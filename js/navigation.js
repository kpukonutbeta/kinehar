// Fade out and navigate
function navigateTo(url) {
    document.body.classList.remove('page-loaded'); // Remove opacity: 1 (reverts to opacity: 0 via CSS)
    document.body.classList.add('page-transitioning'); // Explicit fade out class if needed (optional since base class handles it)

    setTimeout(() => {
        window.location.href = url;
    }, 300); // Match CSS transition duration
}

// Fade in on load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure browser rendering cycle has started
    setTimeout(() => {
        document.body.classList.add('page-loaded');
    }, 50);
});
