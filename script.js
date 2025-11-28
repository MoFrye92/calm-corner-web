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

// Init Firebase
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
// PROFILE LOADING / UPDATING
// (for profile.html that uses displayName, emailField, avatarImg, avatarInput)
// ---------------------------------------------------------------------
function loadProfile() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // If you prefer, redirect to signup instead:
      // window.location.href = "signup.html";
      window.location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // If no Firestore document yet, seed it
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

    const effectiveDisplayName =
      data.displayName ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "") ||
      user.uid;

    if (nameEl) nameEl.textContent = effectiveDisplayName;
    if (emailEl) emailEl.textContent = data.email || "";

    if (avatarEl) {
      const resolvedAvatarUrl =
        data.avatarUrl || user.photoURL || "default.png";
      avatarEl.src = resolvedAvatarUrl;
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

async function uploadAvatar(uid, file) {
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
}

async function updateDisplayName() {
  const newName = prompt("Enter your new name:");
  if (!newName) return;

  const user = auth.currentUser;
  if (!user) return;

  await setDoc(
    doc(db, "users", user.uid),
    { displayName: newName },
    { merge: true }
  );

  await updateProfile(user, { displayName: newName });

  const nameEl = document.getElementById("displayName");
  if (nameEl) nameEl.textContent = newName;
}

// ---------------------------------------------------------------------
// MOOD
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

// Run on every page, but it only updates if #focusText exists
document.addEventListener("DOMContentLoaded", loadMood);

// TAG MAP
const TAGS_BY_MOOD = {
    "Calm": ["#calm", "#mindfulness"],
    "Inspired": ["#inspiration", "#motivation"],
    "Stressed": ["#stress", "#support"],
    "Happy": ["#joy", "#gratitude"],
    "Neutral": ["#reflection"]
};

// ---------------------------------------------------------------------
// CREATE POSTS (TEXT)
// ---------------------------------------------------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    const text = input.value.trim();
    if (!text) return alert("Write something first.");

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    const mood = localStorage.getItem("currentMood") || "Neutral";
    const tags = TAGS_BY_MOOD[mood] || ["#reflection"];

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

// ---------------------------------------------------------------------
// CREATE PHOTO POSTS
// ---------------------------------------------------------------------
export async function createPhotoPost() {
    const input = document.getElementById("photoPostInput");
    if (!input.files.length) return alert("Upload a photo first.");

    const file = input.files[0];
    const user = auth.currentUser;

    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const mood = localStorage.getItem("currentMood") || "Neutral";
    const tags = TAGS_BY_MOOD[mood] || ["#reflection"];

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
// LOAD FEED — NEW UI
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

        // Load user info
        const userDoc = await getDoc(doc(db, "users", post.userId));
        const user = userDoc.data();

        const postEl = document.createElement("div");
        postEl.className = "post-card";

        // Create tags HTML
        const tagsHtml = (post.tags || [])
            .map(t => `<span class="tag">${t}</span>`)
            .join("");

        // Optional content blocks
        const photoBlock = post.type === "photo" ?
            `<img src="${post.imageUrl}" class="post-photo"/>` : ``;

        const textBlock = post.content ?
            `<div class="post-text">${post.content}</div>` : ``;

        postEl.innerHTML = `
            <div class="post-header">
                <img src="${user.avatarUrl || 'https://via.placeholder.com/40'}" class="avatar-sm"/>
                <div class="username">@${user.displayName}</div>
                <div class="menu-dots">•••</div>
            </div>

            ${photoBlock}

            <div class="post-tags">
                ${tagsHtml}
            </div>

            ${textBlock}

            <div class="post-actions">
                <span class="icon">♡</span>
                <span class="icon">🔖</span>
            </div>
        `;

        container.appendChild(postEl);
    }
}

// ---------------------------------------------------------------------
// THREAD VIEW (single post + replies)
// ---------------------------------------------------------------------
export async function loadThread() {
  const mainDiv = document.getElementById("mainPost");
  const repliesDiv = document.getElementById("repliesList");
  if (!mainDiv || !repliesDiv) return;

  // get thread id from ?id= in the URL, e.g. thread.html?id=ABC123
  const params = new URLSearchParams(window.location.search);
  const threadId = params.get("id");

  if (!threadId) {
    mainDiv.textContent = "No thread selected.";
    return;
  }

  // load main post from "posts" collection
  const postSnap = await getDoc(doc(db, "posts", threadId));
  if (!postSnap.exists()) {
    mainDiv.textContent = "This post could not be found.";
    return;
  }

  const post = postSnap.data();
  mainDiv.innerHTML = `
    <div>${post.content || ""}</div>
    <div class="tag">Reflection</div>
  `;

  // load replies from subcollection posts/{threadId}/replies
  const repliesQuery = query(
    collection(db, "posts", threadId, "replies"),
    orderBy("created", "asc")
  );

  const snap = await getDocs(repliesQuery);
  repliesDiv.innerHTML = "";

  snap.forEach((docSnap) => {
    const reply = docSnap.data();
    const div = document.createElement("div");
    div.className = "reply";

    const name = reply.authorName || "Anonymous";

    div.innerHTML = `
      <div class="reply-user">${name}</div>
      <div>${reply.text}</div>
    `;
    repliesDiv.appendChild(div);
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

  const params = new URLSearchParams(window.location.search);
  const threadId = params.get("id");
  if (!threadId) {
    alert("No thread selected.");
    return;
  }

  const authorName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "") ||
    user.uid;

  await addDoc(collection(db, "posts", threadId, "replies"), {
    text,
    authorId: user.uid,
    authorName,
    created: serverTimestamp()
  });

  input.value = "";
  // reload replies
  loadThread();
}

// ---------------------------------------------------------------------
// EXPOSE FUNCTIONS TO HTML (onclick / onload)
// ---------------------------------------------------------------------
window.signUpUser        = signUpUser;
window.loginUser         = loginUser;
window.logoutUser        = logoutUser;
window.selectMood        = selectMood;
window.createTextPost    = createTextPost;
window.createPhotoPost   = createPhotoPost;
window.updateDisplayName = updateDisplayName;
window.loadProfile       = loadProfile;
window.loadThread        = loadThread;
window.createReply       = createReply;
