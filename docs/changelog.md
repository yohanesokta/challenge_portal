# Changelog Project CodeLab JAI

Semua perubahan penting pada proyek ini akan dicatat di dokumen ini.

## [Unreleased] - 2026-04-30
### Added
- **Sistem Dokumentasi Administrator**:
  - Penambahan direktori `/docs` untuk panduan teknis dan tutorial.
  - Implementasi rute web `/docs`, `/docs/tutorial`, dan `/docs/changelog` untuk akses dokumentasi melalui browser.
- **Komponen MarkdownRenderer Terpadu**:
  - Penggunaan `MarkdownRenderer` di seluruh aplikasi (Dashboard, Problem View, Review, dan Admin Preview).
  - Dukungan **Syntax Highlighting** yang lebih berwarna menggunakan tema `atomDark`.
  - Fitur **Auto Word Wrap** pada blok kode untuk meningkatkan keterbacaan.
  - Tombol **Salin Kode** (Copy to Clipboard) yang ringkas pada setiap blok kode dengan umpan balik visual.
  - Perbaikan tampilan kode inline (menghilangkan petik/backtick otomatis dari Tailwind Typography).
- **Dukungan Input Stdin untuk Test Case**:
  - Fitur pemberian input kustom (`stdin`) untuk setiap test case yang akan diproses oleh `input()` di kode Python mahasiswa.
  - Pembaruan backend (Server Actions) dan mesin evaluasi untuk mendukung aliran data input.
  - Penambahan field input pada UI Admin (Create/Edit Problem).
  - Transparansi input test case pada halaman pengerjaan mahasiswa dan hasil pengujian.

## [2026-04-29]
### Added
- Integrasi Docker Workflow dengan QEMU dan Buildx untuk dukungan multi-platform.
- Workflow CI/CD untuk build dan push Docker image ke registry.
- Penambahan layanan `shortlink-service` untuk manajemen tautan singkat soal secara otomatis.
- Peningkatan pratinjau kode pada test case menggunakan editor berbasis Python di panel Admin.

## [2026-04-28]
### Added
- Halaman setup awal untuk konfigurasi detail superadmin dan kredensial pertama.
- Fitur Timer pada daftar soal dengan opsi layar penuh (fullscreen) dan fungsionalitas reset.
- Sinkronisasi waktu server pada komponen Timer untuk akurasi durasi pengerjaan yang adil.
- Instruksi instalasi mendalam untuk Linux dan macOS pada README.

### Fixed
- Masalah penumpukan visual (`zIndex`) pada dropdown profil di Header.
- Pembaruan `.gitignore` untuk keamanan skrip shell layanan internal.
