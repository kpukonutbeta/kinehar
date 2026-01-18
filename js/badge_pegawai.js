// --- LOCAL STORAGE LOGIC START ---
const STORAGE_KEY = 'saved_asn_selection';
let savedSelection = null;

try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        savedSelection = JSON.parse(storedData);
    }
} catch (e) {
    console.error("Error reading from localStorage", e);
}

// Jika ada data tersimpan, restore state UI segera
if (savedSelection && savedSelection.nip) {
    // Isi text badge pegawai
    if (savedSelection.nama) {
        $('#textName').text(savedSelection.nama);
    }

    if (savedSelection.nip) {
        $('#textNip').text(savedSelection.nip);
    }

    if (savedSelection.jabatan) {
        $('#textPosition').text(savedSelection.jabatan);
    }

    if (savedSelection.unitKerja) {
        $('#textDepartment').text(savedSelection.unitKerja);
    }
}