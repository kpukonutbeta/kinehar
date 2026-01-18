$(document).ready(function () {
    const endpoint = "https://proxy.arti-pos.com/?action=kinerja_count";
    const container = $("#employeeList");
    const totalLaporanEl = $("#totalLaporanBulanIni");
    const totalPegawaiEl = $("#totalPegawai");
    const persentaseEl = $("#persentaseLaporanBulanIni");
    const searchInput = $("#searchEmployee");

    let allEmployees = []; // Store raw data for filtering
    let nilaiAmbang = 10;

    function renderList(employees) {
        container.empty();

        if (employees.length === 0) {
            container.append('<div class="text-center text-gray-500 py-4">Tidak ada data pegawai.</div>');
            return;
        }

        employees.forEach(emp => {
            const percentage = Math.min((emp.count / nilaiAmbang) * 100, 100);
            const isComplete = emp.count >= nilaiAmbang;

            // Determine color based on progress
            let progressColorClass = "bg-orange-500";
            let badgeClass = "text-orange-500 bg-orange-100";
            let badgeText = Math.round(percentage) + "%";

            if (isComplete) {
                progressColorClass = "bg-green-500";
                badgeClass = "text-green-600 bg-green-100";
                badgeText = "Lengkap";
            }

            const html = `
                    <div class="flex items-center gap-4 bg-white dark:bg-slate-800/50 mx-2 mb-2 rounded-xl px-4 min-h-[72px] py-3 justify-between shadow-sm border border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <!-- Avatar Placeholder based on Name Initial or just default icon -->
                            <div class="shrink-0 w-10 h-10 rounded-full border-2 border-primary/10 flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-base">
                                ${emp.name.charAt(0)}
                            </div>
                            <div class="flex flex-col justify-center min-w-0">
                                <p class="text-slate-900 dark:text-white text-sm font-bold leading-tight truncate">
                                    ${emp.name}
                                </p>
                                <p class="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-normal mt-0.5">
                                    ${emp.count}/${nilaiAmbang} Laporan
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0 flex flex-col items-end gap-1 ml-2">
                             <span class="${badgeClass} text-[10px] font-bold px-2 py-0.5 rounded">${badgeText}</span>
                            <div class="w-16 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div class="h-full rounded-full ${progressColorClass}" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </div>
                    `;
            container.append(html);
        });
    }

    fetch(endpoint)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const items = data.data.item;
                nilaiAmbang = data.data.nilai_ambang || 10;
                let totalReports = 0;
                let totalEmployees = 0;
                allEmployees = [];

                // Parse and collect data
                for (const [key, count] of Object.entries(items)) {
                    totalEmployees++;
                    totalReports += count;

                    // Split "NIP - NAME"
                    const parts = key.split(" - ");
                    const nip = parts[0];
                    const name = parts[1] || nip; // Fallback if no separator

                    allEmployees.push({
                        nip: nip,
                        name: name,
                        count: count
                    });
                }

                // Update Header Stats
                totalLaporanEl.text(totalReports.toLocaleString());
                totalPegawaiEl.text(totalEmployees);

                // Sort employees by count descending (optional, but usually good for stats)
                allEmployees.sort((a, b) => b.count - a.count);

                // Initial Render
                renderList(allEmployees);

            } else {
                container.html('<div class="text-center text-red-500 py-4">Gagal memuat data.</div>');
            }
        })
        .catch(err => {
            console.error("Error fetching statistic:", err);
            container.html('<div class="text-center text-red-500 py-4">Terjadi kesalahan koneksi.</div>');
        });

    // Search Filter Logic
    searchInput.on("input", function () {
        const searchTerm = $(this).val().toLowerCase();
        const filtered = allEmployees.filter(emp => emp.name.toLowerCase().includes(searchTerm) || emp.nip.includes(searchTerm));
        renderList(filtered);
    });
});
