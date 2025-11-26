// Save mood on click
function selectMood(mood) {
    localStorage.setItem("currentMood", mood);
    window.location.href = "feed.html";
}

// Load mood on feed page
function loadMood() {
    const mood = localStorage.getItem("currentMood") || "Neutral";
    const moodLabel = document.getElementById("current-mood");
    if (moodLabel) moodLabel.textContent = mood;
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadMood);
