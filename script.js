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
    orderBy,
    limit
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
    const email = document.getElementById("emailInput")?.value;
    const pass = document.getElementById("passwordInput")?.value;

    if (!email || !pass) {
        alert("Please enter an email and password.");
        return;
    }

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
    const email = document.getElementById("loginEmail")?.value;
    const pass = document.getElementById("loginPassword")?.value;

    if (!email || !pass) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "feed.html";
    } catch (err) {
        alert(err.message);
    }
}

export function logoutUser() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
}

// Backwards-compatible alias if any HTML still calls signOutUser()
export function signOutUser() {
    logoutUser();
}

// ---------------------------------------------------------------------
// PROFILE LOADING / UPDATING  (single, clean version)
// ---------------------------------------------------------------------
export function loadProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const profileNameEl   = document.getElementById("displayName");
        const profileEmailEl  = document.getElementById("emailField");
        const avatarImgEl     = document.getElementById("avatarImg");
        const avatarInputEl   = document.getElementById("avatarInput");

        // If the profile page isn't actually loaded, just bail
        if (!profileNameEl || !profileEmailEl || !avatarImgEl) return;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.exists() ? userDoc.data() : {
            displayName: user.displayName || user.email || "Anonymous",
            email: user.email,
            avatarUrl: ""
        };

        profileNameEl.textContent  = data.displayName || "Anonymous";
        profileEmailEl.textContent = data.email || user.email || "";

        avatarImgEl.src = data.avatarUrl || "https://via.placeholder.com/100?text=Avatar";

        if (avatarInputEl) {
            avatarInputEl.onchange = () => {
                if (avatarInputEl.files && avatarInputEl.files[0]) {
                    uploadAvatar(user.uid, avatarInputEl.files[0]);
                }
            };
        }
    });
}

export async function uploadAvatar(uid, file) {
    const storageRef = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await setDoc(doc(db, "users", uid), { avatarUrl: url }, { merge: true });

    const avatarImgEl = document.getElementById("avatarImg");
    if (avatarImgEl) avatarImgEl.src = url;
}

export async function updateDisplayName() {
    const newName = prompt("Enter your new name:");
    if (!newName) return;

    const user = auth.currentUser;
    if (!user) {
        alert("Not logged in.");
        return;
    }

    await setDoc(
        doc(db, "users", user.uid),
        { displayName: newName },
        { merge: true }
    );

    await updateProfile(user, { displayName: newName });

    const profileNameEl = document.getElementById("displayName");
    if (profileNameEl) profileNameEl.textContent = newName;
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

// Run loadMood on any page that happens to have #focusText
document.addEventListener("DOMContentLoaded", () => {
    loadMood();
});

// ---------------------------------------------------------------------
// CREATE POSTS
// ---------------------------------------------------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    const text = input?.value.trim();

    if (!text) {
        alert("Write something first.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

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
    if (!input || !input.files.length) {
        alert("Upload a photo first.");
        return;
    }

    const file = input.files[0];
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

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
    if (!container) return; // Not on the feed page

    const postsQuery = query(
        collection(db, "posts"),
        orderBy("created", "desc")
    );

    const snapshot = await getDocs(postsQuery);
    container.innerHTML = "";

    snapshot.forEach((docData) => {
        const post = docData.data();
        const div = document.createElement("div");
        div.className = "post";

        if (post.type === "text") {
            div.innerHTML = `
                <div class="postText">${post.content}</div>
                <div class="tag">Reflection</div>
            `;
        } else if (post.type === "photo") {
            div.innerHTML = `
                <img src="${post.imageUrl}" class="postPhoto" />
                <div class="tag">Photography</div>
            `;
        }

        container.appendChild(div);
    });
}

// Auto-run feed loading only on pages that have #feedContainer
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("feedContainer");
    if (container) {
        loadFeed().catch(console.error);
    }
});

// ---------------------------------------------------------------------
// THREADS (main post + replies)
// Firestore structure:
//   threads (collection)
//     - threadId (doc) { title, body, tag, created, userId }
//     - replies (subcollection)
//         - replyId (doc) { text, userId, displayName, created }
// ---------------------------------------------------------------------
async function resolveThreadRef() {
    const urlParams = new URLSearchParams(window.location.search);
    let threadId = urlParams.get("id");
    let threadRef;

    if (threadId) {
        threadRef = doc(db, "threads", threadId);
    } else {
        // If no ?id= is provided, grab the most recent thread
        const q = query(collection(db, "threads"), orderBy("created", "desc"), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const first = snap.docs[0];
        threadId = first.id;
        threadRef = first.ref;
    }

    window.currentThreadId = threadId;
    return threadRef;
}

export async function loadThread() {
    const mainPostEl   = document.getElementById("mainPost");
    const repliesList  = document.getElementById("repliesList");

    if (!mainPostEl || !repliesList) return; // Not on thread page

    mainPostEl.innerHTML = "Loading…";
    repliesList.innerHTML = "";

    const threadRef = await resolveThreadRef();
    if (!threadRef) {
        mainPostEl.innerHTML = "No thread found yet.";
        return;
    }

    const threadSnap = await getDoc(threadRef);
    if (!threadSnap.exists()) {
        mainPostEl.innerHTML = "That thread doesn't exist.";
        return;
    }

    const thread = threadSnap.data();

    mainPostEl.innerHTML = `
        <div>${thread.title ? `<strong>${thread.title}</strong><br/><br/>` : ""}${thread.body || ""}</div>
        ${thread.tag ? `<div class="tag">${thread.tag}</div>` : ""}
    `;

    // Load replies
    const repliesQuery = query(
        collection(threadRef, "replies"),
        orderBy("created", "asc")
    );
    const repliesSnap = await getDocs(repliesQuery);
    repliesList.innerHTML = "";

    repliesSnap.forEach((replyDoc) => {
        const r = replyDoc.data();
        const div = document.createElement("div");
        div.className = "reply";
        div.innerHTML = `
            <div class="reply-user">${r.displayName || "Someone"}</div>
            <div>${r.text || ""}</div>
        `;
        repliesList.appendChild(div);
    });
}

export async function createReply() {
    const input = document.getElementById("replyInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) {
        alert("You need to be logged in to reply.");
        return;
    }

    const threadId = window.currentThreadId;
    if (!threadId) {
        alert("No thread selected.");
        return;
    }

    const threadRef = doc(db, "threads", threadId);

    await addDoc(collection(threadRef, "replies"), {
        text,
        userId: user.uid,
        displayName: user.displayName || user.email || "Anonymous",
        created: serverTimestamp()
    });

    input.value = "";
    await loadThread();
}

// ---------------------------------------------------------------------
// Expose functions on window for inline HTML handlers
// ---------------------------------------------------------------------
window.signUpUser       = signUpUser;
window.loginUser        = loginUser;
window.logoutUser       = logoutUser;
window.signOutUser      = signOutUser;
window.selectMood       = selectMood;
window.createTextPost   = createTextPost;
window.createPhotoPost  = createPhotoPost;
window.loadFeed         = loadFeed;
window.loadProfile      = loadProfile;
window.updateDisplayName = updateDisplayName;
window.loadThread       = loadThread;
window.createReply      = createReply;
