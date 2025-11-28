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

// ---------------------------
// Your Firebase Config
// ---------------------------
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
async function signUpUser() {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);

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

async function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "feed.html";
  } catch (err) {
    alert(err.message);
  }
}

function logoutUser() {
  signOut(auth);
  window.location.href = "index.html";
}

// ---------------------------------------------------------------------
// PROFILE PAGE
// ---------------------------------------------------------------------
function loadProfile() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName:
          user.displayName ||
          (user.email ? user.email.split("@")[0] : user.uid),
        email: user.email,
        avatarUrl: user.photoURL || ""
      });
    }

    const data = (await getDoc(userRef)).data();

    const nameEl = document.getElementById("displayName");
    const emailEl = document.getElementById("emailField");
    const avatarEl = document.getElementById("avatarImg");
    const avatarInput = document.getElementById("avatarInput");

    const effectiveName =
      data.displayName ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : user.uid);

    if (nameEl) nameEl.textContent = effectiveName;
    if (emailEl) emailEl.textContent = data.email || "";
    if (avatarEl) avatarEl.src = data.avatarUrl || "default.png";

    if (avatarInput) {
      avatarInput.onchange = () => {
        if (avatarInput.files?.[0]) {
          uploadAvatar(user.uid, avatarInput.files[0]);
        }
      };
    }
  });
}

async function uploadAvatar(uid, file) {
  const storageRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await setDoc(doc(db, "users", uid), { avatarUrl: url }, { merge: true });

  const avatarEl = document.getElementById("avatarImg");
  if (avatarEl) avatarEl.src = url;
}

async function updateDisplayName() {
  const newName = prompt("Enter your new name:");
  if (!newName) return;

  const user = auth.currentUser;

  await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });
  await updateProfile(user, { displayName: newName });

  const nameEl = document.getElementById("displayName");
  if (nameEl) nameEl.textContent = newName;
}

// ---------------------------------------------------------------------
// MOOD + TAGS
// ---------------------------------------------------------------------
function selectMood(mood) {
  localStorage.setItem("currentMood", mood);
  window.location.href = "feed.html";
}

function loadMood() {
  const mood = localStorage.getItem("currentMood") || "Neutral";
  const label = document.getElementById("focusText");
  if (label) label.textContent = `Content for: ${mood}`;
}

document.addEventListener("DOMContentLoaded", loadMood);

const TAGS_BY_MOOD = {
  Calm: ["#calm", "#mindfulness"],
  Inspired: ["#inspiration", "#motivation"],
  Stressed: ["#stress", "#support"],
  Happy: ["#joy", "#gratitude"],
  Neutral: ["#reflection"]
};

// ---------------------------------------------------------------------
// CREATE POSTS
// ---------------------------------------------------------------------
export async function createTextPost() {
  const input = document.getElementById("textPostInput");
  const text = input.value.trim();
  if (!text) return alert("Write something first.");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const mood = localStorage.getItem("currentMood") || "Neutral";
  const tags = TAGS_BY_MOOD[mood];

  await addDoc(collection(db, "posts"), {
    type: "text",
    content: text,
    tags: tags,
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

  const mood = localStorage.getItem("currentMood") || "Neutral";
  const tags = TAGS_BY_MOOD[mood];

  await addDoc(collection(db, "posts"), {
    type: "photo",
    imageUrl: url,
    tags: tags,
    userId: user.uid,
    created: serverTimestamp()
  });

  input.value = "";
  window.location.href = "feed.html";
}

// ---------------------------------------------------------------------
// FEED
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

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    const userDoc = await getDoc(doc(db, "users", post.userId));
    const user = userDoc.data();

    const postEl = document.createElement("div");
    postEl.className = "post-card";

    const tagsHtml = (post.tags || [])
      .map(t => `<span class="tag">${t}</span>`)
      .join("");

    const photoBlock =
      post.type === "photo"
        ? `<img src="${post.imageUrl}" class="post-photo" />`
        : ``;

    const textBlock =
      post.content
        ? `<div class="post-text">${post.content}</div>`
        : ``;

    postEl.innerHTML = `
        <div class="post-header">
            <img src="${user.avatarUrl || 'default.png'}" class="avatar-sm" />
            <div class="username">@${user.displayName}</div>
            <div class="menu-dots">•••</div>
        </div>

        ${photoBlock}

        <div class="post-tags">${tagsHtml}</div>

        ${textBlock}

        <div class="post-actions">
            <span class="icon">♡</span>
            <a class="icon" href="thread.html?id=${docSnap.id}">💬</a>
        </div>
    `;

    container.appendChild(postEl);
  }
}

// ---------------------------------------------------------------------
// THREAD PAGE
// ---------------------------------------------------------------------
export async function loadThread() {
  const mainDiv = document.getElementById("mainPost");
  const repliesDiv = document.getElementById("repliesList");
  if (!mainDiv || !repliesDiv) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const postSnap = await getDoc(doc(db, "posts", id));
  if (!postSnap.exists()) {
    mainDiv.textContent = "Not found.";
    return;
  }

  const post = postSnap.data();

  mainDiv.innerHTML = `
      <div class="post-text">${post.content || ""}</div>
      <div class="post-tags">
        ${(post.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
  `;

  const repliesQuery = query(
    collection(db, "posts", id, "replies"),
    orderBy("created", "asc")
  );

  const snap = await getDocs(repliesQuery);
  repliesDiv.innerHTML = "";

  snap.forEach(replyDoc => {
    const r = replyDoc.data();
    repliesDiv.innerHTML += `
        <div class="reply">
            <div class="reply-user">${r.authorName}</div>
            <div>${r.text}</div>
        </div>
    `;
  });
}

export async function createReply() {
  const input = document.getElementById("replyInput");
  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return alert("Log in.");

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const authorName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : user.uid);

  await addDoc(collection(db, "posts", id, "replies"), {
    text,
    authorId: user.uid,
    authorName,
    created: serverTimestamp()
  });

  input.value = "";
  loadThread();
}

// ---------------------------------------------------------------------
// EXPORT TO WINDOW
// ---------------------------------------------------------------------
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.selectMood = selectMood;
window.loadProfile = loadProfile;
window.updateDisplayName = updateDisplayName;
window.createTextPost = createTextPost;
window.createPhotoPost = createPhotoPost;
window.loadFeed = loadFeed;
window.loadThread = loadThread;
window.createReply = createReply;
