$(document).ready(function () {
    const pegawaiMap = {};
    const jabatanInput = $('#mobilePosition');
    const unitKerjaInput = $('#mobileDepartment');
    const selectEl = $('#mobileNameSelect');
    selectEl.select2();

    const container = selectEl.data('select2').$container;
    container.addClass('loading');
    // Disable select saat masih loading
    selectEl.prop('disabled', true);
    selectEl.append(new Option("Memuat data...", "", true, true));

    fetch("https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhnw-7TQCEoslIS-_p_pMofvyzQTv6U-yz1vFnoahn0IzRV1xPU6qKraWWAdIdH_cSCviX8hxKtEKixFJsSFZiOm_pw1ILG1t3k_69bS8Zncd3buJsNeTpETXg0dCpvDVaMLpEQsGlQdwk5AjCktE_-YNmSioI1vsjhwpBeeyv17Wx9dE0S-a7nXx9HHdsebEuD_oOwaWutOtISe2_FAOsDWII75uRW7FiPIvmY4ZkiL8DzP0v-4w6-H1iem1pV7jWeifJ4eW6cDqejGuUJW_oz9xQt108ro1Ng-h8i&lib=MYHCtADvkL33Vb7--oaPnJ6E4MQ8kKD2v")
      .then(res => res.json())
      .then(data => {
        selectEl.empty()

        selectEl.append(new Option("-- Belum pilih pegawai --", "", true, true));
        data.forEach(item => {
          const option = new Option(`${item['NIP']} - ${item['Nama Lengkap']}`, item.NIP, false, false);
          selectEl.append(option);

          // update map pegawai berdasarkan NIP
          pegawaiMap[item.NIP] = {
            jabatan: item.Jabatan,
            unitKerja: item["Unit Kerja"]
          };
        });

        container.removeClass('loading');
        selectEl.prop('disabled', false);
        selectEl.trigger('change.select2');

        selectEl.on('change', function () {
          const selectedNIP = $(this).val();
          const pegawai = pegawaiMap[selectedNIP];

           if (pegawai) {
    jabatanInput
      .val(pegawai.jabatan)
      .attr('placeholder', ''); // Kosongkan placeholder

    unitKerjaInput
      .val(pegawai.unitKerja)
      .attr('placeholder', '');
  } else {
    // Pilihan default: kosongkan nilai dan beri placeholder
    jabatanInput
      .val('')
      .attr('placeholder', '-- Pilih pegawai terlebih dahulu --');

    unitKerjaInput
      .val('')
      .attr('placeholder', '-- Pilih pegawai terlebih dahulu --');
  }
        });
      })
      .catch(err => {
        console.error("Gagal memuat data:", err);
      });
});

