// ------------------------------------------------------
// Firebase Setup
// ------------------------------------------------------
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

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ------------------------------------------------------
// AUTH
// ------------------------------------------------------
export async function signUpUser() {
    const email = document.getElementById("emailInput").value;
    const pass = document.getElementById("passwordInput").value;

    const userCred = await createUserWithEmailAndPassword(auth, email, pass);

    // Default profile
    await setDoc(doc(db, "users", userCred.user.uid), {
        displayName: email.split("@")[0],
        email: email,
        avatarUrl: "",
        bio: "",
        darkMode: false
    });

    window.location.href = "mood.html";
}

export async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;

    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "feed.html";
}

export function signOutUser() {
    signOut(auth).then(() => (window.location.href = "index.html"));
}

// ------------------------------------------------------
// PROFILE LOADING
// ------------------------------------------------------
export function loadProfile() {
    onAuthStateChanged(auth, async user => {
        if (!user) return (window.location.href = "index.html");

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();

        // Fill UI
        document.getElementById("name").textContent = data.displayName;
        document.getElementById("email").textContent = data.email;
        document.getElementById("avatar").src =
            data.avatarUrl || "default.png";

        if (document.getElementById("bio")) {
            document.getElementById("bio").textContent = data.bio || "";
        }

        applyDarkMode(data.darkMode);
    });
}

// ------------------------------------------------------
// EDIT PROFILE (name, avatar, bio)
// ------------------------------------------------------
export async function updateUserProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const newName = document.getElementById("editName").value.trim();
    const newBio = document.getElementById("editBio").value.trim();
    const newAvatarFile = document.getElementById("editAvatar").files[0];

    let avatarUrl = null;

    // Upload avatar (if selected)
    if (newAvatarFile) {
        const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
        await uploadBytes(avatarRef, newAvatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
    }

    // Save to Firestore
    await setDoc(
        doc(db, "users", user.uid),
        {
            displayName: newName,
            bio: newBio,
            ...(avatarUrl && { avatarUrl })
        },
        { merge: true }
    );

    // Sync Firebase auth displayName (optional)
    await updateProfile(user, {
        displayName: newName,
        ...(avatarUrl && { photoURL: avatarUrl })
    });

    window.location.href = "profile.html";
}

// ------------------------------------------------------
// DARK MODE
// ------------------------------------------------------
export async function toggleDarkMode() {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const current = userDoc.data().darkMode;

    await setDoc(doc(db, "users", user.uid), { darkMode: !current }, { merge: true });

    applyDarkMode(!current);
}

export function applyDarkMode(enabled) {
    document.body.classList.toggle("dark", enabled);

    // Save locally so pages look correct before Firestore loads
    localStorage.setItem("darkMode", enabled);
}

(function preloadDarkMode() {
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
    }
})();

// ------------------------------------------------------
// FEED + POSTS
// ------------------------------------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    const text = input.value.trim();

    if (!text) return alert("Write something first.");

    const user = auth.currentUser;

    await addDoc(collection(db, "posts"), {
        type: "text",
        content: text,
        userId: user.uid,
        created: serverTimestamp()
    });

    input.value = "";
    window.location.href = "feed.html";
}

export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    const postsQuery = query(collection(db, "posts"), orderBy("created", "desc"));
    const snapshot = await getDocs(postsQuery);

    container.innerHTML = "";

    snapshot.forEach(postDoc => {
        const post = postDoc.data();
        const div = document.createElement("div");
        div.className = "post";

        if (post.type === "text") {
            div.innerHTML = `
                <div class="postText">${post.content}</div>
                <div class="tag">Reflection</div>
            `;
        }

        container.appendChild(div);
    });
}
