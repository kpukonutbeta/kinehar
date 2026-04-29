function saveAbsensi(data) {
  const parentFolderId = "1IYAicOD3DqTsTFQWFdUQyu_jFZchiegj"; // ID Folder Utama
  const folderAbsensi = getOrCreateAbsensiFolder(data.date, parentFolderId);
  const ss = getOrCreateDailySpreadsheet(data.date, folderAbsensi);
  const sheet = ss.getSheets()[0];

  const nip = data.nip;
  const sesi = data.sesi.toLowerCase(); // "pagi", "siang", "sore"
  const now = new Date();
  const timeStr = Utilities.formatDate(now, "GMT+8", "HH:mm");

  // Cari baris pegawai berdasarkan NIP di kolom B (Nama/NIP)
  const lastRow = sheet.getLastRow();
  const startDataRow = 10;
  if (lastRow < startDataRow) return;
  
  const dataRange = sheet.getRange(startDataRow, 2, lastRow - (startDataRow - 1), 1).getValues();
  let targetRow = -1;

  for (let i = 0; i < dataRange.length; i++) {
    const cellValue = dataRange[i][0].toString();
    if (cellValue.includes(nip)) {
      targetRow = startDataRow + i;
      break;
    }
  }

  if (targetRow !== -1) {
    let colIndex = -1;
    if (sesi === "pagi") colIndex = 4; // Kolom D
    else if (sesi === "siang") colIndex = 5; // Kolom E
    else if (sesi === "sore") colIndex = 6; // Kolom F

    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex).setValue(timeStr).setHorizontalAlignment("center");
    }
  }
}

function getOrCreateAbsensiFolder(dateStr, parentId) {
  const parts = dateStr.split(" ");
  const folderName = `ABSENSI (${parts[1]} ${parts[2]})`;
  const parentFolder = DriveApp.getFolderById(parentId);
  const folders = parentFolder.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

function getOrCreateDailySpreadsheet(dateStr, folder) {
  const dayName = getDayNameFromDateStr(dateStr);
  const fileName = `${dateStr}, ${dayName}`;
  
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  } else {
    const ss = SpreadsheetApp.create(fileName);
    const file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Bersihkan dari root jika perlu
    
    setupAbsensiTemplate(ss, dateStr);
    return ss;
  }
}

function setupAbsensiTemplate(ss, dateStr) {
  const sheet = ss.getSheets()[0];
  const parts = dateStr.split(" ");
  const dayName = getDayNameFromDateStr(dateStr);

  sheet.clear();
  sheet.setColumnWidth(1, 60);  // NO. ABSEN
  sheet.setColumnWidth(2, 300); // NAMA / NIP
  sheet.setColumnWidth(3, 250); // JABATAN
  sheet.setColumnWidth(4, 70);  // PAGI
  sheet.setColumnWidth(5, 70);  // SIANG
  sheet.setColumnWidth(6, 70);  // SORE
  // Kolom 7-13 untuk KETERANGAN (C, I, S, DL, TB, TL, TK)
  for (let i = 7; i <= 13; i++) {
    sheet.setColumnWidth(i, 35);
  }

  // Header
  sheet.getRange("A1:M1").merge().setValue("DAFTAR HADIR").setFontWeight("bold").setFontSize(14).setHorizontalAlignment("center");
  sheet.getRange("A2:M2").merge().setValue("SEKRETARIAT KPU KABUPATEN KONAWE UTARA").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("A3:M3").merge().setValue("TAHUN " + parts[2]).setFontWeight("bold").setHorizontalAlignment("center");

  sheet.getRange("A5").setValue("Hari").setFontWeight("bold");
  sheet.getRange("B5").setValue(": " + dayName);
  sheet.getRange("A6").setValue("Tanggal").setFontWeight("bold");
  sheet.getRange("B6").setValue(": " + dateStr);

  // Table Header
  const tableHeaders = [
    ["NO.\nABSEN", "NAMA / NIP", "JABATAN", "PAGI", "SIANG", "SORE", "KETERANGAN"]
  ];
  sheet.getRange("A8:G8").setValues(tableHeaders).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, true, true);
  sheet.getRange("G8:M8").merge();
  
  const ketSubHeaders = [["C", "I", "S", "DL", "TB", "TL", "TK"]];
  sheet.getRange("G9:M9").setValues(ketSubHeaders).setFontWeight("bold").setHorizontalAlignment("center").setBorder(true, true, true, true, true, true);
  
  // Merge headers that span two rows
  ["A8", "B8", "C8", "D8", "E8", "F8"].forEach(cell => {
    sheet.getRange(cell + ":" + cell.replace("8", "9")).merge();
  });

  // Load ASN Data
  const asnList = getASNList();
  const rows = [];
  asnList.forEach((asn, index) => {
    rows.push([
      index + 1,
      `${asn["Nama Lengkap"]} \n${asn["NIP"]}`,
      asn["Jabatan"],
      "", "", "", "", "", "", "", "", "", ""
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(10, 1, rows.length, 13).setValues(rows)
      .setBorder(true, true, true, true, true, true)
      .setVerticalAlignment("middle")
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getRange(10, 1, rows.length, 1).setHorizontalAlignment("center"); // Kolom No
    sheet.getRange(10, 4, rows.length, 10).setHorizontalAlignment("center"); // Kolom Pagi - Keterangan
  }

  // Signature Section
  const signData = getSignatoryData();
  const startRowSign = 10 + rows.length + 3;
  
  // Sekretaris (Column B)
  sheet.getRange(startRowSign, 2).setValue("SEKRETARIS");
  sheet.getRange(startRowSign + 4, 2).setValue(signData.sekretaris.nama).setFontWeight("bold").setFontLine("underline");
  sheet.getRange(startRowSign + 5, 2).setValue("NIP. " + signData.sekretaris.nip);

  // Pengelola (Column 8)
  sheet.getRange(startRowSign, 8).setValue("PENGELOLA DAFTAR HADIR");
  sheet.getRange(startRowSign + 4, 8).setValue(signData.pengelola.nama).setFontWeight("bold").setFontLine("underline");
  sheet.getRange(startRowSign + 5, 8).setValue("NIP. " + signData.pengelola.nip);
}

function getSignatoryData() {
  const ss = SpreadsheetApp.openById("1I8SqB6vXGeTDONcncmIDT1M_nBnNxh7YB45HS9aTjV4");
  const sheet = ss.getSheets()[0];
  const data = sheet.getRange("A1:C2").getValues();
  
  return {
    sekretaris: { nip: data[0][1], nama: data[0][2] },
    pengelola: { nip: data[1][1], nama: data[1][2] }
  };
}

// Helper Functions
function getDayNameFromDateStr(dateStr) {
  const parts = dateStr.split(" ");
  const day = parseInt(parts[0]);
  const month = getMonthIndex(parts[1]);
  const year = parseInt(parts[2]);
  const date = new Date(year, month, day);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()];
}

function getMonthIndex(monthName) {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return months.indexOf(monthName);
}
