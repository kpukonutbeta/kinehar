$(document).ready(function () {
    let currentSelection = null;
    let manualOverride = false;
    let isLoadingData = false; // For general block
    let isSubmitting = false; // For saving process
    let activeSpecialStatus = null; // Storing today's active special status

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
        // If a special status is already filled, do not auto select anything
        let hasSpecial = false;
        const specialSessions = ['session-cuti', 'session-izin', 'session-sakit', 'session-dinas_luar', 'session-tugas_belajar', 'session-tugas_luar'];
        for (const id of specialSessions) {
            const isAbsen = $(`#${id}`).find('span[id^="status-"]').attr('data-absen') === 'true';
            if (isAbsen) {
                hasSpecial = true;
                break;
            }
        }
        if (hasSpecial) {
            currentSelection = null;
            $('.attendance-card').removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
                .addClass('border-gray-100 dark:border-slate-800 scale-100');
            $('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
                .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');
            validateSaveButton();
            updateLocationVisibility();
            return;
        }

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
                updateLocationVisibility();
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

        function handleStatusDisplay(status) {
            updateBadgeStatus('pagi', status.pagi);
            updateBadgeStatus('siang', status.siang);
            updateBadgeStatus('sore', status.sore);
            updateSpecialBadgeStatus('cuti', status.cuti);
            updateSpecialBadgeStatus('izin', status.izin);
            updateSpecialBadgeStatus('sakit', status.sakit);
            updateSpecialBadgeStatus('dinas_luar', status.dinas_luar);
            updateSpecialBadgeStatus('tugas_belajar', status.tugas_belajar);
            updateSpecialBadgeStatus('tugas_luar', status.tugas_luar);

            let activeStatusText = "";
            activeSpecialStatus = null; // reset
            if (status.cuti && status.cuti.trim() !== "") { activeStatusText = "Cuti"; activeSpecialStatus = "cuti"; }
            else if (status.izin && status.izin.trim() !== "") { activeStatusText = "Izin"; activeSpecialStatus = "izin"; }
            else if (status.sakit && status.sakit.trim() !== "") { activeStatusText = "Sakit"; activeSpecialStatus = "sakit"; }
            else if (status.dinas_luar && status.dinas_luar.trim() !== "") { activeStatusText = "Dinas Luar"; activeSpecialStatus = "dinas_luar"; }
            else if (status.tugas_belajar && status.tugas_belajar.trim() !== "") { activeStatusText = "Tugas Belajar"; activeSpecialStatus = "tugas_belajar"; }
            else if (status.tugas_luar && status.tugas_luar.trim() !== "") { activeStatusText = "Tugas Luar"; activeSpecialStatus = "tugas_luar"; }

            if (activeStatusText) {
                switchTab('tidak-hadir');
            } else {
                switchTab('hadir');
            }
        }

        // 1. Try to load from Cache first (Instant UI)
        const CACHE_KEY = `absensi_cache_${asn.nip}`;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const cacheData = JSON.parse(cached);
                // Only use cache if it's for today
                if (cacheData.date === formattedDate) {
                    handleStatusDisplay(cacheData.status);
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
                    handleStatusDisplay(status);
                    
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
                .removeClass('bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-200')
                .html('<span class="material-symbols-outlined text-xl">check_circle</span> Simpan Kehadiran');
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

        if (!isSubmitting) {
            let btnText = "Simpan Kehadiran";
            const sesiName = currentSelection.split('-')[1];
            if (sesiName === "pagi") btnText = "Simpan Absen Pagi";
            else if (sesiName === "siang") btnText = "Simpan Absen Siang";
            else if (sesiName === "sore") btnText = "Simpan Absen Sore";
            else if (sesiName === "cuti") btnText = "Simpan Status Cuti";
            else if (sesiName === "izin") btnText = "Simpan Status Izin";
            else if (sesiName === "sakit") btnText = "Simpan Status Sakit";
            else if (sesiName === "dinas_luar") btnText = "Simpan Dinas Luar";
            else if (sesiName === "tugas_belajar") btnText = "Simpan Tugas Belajar";
            else if (sesiName === "tugas_luar") btnText = "Simpan Tugas Luar";
            
            $('#btnSimpan').html(`<span class="material-symbols-outlined text-xl">check_circle</span> ${btnText}`);
        }
    }

    function updateSpecialBadgeStatus(sesi, hasStatus) {
        const $badge = $(`#status-${sesi}`);
        const $card = $(`#session-${sesi}`);

        if (hasStatus && hasStatus.trim() !== "" && hasStatus !== "undefined") {
            $badge.text('Aktif').attr('data-absen', 'true');
            $card.addClass('cursor-not-allowed').css('pointer-events', 'auto');
            
            // Apply Green color styling directly
            $badge.addClass('bg-green-50 dark:bg-green-900/40 text-green-600')
                  .removeClass('bg-slate-100 dark:bg-slate-800 text-slate-500 bg-orange-50 dark:bg-orange-900/40 text-orange-600');
            $card.removeClass('border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] active')
                 .addClass('border-gray-100 dark:border-slate-800 scale-100');
            $card.find('.session-icon').removeClass('bg-orange-50 dark:bg-orange-900/40 text-orange-500')
                 .addClass('bg-blue-50 dark:bg-blue-900/20 text-blue-600');

            if (currentSelection === `session-${sesi}`) {
                currentSelection = null;
            }
        } else {
            $badge.text('').attr('data-absen', 'false');
            $card.removeClass('cursor-not-allowed').css('pointer-events', 'auto');
            
            if (currentSelection !== `session-${sesi}`) {
                $badge.addClass('bg-slate-100 dark:bg-slate-800 text-slate-500')
                      .removeClass('bg-green-50 dark:bg-green-900/40 text-green-600 bg-orange-50 dark:bg-orange-900/40 text-orange-600');
            }
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
        updateLocationVisibility();
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

        updateLocationVisibility();

        if (!isEnabled) {
            $('#locationMarker').removeClass('animate-bounce');
            userLocation = null;
            return;
        }

        updateLocationVisibility(); // Ensure map gets shown/hidden appropriately
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
            showAlert('Sudah Absen / Aktif', 'Status ini sudah terisi.', 'warning');
            return;
        }

        const sesiName = currentSelection.split('-')[1];
        const isRecording = $('#recordLocation').is(':checked');
        const bypassLocation = ["cuti", "izin", "sakit", "tugas_belajar"].includes(sesiName);

        if (isRecording && !userLocation && !bypassLocation) {
            showAlert('Lokasi Belum Tersedia', 'Tunggu sebentar sampai lokasi terdeteksi atau nonaktifkan record lokasi.', 'error');
            return;
        }

        const isRegularSesi = ["pagi", "siang", "sore"].includes(sesiName);
        if (isRegularSesi && activeSpecialStatus) {
            const statusLabel = {
                cuti: "Cuti",
                izin: "Izin",
                sakit: "Sakit",
                dinas_luar: "Dinas Luar",
                tugas_belajar: "Tugas Belajar",
                tugas_luar: "Tugas Luar"
            }[activeSpecialStatus] || activeSpecialStatus;

            showConfirm(`Hari ini Anda tercatat sedang ${statusLabel}. Apakah Anda ingin membatalkan status tersebut dan melakukan absensi?`, function() {
                submitAttendance(sesiName, isRecording, bypassLocation, true);
            });
            return;
        }

        // If it is a special status session, open the Keterangan Detail modal
        if (!isRegularSesi) {
            showKeteranganDetailModal(sesiName, isRecording, bypassLocation);
            return;
        }

        submitAttendance(sesiName, isRecording, bypassLocation, false);
    });

    function submitAttendance(sesiName, isRecording, bypassLocation, clearSpecial, keterangan = "", jenisCuti = "", dates = "") {
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

        const $btn = $('#btnSimpan');
        const originalContent = $btn.html();

        // Prepare Data
        const now = new Date();
        const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const formattedDate = `${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()}`;
        
        const formData = {
            action: "absensi",
            date: formattedDate,
            sesi: sesiName, // "pagi", "siang", "sore", "cuti", "izin", "sakit", "dinas_luar", "tugas_belajar", "tugas_luar"
            nip: savedSelection.nip,
            name: savedSelection.nama,
            position: savedSelection.jabatan,
            location: isRecording && userLocation && !bypassLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Tanpa Lokasi",
            clearSpecial: clearSpecial,
            keterangan: keterangan,
            jenisCuti: jenisCuti,
            dates: dates
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
                let locMsg = isRecording && userLocation && !bypassLocation ? `Lokasi Anda telah direkam.` : 'Presensi disimpan tanpa data lokasi.';
                showAlert('Berhasil!', `Kehadiran ${formData.sesi.toUpperCase()} Anda telah berhasil dikirim. ${locMsg}`, 'success');
                // Reload status to reflect changes
                loadAttendanceStatus();
            } else {
                showAlert('Gagal Simpan', data.error || 'Terjadi kesalahan saat menyimpan data.', 'error');
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            showAlert('Koneksi Gagal', 'Gagal menghubungi server. Periksa koneksi internet Anda.', 'error');
        })
        .finally(() => {
            $btn.prop('disabled', false).html(originalContent);
            isSubmitting = false;
            validateSaveButton();
        });
    }

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

    // --- TAB SWITCHER LOGIC ---
    function updateLocationVisibility() {
        const isEnabled = $('#recordLocation').is(':checked');
        const activeTab = $('#container-hadir').is(':visible') ? 'hadir' : 'tidak-hadir';
        const sesiName = currentSelection ? currentSelection.split('-')[1] : null;
        const bypassLocation = ["cuti", "izin", "sakit", "tugas_belajar"].includes(sesiName);
        
        const showToggle = (activeTab === 'hadir' || (currentSelection && !bypassLocation));
        const showMap = (showToggle && isEnabled);

        if (showToggle) {
            $('#recordLocation').closest('label').parent().removeClass('hidden');
        } else {
            $('#recordLocation').closest('label').parent().addClass('hidden');
        }

        if (showMap) {
            $('#locationContainer').removeClass('hidden');
        } else {
            $('#locationContainer').addClass('hidden');
        }
    }

    function switchTab(tabId) {
        if (tabId === 'hadir') {
            $('#tab-hadir').addClass('bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-white').removeClass('text-slate-500 dark:text-slate-400 bg-transparent');
            $('#tab-tidak-hadir').removeClass('bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-white').addClass('text-slate-500 dark:text-slate-400 bg-transparent');
            $('#container-hadir').removeClass('hidden');
            $('#container-tidak-hadir').addClass('hidden').removeClass('grid');
            
            // Clear selection if it's a special session
            if (currentSelection && !['session-pagi', 'session-siang', 'session-sore'].includes(currentSelection)) {
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
            }
            autoSelectSession(new Date());
        } else {
            $('#tab-tidak-hadir').addClass('bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-white').removeClass('text-slate-500 dark:text-slate-400 bg-transparent');
            $('#tab-hadir').removeClass('bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-white').addClass('text-slate-500 dark:text-slate-400 bg-transparent');
            $('#container-tidak-hadir').removeClass('hidden').addClass('grid');
            $('#container-hadir').addClass('hidden');
            
            // Clear selection if it's a daily session (Pagi, Siang, Sore)
            if (currentSelection && ['session-pagi', 'session-siang', 'session-sore'].includes(currentSelection)) {
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
            }
            validateSaveButton();
        }
        updateLocationVisibility();
    }

    $('#tab-hadir').on('click', function() {
        switchTab('hadir');
    });

    $('#tab-tidak-hadir').on('click', function() {
        switchTab('tidak-hadir');
    });

    // --- CONFIRMATION DIALOG LOGIC ---
    let confirmCallback = null;

    function showConfirm(message, callback) {
        $('#confirmMessage').text(message);
        confirmCallback = callback;
        
        const modal = $('#confirmModal');
        modal.removeClass('hidden');
        setTimeout(() => {
            modal.removeClass('opacity-0').find('> div').removeClass('scale-95').addClass('scale-100');
        }, 10);
    }

    function closeConfirm() {
        const modal = $('#confirmModal');
        modal.find('> div').addClass('scale-95').removeClass('scale-100');
        modal.addClass('opacity-0');
        setTimeout(() => {
            modal.addClass('hidden');
        }, 300);
        confirmCallback = null;
    }

    $('#cancelConfirm').on('click', closeConfirm);
    $('#okConfirm').on('click', function() {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });
    $('#confirmModal').on('click', function (e) { if (e.target === this) closeConfirm(); });

    // --- KETERANGAN DETAIL MODAL LOGIC ---
    function showKeteranganDetailModal(sesiName, isRecording, bypassLocation) {
        // Reset form inputs
        $('#txtKeterangan').val('');
        $('#selectJenisCuti').val('Cuti Tahunan');

        // Initialize Flatpickr for multiple dates selection
        if (window.detailDatePicker) {
            window.detailDatePicker.destroy();
        }
        
        // Disable weekend days (Saturday and Sunday)
        const todayLocal = new Date();
        let defaultDates = [];
        if (todayLocal.getDay() !== 0 && todayLocal.getDay() !== 6) {
            defaultDates.push(todayLocal);
        }

        window.detailDatePicker = flatpickr("#inputTanggalMultiple", {
            mode: "multiple",
            dateFormat: "j F Y",
            locale: "id",
            disable: [
                function(date) {
                    // Disable Saturday (6) and Sunday (0)
                    return (date.getDay() === 0 || date.getDay() === 6);
                }
            ],
            defaultDate: defaultDates
        });

        // Determine title
        const statusLabel = {
            cuti: "Cuti",
            izin: "Izin",
            sakit: "Sakit",
            dinas_luar: "Dinas Luar",
            tugas_belajar: "Tugas Belajar",
            tugas_luar: "Tugas Luar"
        }[sesiName] || sesiName;

        $('#ketModalTitle').text(`Detail Laporan ${statusLabel}`);

        // Set dynamic placeholder & label for description
        let descPlaceholder = "Masukkan keterangan tambahan...";
        if (sesiName === "sakit") {
            descPlaceholder = "Misal: Demam, Sakit Kepala, dll.";
        } else if (sesiName === "dinas_luar" || sesiName === "tugas_luar") {
            descPlaceholder = "Misal: Dinas di Instansi X, Monitoring Y, dll.";
        } else if (sesiName === "izin") {
            descPlaceholder = "Misal: Urusan Keluarga, dll.";
        } else if (sesiName === "tugas_belajar") {
            descPlaceholder = "Misal: Kuliah di Universitas Z, dll.";
        }
        $('#txtKeterangan').attr('placeholder', descPlaceholder);

        // Show/hide Cuti type container
        if (sesiName === "cuti") {
            $('#cutiTypeContainer').removeClass('hidden');
            $('#lblKeterangan').text('Alasan / Keterangan Cuti');
        } else {
            $('#cutiTypeContainer').addClass('hidden');
            $('#lblKeterangan').text('Deskripsi / Keterangan');
        }

        // Configure click handlers for modal buttons
        $('#submitKetModal').off('click').on('click', function() {
            const datesVal = $('#inputTanggalMultiple').val();

            if (!datesVal || datesVal.trim() === "") {
                showAlert('Pilih Tanggal', 'Silakan pilih minimal satu tanggal.', 'warning');
                return;
            }

            const keterangan = $('#txtKeterangan').val().trim();
            const jenisCuti = sesiName === "cuti" ? $('#selectJenisCuti').val() : "";

            closeKeteranganDetailModal();
            submitAttendance(sesiName, isRecording, bypassLocation, false, keterangan, jenisCuti, datesVal);
        });

        $('#cancelKetModal').off('click').on('click', function() {
            closeKeteranganDetailModal();
        });

        // Open Modal
        const modal = $('#keteranganDetailModal');
        modal.removeClass('hidden');
        setTimeout(() => {
            modal.removeClass('opacity-0').find('> div').removeClass('scale-95').addClass('scale-100');
        }, 10);
    }

    function closeKeteranganDetailModal() {
        const modal = $('#keteranganDetailModal');
        modal.find('> div').addClass('scale-95').removeClass('scale-100');
        modal.addClass('opacity-0');
        setTimeout(() => {
            modal.addClass('hidden');
        }, 300);
    }

    $('#keteranganDetailModal').on('click', function (e) { if (e.target === this) closeKeteranganDetailModal(); });
});
