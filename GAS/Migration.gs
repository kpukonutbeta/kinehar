/**
 * Main function to run the migration automatically.
 * Strategy: Processes ONE monthly file per execution.
 * Tracks processed files to avoid duplication.
 */
function migrateAutomatically() {
  const startTime = new Date().getTime();
  
  // Clean up existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "migrateAutomatically") {
      ScriptApp.deleteTrigger(t);
    }
  });

  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const files = parentFolder.getFiles();
  const processedFiles = getProcessedFiles();
  
  let targetFileId = null;
  let targetFileName = null;
  let remainingFiles = false;

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const fileId = file.getId();
    
    if (fileName.startsWith("KINEHAR (") && fileName.endsWith(")") && file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      if (processedFiles.includes(fileId)) {
        continue;
      }
      
      if (!targetFileId) {
        targetFileId = fileId;
        targetFileName = fileName;
      } else {
        remainingFiles = true;
        break; // We found our target and we know there's more
      }
    }
  }

  if (!targetFileId) {
    Logger.log("All monthly files have been migrated.");
    return;
  }

  Logger.log(`Starting migration for file: ${targetFileName}`);
  
  try {
    const content = targetFileName.substring(9, targetFileName.length - 1); // "Mei 2024"
    const parts = content.split(" ");
    if (parts.length === 2) {
      const month = parts[0];
      const year = parts[1];
      
      processMonthlyFile(targetFileId, month, year);
      markFileAsProcessed(targetFileId);
      Logger.log(`Successfully migrated file: ${targetFileName}`);
    }
  } catch (e) {
    Logger.log(`Error migrating file: ${targetFileName}. Error: ${e.toString()}`);
    // If it's a timeout error from inside processMonthlyFile, we might not have marked it as done
    // We should probably check time inside processMonthlyFile too if there are MANY sheets
  }

  // Schedule next file migration
  if (remainingFiles) {
    Logger.log("More files to process. Scheduling next run...");
    ScriptApp.newTrigger("migrateAutomatically")
      .timeBased()
      .after(1 * 60 * 1000) // 1 minute delay
      .create();
  } else {
    Logger.log("Migration complete. No more files found.");
  }
}

function resetMigrationProgress() {
  PropertiesService.getScriptProperties().deleteProperty("PROCESSED_FILES");
  Logger.log("Migration progress reset.");
}

function getProcessedFiles() {
  const props = PropertiesService.getScriptProperties();
  const data = props.getProperty("PROCESSED_FILES");
  return data ? JSON.parse(data) : [];
}

function markFileAsProcessed(fileId) {
  const props = PropertiesService.getScriptProperties();
  const processed = getProcessedFiles();
  if (!processed.includes(fileId)) {
    processed.push(fileId);
    props.setProperty("PROCESSED_FILES", JSON.stringify(processed));
  }
}

/**
 * Processes all sheets in a single monthly file.
 */
function processMonthlyFile(fileId, month, year) {
  const ss = SpreadsheetApp.openById(fileId);
  const sheets = ss.getSheets();
  const ignoredSheets = ["Master", "Template", "Sheet1"];
  
  const yearlyFolderName = `KINERJA HARIAN (${year})`;
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  let yearlyFolder;
  const folders = parentFolder.getFoldersByName(yearlyFolderName);
  if (folders.hasNext()) {
    yearlyFolder = folders.next();
  } else {
    yearlyFolder = parentFolder.createFolder(yearlyFolderName);
  }
  
  sheets.forEach(sheet => {
    const nip = sheet.getName();
    if (ignoredSheets.includes(nip)) return;
    
    // Get Name from C5
    let rawName = sheet.getRange("C5").getValue().toString();
    let name = rawName.replace(/:/g, "").trim();
    if (!name) {
      Logger.log("Could not find name for NIP " + nip + " in file " + month + " " + year);
      return;
    }
    
    const employeeFileName = `${nip} - ${name}`;
    let employeeSS;
    const employeeFiles = yearlyFolder.getFilesByName(employeeFileName);
    
    if (employeeFiles.hasNext()) {
      employeeSS = SpreadsheetApp.openById(employeeFiles.next().getId());
    } else {
      employeeSS = SpreadsheetApp.create(employeeFileName);
      const employeeFile = DriveApp.getFileById(employeeSS.getId());
      yearlyFolder.addFile(employeeFile);
      DriveApp.getRootFolder().removeFile(employeeFile);
    }
    
    const oldSheet = employeeSS.getSheetByName(month);
    if (oldSheet) {
      oldSheet.setName(month + "_old");
    }
    
    const newMonthSheet = sheet.copyTo(employeeSS);
    newMonthSheet.setName(month);
    
    if (oldSheet) {
      employeeSS.deleteSheet(oldSheet);
    }
    
    const defaultSheet = employeeSS.getSheetByName("Sheet1");
    if (defaultSheet && defaultSheet.getLastRow() === 0 && employeeSS.getSheets().length > 1) {
      employeeSS.deleteSheet(defaultSheet);
    }
    
    Logger.log(`Migrated ${nip} for ${month} ${year}`);
  });
}
