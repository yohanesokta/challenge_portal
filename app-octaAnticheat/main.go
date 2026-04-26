package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type StatusResponse struct {
	ActiveWindow string `json:"active_window"`
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	activeWindow := getActiveWindowTitle()
	log.Printf("Pengecekan: %s", activeWindow)

	response := StatusResponse{
		ActiveWindow: activeWindow,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		fmt.Fprintf(w, "pong")
	})

	fmt.Println("OctaAnticheat Go Server running on http://localhost:9012")
	log.Fatal(http.ListenAndServe(":9012", nil))
}
