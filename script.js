// ---------------------------
// Firebase Setup
// ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const db = getFirestore(app);
const storage = getStorage(app);

// ---------------------------
// Mood Selection
// ---------------------------
export function selectMood(mood) {
    localStorage.setItem("currentMood", mood);
    window.location.href = "feed.html";
}

export function loadMood() {
    const mood = localStorage.getItem("currentMood") || "Neutral";
    const label = document.getElementById("focusText");
    if (label) label.textContent = `Content for: ${mood}`;
}

document.addEventListener("DOMContentLoaded", loadMood);

// ---------------------------
// Create Text Post
// ---------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    if (!input) return;

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

// ---------------------------
// Create Photo Post
// ---------------------------
export async function createPhotoPost() {
    const fileInput = document.getElementById("photoPostInput");
    if (!fileInput || !fileInput.files.length) {
        alert("Upload a photo first.");
        return;
    }

    const file = fileInput.files[0];
    const storageRef = ref(storage, `photos/${Date.now()}_${file.name}`);

    // upload to storage
    await uploadBytes(storageRef, file);

    // get URL
    const url = await getDownloadURL(storageRef);

    // save post entry
    await addDoc(collection(db, "posts"), {
        type: "photo",
        imageUrl: url,
        created: serverTimestamp()
    });

    fileInput.value = "";
    window.location.href = "feed.html";
}

// ---------------------------
// Load Posts on Feed
// ---------------------------
export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    const postsQuery = query(
        collection(db, "posts"),
        orderBy("created", "desc")
    );

    const snapshot = await getDocs(postsQuery);

    container.innerHTML = ""; // clear existing

    snapshot.forEach(doc => {
        const post = doc.data();
        let div = document.createElement("div");
        div.className = "post";

        if (post.type === "text") {
            div.innerHTML = `
                <div class="postText">${post.content}</div>
                <div class="tag">Reflection</div>
            `;
        }

        if (post.type === "photo") {
            div.innerHTML = `
                <img src="${post.imageUrl}" class="postPhoto" />
                <div class="tag">Photography</div>
            `;
        }

        container.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", loadFeed);
