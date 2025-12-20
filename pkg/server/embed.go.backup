package server

import (
	"embed"
	"io/fs"
)

//go:embed static/*
var staticFS embed.FS

// StaticFS returns the embedded static filesystem with the "static" prefix stripped.
func StaticFS() (fs.FS, error) {
	return fs.Sub(staticFS, "static")
}
