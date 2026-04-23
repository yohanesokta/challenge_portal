# EXAMPLE.md — Panduan Membuat Soal di CodeLab JAI

Dokumen ini menjelaskan cara membuat soal untuk setiap tipe solusi yang tersedia.
Semua kasus pengujian ditulis dalam Python dan **terlihat** oleh mahasiswa (tidak ada hidden test).

---

## Tipe Soal

| Tipe | Deskripsi | Evaluator |
|------|-----------|-----------|
| `function` | Mahasiswa menulis sebuah fungsi Python dengan nama tertentu | `EvaluatorFunction` |
| `class` | Mahasiswa menulis sebuah class Python dengan method tertentu | `EvaluatorClass` |
| `bebas` | Program lengkap — output dibandingkan atau skrip validasi | `EvaluatorBebas` |

---

## Cara Kerja Evaluator

### EvaluatorFunction & EvaluatorClass
Kode mahasiswa **digabung** dengan skrip pengujian, lalu dijalankan sebagai satu file Python.
- **LULUS** jika `exit code == 0` (tidak ada `AssertionError` atau exception)
- **GAGAL** jika ada exception, `assert` gagal, atau timeout

### EvaluatorBebas
Dua mode:
1. **Skrip validasi** (jika `testScript` berisi kode aktif): sama seperti di atas
2. **Perbandingan stdout** (jika `testScript` hanya komentar): output program dibandingkan dengan `expectedOutput`

---

## Contoh: Tipe `function`

### Konfigurasi Soal
- **Tipe**: `function`
- **Nama Fungsi**: `hitung_faktorial`

### Deskripsi Soal (Markdown)
```markdown
## Faktorial Rekursif

Tulis sebuah fungsi bernama `hitung_faktorial(n)` yang mengembalikan faktorial dari bilangan bulat non-negatif `n`.

**Contoh:**
- `hitung_faktorial(0)` → `1`
- `hitung_faktorial(5)` → `120`

**Batasan:** `0 <= n <= 10`
```

### Skrip Pengujian (Python)

```python
# Kasus Pengujian #1 — Kasus dasar
assert hitung_faktorial(0) == 1, "0! harus 1"
assert hitung_faktorial(1) == 1, "1! harus 1"
print("Kasus dasar lulus!")
```

```python
# Kasus Pengujian #2 — Kasus umum
assert hitung_faktorial(5) == 120, "5! harus 120"
assert hitung_faktorial(10) == 3628800, "10! harus 3628800"
print("Kasus umum lulus!")
```

### Contoh Kode Mahasiswa yang Lulus
```python
def hitung_faktorial(n):
    if n == 0:
        return 1
    return n * hitung_faktorial(n - 1)
```

---

## Contoh: Tipe `class`

### Konfigurasi Soal
- **Tipe**: `class`
- **Nama Class**: `Stack`

### Deskripsi Soal (Markdown)
```markdown
## Implementasi Stack

Buat sebuah class bernama `Stack` yang mengimplementasikan struktur data tumpukan (LIFO).

Class harus memiliki method:
- `push(item)` — tambahkan item ke atas tumpukan
- `pop()` — hapus dan kembalikan item teratas; kembalikan `None` jika kosong
- `peek()` — lihat item teratas tanpa menghapus; `None` jika kosong
- `is_empty()` — kembalikan `True` jika tumpukan kosong
```

### Skrip Pengujian (Python)

```python
# Kasus Pengujian #1 — Operasi dasar
s = Stack()
assert s.is_empty() == True, "Stack baru harus kosong"
s.push(10)
s.push(20)
assert s.peek() == 20, "Peek harus mengembalikan 20"
assert s.pop() == 20, "Pop pertama harus 20"
assert s.pop() == 10, "Pop kedua harus 10"
assert s.is_empty() == True, "Stack harus kosong setelah semua di-pop"
print("Operasi dasar lulus!")
```

```python
# Kasus Pengujian #2 — Pop dari stack kosong
s = Stack()
assert s.pop() is None, "Pop dari stack kosong harus None"
assert s.peek() is None, "Peek dari stack kosong harus None"
print("Edge case kosong lulus!")
```

### Contoh Kode Mahasiswa yang Lulus
```python
class Stack:
    def __init__(self):
        self._data = []

    def push(self, item):
        self._data.append(item)

    def pop(self):
        if self.is_empty():
            return None
        return self._data.pop()

    def peek(self):
        if self.is_empty():
            return None
        return self._data[-1]

    def is_empty(self):
        return len(self._data) == 0
```

---

## Contoh: Tipe `bebas`

Tipe `bebas` mendukung dua sub-mode:

### Sub-mode A: Perbandingan Stdout

Gunakan ini untuk soal input/output klasik.

#### Konfigurasi
- **Tipe**: `bebas`
- **Skrip Pengujian**: *(kosongkan, atau isi hanya komentar)*
- **Output yang Diharapkan**: teks yang harus persis dicetak program

#### Skrip Pengujian
```python
# Tidak ada skrip — output program akan dibandingkan dengan 'Output yang Diharapkan'
```

#### Output yang Diharapkan
```
Halo, Dunia!
```

#### Contoh Kode Mahasiswa
```python
print("Halo, Dunia!")
```

---

### Sub-mode B: Skrip Validasi

Gunakan ini untuk soal yang membutuhkan logika validasi kustom.

#### Konfigurasi
- **Tipe**: `bebas`
- **Skrip Pengujian**: tulis skrip Python

#### Skrip Pengujian
```python
# Kasus Pengujian #1 — Verifikasi output program bebas
import subprocess
import sys

result = subprocess.run(
    [sys.executable, '__file__'],
    capture_output=True, text=True, timeout=5
)
output = result.stdout.strip()
assert output == "Halo, Dunia!", f"Output tidak sesuai: '{output}'"
print("Validasi output lulus!")
```

> **Catatan**: Untuk sub-mode B tipe `bebas`, kode mahasiswa dan skrip pengujian digabung dan dijalankan bersama — sama seperti tipe `function` dan `class`.

---

## Tips Penulisan Test Case

### ✅ Praktik yang Baik
```python
# Berikan pesan deskriptif pada setiap assert
assert fungsi(input) == expected, f"Dengan input {input}, harus menghasilkan {expected}, bukan {fungsi(input)}"

# Kelompokkan assertion terkait
assert Stack().is_empty(), "Stack baru harus kosong"

# Cetak konfirmasi di akhir
print("Semua test lulus!")
```

### ❌ Hindari
```python
# Jangan gunakan print untuk validasi (tidak andal)
print(fungsi(5))  # SALAH — hanya mencetak, tidak memvalidasi

# Jangan gunakan input() dalam skrip pengujian
x = input()  # SALAH — akan hang
```

---

## Struktur Database Terkait

| Kolom | Keterangan |
|-------|------------|
| `problems.solution_type` | `'function'`, `'class'`, atau `'bebas'` |
| `problems.function_name` | Nama fungsi (untuk tipe `function`) |
| `problems.class_name` | Nama class (untuk tipe `class`) |
| `test_cases.test_script` | Skrip Python pengujian |
| `test_cases.expected_output` | Output yang diharapkan (untuk `bebas` sub-mode A) |
