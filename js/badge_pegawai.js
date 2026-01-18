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

// --- HELPER FUNCTIONS ---
function getInitials(name) {
    if (!name) return '--';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
    if (!name) return '#3b82f6';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function updateAvatar(nama) {
    const initials = getInitials(nama);
    const color = getAvatarColor(nama);

    $('#avatarText').text(initials);
    $('#avatarContainer').css('background-color', color);
}

// Jika ada data tersimpan, restore state UI segera
if (savedSelection && savedSelection.nip) {
    // Isi text badge pegawai
    if (savedSelection.nama) {
        $('#textName').text(savedSelection.nama);
        updateAvatar(savedSelection.nama);
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