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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfVOR--E6CgaLNopCql4QNviXdhVg4GAY",
  authDomain: "calm-corner-e92e0.firebaseapp.com",
  projectId: "calm-corner-e92e0",
  storageBucket: "calm-corner-e92e0.firebasestorage.app",
  messagingSenderId: "470025194370",
  appId: "1:470025194370:web:90830dd0951427b39a1d9b",
  measurementId: "G-HBC6NHQF19",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Simple HTML escape to avoid injecting raw HTML from post content / names
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return map[c] || c;
    });
}
// Human-friendly timestamps like "5 min ago"
function formatTimestamp(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
}
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
      created: serverTimestamp(),
    });

    // Also update Firebase Auth profile displayName
    await updateProfile(userCred.user, {
      displayName: email.split("@")[0],
    });

    window.location.href = "mood.html";
  } catch (err) {
    console.error(err);
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
    console.error(err);
    alert(err.message);
  }
}

export function logoutUser() {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((err) => {
      console.error(err);
      alert("Error signing out.");
    });
}

// ---------------------------------------------------------------------
// PROFILE LOADING / UPDATING
// profile.html expects:
//  - #displayName
//  - #emailField
//  - <img id="avatarImg">
//  - <input type="file" id="avatarInput">
// ---------------------------------------------------------------------
export function loadProfile() {
  // Only set up the listener if we're actually on the profile page
  const hasProfileDom =
    document.getElementById("displayName") ||
    document.getElementById("emailField") ||
    document.getElementById("avatarImg");

  if (!hasProfileDom) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // If you prefer, redirect to signup.html instead.
      window.location.href = "index.html";
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const data = snap.exists()
        ? snap.data()
        : {
            displayName: user.displayName || "Friend",
            email: user.email || "",
            avatarUrl: "",
          };

      const nameEl = document.getElementById("displayName");
      const emailEl = document.getElementById("emailField");
      const avatarImg = document.getElementById("avatarImg");
      const avatarInput = document.getElementById("avatarInput");

      if (nameEl) nameEl.textContent = data.displayName || "Friend";
      if (emailEl) emailEl.textContent = data.email || user.email || "";
      if (avatarImg)
        avatarImg.src =
          data.avatarUrl || "https://via.placeholder.com/100?text=Avatar";

      if (avatarInput) {
        avatarInput.onchange = () => {
          if (avatarInput.files && avatarInput.files[0]) {
            uploadAvatar(user.uid, avatarInput.files[0]);
          }
        };
      }
    } catch (err) {
      console.error(err);
      alert("There was a problem loading your profile.");
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
      { avatarUrl: url, updated: serverTimestamp() },
      { merge: true }
    );

    const avatarImg = document.getElementById("avatarImg");
    if (avatarImg) avatarImg.src = url;
  } catch (err) {
    console.error(err);
    alert("Error uploading avatar.");
  }
}

export async function updateDisplayName() {
  const newName = prompt("Enter your new name:");
  if (!newName) return;

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in.");
    return;
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { displayName: newName, updated: serverTimestamp() },
      { merge: true }
    );

    await updateProfile(user, { displayName: newName });

    const nameEl = document.getElementById("displayName");
    if (nameEl) nameEl.textContent = newName;
  } catch (err) {
    console.error(err);
    alert("Error updating name.");
  }
}

// ---------------------------------------------------------------------
// MOOD
// mood.html buttons should call selectMood('Anxious'), etc.
// focus-section shows text in #focusText
// ---------------------------------------------------------------------
export function selectMood(mood) {
  localStorage.setItem("currentMood", mood);
  window.location.href = "feed.html";
}

export function loadMood() {
  const label = document.getElementById("focusText");
  if (!label) return; // not on the mood page

  const mood = localStorage.getItem("currentMood") || "Neutral";
  label.textContent = `Content for: ${mood}`;
}

// ---------------------------------------------------------------------
// CREATE POSTS (post.html)
//  - textarea#textPostInput
//  - input#photoPostInput[type=file]
//  - buttons calling createTextPost() / createPhotoPost()
// ---------------------------------------------------------------------
export async function createTextPost() {
  const input = document.getElementById("textPostInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return alert("Write something first.");

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const mood = localStorage.getItem("currentMood") || "Neutral";

  try {
    await addDoc(collection(db, "posts"), {
      type: "text",
      content: text,
      mood,
      userId: user.uid,
      created: serverTimestamp(),
    });

    input.value = "";
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Error creating post.");
  }
}

export async function createPhotoPost() {
  const input = document.getElementById("photoPostInput");
  if (!input) return;

  if (!input.files.length) return alert("Upload a photo first.");

  const file = input.files[0];
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const mood = localStorage.getItem("currentMood") || "Neutral";

  try {
    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "posts"), {
      type: "photo",
      imageUrl: url,
      mood,
      userId: user.uid,
      created: serverTimestamp(),
    });

    input.value = "";
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Error uploading photo.");
  }
}

// ---------------------------------------------------------------------
// LOAD FEED
// ---------------------------------------------------------------------
export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    // Update mood pill text
    const mood = localStorage.getItem("currentMood") || "Neutral";
    const moodLabel = document.getElementById("currentMoodLabel");
    if (moodLabel) {
        moodLabel.textContent = `Mood: ${mood}`;
    }

    // Get posts newest first
    const postsQuery = query(
        collection(db, "posts"),
        orderBy("created", "desc")
    );

    const snapshot = await getDocs(postsQuery);

    if (snapshot.empty) {
        container.innerHTML = `
            <div class="empty-state">
                Nothing here yet. Try creating a gentle first post.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    // Cache for user docs so we don't refetch the same user repeatedly
    const userCache = new Map();

    for (const docSnap of snapshot.docs) {
        const post = docSnap.data();
        const postId = docSnap.id;

        // --- Look up author info ---
        let userData = null;
        if (post.userId) {
            if (userCache.has(post.userId)) {
                userData = userCache.get(post.userId);
            } else {
                const userDoc = await getDoc(doc(db, "users", post.userId));
                userData = userDoc.exists() ? userDoc.data() : null;
                userCache.set(post.userId, userData);
            }
        }

        // Username fallback order:
        // displayName -> email before @ -> short userId -> "Someone"
        let displayName =
            (userData && userData.displayName) ||
            (userData && userData.email
                ? userData.email.split("@")[0]
                : null) ||
            (post.userId ? post.userId.slice(0, 6) : null) ||
            "Someone";

        const avatarUrl =
            (userData && userData.avatarUrl) ||
            "default.png"; // your default profile picture

        // Timestamp from Firestore
        let createdLabel = "";
        if (post.created && typeof post.created.toDate === "function") {
            const d = post.created.toDate();
            createdLabel = formatTimestamp(d);
        }

        // Tags: use post.tags if it exists, else derive from type
        let tags = [];
        if (Array.isArray(post.tags) && post.tags.length) {
            tags = post.tags;
        } else {
            tags = [post.type === "photo" ? "Photography" : "Reflection"];
        }

        // --- Build the post card ---
        const card = document.createElement("div");
        card.className = "post-card";

        const contentHtml =
            post.type === "photo"
                ? `<img src="${post.imageUrl}" class="post-photo" alt="Shared photo" />`
                : `<div class="post-text">${escapeHtml(post.content || "")}</div>`;

        card.innerHTML = `
            <div class="post-header">
                <img
                    class="post-avatar"
                    src="${avatarUrl}"
                    alt="${escapeHtml(displayName)}'s avatar"
                />
                <div class="post-header-text">
                    <div class="post-username">${escapeHtml(displayName)}</div>
                    <div class="timestamp">${escapeHtml(createdLabel)}</div>
                </div>
            </div>

            ${contentHtml}

            <div class="post-meta">
                <div class="tag-row">
                    ${tags
                        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
                        .join(" ")}
                </div>
            </div>

            <div class="comment-box">
                <textarea
                    class="comment-input"
                    placeholder="Send a kind reply…"
                ></textarea>
                <button class="comment-send-btn">Send</button>
            </div>
        `;

        // --- Wire up the comment send -> background message doc ---
        const textarea = card.querySelector(".comment-input");
        const sendBtn = card.querySelector(".comment-send-btn");

        sendBtn.addEventListener("click", async () => {
            const text = textarea.value.trim();
            if (!text) return;

            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Please sign in to send a message.");
                return;
            }

            try {
                await addDoc(collection(db, "messages"), {
                    postId,
                    postOwnerId: post.userId || null,
                    fromUserId: currentUser.uid,
                    text,
                    created: serverTimestamp()
                });

                textarea.value = "";
                const oldLabel = sendBtn.textContent;
                sendBtn.textContent = "Sent";
                sendBtn.disabled = true;

                setTimeout(() => {
                    sendBtn.textContent = oldLabel;
                    sendBtn.disabled = false;
                }, 1500);
            } catch (err) {
                console.error(err);
                alert("Couldn't send that message yet. Please try again.");
            }
        });

        container.appendChild(card);
    }
}
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state">
                Hmm, something went wrong loading the feed.<br/>
                Try refreshing the page.
            </div>
        `;
    }
}
// ---------------------------------------------------------------------
// THREAD VIEW (thread.html)
//  - body onload="loadThread()"
//  - #mainPost for the parent post
//  - #repliesList for replies
//  - textarea#replyInput, button onclick="createReply()"
// replies stored at: posts/{postId}/replies
// ---------------------------------------------------------------------
export async function loadThread() {
  const mainPostEl = document.getElementById("mainPost");
  const repliesList = document.getElementById("repliesList");
  if (!mainPostEl || !repliesList) return; // not on thread page

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  if (!postId) {
    mainPostEl.textContent = "No post selected.";
    return;
  }

  try {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (!postSnap.exists()) {
      mainPostEl.textContent = "That post was not found.";
      return;
    }

    const post = postSnap.data();

    if (post.type === "photo") {
      mainPostEl.innerHTML = `
        <img src="${post.imageUrl}" style="max-width:100%; border-radius:12px; margin-bottom:10px;" alt="Thread photo"/>
        <div class="tag">${post.mood || "Photography"}</div>
      `;
    } else {
      mainPostEl.innerHTML = `
        <div>${post.content || ""}</div>
        <div class="tag">${post.mood || "Reflection"}</div>
      `;
    }

    // Load replies
    const repliesCol = collection(db, "posts", postId, "replies");
    const repliesSnap = await getDocs(
      query(repliesCol, orderBy("created", "asc"))
    );

    repliesList.innerHTML = "";
    repliesSnap.forEach((replySnap) => {
      const r = replySnap.data();
      const div = document.createElement("div");
      div.className = "reply";
      div.innerHTML = `
        <div class="reply-user">${r.authorName || "Someone"}</div>
        <div>${r.text || ""}</div>
      `;
      repliesList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    mainPostEl.textContent = "There was a problem loading this thread.";
  }
}

export async function createReply() {
  const input = document.getElementById("replyInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");
  if (!postId) {
    alert("No thread to reply to.");
    return;
  }

  const user = auth.currentUser;
  const authorName = user?.displayName || "Guest";

  try {
    await addDoc(collection(db, "posts", postId, "replies"), {
      text,
      authorName,
      userId: user?.uid || null,
      created: serverTimestamp(),
    });

    input.value = "";
    await loadThread();
  } catch (err) {
    console.error(err);
    alert("Error sending reply.");
  }
}

// ---------------------------------------------------------------------
// GLOBAL PAGE INITIALIZATION
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Safe: each function checks for its own DOM elements
  loadMood();
  loadFeed();
  // Profile and thread are loaded via body onload in their HTML,
  // but you *could* also call loadProfile() here if you prefer.
});

// ---------------------------------------------------------------------
// MAKE FUNCTIONS AVAILABLE TO INLINE HTML (onclick / onload)
// Because we're using type="module", exports are NOT global by default.
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
