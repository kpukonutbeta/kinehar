$(document).ready(function () {
  const pegawaiMap = {};
  const jabatanInput = $('#mobilePosition');
  const unitKerjaInput = $('#mobileDepartment');
  const selectEl = $('#mobileNameSelect');

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

  // Initialize Select2
  selectEl.select2();
  const container = selectEl.data('select2').$container;

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

  // Restore state UI immediately if data exists
  if (savedSelection && savedSelection.nip) {
    const tempOption = new Option(
      `${savedSelection.nip} - ${savedSelection.nama}`,
      savedSelection.nip,
      true,
      true
    );
    selectEl.append(tempOption).trigger('change');

    if (savedSelection.nama) {
      $('#textName').text(savedSelection.nama);
      updateAvatar(savedSelection.nama); // Update Avatar here
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

    updateBirthdayCountdown(savedSelection.nip);

    container.removeClass('loading');
    selectEl.prop('disabled', false);
  } else {
    container.addClass('loading');
    selectEl.prop('disabled', true);
    selectEl.append(new Option("Memuat data...", "", true, true));
  }
  // --- LOCAL STORAGE LOGIC END ---

  fetch("https://proxy.arti-pos.com?action=asnlist")
    .then(res => res.json())
    .then(data => {
      const currentVal = selectEl.val();

      selectEl.empty();
      selectEl.append(new Option("-- Belum pilih pegawai --", "", true, true));

      data.forEach(item => {
        const option = new Option(`${item['NIP']} - ${item['Nama Lengkap']}`, item.NIP, false, false);
        selectEl.append(option);

        pegawaiMap[item.NIP] = {
          nama: item['Nama Lengkap'],
          jabatan: item.Jabatan,
          unitKerja: item["Unit Kerja"]
        };
      });

      if (currentVal && pegawaiMap[currentVal]) {
        selectEl.val(currentVal).trigger('change');

        const freshData = pegawaiMap[currentVal];
        jabatanInput.val(freshData.jabatan).attr('placeholder', '');
        unitKerjaInput.val(freshData.unitKerja).attr('placeholder', '');
      } else {
        selectEl.val("").trigger('change');
      }

      container.removeClass('loading');
      selectEl.prop('disabled', false);

      // --- EVENT HANDLER ---
      selectEl.on('change', function () {
        const selectedNIP = $(this).val();
        const pegawai = pegawaiMap[selectedNIP];

        if (pegawai) {
          // 1. Update UI
          $('#textName').text(pegawai.nama);
          $('#textNip').text(selectedNIP);
          $('#textPosition').text(pegawai.jabatan);
          $('#textDepartment').text(pegawai.unitKerja);

          // Update Avatar & Countdown
          updateAvatar(pegawai.nama);
          updateBirthdayCountdown(selectedNIP);

          // 2. Save to LocalStorage
          const dataToSave = {
            nip: selectedNIP,
            nama: pegawai.nama,
            jabatan: pegawai.jabatan,
            unitKerja: pegawai.unitKerja
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

        } else {
          // Reset UI
          $('#textName').text('---');
          $('#textNip').text('---');
          $('#textPosition').text('---');
          $('#textDepartment').text('---');

          updateAvatar('');
          updateBirthdayCountdown(null);

          localStorage.removeItem(STORAGE_KEY);
        }
      });
    })
    .catch(err => {
      console.error("Gagal memuat data:", err);
      container.removeClass('loading');
    });
});
