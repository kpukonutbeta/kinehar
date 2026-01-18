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
    // Overlay: "Kamis"
    const dayText = dayName;

    // Set Value
    $("#mobileDatePicker").val(dateValue);

    // Set Overlay
    $("#dayOverlay").text(dayText);

    // Reset padding (if any remains from previous logic)
    $("#mobileDatePicker").css('padding-left', '');
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
            // val comes as "d MMMM yyyy" based on format
            const parts = val.split(" ");
            // parts: [dd, Month, yyyy, time?] - depending on actual output.
            // If AnyPicker appends time for datetime mode even if not in format:
            // But let's rely on parsing standard logic or creating Date object.

            // safer parsing by creating date object
            // existing logic:
            const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const bulan = {
                "Januari": 0, "Februari": 1, "Maret": 2, "April": 3, "Mei": 4, "Juni": 5,
                "Juli": 6, "Agustus": 7, "September": 8, "Oktober": 9, "November": 10, "Desember": 11
            };

            const tanggal = parseInt(parts[0]);
            const namaBulan = parts[1];
            const tahun = parseInt(parts[2]);
            // If time is present
            const waktu = parts[3] || "00:00";
            const [jam, menit] = waktu.split(":").map(Number);

            const d = new Date(tahun, bulan[namaBulan], tanggal, jam, menit);

            updateDateDisplay(d);

            // Also update label if exists
            var labelTanggal = document.getElementById("labelTanggal");
            if (labelTanggal) labelTanggal.textContent = hariIndo[d.getDay()];
        }
    });


$(document).ready(function () {

    // Set default date to today
    // Set default date to today
    const now = new Date();
    updateDateDisplay(now);

    /*
    // Mobile-optimized select2 with search
    $(".mobile-select2").select2({
        placeholder: "Cari NIP/Nama Anda",
        allowClear: true,
        width: '100%',
        dropdownAutoWidth: true,
        dropdownParent: $('.form-container'),
        minimumResultsForSearch: 3
    });
    */

    // Image upload handling for mobile
    const mobileUploadArea = document.getElementById('mobileUploadArea');
    const mobileImageUpload = document.getElementById('mobileImageUpload');
    const mobileImagePreview = document.getElementById('mobileImagePreview');
    let mobileUploadedImages = [];
    const MAX_IMAGES = 5;
    const MAX_SIZE_MB = 2;

    mobileUploadArea.addEventListener('click', function (e) {
        e.preventDefault();
        mobileImageUpload.click();
    });

    mobileImageUpload.addEventListener('change', function (e) {
        if (e.target.files.length) {
            handleMobileFiles(e.target.files);
        }
    });

    function handleMobileFiles(files) {
        const filesToProcess = Math.min(files.length, MAX_IMAGES - mobileUploadedImages.length);

        for (let i = 0; i < filesToProcess; i++) {
            const file = files[i];

            // Check file type
            if (!file.type.match('image.*')) {
                showMobileToast('Only image files are allowed');
                continue;
            }

            // Check file size (2MB max)
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                showMobileToast(`Image ${file.name} is too large (max ${MAX_SIZE_MB}MB)`);
                continue;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const previewWrapper = document.createElement('div');
                previewWrapper.className = 'preview-wrapper';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'image-preview';
                img.alt = 'Preview';

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.onclick = function () {
                    previewWrapper.remove();
                    mobileUploadedImages = mobileUploadedImages.filter(img => img.name !== file.name);
                };

                previewWrapper.appendChild(img);
                previewWrapper.appendChild(deleteBtn);
                mobileImagePreview.appendChild(previewWrapper);

                mobileUploadedImages.push({
                    name: file.name,
                    data: e.target.result
                });
            };
            reader.readAsDataURL(file);
        }

        if (mobileUploadedImages.length >= MAX_IMAGES) {
            showMobileToast(`Maximum ${MAX_IMAGES} photos allowed`);
        }
    }

    function showMobileToast(message) {
        // Simple mobile-friendly toast notification
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0,0,0,0.8)';
        toast.style.color = 'white';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
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

    // Form submission with mobile optimizations
    $("#mobileForm").on("submit", function (e) {
        e.preventDefault();

        // Show loading state
        $("#submitText").hide();
        $("#submitSpinner").show();
        $(".btn-submit").prop("disabled", true);

        // Date is now clean in the input value, no need to parse day name out.
        const cleanDate = $("#mobileDatePicker").val();

        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                savedSelection = JSON.parse(storedData);
            }
        } catch (e) {
            console.error("Error reading from localStorage", e);
        }

        if (!savedSelection) {
            showMobileToast("Silahkan pilih ASN terlebih dahulu");
            // redirect to select asn page
            window.location.href = "./profile.html";
            return;
        }

        const formData = {
            date: cleanDate,
            nip: savedSelection.nip,
            name: savedSelection.nama,
            department: savedSelection.unitKerja,
            position: savedSelection.jabatan,
            comments: $("#mobileComments").val(),
            feedback: $("#mobileFeedback").val(),
            images: mobileUploadedImages
        };

        // Validation
        let emptyField = null;
        if (!formData.date) emptyField = $("#mobileDatePicker");
        else if (!formData.comments) emptyField = $("#mobileComments");
        else if (!formData.feedback) emptyField = $("#mobileFeedback");

        if (emptyField) {
            showMobileToast("Isikan semua field yang diperlukan");
            $("#submitText").show();
            $("#submitSpinner").hide();
            $(".btn-submit").prop("disabled", false);

            if (emptyField.hasClass('mobile-select2')) {
                emptyField.select2('open');
            } else {
                emptyField.focus();
            }
            return;
        }

        // Actual AJAX would look like this:
        fetch("https://proxy.arti-pos.com", {
            method: "POST",
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => {
                console.log("Form data:", JSON.stringify(formData));
                console.log("Response:", data)
                // Show success message
                showMobileToast("Kinerja harian telah tersimpan!");

                // Reset specific fields only (Textareas and Images)
                $("#mobileComments").val('');
                $("#mobileFeedback").val('');

                // Do NOT reset Date, Name, Position, Department
                // $("#mobileForm")[0].reset(); 

                var labelTanggal = document.getElementById("labelTanggal");

                // if (labelTanggal) .. this logic was for full reset, check if still needed or just keep current label
                if (labelTanggal) {
                    labelTanggal.textContent = hariIndo[new Date().getDay()]; // Or keep current? User said "text area only reset". 
                    // Actually reset logic usually cleared label too. If we keep date, we keep label.

                    // Clear images
                    // $(".mobile-select2").val(null).trigger('change'); // Remove this to keep name selected
                    labelTanggal.textContent = "Hari, Tanggal";
                }

                $(".mobile-select2").val(null).trigger('change');
                mobileImagePreview.innerHTML = '';
                mobileImagePreview.innerHTML = '';
                mobileUploadedImages = [];

                // Reset button state
                $("#submitText").show();
                $("#submitSpinner").hide();
                $(".btn-submit").prop("disabled", false);

                // Scroll to top
                window.scrollTo(0, 0);
            })
            .catch(err => {
                showMobileToast("Error: " + err)
                $("#submitText").show();
                $("#submitSpinner").hide();
                $(".btn-submit").prop("disabled", false);
            });
        /*
        $.ajax({
            url: 'your-mobile-api-endpoint.php',
            type: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json',
            dataType: 'json',
            success: function(response) {
                showMobileToast("Submission successful!");
                // Reset form
                $("#mobileForm")[0].reset();
                $(".mobile-select2").val(null).trigger('change');
                mobileImagePreview.innerHTML = '';
                mobileUploadedImages = [];
            },
            error: function(xhr, status, error) {
                showMobileToast("Error: " + error);
            },
            complete: function() {
                $("#submitText").show();
                $("#submitSpinner").hide();
                $(".btn-submit").prop("disabled", false);
            }
        });
        */
    });

    // Better touch feedback for buttons
    document.querySelectorAll('button, select, .upload-area').forEach(el => {
        el.addEventListener('touchstart', function () {
            this.style.transform = 'scale(0.98)';
        });

        el.addEventListener('touchend', function () {
            this.style.transform = '';
        });
    });
});
