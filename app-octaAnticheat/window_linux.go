//go:build linux
package main

import (
	"os"
	"os/exec"
	"strings"
)

func getActiveWindowTitle() string {
	out, err := exec.Command("xdotool", "getactivewindow", "getwindowname").Output()
	if err == nil {
		title := strings.TrimSpace(string(out))
		if title != "" {
			return title
		}
	}

	if strings.Contains(os.Getenv("XDG_SESSION_TYPE"), "wayland") {
		return "Linux (Wayland) - Restricted"
	}

	return "Unknown"
}
