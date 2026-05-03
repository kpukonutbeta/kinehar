const PARENT_FOLDER_ID = "1IYAicOD3DqTsTFQWFdUQyu_jFZchiegj";

function getOrCreateEmployeeSpreadsheet(dateArg, nip, name) {
  const dateSplit = dateArg.split(" ");
  const year = dateSplit[2];
  const yearlyFolderName = `KINERJA HARIAN (${year})`;
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  
  let yearlyFolder;
  const folders = parentFolder.getFoldersByName(yearlyFolderName);
  if (folders.hasNext()) {
    yearlyFolder = folders.next();
  } else {
    yearlyFolder = parentFolder.createFolder(yearlyFolderName);
  }

  const employeeFileName = `${nip} - ${name}`;
  const files = yearlyFolder.getFilesByName(employeeFileName);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  const spreadsheet = SpreadsheetApp.create(employeeFileName);
  const file = DriveApp.getFileById(spreadsheet.getId());
  yearlyFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // Remove from root
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
  const name = data.name.trim();
  const ss = getOrCreateEmployeeSpreadsheet(data.date, data.nip, name);
  
  const dateSplit = data.date.split(" ");
  const monthName = dateSplit[1];
  let sheet = ss.getSheetByName(monthName);

  if (!sheet) {
    sheet = ss.insertSheet(monthName);
    createSheetTemplate(sheet, data.date, data.nip, name, data.position);
  }
  
  // Call Daily Counter
  logDailySubmission(data.date, data.nip);

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
  const dateSplit = dateArg.split(" ");
  const year = dateSplit[2];
  const month = dateSplit[1];
  
  const yearlyFolderName = `KINERJA HARIAN (${year})`;
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const folders = parentFolder.getFoldersByName(yearlyFolderName);
  
  if (!folders.hasNext()) return 'tidak menemukan folder tahun';
  const yearlyFolder = folders.next();
  
  // Find employee file. We don't have the name here, so we look by NIP prefix
  const files = yearlyFolder.getFiles();
  let employeeSS = null;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(nip + " - ")) {
      employeeSS = SpreadsheetApp.openById(file.getId());
      break;
    }
  }

  if (!employeeSS) return 'tidak menemukan file pegawai';
  
  const sheet = employeeSS.getSheetByName(month);

  if (!sheet) {
    return 'tidak menemukan sheet bulan';
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
  const dateInput = (isValidIndoDate(dateArg)) ? dateArg : getTodayManual();
  const dateSplit = dateInput.split(" ");
  const month = dateSplit[1];
  const year = dateSplit[2];
  
  const folderName = "COUNTER HARIAN";
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const folders = parentFolder.getFoldersByName(folderName);
  
  if (!folders.hasNext()) {
    return {"item": {}, "nilai_ambang": hitungNilaiAmbang()};
  }
  
  const counterFolder = folders.next();
  const ss = getOrCreateCounterSS(month, year);
  
  const nipCounts = {};
  if (ss) {
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // Row 0 is header (NIP, 01, 02, ...)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nip = row[0].toString().trim();
      if (!nip) continue;
      
      let workDayCount = 0;
      // Columns 1 to end are daily counts
      for (let j = 1; j < row.length; j++) {
        if (row[j] > 0) {
          workDayCount++; // Count unique days that have reports
        }
      }
      nipCounts[nip] = workDayCount;
    }
  }

  const resultsArray = [];
  const asnList = getASNList();
  asnList.forEach(asn => {
    const nip = asn["NIP"].toString().trim();
    const name = asn["Nama Lengkap"].trim();
    const key = `${nip} - ${name}`;
    resultsArray.push({
      key: key,
      value: nipCounts[nip] || 0
    });
  });

  resultsArray.sort((a, b) => a.key.localeCompare(b.key));

  const sortedResult = {};
  resultsArray.forEach(item => {
    sortedResult[item.key] = item.value;
  });

  return {"item": sortedResult, "nilai_ambang": hitungNilaiAmbang()};
}

function logDailySubmission(dateArg, nip) {
  const dateSplit = dateArg.split(" ");
  const day = parseInt(dateSplit[0]);
  const month = dateSplit[1];
  const year = dateSplit[2];
  
  const ss = getOrCreateCounterSS(month, year);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const nips = data.map(row => row[0].toString().trim());
  const nipStr = nip.toString().trim();
  
  let rowIndex = nips.indexOf(nipStr);
  if (rowIndex === -1) {
    // Add new row for NIP
    sheet.appendRow([nipStr]);
    rowIndex = nips.length; // because appendRow adds at the end
  }
  
  // Day 1 is Column 2 (index 1), etc.
  const colIndex = day + 1;
  const currentVal = sheet.getRange(rowIndex + 1, colIndex).getValue() || 0;
  sheet.getRange(rowIndex + 1, colIndex).setValue(parseInt(currentVal) + 1);
}

function syncKinerjaCounters(dateArg, nipFilter = null) {
  const dateInput = (isValidIndoDate(dateArg)) ? dateArg : getTodayManual();
  const dateSplit = dateInput.split(" ");
  const month = dateSplit[1];
  const year = dateSplit[2];
  
  const folderName = "COUNTER HARIAN";
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  let counterFolder;
  const folders = parentFolder.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    counterFolder = folders.next();
  } else {
    counterFolder = parentFolder.createFolder(folderName);
  }

  const fileName = `COUNTER (${month} ${year})`;
  const files = counterFolder.getFilesByName(fileName);
  
  if (!nipFilter) {
    // Sync all: delete current spreadsheet if exists to rebuild
    if (files.hasNext()) {
      counterFolder.removeFile(files.next());
    }
  } else {
    // Sync specific NIP: reset their row values in existing spreadsheet
    if (files.hasNext()) {
      const ss = SpreadsheetApp.openById(files.next().getId());
      const sheet = ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      const nips = data.map(row => row[0].toString().trim());
      const rowIndex = nips.indexOf(nipFilter.toString().trim());
      if (rowIndex !== -1) {
        // Clear columns 2 to 32 (days)
        sheet.getRange(rowIndex + 1, 2, 1, 31).clearContent();
      }
    }
  }

  // Scan spreadsheets to populate
  const yearlyFolderName = `KINERJA HARIAN (${year})`;
  const yearlyFolders = parentFolder.getFoldersByName(yearlyFolderName);
  if (!yearlyFolders.hasNext()) return "Folder tahun tidak ditemukan";
  const yearlyFolder = yearlyFolders.next();
  
  const employeeFiles = yearlyFolder.getFiles();
  while (employeeFiles.hasNext()) {
    const file = employeeFiles.next();
    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
    
    const empFileName = file.getName();
    const currentNip = empFileName.split(" - ")[0];
    
    if (nipFilter && currentNip !== nipFilter.toString().trim()) continue;
    
    const ss = SpreadsheetApp.openById(file.getId());
    const sheet = ss.getSheetByName(month);
    
    if (sheet) {
      const startRow = 11;
      const lastRow = sheet.getLastRow();
      if (lastRow >= startRow) {
        const dateValues = sheet.getRange(startRow, 3, lastRow - startRow + 1, 1).getDisplayValues();
        const dailyCounts = {}; // day -> count
        
        dateValues.forEach(row => {
          const dateStr = row[0].trim();
          if (dateStr !== "") {
            const dayPart = parseInt(dateStr.split("/")[0]);
            dailyCounts[dayPart] = (dailyCounts[dayPart] || 0) + 1;
          }
        });
        
        // Update the grid
        for (const [day, count] of Object.entries(dailyCounts)) {
          // We need a helper or direct update. Let's reuse logDailySubmission 
          // but modified to set the actual count instead of incrementing if we want perfect sync.
          // For simplicity in sync, I'll call logDailySubmission 'count' times.
          // Better: Create a setDailySubmissionCount function
          setDailySubmissionCount(month, year, currentNip, day, count);
        }
      }
    }
  }
  
  return "Synchronization complete for " + (nipFilter ? "NIP " + nipFilter : "all employees") + " in " + month + " " + year;
}

function setDailySubmissionCount(month, year, nip, day, count) {
  const ss = getOrCreateCounterSS(month, year);
  const sheet = ss.getSheets()[0];
  
  const data = sheet.getDataRange().getValues();
  const nips = data.map(row => row[0].toString().trim());
  const nipStr = nip.toString().trim();
  
  let rowIndex = nips.indexOf(nipStr);
  if (rowIndex === -1) {
    sheet.appendRow([nipStr]);
    rowIndex = nips.length;
  }
  
  sheet.getRange(rowIndex + 1, parseInt(day) + 1).setValue(count);
}

function getOrCreateCounterSS(month, year) {
  const folderName = "COUNTER HARIAN";
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  
  let counterFolder;
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    counterFolder = folders.next();
  } else {
    counterFolder = parentFolder.createFolder(folderName);
  }

  const fileName = `COUNTER (${month} ${year})`;
  const files = counterFolder.getFilesByName(fileName);
  
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  const ss = SpreadsheetApp.create(fileName);
  const file = DriveApp.getFileById(ss.getId());
  counterFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  
  // Create Header
  const sheet = ss.getSheets()[0];
  const header = ["NIP"];
  for (let d = 1; d <= 31; d++) {
    header.push(d < 10 ? "0" + d : d.toString());
  }
  sheet.appendRow(header);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  
  return ss;
}