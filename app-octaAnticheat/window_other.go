//go:build !windows && !linux && !darwin
package main

func getActiveWindowTitle() string {
	return "Unsupported OS"
}
