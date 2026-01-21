$(document).ready(function () {
  const pegawaiMap = {};
  const jabatanInput = $('#mobilePosition');
  const unitKerjaInput = $('#mobileDepartment');

  // Custom Dropdown Elements
  const searchInput = $('#asnSearchInput');
  const hiddenInput = $('#mobileNameSelect');
  const dropdownList = $('#asnDropdownList');
  const dropdownArrow = $('#dropdownArrow');
  const dropdownContainer = searchInput.closest('.relative');

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

  // Function to calculate and update birthday countdown
  function updateBirthdayCountdown(nip) {
    if (!nip || nip.length < 8) {
      $('#countdownValue').text('--');
      $('#countdownText').text('Hari Menuju --');
      return;
    }

    const year = nip.substring(0, 4);
    const month = nip.substring(4, 6);
    const day = nip.substring(6, 8);

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    if (today > nextBirthday) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = Math.abs(nextBirthday - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthName = namaBulan[birthDate.getMonth()];

    if (diffDays === 0) {
      $('#countdownValue').text('Hari Ini');
      $('#countdownText').text(`Selamat Ulang Tahun!`);
    } else {
      $('#countdownValue').text(diffDays);
      $('#countdownText').text(`Hari Menuju ${parseInt(day)} ${monthName}`);
    }
  }

  // --- DROPDOWN LOGIC ---

  function renderDropdownItems(data) {
    dropdownList.empty();

    if (data.length === 0) {
      dropdownList.append(`
            <div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Data tidak ditemukan
            </div>
        `);
      return;
    }

    data.forEach(item => {
      const initials = getInitials(item['Nama Lengkap']);
      const color = getAvatarColor(item['Nama Lengkap']);

      const itemHtml = `
            <div class="dropdown-item" data-nip="${item.NIP}" data-name="${item['Nama Lengkap']}">
                <div class="initials-avatar" style="background-color: ${color}">${initials}</div>
                <div class="item-text">
                    <span class="item-name">${item['Nama Lengkap']}</span>
                    <span class="item-nip">${item.NIP}</span>
                </div>
            </div>
        `;
      dropdownList.append(itemHtml);
    });
  }

  function filterDropdown(query) {
    const items = dropdownList.find('.dropdown-item');
    let hasVisible = false;

    query = query.toLowerCase();

    items.each(function () {
      const name = $(this).data('name').toLowerCase();
      const nip = $(this).data('nip').toString();

      if (name.includes(query) || nip.includes(query)) {
        $(this).show();
        hasVisible = true;
      } else {
        $(this).hide();
      }
    });

    // Remove existing 'no results' message
    dropdownList.find('.no-results').remove();

    if (!hasVisible) {
      dropdownList.append(`
            <div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400 no-results">
                Tidak ada hasil yang cocok
            </div>
        `);
    }
  }

  function toggleDropdown(show) {
    if (show) {
      dropdownList.removeClass('hidden');
      dropdownArrow.css('transform', 'translateY(-50%) rotate(180deg)');
    } else {
      // Restore input value if closing without selection (or confirm current selection)
      const currentNip = hiddenInput.val();
      if (currentNip && pegawaiMap[currentNip]) {
        searchInput.val(pegawaiMap[currentNip].nama);
      }

      dropdownList.addClass('hidden');
      dropdownArrow.css('transform', 'translateY(-50%) rotate(0deg)');
    }
  }

  function selectEmployee(nip) {
    const pegawai = pegawaiMap[nip];
    if (!pegawai) return;

    // Update Input
    searchInput.val(pegawai.nama);
    hiddenInput.val(nip);

    // Update UI Details
    $('#textName').text(pegawai.nama);
    $('#textNip').text(nip);
    $('#textPosition').text(pegawai.jabatan);
    $('#textDepartment').text(pegawai.unitKerja);

    // Update Avatar & Countdown
    updateAvatar(pegawai.nama);
    updateBirthdayCountdown(nip);

    // Save to LocalStorage
    const dataToSave = {
      nip: nip,
      nama: pegawai.nama,
      jabatan: pegawai.jabatan,
      unitKerja: pegawai.unitKerja
    };
    localStorage.setItem('saved_asn_selection', JSON.stringify(dataToSave));

    toggleDropdown(false);
  }

  // --- EVENT LISTENERS ---

  searchInput.on('focus', function () {
    $(this).val(''); // Auto clear on focus for easy searching
    filterDropdown('');
    toggleDropdown(true);
  });

  // Ensure click also opens if not already open (but doesn't clear if just clicking to move cursor)
  searchInput.on('click', function () {
    if (dropdownList.hasClass('hidden')) {
      $(this).val('');
      filterDropdown('');
      toggleDropdown(true);
    }
  });

  searchInput.on('input', function () {
    filterDropdown($(this).val());
    toggleDropdown(true);
  });

  // Handle Item Click
  dropdownList.on('click', '.dropdown-item', function () {
    const nip = $(this).data('nip');
    selectEmployee(nip);
  });

  // Close dropdown when clicking outside
  $(document).on('click', function (e) {
    if (!dropdownContainer.is(e.target) && dropdownContainer.has(e.target).length === 0) {
      toggleDropdown(false);
    }
  });


  // --- INITIALIZATION & DATA FETCHING ---

  // 1. Check LocalStorage first
  const STORAGE_KEY = 'saved_asn_selection';
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.nip) {
        // Pre-fill UI temporarily while fetching
        searchInput.val(parsed.nama);
        hiddenInput.val(parsed.nip);
        $('#textName').text(parsed.nama);
        $('#textNip').text(parsed.nip);
        $('#textPosition').text(parsed.jabatan);
        $('#textDepartment').text(parsed.unitKerja);
        updateAvatar(parsed.nama);
        updateBirthdayCountdown(parsed.nip);
      }
    }
  } catch (e) {
    console.error("Error reading from localStorage", e);
  }

  // 2. Fetch Data

  // Show Skeleton Loader
  dropdownList.html(`
      <div class="p-2 space-y-2">
          <div class="flex items-center gap-3 p-2">
              <div class="skeleton w-8 h-8 rounded-full"></div>
              <div class="flex-1 space-y-1">
                  <div class="skeleton h-4 w-3/4"></div>
                  <div class="skeleton h-3 w-1/2"></div>
              </div>
          </div>
          <div class="flex items-center gap-3 p-2">
              <div class="skeleton w-8 h-8 rounded-full"></div>
              <div class="flex-1 space-y-1">
                  <div class="skeleton h-4 w-2/3"></div>
                  <div class="skeleton h-3 w-1/3"></div>
              </div>
          </div>
          <div class="flex items-center gap-3 p-2">
              <div class="skeleton w-8 h-8 rounded-full"></div>
              <div class="flex-1 space-y-1">
                  <div class="skeleton h-4 w-5/6"></div>
                  <div class="skeleton h-3 w-1/4"></div>
              </div>
          </div>
      </div>
  `);

  fetch("https://proxy.arti-pos.com?action=asnlist")
    .then(res => res.json())
    .then(data => {
      // Clear loading state
      dropdownList.empty();

      if (!data || data.length === 0) {
        dropdownList.html('<div class="p-4 text-center">Data kosong</div>');
        return;
      }

      data.forEach(item => {
        pegawaiMap[item.NIP] = {
          nama: item['Nama Lengkap'],
          jabatan: item.Jabatan,
          unitKerja: item["Unit Kerja"]
        };
      });

      // Render Dropdown Items
      renderDropdownItems(data);

      // Re-validate selection from LocalStorage against fresh data
      const currentNip = hiddenInput.val();
      if (currentNip && pegawaiMap[currentNip]) {
        // Verify data consistency
        const freshData = pegawaiMap[currentNip];
        jabatanInput.val(freshData.jabatan);
        unitKerjaInput.val(freshData.unitKerja);
      } else {
        // If stored NIP is no longer valid, clear it? Or keep as is?
        // Keeping as is for now, or we could reset if not found.
      }

    })
    .catch(err => {
      console.error("Gagal memuat data:", err);
      dropdownList.html('<div class="p-4 text-center text-red-500">Gagal memuat data</div>');
    });

  // Remove loading class if previous existed
  searchInput.prop('disabled', false);
});
