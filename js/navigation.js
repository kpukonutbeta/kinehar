// Fade out and navigate
function navigateTo(url) {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.remove('loader-hidden');
    }

    // Add small delay to ensure loader transition starts
    setTimeout(() => {
        window.location.href = url;
    }, 300); // Match CSS transition duration
}

// Fade in on load
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        // Small delay to ensure browser rendering cycle has started
        setTimeout(() => {
            loader.classList.add('loader-hidden');
        }, 50);
    }
});
