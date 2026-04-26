//go:build darwin
package main

import (
	"os/exec"
	"strings"
)

func getActiveWindowTitle() string {
	script := `tell application "System Events" to get name of first process whose frontmost is true`
	out, err := exec.Command("osascript", "-e", script).Output()
	if err != nil {
		return "Mac - Error getting window"
	}
	title := strings.TrimSpace(string(out))
	if title == "" {
		return "Untitled Window"
	}
	return title
}
