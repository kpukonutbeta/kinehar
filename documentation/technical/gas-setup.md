# Google Apps Script Setup

KEJAR menggunakan **Google Apps Script (GAS)** sebagai jembatan antara aplikasi web dan Google Sheets.

## Fungsi Utama (`SheetUtils.gs`)

Backend ini menangani beberapa tugas penting:
- `doGet(e)`: Menangani permintaan pengambilan data (Data Pegawai, Histori).
- `doPost(e)`: Menangani pengiriman data dari formulir.
- `saveKinerja()`: Fungsi khusus untuk memvalidasi dan menulis data ke baris baru di spreadsheet.

## Cara Deploy Backend

Jika Anda melakukan perubahan pada file di folder `GAS/`, Anda harus memperbarui deployment:
1. Buka [Google Apps Script Editor](https://script.google.com/).
2. Copy kode dari file `.gs` di repo ini ke editor.
3. Klik **Deploy** > **New Deployment**.
4. Pilih type **Web App**.
5. Set "Execute as" ke **Me** dan "Who has access" ke **Anyone** (atau sesuaikan dengan kebutuhan organisasi).
6. Copy **Web App URL** dan masukkan ke dalam konfigurasi JavaScript di frontend.

## Keuntungan Menggunakan GAS
- **Serverless**: Tidak perlu mengelola server fisik atau VPS.
- **Gratis**: Menggunakan kuota gratis dari Google.
- **Integrasi**: Sangat mudah terintegrasi dengan layanan Google lainnya (Drive, Gmail, Sheets).
