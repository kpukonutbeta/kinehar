function getOrCreateMonthlySpreadsheet(dateArg) {
  const dateSplit = dateArg.split(" ");
  const namaFile = `KINEHAR (${dateSplit[1]} ${dateSplit[2]})`;
  const folder = DriveApp.getFolderById("1IYAicOD3DqTsTFQWFdUQyu_jFZchiegj");

  const files = folder.getFilesByName(namaFile);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  const spreadsheet = SpreadsheetApp.create(namaFile);
  const file = DriveApp.getFileById(spreadsheet.getId());
  folder.addFile(file);
  return spreadsheet;
}

function createSheetTemplate(sheet, dateArg, nip, name, position) {
  const dateSplit = dateArg.split(" ");

  sheet.clear();
  sheet.setColumnWidth(1, 40);
  sheet.setColumnWidth(2, 70);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 500);
  sheet.setColumnWidth(5, 500);

  sheet.getRange("A1:E1").merge().setValue("LAPORAN KINERJA HARIAN").setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center");
  sheet.getRange("A2:E2").merge().setValue("SEKRETARIAT KPU KABUPATEN KONAWE UTARA").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("A3:E3").merge().setValue("TAHUN " + dateSplit[2]).setFontWeight("bold").setHorizontalAlignment("center");

  const info = [
    ["Nama", ": " + name],
    ["NIP", ": " + nip],
    ["Periode Laporan", ": " + dateSplit[1] + " " + dateSplit[2]],
    ["Jabatan", ": " + position]
  ];

  for (let i = 0; i < info.length; i++) {
    sheet.getRange(5 + i, 1).setValue(info[i][0]);
    sheet.getRange(5 + i, 3).setValue(info[i][1]);
  }

  sheet.getRange("A10:E10").setValues([["No", "Hari", "Tanggal", "Uraian Kinerja", "Output"]])
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true);
}

function getASNList() {
  const ss = SpreadsheetApp.openById("1DQYTh3GdgjNw58eCVDrRUh8NtGpcA4BbwmDUUddUA_Y");
  const sheet = ss.getSheetByName("Form Responses 1");
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  return rows;
}

function saveKinerja(data) {
  const ss = getOrCreateMonthlySpreadsheet(data.date);
  let sheet = ss.getSheetByName(data.nip);

  if (!sheet) {
    sheet = ss.insertSheet(data.nip);
    const name = data.name.trim(); 
    createSheetTemplate(sheet, data.date, data.nip, name, data.position);
  }

  // Header "No" murni teks (tanpa rumus)
  sheet.getRange("A10").setValue("No");

  // --- HELPER TANGGAL & HARI ---
  const monthsIndo = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
    "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };

  const parseIndoDate = (str) => {
    if (!str) return new Date(0);
    const p = str.split(" ");
    if (p.length === 3) return new Date(p[2], monthsIndo[p[1]], p[0]);
    const d = str.split("/");
    return new Date(d[2], d[1] - 1, d[0]);
  };

  const getIndoDay = (date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[date.getDay()];
  };

  // --- LOGIKA PENEMPATAN BARIS ---
  const newDateObj = parseIndoDate(data.date);
  const newDateTime = newDateObj.getTime();
  const startRow = 11;
  const dateColumn = 3;
  let lastRow = sheet.getLastRow();
  let targetRow = startRow;

  if (lastRow >= startRow) {
    const dateRange = sheet.getRange(startRow, dateColumn, lastRow - startRow + 1).getDisplayValues();
    let found = false;
    for (let i = 0; i < dateRange.length; i++) {
      if (dateRange[i][0] === "") continue;
      let currentDateValue = parseIndoDate(dateRange[i][0]).getTime();
      if (currentDateValue > newDateTime) {
        targetRow = startRow + i;
        found = true;
        break;
      }
    }
    if (!found) targetRow = lastRow + 1;
  }

  // 1. Sisipkan baris kosong
  sheet.insertRowBefore(targetRow);

  // 2. Tulis Data (B: Hari, C: Tanggal, D: Uraian, E: Output)
  const formattedDate = Utilities.formatDate(newDateObj, "GMT+8", "dd/MM/yyyy");
  const rowData = [
    getIndoDay(newDateObj), 
    formattedDate,          
    data.comments,          
    data.feedback           
  ];

  // Ambil range baris baru (Kolom B sampai E)
  const dataRange = sheet.getRange(targetRow, 2, 1, rowData.length);
  dataRange.setValues([rowData]);

  // --- PENYESUAIAN FORMAT (BORDER & WRAP) ---
  
  // Ambil range lengkap dari kolom A sampai E pada baris tersebut
  const fullRowRange = sheet.getRange(targetRow, 1, 1, 5); 

  fullRowRange
    .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID) // Garis luar & dalam
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP) // Teks turun ke bawah (Wrap)
    .setVerticalAlignment("top"); // Agar teks yang panjang tetap rapi mulai dari atas

  // --- LOGIKA PENOMORAN ULANG ---
  const finalLastRow = sheet.getLastRow();
  if (finalLastRow >= startRow) {
    const totalDataRows = finalLastRow - startRow + 1;
    const numberList = [];
    for (let i = 1; i <= totalDataRows; i++) {
      numberList.push([i]);
    }
    sheet.getRange(startRow, 1, totalDataRows, 1).setValues(numberList);
    
    // Pastikan kolom No juga punya border
    sheet.getRange(startRow, 1, totalDataRows, 1).setBorder(true, true, true, true, true, true);
  }

  Logger.log("Data berhasil masuk dan nomor urut telah dihitung ulang.");
}

function getKinerjaByDate(dateArg, nip) {
  const ss = getOrCreateMonthlySpreadsheet(dateArg);
  const sheet = ss.getSheetByName(nip);

  if (!sheet) {
    return 'tidak menemukan sheet';
  }

  const data = sheet.getDataRange().getValues();
  const startRowIndex = 10; // Mulai dari baris 11 (index 10)
  const rows = []
  
  for (let i = startRowIndex; i < data.length; i++) {
    const row = data[i];
    rows.push( {
        no: row[0],
        day: row[1],
        date: row[2],
        comments: row[3],
        feedback: row[4]
      }
    )
  }

  var sortedData = rows.slice().sort(function(a, b) {
    return b.no - a.no;
  });

  return sortedData;
}

function getWorkDayCounts(dateArg) {
  const dateInput = (isValidIndoDate(dateArg)) ? dateArg: getTodayManual();
  const ss = getOrCreateMonthlySpreadsheet(dateInput);
  const sheets = ss.getSheets();
  let resultsArray = []; 

  const ignoredSheets = ["Master", "Template", "Sheet1"];

  sheets.forEach(sheet => {
    const sheetName = sheet.getName(); 
    if (ignoredSheets.includes(sheetName)) return;

    // Ambil Nama dari Cell C5 dan bersihkan titik dua
    let rawName = sheet.getRange("C5").getValue().toString();
    let cleanName = rawName.replace(/:/g, "").trim();
    const resultKey = sheetName + " - " + cleanName;

    const startRow = 11;
    const lastRow = sheet.getLastRow();
    
    let count = 0;
    if (lastRow >= startRow) {
      const dateValues = sheet.getRange(startRow, 3, lastRow - startRow + 1, 1).getDisplayValues();
      const uniqueDates = new Set();
      
      dateValues.forEach(row => {
        const dateStr = row[0].trim();
        if (dateStr !== "") {
          uniqueDates.add(dateStr);
        }
      });
      count = uniqueDates.size;
    }

    resultsArray.push({
      key: resultKey,
      value: count
    });
  });

  // --- LOGIKA SORT ASCENDING BERDASARKAN KEY ---
  resultsArray.sort((a, b) => {
    if (a.key < b.key) return -1; // Jika a lebih kecil, taruh di atas
    if (a.key > b.key) return 1;  // Jika a lebih besar, taruh di bawah
    return 0;
  });

  // --- KONVERSI KEMBALI KE OBJEK ---
  const sortedResult = {};
  resultsArray.forEach(item => {
    sortedResult[item.key] = item.value;
  });

  const response_data = {"item": sortedResult, "nilai_ambang": hitungNilaiAmbang()}

  Logger.log(JSON.stringify(response_data));
  return response_data;
}