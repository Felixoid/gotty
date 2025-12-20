OUTPUT_DIR = ./builds
GIT_COMMIT = $(shell git rev-parse HEAD | cut -c1-7)
VERSION = 2.2.0

.PHONY: all
all: static gotty

.PHONY: gotty
gotty: static
	go build -ldflags "-X main.Version=$(VERSION) -X main.CommitID=$(GIT_COMMIT)" -o gotty ./pkg/app

.PHONY: static
static: pkg/embed/static/index.html pkg/embed/static/js/gotty-bundle.js pkg/embed/static/css/index.css pkg/embed/static/css/terminal.css pkg/embed/static/favicon.png

pkg/embed/static:
	mkdir -p pkg/embed/static/js pkg/embed/static/css

pkg/embed/static/index.html: pkg/embed/static
	cp pkg/embed/static/resources/index.html pkg/embed/static/index.html

pkg/embed/static/favicon.png: pkg/embed/static
	cp pkg/embed/static/resources/favicon.png pkg/embed/static/favicon.png

pkg/embed/static/css/index.css: pkg/embed/static
	cp pkg/embed/static/resources/index.css pkg/embed/static/css/index.css

pkg/embed/static/css/terminal.css: pkg/embed/static
	cp pkg/embed/static/resources/terminal.css pkg/embed/static/css/terminal.css

pkg/embed/static/js/gotty-bundle.js: pkg/embed/static
	cp pkg/embed/static/js/dist/*.js pkg/embed/static/js/

pkg/embed/static/js/dist/gotty-bundle.js: pkg/embed/static/js/src/* pkg/embed/static/js/node_modules/.package-lock.json
	cd pkg/embed/static/js && npx webpack

pkg/embed/static/js/node_modules/.package-lock.json: pkg/embed/static/js/package.json
	cd pkg/embed/static/js && npm install

.PHONY: clean
clean:
	rm -rf gotty pkg/embed/static builds

.PHONY: test
test:
	go test ./...

.PHONY: fmt
fmt:
	go fmt ./...
	cd pkg/embed/static/js && npm run format 2>/dev/null || true

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
