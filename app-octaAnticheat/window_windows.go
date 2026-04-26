//go:build windows
package main

import (
	"syscall"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	getForegroundWin = user32.NewProc("GetForegroundWindow")
	getWindowText    = user32.NewProc("GetWindowTextW")
)

func getActiveWindowTitle() string {
	hwnd, _, _ := getForegroundWin.Call()
	if hwnd == 0 {
		return "No Active Window"
	}

	b := make([]uint16, 512)
	ret, _, _ := getWindowText.Call(hwnd, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
	if ret == 0 {
		return "Untitled Window"
	}

	return syscall.UTF16ToString(b)
}
