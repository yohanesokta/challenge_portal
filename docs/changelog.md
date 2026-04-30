# Changelog Project CodeLab JAI

Semua perubahan penting pada proyek ini akan dicatat di dokumen ini.

## [Unreleased] - 2026-04-30
### Added
- Fitur input `stdin` untuk Test Case:
  - Admin dapat menambahkan input kustom yang akan diterima oleh fungsi `input()` di kode mahasiswa.
  - Penambahan field `input` pada interface `TestCase` di backend dan UI.
  - Pembaruan `EvaluatorFunction`, `EvaluatorClass`, dan `EvaluatorBebas` untuk mendukung pengiriman input ke proses Python.
  - Tampilan input test case pada halaman pengerjaan soal mahasiswa untuk transparansi.
  - Tampilan input yang digunakan pada hasil pengujian di panel Editor.

## [2026-04-29]
### Added
- Integrasi Docker Workflow dengan QEMU dan Buildx untuk dukungan multi-platform.
- Workflow CI/CD untuk build dan push Docker image.
- Penambahan layanan `shortlink-service` untuk manajemen tautan singkat soal.
- Peningkatan pratinjau kode pada test case menggunakan editor berbasis Python.

## [2026-04-28]
### Added
- Halaman setup awal untuk konfigurasi detail superadmin.
- Fitur Timer pada daftar soal dengan opsi layar penuh (fullscreen) dan reset.
- Sinkronisasi waktu server pada komponen Timer untuk akurasi durasi pengerjaan.
- Instruksi instalasi untuk Linux dan macOS pada README.

### Fixed
- Masalah `zIndex` pada dropdown profil di Header.
- Pembaruan `.gitignore` untuk menyembunyikan skrip shell layanan shortlink.
