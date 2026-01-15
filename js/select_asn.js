$(document).ready(function () {
  const pegawaiMap = {};
  const jabatanInput = $('#mobilePosition');
  const unitKerjaInput = $('#mobileDepartment');
  const selectEl = $('#mobileNameSelect');

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
    jabatanInput.val(savedSelection.jabatan).attr('placeholder', '');
    unitKerjaInput.val(savedSelection.unitKerja).attr('placeholder', '');

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
          jabatanInput
            .val(pegawai.jabatan)
            .attr('placeholder', '');

          unitKerjaInput
            .val(pegawai.unitKerja)
            .attr('placeholder', '');

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
          jabatanInput.val('').attr('placeholder', '-- Pilih pegawai terlebih dahulu --');
          unitKerjaInput.val('').attr('placeholder', '-- Pilih pegawai terlebih dahulu --');

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

