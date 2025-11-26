// ---------------------------
// Firebase Setup
// ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);
const storage = getStorage(app);

// ---------------------------------------------------------------------
// AUTH FUNCTIONS
// ---------------------------------------------------------------------
export async function signUpUser() {
    const email = document.getElementById("emailInput").value;
    const pass = document.getElementById("passwordInput").value;

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);

        // Create user profile in Firestore
        await setDoc(doc(db, "users", userCred.user.uid), {
            displayName: email.split("@")[0],
            email: email,
            avatarUrl: "",
        });

        window.location.href = "mood.html";
    } catch (err) {
        alert(err.message);
    }
}

export async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "feed.html";
    } catch (err) {
        alert(err.message);
    }
}

export function logoutUser() {
    signOut(auth);
    window.location.href = "index.html";
}

// ---------------------------------------------------------------------
// PROFILE LOADING / UPDATING
// ---------------------------------------------------------------------
export function loadProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();

        document.getElementById("displayName").textContent = data.displayName;
        document.getElementById("emailField").textContent = data.email;

        const avatar = document.getElementById("avatarImg");
        avatar.src = data.avatarUrl || "https://via.placeholder.com/100?text=Avatar";

        // avatar upload event
        const avatarInput = document.getElementById("avatarInput");
        avatarInput.onchange = () => uploadAvatar(user.uid, avatarInput.files[0]);
    });
}

export async function uploadAvatar(uid, file) {
    const storageRef = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await setDoc(doc(db, "users", uid), { avatarUrl: url }, { merge: true });

    document.getElementById("avatarImg").src = url;
}

export async function updateDisplayName() {
    const newName = prompt("Enter your new name:");
    if (!newName) return;

    const user = auth.currentUser;

    await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });

    updateProfile(user, { displayName: newName });

    document.getElementById("displayName").textContent = newName;
}

// ---------------------------------------------------------------------
// MOOD
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// CREATE POSTS
// ---------------------------------------------------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    const text = input.value.trim();

    if (!text) return alert("Write something first.");

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    await addDoc(collection(db, "posts"), {
        type: "text",
        content: text,
        userId: user.uid,
        created: serverTimestamp()
    });

    input.value = "";
    window.location.href = "feed.html";
}

export async function createPhotoPost() {
    const input = document.getElementById("photoPostInput");
    if (!input.files.length) return alert("Upload a photo first.");

    const file = input.files[0];
    const user = auth.currentUser;

    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "posts"), {
        type: "photo",
        imageUrl: url,
        userId: user.uid,
        created: serverTimestamp(),
    });

    input.value = "";
    window.location.href = "feed.html";
}

// ---------------------------------------------------------------------
// LOAD FEED
// ---------------------------------------------------------------------
export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    const postsQuery = query(
        collection(db, "posts"),
        orderBy("created", "desc")
    );

    const snapshot = await getDocs(postsQuery);
    container.innerHTML = "";

    snapshot.forEach(docData => {
        const post = docData.data();
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
                <img src="${post.imageUrl}" class="postPhoto"/>
                <div class="tag">Photography</div>
            `;
        }

        container.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", loadFeed);
