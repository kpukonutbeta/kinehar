function handlePost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === "absensi") {
    saveAbsensi(data);
  } else if (action === "kinerja") {
    saveKinerja(data);
  } else {
    return createCorsResponse({ error: "Aksi POST tidak dikenal", success: false });
  }

  return createCorsResponse({ success: true });
}
