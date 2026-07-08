function saveAbsensi(data) {
  if (data.dates) {
    let dateList = [];
    if (Array.isArray(data.dates)) {
      dateList = data.dates;
    } else {
      dateList = data.dates.split(",").map(function(d) { return d.trim(); });
    }
    
    for (let i = 0; i < dateList.length; i++) {
      const dateStr = dateList[i];
      if (dateStr) {
        saveSingleAbsensi(data, dateStr);
      }
    }
  } else {
    saveSingleAbsensi(data, data.date);
  }
}

function formatLocalDateStr(dateObj) {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

function saveSingleAbsensi(data, dateStr) {
  const parentFolderId = "1IYAicOD3DqTsTFQWFdUQyu_jFZchiegj"; // ID Folder Utama
  const folderAbsensi = getOrCreateAbsensiFolder(dateStr, parentFolderId);
  const ss = getOrCreateDailySpreadsheet(dateStr, folderAbsensi);
  const sheet = ss.getSheets()[0];

  const nip = data.nip;
  const name = data.name || "";
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
    let valStr = timeStr;

    const isSpecialSesi = ["cuti", "izin", "sakit", "dinas_luar", "tugas_belajar", "tugas_luar"].includes(sesi);
    if (isSpecialSesi || data.clearSpecial === true || data.clearSpecial === "true") {
      // Clear columns G to L (7 to 12) to ensure at most one special status
      sheet.getRange(targetRow, 7, 1, 6).setValues([["", "", "", "", "", ""]]);
    }

    if (sesi === "pagi") colIndex = 4; // Kolom D
    else if (sesi === "siang") colIndex = 5; // Kolom E
    else if (sesi === "sore") colIndex = 6; // Kolom F
    else if (sesi === "cuti") { colIndex = 7; valStr = "V"; } // Kolom G
    else if (sesi === "izin") { colIndex = 8; valStr = "V"; } // Kolom H
    else if (sesi === "sakit") { colIndex = 9; valStr = "V"; } // Kolom I
    else if (sesi === "dinas_luar") { colIndex = 10; valStr = "V"; } // Kolom J
    else if (sesi === "tugas_belajar") { colIndex = 11; valStr = "V"; } // Kolom K (TB)
    else if (sesi === "tugas_luar") { colIndex = 12; valStr = "V"; } // Kolom L (TL)

    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex).setValue(valStr).setHorizontalAlignment("center");
    }

    // Update Keterangan Khusus notes section at the bottom of the table
    updateOrDeleteKeteranganNote(sheet, startDataRow, lastRow, nip, name, sesi, data.keterangan, data.jenisCuti);
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
    ss.setSpreadsheetLocale('id'); // Set locale to Indonesia
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

function getAbsensiStatus(dateStr, nip) {
  try {
    const parentFolderId = "1IYAicOD3DqTsTFQWFdUQyu_jFZchiegj";
    const folderAbsensi = getOrCreateAbsensiFolder(dateStr, parentFolderId);
    
    // Check if daily spreadsheet exists
    const dayName = getDayNameFromDateStr(dateStr);
    const fileName = `${dateStr}, ${dayName}`;
    const files = folderAbsensi.getFilesByName(fileName);
    
    if (!files.hasNext()) return { pagi: "", siang: "", sore: "", cuti: "", izin: "", sakit: "", dinas_luar: "", tugas_belajar: "", tugas_luar: "" };
    
    const ss = SpreadsheetApp.openById(files.next().getId());
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();
    const startDataRow = 10;
    
    if (lastRow < startDataRow) return { pagi: "", siang: "", sore: "", cuti: "", izin: "", sakit: "", dinas_luar: "", tugas_belajar: "", tugas_luar: "" };

    const data = sheet.getRange(startDataRow, 2, lastRow - (startDataRow - 1), 12).getDisplayValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0].toString().includes(nip)) {
        return {
          pagi: data[i][2],
          siang: data[i][3],
          sore: data[i][4],
          cuti: data[i][5],
          izin: data[i][6],
          sakit: data[i][7],
          dinas_luar: data[i][8],
          tugas_belajar: data[i][9], // Index 9 is Column K (TB)
          tugas_luar: data[i][10] // Index 10 is Column L (TL)
        };
      }
    }
  } catch (err) {
    Logger.log("Error in getAbsensiStatus: " + err.toString());
  }
  return { pagi: "", siang: "", sore: "", cuti: "", izin: "", sakit: "", dinas_luar: "", tugas_belajar: "", tugas_luar: "" };
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

function updateOrDeleteKeteranganNote(sheet, startDataRow, lastRow, nip, name, sesiName, desc, typeCuti) {
  const lastRowWithContent = sheet.getLastRow();
  
  let startNotesRow = -1;
  let sekretarisRow = -1;
  
  // Scan column B for headers/signatures
  const valuesB = sheet.getRange(1, 2, lastRowWithContent, 1).getValues();
  for (let r = 0; r < valuesB.length; r++) {
    const val = valuesB[r][0].toString();
    if (val === "SEKRETARIS") {
      sekretarisRow = r + 1;
    }
    if (val === "KETERANGAN KHUSUS:") {
      startNotesRow = r + 1;
    }
  }
  
  // Find the end of employee table by scanning Column A (NO. ABSEN)
  const valuesA = sheet.getRange(10, 1, lastRowWithContent - 9, 1).getValues();
  let lastEmployeeRow = 9;
  for (let r = 0; r < valuesA.length; r++) {
    const val = valuesA[r][0];
    if (val !== "" && !isNaN(val)) {
      lastEmployeeRow = 10 + r;
    }
  }
  
  // The notes section starts at lastEmployeeRow + 1
  if (startNotesRow === -1) {
    startNotesRow = lastEmployeeRow + 1;
    // Write "KETERANGAN KHUSUS:" heading
    sheet.getRange(startNotesRow, 2).setValue("KETERANGAN KHUSUS:").setFontWeight("bold").setFontStyle("italic");
  }

  // Find if there is an existing note for this employee NIP
  let existingNoteRow = -1;
  const scanLimit = sekretarisRow !== -1 ? sekretarisRow : lastRowWithContent + 1;
  for (let r = startNotesRow + 1; r < scanLimit; r++) {
    const val = sheet.getRange(r, 2).getValue().toString();
    if (val.includes(nip)) {
      existingNoteRow = r;
      break;
    }
  }

  // Determine status label
  const statusLabel = {
    cuti: "Cuti",
    izin: "Izin",
    sakit: "Sakit",
    dinas_luar: "Dinas Luar",
    tugas_belajar: "Tugas Belajar",
    tugas_luar: "Tugas Luar"
  }[sesiName] || sesiName;

  // Format note: "- Name (NIP): Status - Detail"
  let detailParts = [];
  if (sesiName === "cuti" && typeCuti) {
    detailParts.push(typeCuti);
  }
  if (desc) {
    detailParts.push(desc);
  }
  const detailStr = detailParts.length > 0 ? ` (${detailParts.join(" - ")})` : "";
  // Clean clean name to remove line breaks for NIP
  const cleanName = name.replace(/\n.*/g, "").trim();
  const noteValue = `- ${cleanName} (${nip}): ${statusLabel}${detailStr}`;

  const isSpecial = ["cuti", "izin", "sakit", "dinas_luar", "tugas_belajar", "tugas_luar"].includes(sesiName);

  if (isSpecial) {
    if (existingNoteRow !== -1) {
      sheet.getRange(existingNoteRow, 2).setValue(noteValue).setFontWeight("normal").setFontStyle("normal");
    } else {
      const insertRowIdx = startNotesRow + 1;
      sheet.insertRowBefore(insertRowIdx);
      sheet.getRange(insertRowIdx, 2).setValue(noteValue).setFontWeight("normal").setFontStyle("normal");
      sheet.getRange(insertRowIdx, 1, 1, 13).setBorder(false, false, false, false, false, false);
    }
  } else {
    // If not special, delete the note
    if (existingNoteRow !== -1) {
      sheet.deleteRow(existingNoteRow);
      
      // If no notes are left, delete the "KETERANGAN KHUSUS:" heading
      let newSekretarisRow = -1;
      const newLastRow = sheet.getLastRow();
      const newValuesB = sheet.getRange(1, 2, newLastRow, 1).getValues();
      for (let r = 0; r < newValuesB.length; r++) {
        if (newValuesB[r][0].toString() === "SEKRETARIS") {
          newSekretarisRow = r + 1;
          break;
        }
      }
      
      if (newSekretarisRow !== -1 && newSekretarisRow === startNotesRow + 1) {
        sheet.deleteRow(startNotesRow);
      }
    }
  }
}
