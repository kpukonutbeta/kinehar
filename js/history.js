$(document).ready(function () {
    const listContainer = $('#historyList');
    const totalHariEl = $('#totalHariKerja');
    const periodeSelect = $('#periodeSelect');

    const STORAGE_KEY_SELECTION = 'saved_asn_selection';
    const STORAGE_KEY_PREF = 'history_last_pref'; // { nip: "...", month: "januari-2026", data: [] }

    // Modal Elements
    const modal = $('#detailModal');
    const closeModalBtn = $('#closeModal');
    const modalDate = $('#modalDate');
    const modalComments = $('#modalComments');
    const modalFeedback = $('#modalFeedback');

    let currentNip = null;

    // 1. Get NIP from selection cache
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SELECTION);
        if (saved) {
            currentNip = JSON.parse(saved).nip;
        }
    } catch (e) {
        console.error("Error reading selection cache", e);
    }

    if (!currentNip) {
        listContainer.html('<div class="text-center text-red-500 py-4">Silakan pilih pegawai terlebih dahulu di halaman Profil/Home.</div>');
        return;
    }

    // 2. Auto-select Month (Current Month/Year)
    const now = new Date();
    const subMonths = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    const currentVal = `${subMonths[now.getMonth()]}-${now.getFullYear()}`;

    // Check if dropdown has this value, if so select it. Else default to whatever is selected.
    if (periodeSelect.find(`option[value="${currentVal}"]`).length > 0) {
        periodeSelect.val(currentVal);
    }

    // 3. Helper Functions
    function formatParamDate(value) {
        if (!value) return "";
        const parts = value.split('-');
        if (parts.length !== 2) return "";
        const month = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        return `01 ${month} ${parts[1]}`;
    }

    function parseDate(isoString, dayName) {
        const dateObj = new Date(isoString);
        const date = dateObj.getDate();
        const monthIndex = dateObj.getMonth();
        const year = dateObj.getFullYear();

        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const longMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        return {
            date: date,
            dayName: dayName,
            monthShort: shortMonths[monthIndex],
            full: `${dayName}, ${date} ${longMonths[monthIndex]} ${year}`
        };
    }

    // 4. Grouping Logic
    function groupItemsByDate(items) {
        // Group items by unique date string (YYYY-MM-DD or just ISO) to ensure correct grouping
        const groups = {};

        // Items are typically sorted by date desc from API, but we group them anyway
        items.forEach(item => {
            // Use date string as key to group same days
            const dateKey = item.date;
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    dateInfo: parseDate(item.date, item.day),
                    activities: []
                };
            }
            groups[dateKey].activities.push(item);
        });

        return Object.values(groups);
    }

    function renderGroupedList(items) {
        listContainer.empty();

        // Unique Days
        const uniqueDates = new Set(items.map(item => item.date));
        totalHariEl.text(uniqueDates.size);

        if (items.length === 0) {
            listContainer.append('<div class="text-center text-gray-500 py-4">Tidak ada data untuk periode ini.</div>');
            return;
        }

        const groupedData = groupItemsByDate(items);

        groupedData.forEach(group => {
            const dateInfo = group.dateInfo;

            // Build activities HTML
            let activitiesHtml = '';

            // Sort activities if needed? Assuming they come in order we want (latest first usually)
            // But if users want "latest open", we assume index 0/activities[0] is the latest/most important
            // Or usually index 0 is the newest added.

            group.activities.forEach((act, index) => {
                const isOpen = (index === 0); // Only first item is open by default
                const displayClass = isOpen ? 'block' : 'hidden';
                const rotationClass = isOpen ? 'rotate-180' : '';
                const bgClass = isOpen ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-transparent';

                activitiesHtml += `
                    <div class="activity-accordion rounded-xl overflow-hidden transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-white/5 ${bgClass} mb-0 last:mb-0">
                         <!-- Header -->
                         <div class="accordion-header flex justify-between items-center p-2 cursor-pointer select-none"
                              data-full-date="${dateInfo.full}"
                              data-comments="${act.comments.replace(/"/g, '&quot;')}" 
                              data-feedback="${(act.feedback || '-').replace(/"/g, '&quot;')}">
                             
                             <div class="flex items-center gap-2">
                                 <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                 <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Aktivitas #${group.activities.length - index}</span>
                             </div>

                             <div class="flex items-center gap-2">
                                <button class="btn-detail text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                                    DETAIL
                                </button>
                                <span class="material-symbols-outlined text-slate-400 text-base transition-transform duration-200 ${rotationClass}">expand_more</span>
                             </div>
                         </div>
                         
                         <!-- Content (Accordion Body) -->
                         <div class="accordion-body px-3 pb-3 pt-0 ${displayClass}">
                             <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify line-clamp-5">
                                 ${act.comments}
                             </p>
                         </div>
                    </div>
                `;
            });

            // Main Card Structure
            const html = `
                <div class="flex bg-white dark:bg-[#1a2133] rounded-xl overflow-hidden shadow-sm border border-[#cfd7e7] dark:border-white/5">
                    <!-- Left Column: Date & Day -->
                    <div class="bg-primary/5 dark:bg-primary/10 flex flex-col items-center justify-start pt-4 px-2 min-w-[75px] border-r border-[#cfd7e7] dark:border-white/5 gap-1">
                        <span class="text-[10px] font-bold uppercase text-primary/70 tracking-wider">${dateInfo.dayName}</span>
                        <div class="flex flex-col items-center -mt-1">
                            <span class="text-3xl font-black text-primary leading-none">${dateInfo.date}</span>
                            <span class="text-[10px] font-bold uppercase text-primary/70">${dateInfo.monthShort}</span>
                        </div>
                    </div>
                    
                    <!-- Right Column: Activities with Accordion -->
                    <div class="p-2 flex-1 min-w-0 flex flex-col gap-1">
                         ${activitiesHtml}
                    </div>
                </div>
            `;
            listContainer.append(html);
        });

        // Event Handling

        // 1. Accordion Toggle
        $('.accordion-header').on('click', function (e) {
            // If clicking the Detail button, don't toggle accordion
            if ($(e.target).closest('.btn-detail').length) return;

            const header = $(this);
            const body = header.next('.accordion-body');
            const icon = header.find('.material-symbols-outlined').last();
            const wrapper = header.parent();

            // Toggle
            if (body.hasClass('hidden')) {
                // Open
                body.removeClass('hidden');
                icon.addClass('rotate-180');
                wrapper.addClass('bg-slate-50 dark:bg-slate-800/50');
            } else {
                // Close
                body.addClass('hidden');
                icon.removeClass('rotate-180');
                wrapper.removeClass('bg-slate-50 dark:bg-slate-800/50');
            }
        });

        // 2. Detail Button Click
        $('.btn-detail').on('click', function (e) {
            e.stopPropagation(); // Prevents accordion toggle
            const header = $(this).closest('.accordion-header');

            modalDate.text(header.data('full-date'));
            modalComments.text(header.data('comments'));
            modalFeedback.text(header.data('feedback'));

            openModal();
        });
    }

    // 5. Caching & Fetch Logic
    function loadData() {
        const selectedMonth = periodeSelect.val();

        // Try load from cache first
        let cached = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREF);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.nip === currentNip && parsed.month === selectedMonth) {
                    cached = parsed.data;
                }
            }
        } catch (e) { console.error("Cache error", e); }

        if (cached) {
            renderGroupedList(cached);
        } else {
            listContainer.html('<div class="text-center text-gray-500 py-4">Memuat data...</div>');
        }

        // Fetch fresh data
        const infoDate = formatParamDate(selectedMonth);
        const endpoint = `https://proxy.arti-pos.com/?action=kinerja&date=${encodeURIComponent(infoDate)}&nip=${currentNip}`;

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    renderGroupedList(data.data);

                    const toSave = {
                        nip: currentNip,
                        month: selectedMonth,
                        data: data.data
                    };
                    localStorage.setItem(STORAGE_KEY_PREF, JSON.stringify(toSave));

                } else {
                    listContainer.html('<div class="text-center text-gray-500 py-4">Tidak ada data untuk periode ini.</div>');
                    totalHariEl.text('0');
                }
            })
            .catch(err => {
                if (!cached) {
                    listContainer.html('<div class="text-center text-red-500 py-4">Gagal memuat data.</div>');
                }
                console.error("Fetch error", err);
            });
    }

    // Modal Functions
    function openModal() {
        modal.removeClass('hidden');
        setTimeout(() => {
            modal.removeClass('opacity-0').addClass('modal-entering');
        }, 10);
    }
    function closeModal() {
        modal.removeClass('modal-entering').addClass('opacity-0');
        setTimeout(() => {
            modal.addClass('hidden');
        }, 300);
    }

    closeModalBtn.on('click', closeModal);
    modal.on('click', function (e) { if (e.target === this) closeModal(); });

    periodeSelect.on('change', loadData);

    // Initial Load
    loadData();
});
