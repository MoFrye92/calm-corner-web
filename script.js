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
getAnalytics(app);

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

        // Go to mood selection after successful signup
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
    signOut(auth)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch(err => {
            console.error(err);
            alert("Could not log out. Please try again.");
        });
}

// Backwards-compatible alias if any HTML still calls signOutUser()
export function signOutUser() {
    logoutUser();
}

// ---------------------------------------------------------------------
// PROFILE LOADING / UPDATING
// ---------------------------------------------------------------------
export function loadProfile() {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            // If no user, send them to signup
            window.location.href = "signup.html";
            return;
        }

        const profileNameEl  = document.getElementById("displayName");
        const profileEmailEl = document.getElementById("emailField");
        const avatarImgEl    = document.getElementById("avatarImg");
        const avatarInputEl  = document.getElementById("avatarInput");

        // If this isn't the profile page, bail quietly
        if (!profileNameEl || !profileEmailEl || !avatarImgEl) return;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.exists()
            ? userDoc.data()
            : {
                  displayName: user.displayName || user.email || "Anonymous",
                  email: user.email,
                  avatarUrl: ""
              };

        profileNameEl.textContent  = data.displayName || "Anonymous";
        profileEmailEl.textContent = data.email || user.email || "";
        avatarImgEl.src            = data.avatarUrl || "https://via.placeholder.com/100?text=Avatar";

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

    // Update Firestore user document
    await setDoc(
        doc(db, "users", user.uid),
        { displayName: newName },
        { merge: true }
    );

    // Update Firebase Auth profile
    await updateProfile(user, { displayName: newName });

    // Update on-page UI if element exists
    const profileNameEl = document.getElementById("displayName");
    if (profileNameEl) profileNameEl.textContent = newName;
}

// allow onclick="editProfile()" in HTML
export function editProfile() {
    return updateDisplayName();
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

// Run loadMood on pages that have #focusText
document.addEventListener("DOMContentLoaded", () => {
    loadMood();
});

// ---------------------------------------------------------------------
// CREATE POSTS
// ---------------------------------------------------------------------
export async function createTextPost() {
    const input = document.getElementById("textPostInput");
    if (!input) {
        alert("Post input not found.");
        return;
    }

    const text = input.value.trim();
    if (!text) {
        alert("Write something first.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const mood = localStorage.getItem("currentMood") || "Neutral";

    await addDoc(collection(db, "posts"), {
        type: "text",
        content: text,
        userId: user.uid,
        mood,
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

    const mood = localStorage.getItem("currentMood") || "Neutral";

    await addDoc(collection(db, "posts"), {
        type: "photo",
        imageUrl: url,
        userId: user.uid,
        mood,
        created: serverTimestamp()
    });

    input.value = "";
    window.location.href = "feed.html";
}

// ---------------------------------------------------------------------
// LOAD FEED
// ---------------------------------------------------------------------
function formatPostTime(created) {
    try {
        if (!created) return "just now";

        const date = created.toDate ? created.toDate() : new Date(created);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 1) return "just now";
        if (diffMinutes < 60) {
            return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
        }

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
        }

        return date.toLocaleDateString();
    } catch (e) {
        console.error("Error formatting time", e);
        return "recently";
    }
}

export async function loadFeed() {
    const container = document.getElementById("feedContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="feed-loading">Loading your corner…</div>
    `;

    try {
        const postsQuery = query(
            collection(db, "posts"),
            orderBy("created", "desc")
        );

        const snapshot = await getDocs(postsQuery);
        container.innerHTML = "";

        if (snapshot.empty) {
            const empty = document.createElement("div");
            empty.textContent = "Nothing here yet. Your first note could go here.";
            empty.style.fontSize = "13px";
            empty.style.color = "#64748b";
            container.appendChild(empty);
            return;
        }

        snapshot.forEach(docSnap => {
            const post = docSnap.data();
            const postId = docSnap.id;

            const article = document.createElement("article");
            article.className = "post";
            article.dataset.postId = postId;

            const tagLabel =
                post.tag || (post.type === "photo" ? "Photography" : "Reflection");
            const createdLabel = formatPostTime(post.created);

            article.innerHTML = `
                <div class="post-header">
                    <div class="post-meta">You · ${createdLabel}</div>
                    <div class="post-tag">
                        <span class="post-tag-dot"></span>
                        <span class="post-tag-label">${tagLabel}</span>
                    </div>
                </div>

                ${
                    post.type === "photo"
                        ? `<img src="${post.imageUrl}" alt="" class="postPhoto" />`
                        : `<div class="postText"></div>`
                }

                <div class="post-footer">
                    <div class="comment-summary">No comments yet</div>
                    <button class="comment-toggle-btn" type="button">Comment</button>
                </div>

                <div class="comments" style="display:none;">
                    <div class="comments-list"></div>
                    <div class="add-comment-row">
                        <input
                            class="add-comment-input"
                            type="text"
                            placeholder="Add a gentle reply…"
                        />
                        <button class="add-comment-btn" type="button">Send</button>
                    </div>
                </div>
            `;

            if (post.type === "text") {
                const textEl = article.querySelector(".postText");
                if (textEl) textEl.textContent = post.content || "";
            }

            container.appendChild(article);

            // Wire up comments for this post
            setupCommentsForPost(postId, article);
        });
    } catch (err) {
        console.error("Error loading feed", err);
        container.innerHTML = "";
        const errorEl = document.createElement("div");
        errorEl.textContent = "Couldn’t load your feed. Please try again in a moment.";
        errorEl.style.fontSize = "13px";
        errorEl.style.color = "#b91c1c";
        container.appendChild(errorEl);
    }
}

// Only does something on pages with #feedContainer
document.addEventListener("DOMContentLoaded", loadFeed);

// ---------------------------------------------------------------------
// COMMENTS
// ---------------------------------------------------------------------
async function setupCommentsForPost(postId, articleEl) {
    const commentsContainer = articleEl.querySelector(".comments");
    const commentsList      = articleEl.querySelector(".comments-list");
    const summaryEl         = articleEl.querySelector(".comment-summary");
    const toggleBtn         = articleEl.querySelector(".comment-toggle-btn");
    const inputEl           = articleEl.querySelector(".add-comment-input");
    const sendBtn           = articleEl.querySelector(".add-comment-btn");

    if (
        !commentsContainer ||
        !commentsList ||
        !summaryEl ||
        !toggleBtn ||
        !inputEl ||
        !sendBtn
    ) {
        return;
    }

    async function refreshComments() {
        commentsList.innerHTML = "";

        try {
            const commentsCol   = collection(db, "posts", postId, "comments");
            const commentsQuery = query(commentsCol, orderBy("created", "asc"));
            const snap          = await getDocs(commentsQuery);

            let count = 0;
            snap.forEach(docSnap => {
                const c    = docSnap.data();
                const item = document.createElement("div");
                item.className = "comment-item";

                const author = c.authorName || "Someone";

                item.innerHTML = `
                    <span class="comment-author">${author}</span>
                    <span>${c.text || ""}</span>
                `;
                commentsList.appendChild(item);
                count++;
            });

            if (count === 0) {
                summaryEl.textContent = "No comments yet";
            } else if (count === 1) {
                summaryEl.textContent = "1 gentle reply";
            } else {
                summaryEl.textContent = `${count} gentle replies`;
            }
        } catch (err) {
            console.error("Error loading comments", err);
            summaryEl.textContent = "Couldn’t load replies";
        }
    }

    await refreshComments();

    toggleBtn.addEventListener("click", () => {
        const isOpen = commentsContainer.style.display === "block";
        commentsContainer.style.display = isOpen ? "none" : "block";
        toggleBtn.textContent = isOpen ? "Comment" : "Hide";
    });

    async function sendComment() {
        const text = inputEl.value.trim();
        if (!text) return;

        const user = auth.currentUser;

        try {
            await addDoc(collection(db, "posts", postId, "comments"), {
                text,
                userId: user ? user.uid : null,
                authorName: user?.displayName || "You",
                created: serverTimestamp()
            });

            inputEl.value = "";
            await refreshComments();
            commentsContainer.style.display = "block";
            toggleBtn.textContent = "Hide";
        } catch (err) {
            console.error("Error adding comment", err);
            alert("Could not add comment. Please try again.");
        }
    }

    sendBtn.addEventListener("click", sendComment);

    inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendComment();
        }
    });
}

// ---------------------------------------------------------------------
// THEME / PREFERENCES (Dark Mode)
// ---------------------------------------------------------------------
const THEME_KEY = "calmTheme";

export function applySavedTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    if (saved === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
}

document.addEventListener("DOMContentLoaded", applySavedTheme);

export function loadPreferences() {
    applySavedTheme();
    const toggle = document.getElementById("darkToggle");
    if (toggle) {
        toggle.checked = document.body.classList.contains("dark");
    }
}

export function toggleDarkMode() {
    const nowDark = !document.body.classList.contains("dark");
    if (nowDark) {
        document.body.classList.add("dark");
        localStorage.setItem(THEME_KEY, "dark");
    } else {
        document.body.classList.remove("dark");
        localStorage.setItem(THEME_KEY, "light");
    }

    const toggle = document.getElementById("darkToggle");
    if (toggle) {
        toggle.checked = nowDark;
    }
}

// ---------------------------------------------------------------------
// THREAD VIEW (single post + replies, based on posts/{id})
// ---------------------------------------------------------------------
function getThreadIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

export async function loadThread() {
    const mainPost   = document.getElementById("mainPost");
    const repliesList = document.getElementById("repliesList");
    if (!mainPost || !repliesList) return;

    const threadId = getThreadIdFromUrl();
    if (!threadId) {
        mainPost.textContent = "No thread selected.";
        repliesList.innerHTML = "";
        return;
    }

    try {
        const postRef  = doc(db, "posts", threadId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            mainPost.textContent = "Post not found.";
            repliesList.innerHTML = "";
            return;
        }

        const post = postSnap.data();

        if (post.type === "photo") {
            mainPost.innerHTML = `
                <img src="${post.imageUrl}" style="width:100%;border-radius:12px;margin-bottom:10px;" />
                <div class="tag">${post.tag || "Photography"}</div>
            `;
        } else {
            mainPost.innerHTML = `
                <div>${post.content || ""}</div>
                <div class="tag">${post.tag || "Reflection"}</div>
            `;
        }

        const repliesRef = collection(db, "posts", threadId, "replies");
        const repliesQ   = query(repliesRef, orderBy("created", "asc"));
        const repliesSnap = await getDocs(repliesQ);

        repliesList.innerHTML = "";

        if (repliesSnap.empty) {
            repliesList.innerHTML = `
                <div style="text-align:center;font-size:13px;color:#4c5c6b;margin-top:12px;">
                    No replies yet. Be the first to respond.
                </div>
            `;
            return;
        }

        repliesSnap.forEach(docSnap => {
            const reply = docSnap.data();
            const div   = document.createElement("div");
            div.className = "reply";

            const userName = reply.userName || "Someone";

            div.innerHTML = `
                <div class="reply-user">${userName}</div>
                <div>${reply.text || ""}</div>
            `;
            repliesList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        mainPost.textContent = "Something went wrong loading this thread.";
    }
}

export async function createReply() {
    const input = document.getElementById("replyInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
        alert("Write a reply first.");
        return;
    }

    const threadId = getThreadIdFromUrl();
    if (!threadId) {
        alert("No thread found for this reply.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You need to be signed in to reply.");
        return;
    }

    try {
        const repliesRef = collection(db, "posts", threadId, "replies");
        await addDoc(repliesRef, {
            text,
            userId: user.uid,
            userName: user.displayName || user.email || "Someone",
            created: serverTimestamp()
        });

        input.value = "";
        await loadThread();
    } catch (err) {
        console.error(err);
        alert("Couldn't send your reply. Please try again.");
    }
}

// ---------------------------------------------------------------------
// AUTH BUTTON WIRING (index.html, signup.html)
// ---------------------------------------------------------------------
function wireAuthButtons() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", event => {
            event.preventDefault();
            loginUser();
        });
    }

    const signupBtn = document.getElementById("signupBtn");
    if (signupBtn) {
        signupBtn.addEventListener("click", event => {
            event.preventDefault();
            signUpUser();
        });
    }
}

// Run after DOM is ready, on any page that includes script.js
document.addEventListener("DOMContentLoaded", wireAuthButtons);

// ---------------------------------------------------------------------
// Expose functions on window for inline HTML handlers
// ---------------------------------------------------------------------
window.signUpUser        = signUpUser;
window.loginUser         = loginUser;
window.logoutUser        = logoutUser;
window.signOutUser       = signOutUser;

window.selectMood        = selectMood;
window.createTextPost    = createTextPost;
window.createPhotoPost   = createPhotoPost;

window.loadFeed          = loadFeed;
window.loadProfile       = loadProfile;
window.updateDisplayName = updateDisplayName;
window.editProfile       = editProfile;

window.loadThread        = loadThread;
window.createReply       = createReply;

window.loadPreferences   = loadPreferences;
window.toggleDarkMode    = toggleDarkMode;
window.applySavedTheme   = applySavedTheme;
