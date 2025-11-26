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
  signOut(auth).finally(() => {
    window.location.href = "index.html";
  });
}

// ---------------------------------------------------------------------
// PROFILE LOADING / UPDATING (profile.html)
// ---------------------------------------------------------------------
export function loadProfile() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const data = userSnap.exists()
      ? userSnap.data()
      : {
          displayName: user.displayName || "Anonymous",
          email: user.email || "",
          avatarUrl: ""
        };

    const nameEl = document.getElementById("displayName");
    const emailEl = document.getElementById("emailField");
    const avatarEl = document.getElementById("avatarImg");
    const avatarInput = document.getElementById("avatarInput");

    if (nameEl) nameEl.textContent = data.displayName || "Anonymous";
    if (emailEl) emailEl.textContent = data.email || user.email || "";
    if (avatarEl) {
      avatarEl.src =
        data.avatarUrl || "https://via.placeholder.com/100?text=Avatar";
    }

    if (avatarInput) {
      avatarInput.onchange = () => {
        if (avatarInput.files && avatarInput.files[0]) {
          uploadAvatar(user.uid, avatarInput.files[0]);
        }
      };
    }
  });
}

export async function uploadAvatar(uid, file) {
  try {
    const storageRef = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await setDoc(
      doc(db, "users", uid),
      { avatarUrl: url },
      { merge: true }
    );

    const avatarEl = document.getElementById("avatarImg");
    if (avatarEl) avatarEl.src = url;
  } catch (err) {
    console.error(err);
    alert("Problem uploading avatar.");
  }
}

export async function updateDisplayName() {
  const newName = prompt("Enter your new name:");
  if (!newName) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { displayName: newName },
      { merge: true }
    );
    await updateProfile(user, { displayName: newName });

    const nameEl = document.getElementById("displayName");
    if (nameEl) nameEl.textContent = newName;
  } catch (err) {
    console.error(err);
    alert("Could not update your name.");
  }
}

// ---------------------------------------------------------------------
// MOOD (mood.html + small helper on other pages)
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

// run on all pages, harmless if #focusText is missing
document.addEventListener("DOMContentLoaded", loadMood);

// ---------------------------------------------------------------------
// CREATE POSTS (post.html)
// ---------------------------------------------------------------------
export async function createTextPost() {
  const input = document.getElementById("textPostInput");
  const text = input?.value.trim();

  if (!text) return alert("Write something first.");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  try {
    await addDoc(collection(db, "posts"), {
      type: "text",
      content: text,
      userId: user.uid,
      created: serverTimestamp()
    });

    if (input) input.value = "";
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Could not create post.");
  }
}

export async function createPhotoPost() {
  const input = document.getElementById("photoPostInput");
  if (!input || !input.files || !input.files.length) {
    return alert("Upload a photo first.");
  }

  const file = input.files[0];
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  try {
    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "posts"), {
      type: "photo",
      imageUrl: url,
      userId: user.uid,
      created: serverTimestamp()
    });

    input.value = "";
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Could not create photo post.");
  }
}

// ---------------------------------------------------------------------
// LOAD FEED (feed.html)
// ---------------------------------------------------------------------
export async function loadFeed() {
  const container = document.getElementById("feedContainer");
  if (!container) return; // not on feed page

  try {
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
  } catch (err) {
    console.error(err);
    const container = document.getElementById("feedContainer");
    if (container) container.textContent = "Could not load feed.";
  }
}

// run on all pages, but no-op if #feedContainer is missing
document.addEventListener("DOMContentLoaded", loadFeed);

// ---------------------------------------------------------------------
// THREAD VIEW (thread.html)
// Schema assumption:
//   Collection: threads
//   Doc: { content: string, tag?: string, created, userId }
//   Subcollection: threads/{threadId}/replies with
//     { text, userId, displayName?, created }
// ---------------------------------------------------------------------
function getThreadIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

export async function loadThread() {
  const mainPostEl = document.getElementById("mainPost");
  const repliesEl = document.getElementById("repliesList");
  if (!mainPostEl || !repliesEl) return; // not on thread page

  const threadId = getThreadIdFromUrl();
  if (!threadId) {
    mainPostEl.textContent = "No thread selected.";
    return;
  }

  try {
    const threadRef = doc(db, "threads", threadId);
    const snap = await getDoc(threadRef);

    if (!snap.exists()) {
      mainPostEl.textContent = "Thread not found.";
      return;
    }

    const data = snap.data();

    mainPostEl.innerHTML = `
      <div>${data.content || ""}</div>
      ${
        data.tag
          ? `<div class="tag">${data.tag}</div>`
          : ""
      }
    `;

    const repliesRef = collection(threadRef, "replies");
    const q = query(repliesRef, orderBy("created", "asc"));
    const repliesSnap = await getDocs(q);

    repliesEl.innerHTML = "";
    repliesSnap.forEach((replyDoc) => {
      const reply = replyDoc.data();
      const div = document.createElement("div");
      div.className = "reply";

      const name = reply.displayName || "Someone";
      div.innerHTML = `
        <div class="reply-user">${name}</div>
        <div>${reply.text || ""}</div>
      `;
      repliesEl.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    mainPostEl.textContent = "Sorry, the thread could not be loaded.";
  }
}

export async function createReply() {
  const textarea = document.getElementById("replyInput");
  const text = textarea?.value.trim();
  if (!text) return alert("Write a reply first.");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to reply.");

  const threadId = getThreadIdFromUrl();
  if (!threadId) {
    alert("No thread selected.");
    return;
  }

  try {
    const threadRef = doc(db, "threads", threadId);
    const repliesRef = collection(threadRef, "replies");

    await addDoc(repliesRef, {
      text,
      userId: user.uid,
      displayName: user.displayName || user.email || "Someone",
      created: serverTimestamp()
    });

    if (textarea) textarea.value = "";
    await loadThread();
  } catch (err) {
    console.error(err);
    alert("Could not send your reply.");
  }
}

// ---------------------------------------------------------------------
// Expose functions to the global window for inline HTML handlers
// ---------------------------------------------------------------------
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;

window.loadProfile = loadProfile;
window.updateDisplayName = updateDisplayName;

window.selectMood = selectMood;

window.createTextPost = createTextPost;
window.createPhotoPost = createPhotoPost;
window.loadFeed = loadFeed;

window.loadThread = loadThread;
window.createReply = createReply;
