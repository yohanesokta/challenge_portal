//go:build windows
package main

import (
	"path/filepath"
	"syscall"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	getForegroundWin = user32.NewProc("GetForegroundWindow")
	getWindowText    = user32.NewProc("GetWindowTextW")
	getWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")

	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	openProcess = kernel32.NewProc("OpenProcess")
	closeHandle = kernel32.NewProc("CloseHandle")
	queryFullProcessImageName = kernel32.NewProc("QueryFullProcessImageNameW")
)

const (
	PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
)

func getProcessName(hwnd uintptr) string {
	var pid uint32
	getWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	if pid == 0 {
		return ""
	}

	hProcess, _, _ := openProcess.Call(uintptr(PROCESS_QUERY_LIMITED_INFORMATION), 0, uintptr(pid))
	if hProcess == 0 {
		return ""
	}
	defer closeHandle.Call(hProcess)

	b := make([]uint16, syscall.MAX_PATH)
	size := uint32(len(b))
	ret, _, _ := queryFullProcessImageName.Call(hProcess, 0, uintptr(unsafe.Pointer(&b[0])), uintptr(unsafe.Pointer(&size)))
	if ret == 0 {
		return ""
	}

	return filepath.Base(syscall.UTF16ToString(b[:size]))
}

func getActiveWindowTitle() string {
	hwnd, _, _ := getForegroundWin.Call()
	if hwnd == 0 {
		return "No Active Window"
	}

	// Get Process Name first as it's often more reliable
	processName := getProcessName(hwnd)

	// Try to get Window Title
	b := make([]uint16, 512)
	ret, _, _ := getWindowText.Call(hwnd, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
	
	var title string
	if ret > 0 {
		title = syscall.UTF16ToString(b[:ret])
	}

	if title == "" {
		if processName != "" {
			return processName
		}
		return "Untitled Window"
	}

	if processName != "" {
		return title + " [" + processName + "]"
	}

	return title
}
