//go:build linux

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func getActiveWindowProcessX11() string {
	out, err := exec.Command("xdotool", "getactivewindow", "getwindowpid").Output()
	if err == nil {
		pid := strings.TrimSpace(string(out))
		if pid != "" {
			return pid
		}
	}
	return "Unknown"
}

func getActiveWindowProcessWayland() string {

	home := os.Getenv("HOME")
	locationFolder := filepath.Join(home, ".config", "octaAnticheat")

	out, err := exec.Command(locationFolder+"/kdotool", "getactivewindow").Output()
	var windowid string
	if err == nil {
		pid := strings.TrimSpace(string(out))
		if pid != "" {
			windowid = pid
		}
	}

	if windowid != "" {
		out, err = exec.Command(locationFolder+"/kdotool", "getwindowname", windowid).Output()
		if err == nil {
			pid := strings.TrimSpace(string(out))
			if pid != "" {
				return pid
			}
		}
	}
	return "Unknown"
}

func getActiveWindowTitle() string {

	if strings.Contains(os.Getenv("XDG_SESSION_TYPE"), "wayland") {

		println("Wayland session detected")
		return getActiveWindowProcessWayland()
	} else {
		println("X11 session detected")
		return getActiveWindowProcessX11()
	}
}
