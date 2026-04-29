function handleGet(e) {
  const action = e.parameter.action;

  if (action === "asnlist") {
    return createCorsResponse(
      getASNList()
  );
  } else if (action === "kinerja") {
    return createCorsResponse(
      {success: true, data: getKinerjaByDate(e.parameter.date, e.parameter.nip)}
    );
  } else if (action === "kinerja_count") {
    return createCorsResponse(
      {success: true, data: getWorkDayCounts(e.parameter.date)}
    );
  } else if (action === "absensi_status") {
    return createCorsResponse(
      {success: true, data: getAbsensiStatus(e.parameter.date, e.parameter.nip)}
    );
  } else {
    return createCorsResponse({ error: "Aksi GET tidak dikenal", success: false });
  }
}
