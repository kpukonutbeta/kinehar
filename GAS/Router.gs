function doGet(e) {
  Logger.log("GET dipanggil");
  return handleGet(e);
}

function doPost(e) {
  Logger.log("POST dipanggil");
  return handlePost(e);
}

function doOptions(e) {
  Logger.log("OPTIONS dipanggil");
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
