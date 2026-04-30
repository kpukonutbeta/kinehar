$(document).ready(function () {
    let currentSelection = null;
    let manualOverride = false;
    let isLoadingData = false; // For general block
    let isSubmitting = false; // For saving process

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

        let suggestedId = null;
        if (timeValue >= 600 && timeValue < 830) suggestedId = 'session-pagi';
        else if (timeValue >= 830 && timeValue < 1600) suggestedId = 'session-siang';
        else if (timeValue >= 1600 && timeValue <= 2359) suggestedId = 'session-sore';

        // Check if suggested is already filled
        const isSuggestedFilled = suggestedId && $(`#${suggestedId}`).find('span[id^="status-"]').attr('data-absen') === 'true';

        let finalTargetId = null;

        if (suggestedId && !isSuggestedFilled) {
            finalTargetId = suggestedId;
        } else {
            // Find the first unfilled session
            const sessions = ['session-pagi', 'session-siang', 'session-sore'];
            for (const id of sessions) {
                const isAbsen = $(`#${id}`).find('span[id^="status-"]').attr('data-absen') === 'true';
                if (!isAbsen) {
                    finalTargetId = id;
                    break;
                }
            }
        }

        if (finalTargetId !== currentSelection) {
            if (finalTargetId) {
                selectSession(finalTargetId);
            } else {
                // Clear selection if everything is filled
                currentSelection = null;
                $('.attendance-card').removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
                    .addClass('border-gray-100 dark:border-slate-800 scale-100');
                $('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
                    .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');
                $('.attendance-card span[id^="status-"]').each(function() {
                    const isAbsen = $(this).attr('data-absen') === 'true';
                    if (isAbsen) {
                        $(this).addClass('bg-green-50 dark:bg-green-900/40 text-green-600').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600');
                    } else {
                        $(this).addClass('bg-slate-100 dark:bg-slate-800 text-slate-500').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600');
                    }
                });
                validateSaveButton();
            }
        }
    }

    function loadASNInfo() {
        try {
            const storedData = localStorage.getItem('saved_asn_selection');
            if (storedData) {
                const asn = JSON.parse(storedData);
                $('#textName').text(asn.nama);
                $('#textNip').text(asn.nip);
                
                // Set initials for avatar
                const initials = asn.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                $('#avatarText').text(initials);
            }
        } catch (e) {
            console.error('Error loading ASN info:', e);
        }
    }

    function loadAttendanceStatus() {
        const storedData = localStorage.getItem('saved_asn_selection');
        if (!storedData) {
            $('#page-loader').fadeOut();
            return;
        }
        
        const asn = JSON.parse(storedData);
        const now = new Date();
        const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const formattedDate = `${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()}`;

        // 1. Try to load from Cache first (Instant UI)
        const CACHE_KEY = `absensi_cache_${asn.nip}`;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const cacheData = JSON.parse(cached);
                // Only use cache if it's for today
                if (cacheData.date === formattedDate) {
                    updateBadgeStatus('pagi', cacheData.status.pagi);
                    updateBadgeStatus('siang', cacheData.status.siang);
                    updateBadgeStatus('sore', cacheData.status.sore);
                    validateSaveButton();
                    autoSelectSession(new Date()); // Auto select instantly from cache
                }
            } catch (e) {
                console.error("Cache error:", e);
            }
        }

        // 2. Fetch Latest from Server (Background Sync)
        isLoadingData = true; // Still block selection during first load
        const url = `https://proxy.arti-pos.com?action=absensi_status&date=${formattedDate}&nip=${asn.nip}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const status = data.data;
                    updateBadgeStatus('pagi', status.pagi);
                    updateBadgeStatus('siang', status.siang);
                    updateBadgeStatus('sore', status.sore);
                    
                    // Save to Cache
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        date: formattedDate,
                        status: status
                    }));

                    // After loading, check if current selection is valid
                    isLoadingData = false; 
                    validateSaveButton();
                    autoSelectSession(new Date());
                }
            })
            .catch(err => {
                console.error('Error loading status:', err);
                isLoadingData = false;
                validateSaveButton();
            })
            .finally(() => {
                $('#page-loader').fadeOut();
            });
    }

    function validateSaveButton() {
        if (!currentSelection) {
            $('#btnSimpan').prop('disabled', true)
                .addClass('bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed')
                .removeClass('bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-200');
            return;
        }

        const isAbsen = $(`#${currentSelection}`).find('span[id^="status-"]').attr('data-absen') === 'true';
        // Only block if already absent or if currently SUBMITTING
        if (isAbsen || isSubmitting) {
            $('#btnSimpan').prop('disabled', true)
                .addClass('bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed')
                .removeClass('bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-200');
        } else {
            $('#btnSimpan').prop('disabled', false)
                .removeClass('bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed')
                .addClass('bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-200');
        }
    }

    function updateBadgeStatus(sesi, time) {
        const $badge = $(`#status-${sesi}`);
        const $infoBtn = $(`#info-${sesi}`);
        const $timeDisplay = $(`#time-${sesi}`);
        const $card = $(`#session-${sesi}`);

        if (time && time.trim() !== "" && time !== "undefined") {
            $badge.text('Sudah Absen').attr('data-absen', 'true');
            $infoBtn.removeClass('hidden');
            $timeDisplay.text(time);
            $card.addClass('cursor-not-allowed').css('pointer-events', 'auto');
            
            // If this session was selected but now we know it's filled, UNSELECT it
            if (currentSelection === `session-${sesi}`) {
                currentSelection = null;
                $card.removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
                     .addClass('border-gray-100 dark:border-slate-800 scale-100');
                $card.find('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
                     .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');
                $badge.addClass('bg-green-50 dark:bg-green-900/40 text-green-600').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600');
            } else {
                $badge.removeClass('bg-slate-100 dark:bg-slate-800 text-slate-500').addClass('bg-green-50 dark:bg-green-900/40 text-green-600');
            }
        } else {
            $badge.text('Belum Absen').attr('data-absen', 'false');
            $infoBtn.addClass('hidden');
            $card.removeClass('cursor-not-allowed').css('pointer-events', 'auto');
            
            if (currentSelection !== `session-${sesi}`) {
                $badge.addClass('bg-slate-100 dark:bg-slate-800 text-slate-500').removeClass('bg-green-50 dark:bg-green-900/40 text-green-600');
            }
        }
    }

    function selectSession(sessionId) {
        if (isLoadingData) return;

        // Prevent selection if already recorded
        const isAbsen = $(`#${sessionId}`).find('span[id^="status-"]').attr('data-absen') === 'true';
        if (isAbsen) return;

        currentSelection = sessionId;
        manualOverride = true;

        // Reset all cards
        $('.attendance-card').removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
            .addClass('border-gray-100 dark:border-slate-800 scale-100');
        
        $('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
            .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');

        // Reset all status badges based on their 'data-absen' state
        $('.attendance-card span[id^="status-"]').each(function() {
            const isAbsen = $(this).attr('data-absen') === 'true';
            $(this).removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600');
            
            if (isAbsen) {
                $(this).addClass('bg-green-50 dark:bg-green-900/40 text-green-600').removeClass('bg-slate-100 dark:bg-slate-800 text-slate-500');
            } else {
                $(this).addClass('bg-slate-100 dark:bg-slate-800 text-slate-500').removeClass('bg-green-50 dark:bg-green-900/40 text-green-600');
            }
        });

        // Apply Orange (Selected) state to target
        const $target = $(`#${sessionId}`);
        $target.addClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
            .removeClass('border-gray-100 dark:border-slate-800 scale-100');
        
        $target.find('.session-icon').addClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
            .removeClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');

        // Apply Orange to selected badge
        $target.find('span[id^="status-"]').addClass('bg-orange-50 dark:bg-orange-900/40 text-orange-600')
            .removeClass('bg-slate-100 dark:bg-slate-800 text-slate-500 bg-green-50 dark:bg-green-900/40 text-green-600');
        
        validateSaveButton();
    }

    // Initial calls
    loadASNInfo();
    updateClock();
    loadAttendanceStatus();
    
    // Update clock every second
    setInterval(updateClock, 1000);

    // --- SESSION CARD CLICK (RADIO BUTTON BEHAVIOR) ---
    $('.attendance-card').on('click', function (e) {
        if (isLoadingData) return;

        // If clicking info button, don't trigger card selection
        if ($(e.target).closest('button[id^="info-"]').length) return;

        const isAbsen = $(this).find('span[id^="status-"]').attr('data-absen') === 'true';
        if (isAbsen) return;

        manualOverride = true;
        selectSession(this.id);
    });

    // --- GEOLOCATION LOGIC ---
    const LOC_STORAGE_KEY = 'attendance_record_location';
    let userLocation = null;

    // Load initial state from localStorage
    const savedLocPref = localStorage.getItem(LOC_STORAGE_KEY);
    if (savedLocPref !== null) {
        const prefValue = savedLocPref === 'true';
        $('#recordLocation').prop('checked', prefValue);
    }

    function detectLocation() {
        const isEnabled = $('#recordLocation').is(':checked');
        localStorage.setItem(LOC_STORAGE_KEY, isEnabled);

        if (!isEnabled) {
            $('#locationContainer').addClass('hidden');
            $('#locationMarker').removeClass('animate-bounce');
            userLocation = null;
            return;
        }

        $('#locationContainer').removeClass('hidden');
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
        if (isSubmitting) return;
        if (!currentSelection) {
            showAlert('Pilih Sesi', 'Silakan pilih sesi absensi terlebih dahulu.', 'error');
            return;
        }

        const isAbsen = $(`#${currentSelection}`).find('span[id^="status-"]').attr('data-absen') === 'true';
        if (isAbsen) {
            showAlert('Sudah Absen', 'Sesi ini sudah terisi.', 'warning');
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
        isSubmitting = true;
        validateSaveButton();

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
                // Reload status to reflect changes
                loadAttendanceStatus();
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
            isSubmitting = false;
            validateSaveButton();
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
            iconContainer.addClass('bg-green-50 text-green-500').removeClass('bg-red-50 text-red-500 bg-orange-50 text-orange-500');
            icon.text('check_circle');
        } else if (type === 'warning') {
            iconContainer.addClass('bg-orange-50 text-orange-500').removeClass('bg-green-50 text-green-500 bg-red-50 text-red-500');
            icon.text('warning');
        } else {
            iconContainer.addClass('bg-red-50 text-red-500').removeClass('bg-green-50 text-green-500 bg-orange-50 text-orange-500');
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
