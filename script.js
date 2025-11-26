// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfVOR--E6CgaLNopCql4QNviXdhVg4GAY",
  authDomain: "calm-corner-e92e0.firebaseapp.com",
  projectId: "calm-corner-e92e0",
  storageBucket: "calm-corner-e92e0.firebasestorage.app",
  messagingSenderId: "470025194370",
  appId: "1:470025194370:web:90830dd0951427b39a1d9b",
  measurementId: "G-HBC6NHQF19"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);



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
// Firestore + Storage references
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const db = getFirestore();
const storage = getStorage();

/* ---------------------------
   TEXT POST
---------------------------- */
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    const text = input.value.trim();

    if (!text) {
        alert("Write something first.");
        return;
    }

    await addDoc(collection(db, "posts"), {
        type: "text",
        content: text,
        created: serverTimestamp()
    });

    input.value = "";
    window.location.href = "feed.html";
}

/* ---------------------------
   PHOTO POST
---------------------------- */
export async function createPhotoPost() {
    const fileInput = document.getElementById("photoInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Pick a photo first.");
        return;
    }

    // Upload to Firebase Storage
    const storageRef = ref(storage, "photos/" + Date.now() + "-" + file.name);
    const uploadResult = await uploadBytes(storageRef, file);

    // Get public image URL
    const url = await getDownloadURL(uploadResult.ref);

    // Save post to Firestore
    await addDoc(collection(db, "posts"), {
        type: "photo",
        imageUrl: url,
        created: serverTimestamp()
    });

    fileInput.value = "";
    window.location.href = "feed.html";
}
// FEED PAGE
export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    const q = collection(db, "posts");
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();
        let el = document.createElement("div");
        el.classList.add("post");

        if (data.type === "text") {
            el.textContent = data.content;
        }

        if (data.type === "photo") {
            el.innerHTML = `<img src='${data.imageUrl}' style='width:100%; border-radius:12px;' />`;
        }

        container.appendChild(el);
    });
}


