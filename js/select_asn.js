$(document).ready(function () {
  const pegawaiMap = {};
  const jabatanInput = $('#mobilePosition');
  const unitKerjaInput = $('#mobileDepartment');
  const selectEl = $('#mobileNameSelect');

  // Initialize Select2
  selectEl.select2();
  const container = selectEl.data('select2').$container;

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

    // Bulan di JS 0-indexed
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Set tahun next birthday ke tahun ini dulu
    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    // Jika hari ini sudah melewati ultah tahun ini (atau sama dengan hari ini tapi kita ingin hitung 0/selamat?), 
    // Jika today > nextBirthday, berarti sudah lewat -> tahun depan.
    if (today > nextBirthday) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    // Hitung selisih hari
    const diffTime = Math.abs(nextBirthday - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthName = namaBulan[birthDate.getMonth()];

    // Update UI
    if (diffDays === 0) {
      $('#countdownValue').text('Hari Ini');
      $('#countdownText').text(`Selamat Ulang Tahun!`);
    } else {
      $('#countdownValue').text(diffDays);
      $('#countdownText').text(`Hari Menuju ${parseInt(day)} ${monthName}`);
    }
  }

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
    // Tambahkan option sementara agar Select2 bisa menampilkan nilai
    const tempOption = new Option(
      `${savedSelection.nip} - ${savedSelection.nama}`, // Text
      savedSelection.nip, // Value
      true, // DefaultSelected
      true  // Selected
    );
    selectEl.append(tempOption).trigger('change');

    // Isi input field
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

    // Update Countdown
    updateBirthdayCountdown(savedSelection.nip);

    // Pastikan UI tidak blocked
    container.removeClass('loading');
    selectEl.prop('disabled', false);
  } else {
    // Jika tidak ada data tersimpan, tampilkan loading state standar
    container.addClass('loading');
    selectEl.prop('disabled', true);
    selectEl.append(new Option("Memuat data...", "", true, true));
  }
  // --- LOCAL STORAGE LOGIC END ---

  fetch("https://proxy.arti-pos.com?action=asnlist")
    .then(res => res.json())
    .then(data => {
      // Simpan current value (bisa jadi dari LocalStorage atau user sudah pilih duluan jika fetch lambat)
      const currentVal = selectEl.val();

      selectEl.empty();
      selectEl.append(new Option("-- Belum pilih pegawai --", "", true, true));

      data.forEach(item => {
        // Gunakan NIP sebagai value
        const option = new Option(`${item['NIP']} - ${item['Nama Lengkap']}`, item.NIP, false, false);
        selectEl.append(option);

        // update map pegawai
        pegawaiMap[item.NIP] = {
          nama: item['Nama Lengkap'], // Simpan nama untuk keperluan save
          jabatan: item.Jabatan,
          unitKerja: item["Unit Kerja"]
        };
      });

      // Restore selection jika match dengan data baru
      if (currentVal && pegawaiMap[currentVal]) {
        selectEl.val(currentVal).trigger('change');

        // Opsional: perbarui field text dengan data terbaru dari server (data fresh)
        const freshData = pegawaiMap[currentVal];
        jabatanInput.val(freshData.jabatan).attr('placeholder', '');
        unitKerjaInput.val(freshData.unitKerja).attr('placeholder', '');
      } else {
        // Jika value lama tidak valid di data baru, atau user belum pilih apa2
        selectEl.val("").trigger('change');
      }

      container.removeClass('loading');
      selectEl.prop('disabled', false);

      // --- EVENT HANDLER ---
      // Fix: Jangan gunakan .off('change') karena akan menghapus listener internal Select2!
      selectEl.on('change', function () {
        const selectedNIP = $(this).val();
        const pegawai = pegawaiMap[selectedNIP];

        if (pegawai) {
          // 1. Update UI
          $('#textName').text(pegawai.nama);
          $('#textNip').text(selectedNIP);
          $('#textPosition').text(pegawai.jabatan);
          $('#textDepartment').text(pegawai.unitKerja);

          // Update Countdown
          updateBirthdayCountdown(selectedNIP);

          // 2. Simpan ke LocalStorage
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

          updateBirthdayCountdown(null);

          // Hapus dari LocalStorage jika user pilih "-- Belum pilih --"
          localStorage.removeItem(STORAGE_KEY);
        }
      });
    })
    .catch(err => {
      console.error("Gagal memuat data:", err);
      // Jika fetch error, setidaknya matikan loading agar user tau (atau biarkan jika mau fail silent)
      container.removeClass('loading');
      // selectEl.prop('disabled', false); // Optional logic
    });
});

