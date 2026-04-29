function createCorsResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseDayDate(dateString) {
  const bulanMap = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3,
    "Mei": 4, "Juni": 5, "Juli": 6, "Agustus": 7,
    "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };
  const hariMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const parts = dateString.trim().split(" ");
  const tgl = parseInt(parts[0]);
  const bln = bulanMap[parts[1]];
  const thn = parseInt(parts[2]);

  const date = new Date(thn, bln, tgl);
  const hari = hariMap[date.getDay()];
  const tanggalFormatted = `${String(tgl).padStart(2, '0')}/${String(bln + 1).padStart(2, '0')}/${thn}`;

  return { hari: hari, tanggal: tanggalFormatted };
}

function getTodayManual() {
  const today = new Date();
  const day = today.getDate();
  const monthIndex = today.getMonth();
  const year = today.getFullYear();
  
  const monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const formattedDate = day + " " + monthsIndo[monthIndex] + " " + year;
  
  Logger.log(formattedDate); // Hasil: 15 Januari 2026
  return formattedDate;
}

function isValidIndoDate(dateStr) {
  // Regex untuk format: [1-2 digit tanggal] [Nama Bulan] [4 digit tahun]
  const regex = /^([1-9]|[12][0-9]|3[01]) (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4}$/;
  
  // 1. Cek apakah pola string sesuai
  if (!regex.test(dateStr)) {
    return false;
  }

  // 2. Cek validitas tanggal (misal: menghindari 31 Februari)
  const parts = dateStr.split(" ");
  const day = parseInt(parts[0]);
  const monthName = parts[1];
  const year = parseInt(parts[2]);

  const monthsIndo = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
    "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };

  const testDate = new Date(year, monthsIndo[monthName], day);
  
  // Jika objek Date berubah (misal input 31 Feb jadi 3 Mar), berarti tidak valid
  return testDate.getDate() === day && 
         testDate.getMonth() === monthsIndo[monthName] && 
         testDate.getFullYear() === year;
}

function hitungNilaiAmbang() {
  var hariIni = new Date();
  var hari = hariIni.getDate(); // setara dengan hari_ini.day

  var nilaiAmbang = hari - Math.ceil(hari / 5 * 2);
  return nilaiAmbang;
}
