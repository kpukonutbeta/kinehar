$(document).ready(function () {
    let currentSelection = null;
    let manualOverride = false;

    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        $('#clockDisplay').html(`${hours}:${minutes}<span class="text-4xl opacity-50 ml-1">${seconds}</span>`);

        // Update Date Display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        $('#dateDisplay').text(now.toLocaleDateString('id-ID', options));

        if (!manualOverride) {
            autoSelectSession(now);
        }
    }

    function autoSelectSession(now) {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeValue = hours * 100 + minutes;

        let targetId = null;
        if (timeValue >= 600 && timeValue < 830) targetId = 'session-pagi';
        else if (timeValue >= 830 && timeValue < 1600) targetId = 'session-siang';
        else if (timeValue >= 1600 && timeValue <= 2359) targetId = 'session-sore';

        if (targetId && targetId !== currentSelection) {
            selectSession(targetId);
        }
    }
    function selectSession(sessionId) {
        currentSelection = sessionId;
        manualOverride = true;

        // Reset all cards to Blue (Unselected) state
        $('.attendance-card').removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
            .addClass('border-gray-100 dark:border-slate-800 scale-100');
        
        $('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
            .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');

        // Reset all status badges
        $('.attendance-card span[id^="status-"]').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600')
            .addClass('bg-slate-100 dark:bg-slate-800 text-slate-500');

        // Apply Orange (Selected) state to target
        const $target = $(`#${sessionId}`);
        $target.addClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
            .removeClass('border-gray-100 dark:border-slate-800 scale-100');
        
        $target.find('.session-icon').addClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
            .removeClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');

        // Apply Orange to selected badge
        $target.find('span[id^="status-"]').addClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600')
            .removeClass('bg-slate-100 dark:bg-slate-800 text-slate-500');
    }

    // Initial call
    updateClock();
    // Update every minute
    setInterval(updateClock, 1000);

    // --- SESSION CARD CLICK (RADIO BUTTON BEHAVIOR) ---
    $('.attendance-card').on('click', function () {
        manualOverride = true;
        selectSession(this.id);
    });

    // --- GEOLOCATION LOGIC ---
    const LOC_STORAGE_KEY = 'attendance_record_location';
    let userLocation = null;

    // Load initial state from localStorage
    const savedLocPref = localStorage.getItem(LOC_STORAGE_KEY);
    if (savedLocPref !== null) {
        $('#recordLocation').prop('checked', savedLocPref === 'true');
    }

    function detectLocation() {
        const isEnabled = $('#recordLocation').is(':checked');
        localStorage.setItem(LOC_STORAGE_KEY, isEnabled);

        if (!isEnabled) {
            $('#textLocation').text('Perekaman lokasi dinonaktifkan');
            $('#locationContainer').addClass('opacity-50');
            $('#locationMarker').removeClass('animate-bounce');
            userLocation = null;
            return;
        }

        $('#locationContainer').removeClass('opacity-50');
        $('#textLocation').text('Mencari lokasi...');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    userLocation = { lat, lng };
                    $('#textLocation').text(`${lat}, ${lng}`);
                    $('#locationMarker').addClass('animate-bounce');
                },
                (error) => {
                    console.error('Error getting location:', error);
                    let msg = 'Gagal mendeteksi lokasi';
                    if (error.code === 1) msg = 'Izin lokasi ditolak';
                    $('#textLocation').text(msg);
                    $('#locationMarker').removeClass('animate-bounce');
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            $('#textLocation').text('Browser tidak mendukung lokasi');
        }
    }

    // Toggle location detection
    $('#recordLocation').on('change', function() {
        detectLocation();
    });

    // Initial detection
    detectLocation();

    // --- BUTTON HANDLER ---
    $('#btnSimpan').on('click', function () {
        if (!currentSelection) {
            showAlert('Pilih Sesi', 'Silakan pilih sesi absensi terlebih dahulu.', 'error');
            return;
        }

        const isRecording = $('#recordLocation').is(':checked');
        if (isRecording && !userLocation) {
            showAlert('Lokasi Belum Tersedia', 'Tunggu sebentar sampai lokasi terdeteksi atau nonaktifkan record lokasi.', 'error');
            return;
        }

        // Get stored ASN data
        let savedSelection = null;
        try {
            const storedData = localStorage.getItem('saved_asn_selection');
            if (storedData) savedSelection = JSON.parse(storedData);
        } catch (e) {}

        if (!savedSelection || !savedSelection.nip) {
            showAlert('Pegawai Belum Dipilih', 'Silakan pilih pegawai terlebih dahulu di halaman Profil.', 'error');
            return;
        }

        const $btn = $(this);
        const originalContent = $btn.html();

        // Prepare Data
        const now = new Date();
        const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const formattedDate = `${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()}`;
        
        const formData = {
            action: "absensi",
            date: formattedDate,
            sesi: currentSelection.split('-')[1], // "pagi", "siang", "sore"
            nip: savedSelection.nip,
            name: savedSelection.nama,
            position: savedSelection.jabatan,
            location: isRecording && userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Tanpa Lokasi"
        };

        // Disable button & show loading
        $btn.prop('disabled', true).html('<span class="loader-spinner !w-5 !h-5 !border-2"></span> Menyimpan...');

        // POST to GAS via Proxy
        fetch("https://proxy.arti-pos.com", {
            method: "POST",
            body: JSON.stringify(formData),
            headers: { "Content-Type": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                let locMsg = isRecording && userLocation ? `Lokasi Anda telah direkam.` : 'Presensi disimpan tanpa data lokasi.';
                showAlert('Berhasil!', `Kehadiran ${formData.sesi.toUpperCase()} Anda telah berhasil dikirim. ${locMsg}`, 'success');
            } else {
                showAlert('Gagal Simpan', data.error || 'Terjadi kesalahan saat menyimpan data.', 'error');
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            showAlert('Error', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
        })
        .finally(() => {
            $btn.prop('disabled', false).html(originalContent);
        });
    });

    // --- MODAL LOGIC ---
    function showAlert(title, message, type = 'success') {
        const modal = $('#alertModal');
        const iconContainer = $('#alertIconContainer');
        const icon = $('#alertIcon');

        $('#alertTitle').text(title);
        $('#alertMessage').text(message);

        if (type === 'success') {
            iconContainer.addClass('bg-green-50 text-green-500').removeClass('bg-red-50 text-red-500');
            icon.text('check_circle');
        } else {
            iconContainer.addClass('bg-red-50 text-red-500').removeClass('bg-green-50 text-green-500');
            icon.text('error');
        }

        modal.removeClass('hidden');
        setTimeout(() => {
            modal.removeClass('opacity-0').find('> div').removeClass('scale-95').addClass('scale-100');
        }, 10);
    }

    function closeAlert() {
        const modal = $('#alertModal');
        modal.find('> div').addClass('scale-95').removeClass('scale-100');
        modal.addClass('opacity-0');
        setTimeout(() => {
            modal.addClass('hidden');
        }, 300);
    }

    $('#closeAlert').on('click', closeAlert);
    $('#alertModal').on('click', function (e) { if (e.target === this) closeAlert(); });
});
