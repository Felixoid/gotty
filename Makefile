OUTPUT_DIR = ./builds
GIT_COMMIT = $(shell git rev-parse HEAD | cut -c1-7)
VERSION = 2.1.0

.PHONY: all
all: static gotty

.PHONY: gotty
gotty: static
	go build -ldflags "-X main.Version=$(VERSION) -X main.CommitID=$(GIT_COMMIT)" -o gotty

.PHONY: static
static: server/static/index.html server/static/js/gotty-bundle.js server/static/css/index.css server/static/css/terminal.css server/static/favicon.png

server/static:
	mkdir -p server/static/js server/static/css

server/static/index.html: server/static resources/index.html
	cp resources/index.html server/static/index.html

server/static/favicon.png: server/static resources/favicon.png
	cp resources/favicon.png server/static/favicon.png

server/static/css/index.css: server/static resources/index.css
	cp resources/index.css server/static/css/index.css

server/static/css/terminal.css: server/static resources/terminal.css
	cp resources/terminal.css server/static/css/terminal.css

server/static/js/gotty-bundle.js: server/static js/dist/gotty-bundle.js
	cp js/dist/*.js server/static/js/

js/dist/gotty-bundle.js: js/src/* js/node_modules/.package-lock.json
	cd js && npx webpack

js/node_modules/.package-lock.json: js/package.json
	cd js && npm install

.PHONY: clean
clean:
	rm -rf gotty server/static builds

.PHONY: test
test:
	go test ./...

.PHONY: fmt
fmt:
	go fmt ./...
	cd js && npm run format 2>/dev/null || true

.PHONY: cross_compile
cross_compile: static
	GOARM=5 gox -os="darwin linux freebsd netbsd openbsd" -arch="386 amd64 arm arm64" \
		-osarch="!darwin/386 !darwin/arm" \
		-ldflags "-X main.Version=$(VERSION) -X main.CommitID=$(GIT_COMMIT)" \
		-output "${OUTPUT_DIR}/pkg/{{.OS}}_{{.Arch}}/{{.Dir}}"

.PHONY: release
release: cross_compile
	mkdir -p ${OUTPUT_DIR}/dist
	cd ${OUTPUT_DIR}/pkg/; for osarch in *; do (cd $$osarch; tar zcvf ../../dist/gotty_${VERSION}_$$osarch.tar.gz ./*); done;
	cd ${OUTPUT_DIR}/dist; sha256sum * > ./SHA256SUMS
