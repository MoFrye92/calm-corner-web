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
try {
  getAnalytics(app);
} catch (e) {
  console.warn("Analytics disabled / not available:", e);
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ---------------------------------------------------------------------
// LANDING FLOW
// ---------------------------------------------------------------------
export function handleBegin() {
  // Resolve auth state then route
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    if (user) {
      window.location.href = "mood.html";
    } else {
      window.location.href = "signup.html";
    }
  });
}

// ---------------------------------------------------------------------
// AUTH FUNCTIONS
// ---------------------------------------------------------------------
export async function signUpUser() {
  const email = document.getElementById("emailInput")?.value;
  const pass = document.getElementById("passwordInput")?.value;

  if (!email || !pass) {
    alert("Please enter email and password.");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);

    // Create user profile in Firestore
    await setDoc(doc(db, "users", userCred.user.uid), {
      displayName: email.split("@")[0],
      email: email,
      avatarUrl: ""
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
    alert("Please enter email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "mood.html"; // go pick mood/focus after login
  } catch (err) {
    alert(err.message);
  }
}

export async function logoutUser() {
  await signOut(auth);
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
    const data = userDoc.data() || {};

    const nameEl = document.getElementById("displayName");
    const emailEl = document.getElementById("emailField");
    const avatarImg = document.getElementById("avatarImg");

    if (nameEl) nameEl.textContent = data.displayName || user.displayName || "Anonymous";
    if (emailEl) emailEl.textContent = data.email || user.email || "";
    if (avatarImg) {
      avatarImg.src = data.avatarUrl || user.photoURL || "https://via.placeholder.com/100?text=Avatar";
    }

    // avatar upload
    const avatarInput = document.getElementById("avatarInput");
    if (avatarInput) {
      avatarInput.onchange = () => {
        if (avatarInput.files[0]) {
          uploadAvatar(user.uid, avatarInput.files[0]);
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

  const avatarImg = document.getElementById("avatarImg");
  if (avatarImg) avatarImg.src = url;
}

export async function updateDisplayName() {
  const newName = prompt("Enter your new name:");
  if (!newName) return;

  const user = auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });
  await updateProfile(user, { displayName: newName });

  const nameEl = document.getElementById("displayName");
  if (nameEl) nameEl.textContent = newName;
}

// ---------------------------------------------------------------------
// MOOD + FOCUS
// ---------------------------------------------------------------------
export function selectMood(mood) {
  localStorage.setItem("currentMood", mood);

  // Visually highlight selected
  document.querySelectorAll("[data-mood]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mood === mood);
  });

  hydrateMoodUI();
}

export function selectFocus(focus) {
  localStorage.setItem("currentFocus", focus);

  document.querySelectorAll("[data-focus]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.focus === focus);
  });

  hydrateMoodUI();
}

export function continueToFeed() {
  const mood = localStorage.getItem("currentMood");
  const focus = localStorage.getItem("currentFocus");

  if (!mood || !focus) {
    alert("Please pick both a mood and a focus.");
    return;
  }

  window.location.href = "feed.html";
}

export function hydrateMoodUI() {
  const mood = localStorage.getItem("currentMood");
  const focus = localStorage.getItem("currentFocus");
  const label = document.getElementById("focusText");

  if (label) {
    if (mood && focus) {
      label.textContent = `Content for: ${mood} • ${focus}`;
    } else if (mood) {
      label.textContent = `Content for: ${mood}`;
    } else {
      label.textContent = "Pick how you're feeling and what to focus on.";
    }
  }

  // Re-apply selected classes if page reloaded
  if (mood) {
    document.querySelectorAll("[data-mood]").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.mood === mood);
    });
  }

  if (focus) {
    document.querySelectorAll("[data-focus]").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.focus === focus);
    });
  }
}

// ---------------------------------------------------------------------
// CREATE POSTS (tag with mood + focus)
// ---------------------------------------------------------------------
export async function createTextPost() {
  const input = document.getElementById("textPostInput");
  const text = input?.value.trim();

  if (!text) return alert("Write something first.");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const mood = localStorage.getItem("currentMood") || null;
  const focus = localStorage.getItem("currentFocus") || null;

  await addDoc(collection(db, "posts"), {
    type: "text",
    content: text,
    userId: user.uid,
    mood,
    focus,
    created: serverTimestamp()
  });

  input.value = "";
  window.location.href = "feed.html";
}

export async function createPhotoPost() {
  const input = document.getElementById("photoPostInput");
  if (!input?.files.length) return alert("Upload a photo first.");

  const file = input.files[0];
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const mood = localStorage.getItem("currentMood") || null;
  const focus = localStorage.getItem("currentFocus") || null;

  await addDoc(collection(db, "posts"), {
    type: "photo",
    imageUrl: url,
    userId: user.uid,
    mood,
    focus,
    created: serverTimestamp()
  });

  input.value = "";
  window.location.href = "feed.html";
}

// ---------------------------------------------------------------------
// LOAD FEED (filter by mood + focus)
// ---------------------------------------------------------------------
export async function loadFeed() {
  const container = document.getElementById("feedContainer");
  if (!container) return; // not on this page

  const moodFilter = localStorage.getItem("currentMood");
  const focusFilter = localStorage.getItem("currentFocus");

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("created", "desc")
  );

  const snapshot = await getDocs(postsQuery);
  container.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const post = docSnap.data();

    // client-side filtering to avoid index headaches
    if (moodFilter && post.mood && post.mood !== moodFilter) return;
    if (focusFilter && post.focus && post.focus !== focusFilter) return;

    const div = document.createElement("div");
    div.className = "post";

    let tagsHtml = "";
    const tags = [];
    if (post.mood) tags.push(post.mood);
    if (post.focus) tags.push(post.focus);

    if (tags.length) {
      tagsHtml = `<div class="tag-row">
        ${tags.map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>`;
    }

    if (post.type === "text") {
      div.innerHTML = `
        <div class="postText">${post.content}</div>
        ${tagsHtml || `<div class="tag">Reflection</div>`}
      `;
    } else if (post.type === "photo") {
      div.innerHTML = `
        <img src="${post.imageUrl}" class="postPhoto" />
        ${tagsHtml || `<div class="tag">Photography</div>`}
      `;
    }

    container.appendChild(div);
  });

  if (!container.children.length) {
    container.innerHTML = `<div class="empty-state">
      No posts yet for this mood and focus.
    </div>`;
  }
}

// ---------------------------------------------------------------------
// GLOBAL HOOKS FOR INLINE HTML
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // mood page hydration if present
  hydrateMoodUI();
  // feed page load if present
  loadFeed().catch(() => {});
});

// Make functions available to inline onclick / onload in HTML
window.handleBegin = handleBegin;

window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.signOutUser = logoutUser; // alias if you use this name anywhere

window.loadProfile = loadProfile;
window.updateDisplayName = updateDisplayName;

window.selectMood = selectMood;
window.selectFocus = selectFocus;
window.continueToFeed = continueToFeed;

window.createTextPost = createTextPost;
window.createPhotoPost = createPhotoPost;
