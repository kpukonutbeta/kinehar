# Struktur Data

Aplikasi KEJAR menggunakan Google Sheets sebagai database utama. Berikut adalah skema data yang digunakan.

## 1. Spreadsheet Pegawai
Setiap pegawai memiliki satu file Spreadsheet khusus dengan nama format: `[NIP] - [NAMA]`. Di dalamnya terdapat sheet bulanan (Januari, Februari, dsb).

**Kolom Utama:**
- `Tanggal`: Tanggal aktivitas.
- `Waktu`: Jam pengiriman data.
- `Uraian Tugas`: Deskripsi pekerjaan.
- `Output/Hasil`: Hasil pekerjaan.
- `Lokasi`: Koordinat GPS.

## 2. Spreadsheet Database Pusat (Master)
Berfungsi sebagai direktori utama untuk verifikasi dan rekapitulasi tingkat instansi.

**Kolom Master:**
- `Nama Pegawai`
- `NIP`
- `Jabatan`
- `Unit Kerja`
- `ID Spreadsheet`: Link ke file spreadsheet pribadi pegawai.

## Sinkronisasi Data
Proses pertukaran data dilakukan melalui API Google Apps Script dengan format JSON.
- **Request**: Dikirim menggunakan metode `POST`.
- **Response**: Mengembalikan status `success` atau `error` beserta pesan sistem.
