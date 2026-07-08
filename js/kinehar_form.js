let selectedDate = new Date();

const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Helper function to update Date display with Overlay
function updateDateDisplay(date) {
    const d = date.getDate();
    const m = bulanIndo[date.getMonth()];
    const y = date.getFullYear();
    const dayName = hariIndo[date.getDay()];

    // Value: "15 Januari 2026"
    const dateValue = `${d} ${m} ${y}`;
    // Overlay: "Kamis."
    const dayText = `${dayName}, `;

    // Set Value
    $("#mobileDatePicker").val(dateValue);

    // Set Overlay
    $("#dayPrefixDisplay").text(dayText);
}

// Calculate constraints
const today = new Date();
const minDate = new Date();
minDate.setFullYear(today.getFullYear() - 1);

const maxDate = new Date();
maxDate.setFullYear(today.getFullYear() + 1);

$("#mobileDatePicker").AnyPicker(
    {
        mode: "datetime",
        dateTimeFormat: "d MMMM yyyy",
        theme: "iOS",
        minValue: minDate,
        maxValue: maxDate,
        onSetOutput: function (val) {
            const parts = val.split(" ");
            const bulan = {
                "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
                "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
            };

            const tanggal = parseInt(parts[0]);
            const namaBulan = parts[1];
            const tahun = parseInt(parts[2]);
            const waktu = parts[3] || "00:00";
            const [jam, menit] = waktu.split(":").map(Number);

            const d = new Date(tahun, bulan[namaBulan], tanggal, jam, menit);

            updateDateDisplay(d);

            var labelTanggal = document.getElementById("labelTanggal");
            if (labelTanggal) labelTanggal.textContent = hariIndo[d.getDay()];
        }
    });


$(document).ready(function () {
    // Calendar state variables
    let activeYear = new Date().getFullYear();
    let activeMonth = new Date().getMonth(); // 0-11
    let calendarEvents = {}; // Mapping "YYYY-MM-DD" -> array of activities

    // Check for selected employee
    const STORAGE_KEY = 'saved_asn_selection';
    let savedSelection = null;
    const formContainer = $("#mobileForm");

    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            savedSelection = JSON.parse(storedData);
        }
    } catch (e) {
        console.error("Error reading from localStorage", e);
    }

    if (!savedSelection || !savedSelection.nip) {
        $('#viewModeTabs').addClass('hidden');
        $('#calendarViewContainer').addClass('hidden');
        $('#formViewContainer').html(`
            <div class="text-center py-8">
                <div class="mb-4">
                    <i class="fas fa-user-times text-4xl text-gray-300"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">Pegawai Belum Dipilih</h3>
                <p class="text-gray-500 text-sm mb-6">Silakan pilih pegawai terlebih dahulu di halaman Profil untuk melanjutkan pengisian kinerja.</p>
                <a href="./profile.html" class="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                    Pilih Pegawai
                </a>
            </div>
        `).removeClass('hidden');
        return; // Stop execution
    }

    // Set default date to today
    const now = new Date();
    updateDateDisplay(now);

    // Trigger date picker when container is clicked
    $("#dateContainer").on("click", function () {
        $("#mobileDatePicker").trigger("click");
    });

    // --- Autosave Logic ---
    const DRAFT_KEY = 'kinehar_draft';

    function loadDraft() {
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const data = JSON.parse(draft);
                if (data.comments) $("#mobileComments").val(data.comments);
                if (data.feedback) $("#mobileFeedback").val(data.feedback);
            }
        } catch (e) { console.error("Error loading draft", e); }
    }

    function saveDraft() {
        const data = {
            comments: $("#mobileComments").val(),
            feedback: $("#mobileFeedback").val()
        };
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        } catch (e) { }
    }

    loadDraft();

    $("#mobileComments, #mobileFeedback").on('input', function () {
        saveDraft();
    });

    $("#resetButton").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        $("#mobileComments").val('');
        $("#mobileFeedback").val('');

        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch (e) { }

        showMobileToast("Formulir dan draft di-reset");
    });

    // --- VIEW MODE SWITCHER LOGIC ---
    function switchViewMode(mode) {
        if (mode === 'calendar') {
            $('#tab-calendar')
                .addClass('text-slate-800 dark:text-white bg-white dark:bg-slate-700 shadow-sm')
                .removeClass('text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-0 bg-transparent');
            
            $('#tab-form')
                .removeClass('text-slate-800 dark:text-white bg-white dark:bg-slate-700 shadow-sm')
                .addClass('text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-0 bg-transparent');
            
            $('#calendarViewContainer').removeClass('hidden');
            $('#formViewContainer').addClass('hidden');
            
            localStorage.setItem('kinerja_view_pref', 'calendar');
            fetchMonthEvents(); // Load monthly dots
        } else {
            $('#tab-form')
                .addClass('text-slate-800 dark:text-white bg-white dark:bg-slate-700 shadow-sm')
                .removeClass('text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-0 bg-transparent');
            
            $('#tab-calendar')
                .removeClass('text-slate-800 dark:text-white bg-white dark:bg-slate-700 shadow-sm')
                .addClass('text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-0 bg-transparent');
            
            $('#formViewContainer').removeClass('hidden');
            $('#calendarViewContainer').addClass('hidden');
            
            localStorage.setItem('kinerja_view_pref', 'form');
        }
    }

    $('#tab-calendar').on('click', function() { switchViewMode('calendar'); });
    $('#tab-form').on('click', function() { switchViewMode('form'); });

    // Initialize View Mode
    const viewPref = localStorage.getItem('kinerja_view_pref') || 'calendar';
    switchViewMode(viewPref);


    // --- CALENDAR GRID RENDER & LOGIC ---

    function checkNavigationLimits() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Max month is currentMonth of currentYear
        if (activeYear > currentYear || (activeYear === currentYear && activeMonth >= currentMonth)) {
            $('#nextMonthBtn').prop('disabled', true).addClass('opacity-30 pointer-events-none');
        } else {
            $('#nextMonthBtn').prop('disabled', false).removeClass('opacity-30 pointer-events-none');
        }

        // Min month is January 2025 (2025-0)
        if (activeYear < 2025 || (activeYear === 2025 && activeMonth <= 0)) {
            $('#prevMonthBtn').prop('disabled', true).addClass('opacity-30 pointer-events-none');
        } else {
            $('#prevMonthBtn').prop('disabled', false).removeClass('opacity-30 pointer-events-none');
        }
    }

    function renderCalendar() {
        checkNavigationLimits();
        
        const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        $('#currentMonthYear').text(`${monthNames[activeMonth]} ${activeYear}`);

        const grid = $('#calendarGrid');
        grid.empty();

        // Monday-first: shift getDay() so Mon=0, Tue=1, ..., Sat=5, Sun=6
        const rawFirstDay = new Date(activeYear, activeMonth, 1).getDay(); // 0=Sun
        const firstDay = (rawFirstDay + 6) % 7; // Mon-first offset

        // Total days in active month
        const totalDays = new Date(activeYear, activeMonth + 1, 0).getDate();
        // Total days in previous month
        const prevTotalDays = new Date(activeYear, activeMonth, 0).getDate();

        // Trailing days from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = prevTotalDays - i;
            const prevMonthIndex = activeMonth === 0 ? 11 : activeMonth - 1;
            const prevYear = activeMonth === 0 ? activeYear - 1 : activeYear;
            const dateStr = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dow = new Date(prevYear, prevMonthIndex, dayNum).getDay();
            grid.append(createDayCell(dayNum, true, dateStr, false, dow));
        }

        // Days of current month
        const today = new Date();
        for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
            const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = (today.getDate() === dayNum && today.getMonth() === activeMonth && today.getFullYear() === activeYear);
            const dow = new Date(activeYear, activeMonth, dayNum).getDay();
            grid.append(createDayCell(dayNum, false, dateStr, isToday, dow));
        }

        // Leading days from next month to fill grid (42 cells total)
        const totalCellsFilled = firstDay + totalDays;
        const remainingCells = 42 - totalCellsFilled;
        for (let i = 1; i <= remainingCells; i++) {
            const nextMonthIndex = activeMonth === 11 ? 0 : activeMonth + 1;
            const nextYear = activeMonth === 11 ? activeYear + 1 : activeYear;
            const dateStr = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dow = new Date(nextYear, nextMonthIndex, i).getDay();
            grid.append(createDayCell(i, true, dateStr, false, dow));
        }
    }

    function createDayCell(dayNum, isPrevNext, dateStr, isToday = false, dow = -1) {
        const cell = $('<div></div>')
            .addClass('calendar-day-cell')
            .text(dayNum)
            .attr('data-date', dateStr);

        if (isPrevNext) {
            cell.addClass('prev-next-month');
        }
        if (isToday) {
            cell.addClass('today-highlight');
        }
        // Saturday (6) and Sunday (0) → red text
        if (dow === 0 || dow === 6) {
            cell.addClass('weekend-day');
        }

        // Add dot indicator if this day has activities
        if (calendarEvents[dateStr] && calendarEvents[dateStr].length > 0) {
            cell.append('<span class="dot-indicator"></span>');
        }

        // Click handler
        cell.on('click', function() {
            onDayClick(dateStr);
        });

        return cell;
    }

    function onDayClick(dateStr) {
        const parts = dateStr.split("-");
        const year = parseInt(parts[0]);
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const d = new Date(year, monthIdx, day);
        
        const dayName = hariIndo[d.getDay()];
        const formatted = `${day} ${bulanIndo[monthIdx]} ${year}`;
        
        $('#historyModalDayName').text(dayName.toUpperCase());
        $('#historyModalDate').text(formatted);
        
        const list = $('#historyModalList').empty();
        const dayEvents = calendarEvents[dateStr] || [];
        
        if (dayEvents.length > 0) {
            dayEvents.forEach((act, idx) => {
                list.append(`
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-extrabold text-blue-600 dark:text-blue-400">Aktivitas #${idx + 1}</span>
                        </div>
                        <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Uraian Tugas</p>
                        <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">${act.comments}</p>
                        <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-2">Output/Hasil</p>
                        <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">${act.feedback}</p>
                    </div>
                `);
            });
        } else {
            list.append(`
                <div class="text-center py-8 text-slate-400 dark:text-slate-500 font-semibold flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-4xl">assignment_late</span>
                    Belum ada catatan kinerja untuk tanggal ini.
                </div>
            `);
        }

        // Save selected date context
        window.selectedCalDateStr = formatted;
        window.selectedCalDayName = dayName;

        openModal('#historyModal');
    }

    function showCalendarSkeleton() {
        const grid = $('#calendarGrid');
        grid.empty();
        // Render 42 skeleton shimmer cells
        for (let i = 0; i < 42; i++) {
            grid.append('<div class="calendar-skeleton-cell skeleton"></div>');
        }
        // Show dot loader below month name
        $('#calendarLoadingBar').removeClass('hidden');
        // Disable nav buttons during load
        $('#prevMonthBtn, #nextMonthBtn').prop('disabled', true).addClass('opacity-30 pointer-events-none');
    }

    function fetchMonthEvents() {
        showCalendarSkeleton();

        const apiDate = `01 ${bulanIndo[activeMonth]} ${activeYear}`;
        const endpoint = `https://proxy.arti-pos.com/?action=kinerja&date=${encodeURIComponent(apiDate)}&nip=${savedSelection.nip}`;
        
        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                calendarEvents = {};
                if (data.success && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        let itemDateStr = item.date;
                        if (!itemDateStr) return;
                        
                        let dObj;
                        if (itemDateStr.includes("/")) {
                            const p = itemDateStr.split("/");
                            dObj = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
                        } else {
                            dObj = new Date(itemDateStr);
                        }
                        
                        if (!isNaN(dObj.getTime())) {
                            const key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                            if (!calendarEvents[key]) {
                                calendarEvents[key] = [];
                            }
                            calendarEvents[key].push(item);
                        }
                    });
                }
                $('#calendarLoadingBar').addClass('hidden');
                renderCalendar();
            })
            .catch(err => {
                console.error("Error fetching calendar logs", err);
                calendarEvents = {};
                $('#calendarLoadingBar').addClass('hidden');
                renderCalendar();
            });
    }

    // Swipe gestures on calendar grid
    let touchstartX = 0;
    let touchendX = 0;
    
    const gridEl = document.getElementById('calendarGrid');
    if (gridEl) {
        gridEl.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, { passive: true });

        gridEl.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleGesture();
        }, { passive: true });
    }

    function handleGesture() {
        const threshold = 50;
        if (touchendX < touchstartX - threshold) {
            // Swipe left -> Next Month
            if (!$('#nextMonthBtn').prop('disabled')) {
                $('#nextMonthBtn').click();
            }
        }
        if (touchendX > touchstartX + threshold) {
            // Swipe right -> Prev Month
            if (!$('#prevMonthBtn').prop('disabled')) {
                $('#prevMonthBtn').click();
            }
        }
    }

    // Nav button event listeners
    $('#prevMonthBtn').on('click', function() {
        if (activeMonth === 0) {
            activeMonth = 11;
            activeYear--;
        } else {
            activeMonth--;
        }
        fetchMonthEvents();
    });

    // Handle Month Navigation with limits check
    $('#nextMonthBtn').on('click', function() {
        if (activeMonth === 11) {
            activeMonth = 0;
            activeYear++;
        } else {
            activeMonth++;
        }
        fetchMonthEvents();
    });


    // --- MODAL UTILS ---
    function openModal(id) {
        const modal = $(id);
        modal.removeClass('hidden');
        setTimeout(() => {
            modal.removeClass('opacity-0').find('> div').removeClass('scale-95').addClass('scale-100');
        }, 10);
    }

    // Explicitly scope globally for badge integrations or other scripts if needed
    window.openCalendarModal = openModal;

    function closeModal(id) {
        const modal = $(id);
        modal.find('> div').addClass('scale-95').removeClass('scale-100');
        modal.addClass('opacity-0');
        setTimeout(() => {
            modal.addClass('hidden');
        }, 300);
    }
    
    $('#closeHistoryModal').on('click', function() { closeModal('#historyModal'); });
    $('#closeInputModal').on('click', function() { closeModal('#kinerjaInputModal'); });
    $('#historyModal').on('click', function(e) { if (e.target === this) closeModal('#historyModal'); });
    $('#kinerjaInputModal').on('click', function(e) { if (e.target === this) closeModal('#kinerjaInputModal'); });


    // --- ADD BUTTON LISTENERS ---
    $('#btnOpenInputModal').on('click', function() {
        const today = new Date();
        const dayName = hariIndo[today.getDay()];
        const formatted = `${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;
        
        $('#inputModalDayName').text(dayName.toUpperCase());
        $('#inputModalDate').text(formatted);
        window.selectedCalDateStr = formatted;
        window.selectedCalDayName = dayName;
        
        $('#modalComments').val('');
        $('#modalFeedback').val('');
        
        openModal('#kinerjaInputModal');
    });

    $('#historyModalAddBtn').on('click', function() {
        $('#inputModalDayName').text(window.selectedCalDayName.toUpperCase());
        $('#inputModalDate').text(window.selectedCalDateStr);
        
        $('#modalComments').val('');
        $('#modalFeedback').val('');
        
        openModal('#kinerjaInputModal');
    });


    // --- MODAL SUBMIT HANDLER ---
    $('#modalKinerjaForm').on('submit', function(e) {
        e.preventDefault();
        
        const cleanDate = window.selectedCalDateStr;
        
        $('#btnModalSubmit').prop('disabled', true);
        $('#modalSubmitText').hide();
        $('#modalSubmitTextAlt').hide();
        $('#modalSubmitSpinner').show();
        
        const formData = {
            action: "kinerja",
            date: cleanDate,
            nip: savedSelection.nip,
            name: savedSelection.nama,
            department: savedSelection.unitKerja,
            position: savedSelection.jabatan,
            comments: $('#modalComments').val(),
            feedback: $('#modalFeedback').val(),
            images: []
        };

        fetch("https://proxy.arti-pos.com", {
            method: "POST",
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            showMobileToast("Kinerja harian telah tersimpan!");
            
            $('#modalComments').val('');
            $('#modalFeedback').val('');
            
            $('#btnModalSubmit').prop('disabled', false);
            $('#modalSubmitText').show();
            $('#modalSubmitTextAlt').show();
            $('#modalSubmitSpinner').hide();
            
            closeModal('#kinerjaInputModal');
            closeModal('#historyModal');
            
            fetchMonthEvents();
        })
        .catch(err => {
            showMobileToast("Gagal menyimpan: " + err);
            $('#btnModalSubmit').prop('disabled', false);
            $('#modalSubmitText').show();
            $('#modalSubmitTextAlt').show();
            $('#modalSubmitSpinner').hide();
        });
    });


    // --- ORIGINAL FORM SUBMIT HANDLER ---
    $("#mobileForm").on("submit", function (e) {
        e.preventDefault();

        $("#submitText").hide();
        $("#submitTextAlt").hide();
        $("#submitSpinner").show();
        $("#btnSubmit").prop("disabled", true);

        const cleanDate = $("#mobileDatePicker").val();

        const formData = {
            action: "kinerja",
            date: cleanDate,
            nip: savedSelection.nip,
            name: savedSelection.nama,
            department: savedSelection.unitKerja,
            position: savedSelection.jabatan,
            comments: $("#mobileComments").val(),
            feedback: $("#mobileFeedback").val(),
            images: []
        };

        let emptyField = null;
        if (!formData.date) emptyField = $("#mobileDatePicker");
        else if (!formData.comments) emptyField = $("#mobileComments");
        else if (!formData.feedback) emptyField = $("#mobileFeedback");

        if (emptyField) {
            showMobileToast("Isikan semua field yang diperlukan");
            $("#submitText").show();
            $("#submitTextAlt").show();
            $("#submitSpinner").hide();
            $("#btnSubmit").prop("disabled", false);
            emptyField.focus();
            return;
        }

        const fieldsToDisable = [$("#mobileComments"), $("#mobileFeedback"), $("#mobileDatePicker")];
        fieldsToDisable.forEach(field => field.prop("disabled", true));
        $("#dateContainer").addClass("pointer-events-none opacity-60");

        fetch("https://proxy.arti-pos.com", {
            method: "POST",
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            showMobileToast("Kinerja harian telah tersimpan!");

            $("#mobileComments").val('');
            $("#mobileFeedback").val('');

            try {
                localStorage.removeItem('kinehar_draft');
            } catch (e) { }

            $("#submitText").show();
            $("#submitTextAlt").show();
            $("#submitSpinner").hide();
            $("#btnSubmit").prop("disabled", false);

            fieldsToDisable.forEach(field => field.prop("disabled", false));
            $("#dateContainer").removeClass("pointer-events-none opacity-60");

            // Re-fetch calendar events in case they switch back
            fetchMonthEvents();

            window.scrollTo(0, 0);
        })
        .catch(err => {
            showMobileToast("Error: " + err);
            $("#submitText").show();
            $("#submitTextAlt").show();
            $("#submitSpinner").hide();
            $("#btnSubmit").prop("disabled", false);

            fieldsToDisable.forEach(field => field.prop("disabled", false));
            $("#dateContainer").removeClass("pointer-events-none opacity-60");
        });
    });

    function showMobileToast(message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0,0,0,0.8)';
        toast.style.color = 'white';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '12px';
        toast.style.zIndex = '10000';
        toast.style.maxWidth = '90%';
        toast.style.textAlign = 'center';
        toast.style.fontSize = '0.9rem';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // Better touch feedback
    document.querySelectorAll('button, select, #viewModeTabs button').forEach(el => {
        el.addEventListener('touchstart', function () {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        el.addEventListener('touchend', function () {
            this.style.transform = '';
        }, { passive: true });
    });
});
