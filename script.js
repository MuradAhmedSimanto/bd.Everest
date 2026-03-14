function setSrcSafe(id, src){
  const el = document.getElementById(id);
  if (el) el.src = src;
}


async function uploadToCloudinary(file) {
  const cloudName = "ddn8et0q4";
  const uploadPreset = "everest_unsigned";

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Upload failed");
  }

  // Fast CDN delivery
  return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}

let UPLOAD_BUSY_COUNT = 0;

function showUploadBusy(label = "Uploading...") {
  UPLOAD_BUSY_COUNT++;
  const el = document.getElementById("uploadIndicator");
  if (!el) return;
  el.querySelector(".txt").textContent = label;
  el.style.display = "flex";
}

function hideUploadBusy() {
  UPLOAD_BUSY_COUNT = Math.max(0, UPLOAD_BUSY_COUNT - 1);
  const el = document.getElementById("uploadIndicator");
  if (!el) return;
  if (UPLOAD_BUSY_COUNT === 0) el.style.display = "none";
}


// ===== USER HEADER CACHE (instant profile header) =====
const USER_HEADER_CACHE = new Map(); // uid -> {name, photo, cover, ts}

function cacheUserHeader(uid, data){
  if (!uid) return;
  USER_HEADER_CACHE.set(uid, {
    name: data.name || "",
    photo: data.photo || "",
    cover: data.cover || "",
    ts: Date.now()
  });
}

function getCachedUserHeader(uid){
  return USER_HEADER_CACHE.get(uid) || null;
}








let MEMORY_POSTS = [];


let MEMORY_PROFILE_NAME = "";

//caption secton
function formatCaption(text) {
  const words = text.split(/\s+/).filter(w => w);

  if (words.length <= 50) {
    return {
      preview: text,
      full: text,
      showReadMore: false
    };
  }

  const preview = words.slice(0, 40).join(" ");

  return {
    preview: preview,
    full: text,
    showReadMore: true
  };
}
let posts = [];






// ===== FAST FEED CACHE =====
let FEED_CACHE = [];
let FEED_CACHE_MAP = new Map();
let postsUnsub = null;

function normalizePost(doc){
  const p = doc.data() || {};
  return {
    postId: doc.id,
    userId: p.userId,
    type: p.type,
    media: p.media,
    caption: p.caption || "",
    userName: p.userName || "User",
    userPhoto: p.userPhoto || MEMORY_PROFILE_PHOTO || "",
    isProfileUpdate: !!p.isProfileUpdate,
    updateType: p.updateType || "",
    createdAt: p.createdAt || 0
  };
}
/* ================= LEFT DRAWER MENU ================= */
const menuBtn = document.getElementById("menuBtn");
const leftDrawer = document.getElementById("leftDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerCloseBtn = document.getElementById("drawerCloseBtn");

function openDrawer(){
  if (!leftDrawer || !drawerOverlay) return;

  // header sync (name, pic, badge uid)
  const dn = document.getElementById("drawerName");
  if (dn) dn.textContent = (MEMORY_PROFILE_NAME || "Your Name");

  const av = document.getElementById("drawerAvatar");
  const pp = document.getElementById("profilePicBig")?.src || document.getElementById("profilePic")?.src;
  if (av && pp) av.src = pp;

  const dvb = document.getElementById("drawerVerifiedBadge");
  if (dvb) dvb.dataset.verifiedUid = auth.currentUser?.uid || "";

  // open
  leftDrawer.classList.add("open");
  drawerOverlay.classList.add("open");
  document.body.classList.add("drawer-open");
  leftDrawer.setAttribute("aria-hidden", "false");

  // refresh verified badge display using your existing hydrator
  VERIFIED_CACHE?.clear?.();
  hydrateVerifiedBadges?.();
}

function closeDrawer(){
  if (!leftDrawer || !drawerOverlay) return;
  leftDrawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  document.body.classList.remove("drawer-open");
  leftDrawer.setAttribute("aria-hidden", "true");
}

menuBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  e.stopPropagation();
  openDrawer();
});

drawerOverlay?.addEventListener("click", closeDrawer);
drawerCloseBtn?.addEventListener("click", closeDrawer);

document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape") closeDrawer();
});

// drawer এর ভিতরে যে কোন link চাপলে drawer বন্ধ
leftDrawer?.addEventListener("click", (e)=>{
  const a = e.target.closest("a");
  if (!a) return;
  if (a.classList.contains("logo-item")) return;
  closeDrawer();
});


/* ================= ACTIVE ICON ================= */
const icons = document.querySelectorAll(".menu-icon");
function setActive(icon) {
  icons.forEach(i => i.classList.remove("active"));
  icon.classList.add("active");
}

/* ================= PAGE SWITCH ================= */
const homeIcon = document.getElementById("homeIcon");
const profileIcon = document.getElementById("profileIcon");
const notificationIcon = document.getElementById("notificationIcon");
const messageIcon = document.getElementById("messageIcon");

const homePage = document.getElementById("homePage");
const profilePage = document.getElementById("profilePage");
const notificationPage = document.getElementById("notificationPage");
const messagePage = document.getElementById("messagePage");

homeIcon.onclick = () => {
  homePage.style.display = "block";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  setActive(homeIcon);
  gotoPage("home");
  window.scrollTo(0, 0);

  document.body.classList.remove("profile-mode"); // ✅ add
};


profileIcon.onclick = () => {
  
  // guest হলে শুধু message দেখাবে, modal খুলবে না
  if (typeof auth === "undefined" || !auth.currentUser) {
    alert("Please signup to view profile");
    return;
  }

  const myUid = auth.currentUser.uid;

  const prefill = {
    name: (MEMORY_PROFILE_NAME || "").trim(),
    photo:
      document.getElementById("profilePicBig")?.src ||
      document.getElementById("profilePic")?.src ||
      ""
  };

  cacheUserHeader(myUid, prefill);
  openUserProfile(myUid, prefill);

  homePage.style.display = "none";
  profilePage.style.display = "block";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  setActive(profileIcon);
  gotoPage("profile");
  window.scrollTo(0, 0);
  document.body.classList.add("profile-mode");
};


notificationIcon.onclick = () => {
  setNavbarVisible(false);
  homePage.style.display = "none";
  profilePage.style.display = "none";
  messagePage.style.display = "none";
  notificationPage.style.display = "block";
  icons.forEach(i => i.classList.remove("active"));
  gotoPage("notification");
  window.scrollTo(0, 0);
};

messageIcon.onclick = () => {
  setNavbarVisible(false);
  homePage.style.display = "none";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "block";
  icons.forEach(i => i.classList.remove("active"));
  gotoPage("message");
  window.scrollTo(0, 0);
};




//oner profile//
function setProfileOwnerUI(isOwner){
  // camera buttons
  const profileCam = document.getElementById("profileCam");
  const coverCam   = document.getElementById("coverCam");

  // bio edit
  const editBioBtn = document.getElementById("editBioBtn");
  const saveBioBtn = document.getElementById("saveBioBtn");
  const bioInput   = document.getElementById("bioInput");
  const bioText    = document.getElementById("bioText");

  // optional: change name button (settings/dropdown এ থাকলে)
  const changeNameBtn = document.getElementById("changeNameBtn");

  const show = (el) => { if (el) el.style.display = ""; };
  const hide = (el) => { if (el) el.style.display = "none"; };

  if (isOwner){
    show(profileCam);
    show(coverCam);
    show(editBioBtn);
    // save button normally hidden থাকে edit click না করা পর্যন্ত
    if (saveBioBtn) saveBioBtn.style.display = "none";
    if (bioInput) bioInput.style.display = "none";
    if (bioText) bioText.style.display = "block";
    show(changeNameBtn);
  } else {
    hide(profileCam);
    hide(coverCam);
    hide(editBioBtn);
    hide(saveBioBtn);

    // অন্যের প্রোফাইলে bio input/show state clean রাখো
    if (bioInput) bioInput.style.display = "none";
    if (bioText) bioText.style.display = "block";

    hide(changeNameBtn);
  }
}




/* ================= SETTINGS: CLEAN PAGE MODE ================= */
const settingsBtn = document.getElementById("settingsBtn");
const settingsPage = document.getElementById("settingsPage");
const settingsBackBtn = document.getElementById("settingsBackBtn");

let PREV_PAGE = "home";

function hideAllPages(){
  homePage.style.display = "none";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  if (settingsPage) settingsPage.style.display = "none";
}

function detectCurrentPage(){
  if (profilePage.style.display === "block") return "profile";
  if (notificationPage.style.display === "block") return "notification";
  if (messagePage.style.display === "block") return "message";
  return "home";
}

function showPrevPage(){
  hideAllPages();
  document.body.classList.remove("settings-open");

  if (PREV_PAGE === "profile") profilePage.style.display = "block";
  else if (PREV_PAGE === "notification") notificationPage.style.display = "block";
  else if (PREV_PAGE === "message") messagePage.style.display = "block";
  else homePage.style.display = "block";

  window.scrollTo(0,0);
}

function openSettings(){
  PREV_PAGE = detectCurrentPage();
  gotoPage("settings");

  hideAllPages();
  document.body.classList.add("settings-open");
  if (settingsPage) settingsPage.style.display = "block";

  window.scrollTo(0,0);
}

settingsBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  openSettings();
});

settingsBackBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  gotoPage("home");
  showPrevPage();
});




/* ================= POST SYSTEM ================= */
function createPost({
  postId,
  userId,
  type,
  media,
  caption = "",
  userName,
  userPhoto,
 

  isProfileUpdate = false,
  updateType = "",
  skipSave = false,
  target = "both"
}) {

const isOwner = !!(auth.currentUser && auth.currentUser.uid === userId);



  const feed = document.getElementById("feed");
  const profileFeed = document.getElementById("profileFeed");
  


  let updateText = "";
  if (isProfileUpdate && updateType === "profile") updateText = "updated profile picture";
  if (isProfileUpdate && updateType === "cover") updateText = "updated cover photo";

 const postHTML = `
  <div class="post" data-id="${postId}" data-owner-id="${userId}">

    <div class="post-header">
      <div class="post-user-left">
        <img class="post-user-pic" data-uid="${userId}" src="${userPhoto || ""}" />

        <div class="post-user-meta">
          <div class="post-user-name">
            <span class="uname" data-uid="${userId}">${userName || ""}</span>

            <span class="verified-badge"
                  data-verified-uid="${userId}"
                  title="Verified"
                  style="display:none;">
              <svg class="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
               <path
                   d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z"
                   fill="#ff1f1f"
                   />

                <path
                  d="M9.3 12.6l1.9 1.9 4.2-4.3"
                  fill="none"
                  stroke="#ffffff"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </div>

          ${updateText ? `<div class="post-update-text">${updateText}</div>` : ""}
        </div>
      </div>

      <div class="post-menu-wrapper">
        <div class="post-menu">⋯</div>

        <div class="post-menu-dropdown">
          ${isOwner ? `
            
            <div class="pm-item delete">
        <i class="fa-solid fa-trash"></i> Delete post
      </div>

            <div class="pm-item edit">
        <i class="fa-solid fa-pen"></i> Edit post
      </div>

            <div class="pm-item pin">
        <i class="fa-solid fa-thumbtack"></i> Pin post
      </div>

          ` : ``}

          <div class="pm-item save">
      <i class="fa-regular fa-bookmark"></i> Save post
    </div>

          <div class="pm-item copy">
      <i class="fa-solid fa-link"></i> Copy link
    </div>

          
        <div class="pm-item download">
      <i class="fa-solid fa-download"></i> Download post
    </div>

          <div class="pm-item hide">
      <i class="fa-solid fa-eye-slash"></i> Hide post
    </div>

           <div class="pm-item report">
      <i class="fa-solid fa-flag"></i> Report
    </div>

        </div>
          <div class="post-menu-overlay"></div>
      </div>
    </div>

    ${caption ? (() => {
      const c = formatCaption(caption);
      return `
        <div class="post-text ${c.showReadMore ? "collapsed" : ""}" data-full="${c.full}">
          ${c.preview}
        </div>
        ${c.showReadMore ? `<span class="read-more">Read more</span>` : ""}
      `;
    })() : ""}

    ${type === "text" ? `
      <div class="post-text">${media}</div>
    ` : `
      <div class="post-media">
        ${type === "image"
          ? `<img src="${media}" loading="lazy" decoding="async">`
          : `<video controls playsinline preload="metadata">
               <source src="${media}" type="video/mp4">
             </video>`
        }
      </div>
    `}

<!-- ✅ Reaction summary (UP) -->
<div class="reaction-summary"></div>

<!-- ✅ Actions row (Like / Comment / Share) -->
<div class="post-actions">
  <span class="action-btn like-btn" data-post="${postId}">
    <span class="like-text">👍 Like</span>

    <!-- reaction box stays inside like btn -->
    <div class="reaction-box">
      <span class="rx rx-like"  data-type="like">👍</span>
      <span class="rx rx-love"  data-type="love">❤️</span>
      <span class="rx rx-haha"  data-type="haha">😆</span>
      <span class="rx rx-wow"   data-type="wow">😮</span>
      <span class="rx rx-sad"   data-type="sad">😥</span>
      <span class="rx rx-angry" data-type="angry">😡</span>
    </div>
  </span>

  <span class="action-btn comment-btn" data-post="${postId}">💬 Comment</span>
  <span class="action-btn share-btn" data-post="${postId}">↗️ Share</span>
</div>
 </div>
`;





  if ((target === "both" || target === "home") && feed)
  feed.insertAdjacentHTML("beforeend", postHTML);

if ((target === "both" || target === "profile") && profileFeed)
  profileFeed.insertAdjacentHTML("beforeend", postHTML);

  
setTimeout(() => {
  document
    .querySelectorAll(`.post[data-id="${postId}"]`)
    .forEach(el => attachReactionListener(postId, el));
}, 0);




}

/* ================= PROFILE & COVER ================= */
const profileCam = document.getElementById("profileCam");
const coverCam = document.getElementById("coverCam");
const profileInput = document.getElementById("profileInput");
const coverInput = document.getElementById("coverInput");

const profilePic = document.getElementById("profilePic");
const profilePicBig = document.getElementById("profilePicBig");
const coverPic = document.getElementById("coverPic");

profileCam.onclick = () => profileInput.click();
coverCam.onclick = () => coverInput.click();

//sub profile
profileInput.onchange = async () => {
  const file = profileInput.files?.[0];
  profileInput.value = ""; // same file reselect fix
  if (!file || !auth.currentUser) return;

  showUploadBusy("Uploading profile photo...");

  try {
    // instant preview
    const localUrl = URL.createObjectURL(file);
    setSrcSafe("profilePic", localUrl);
    setSrcSafe("profilePicBig", localUrl);

    // upload cloudinary
    const url = await uploadToCloudinary(file);

    // final paint
    setSrcSafe("profilePic", url);
    setSrcSafe("profilePicBig", url);

    // cache
    MEMORY_PROFILE_PHOTO = url;

    // firestore save
    await db.collection("users").doc(auth.currentUser.uid).update({
      profilePic: url
    });

    // optional: create post
    await savePostToFirebase({
      type: "image",
      media: url,
      isProfileUpdate: true,
      updateType: "profile"
    });

  } catch (err) {
    console.error(err);
    alert(err?.message || "Profile upload failed");
  } finally {
    hideUploadBusy();
  }
};


//sub cover
coverInput.onchange = () => {
  const file = coverInput.files[0];
  if (!file || !auth.currentUser) return;

 

  const r = new FileReader();
  r.onload = () => {
    coverPic.src = r.result;

    // ✅ save cover
    db.collection("users")
      .doc(auth.currentUser.uid)
      .update({
        coverPic: r.result
      });

savePostToFirebase({
  type: "image",
  media: r.result,
  isProfileUpdate: true,
  updateType: "cover"
});

  };

  r.readAsDataURL(file);
};






/* ================= TEXT POST ================= */
const textPostModal = document.getElementById("textPostModal");
const textPostInput = document.getElementById("textPostInput");
const textPostBtn = document.getElementById("textPostBtn");

const imageInput = document.getElementById("imageInput");





textPostModal.onclick = e => {
  if (e.target === textPostModal) textPostModal.style.display = "none";
};

textPostBtn.onclick = () => {
  const text = textPostInput.value.trim();
  if (!text) return;

  //firebase
savePostToFirebase({
  type: "text",
  media: text
});



  textPostModal.style.display = "none";
};
    //auth btn//
const authSubmit = document.getElementById("authSubmit");

/* ================= FIREBASE INIT ================= */
const firebaseConfig = {
  apiKey: "AIzaSyA1R9taxrRnPJw7GzNDJ9vyz0MZelnNLi4",
  authDomain: "everest-c9a99.firebaseapp.com",
  projectId: "everest-c9a99",
  storageBucket: "everest-c9a99.firebasestorage.app",
  messagingSenderId: "978178022660",
  appId: "1:978178022660:web:9c210ca91c07cabb400451"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 🔥 Enable offline cache (instant load)
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    console.warn("Persistence error:", err.code);
  });

/* ===== GUEST POST BLOCK ===== */
auth.onAuthStateChanged(user => {
  const postBtn = document.getElementById("postBtn");
  const mindBox = document.querySelector(".mind");

  if (!postBtn || !mindBox) return;

  if (!user) {
    postBtn.style.display = "none";
    mindBox.style.pointerEvents = "none";
    mindBox.style.opacity = "0.6";
    mindBox.innerText = "what are you thinking";
  } else {
    postBtn.style.display = "";
    mindBox.style.pointerEvents = "";
    mindBox.style.opacity = "";
  }
});



//fast delet post//
// ===== Firestore batch delete helper =====
async function deleteQueryBatch(query, batchSize = 400) {
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    if (snap.size < batchSize) break;
  }
}

// ===== Delete comments + replies tree =====
async function deleteCommentsTree(postRef) {
  // comments fetch (limit বড় করলে slow হতে পারে)
  const csnap = await postRef.collection("comments").get();

  for (const cdoc of csnap.docs) {
    const cRef = cdoc.ref;

    // replies delete
    await deleteQueryBatch(cRef.collection("replies"), 400);

    // comment doc delete
    await cRef.delete();
  }
}

// ===== Full delete: reactions + comments/replies + post =====
async function deletePostWithAllData(postId) {
  const postRef = db.collection("posts").doc(postId);

  // 1) reactions
  await deleteQueryBatch(postRef.collection("reactions"), 400);

  // 2) comments + replies
  await deleteCommentsTree(postRef);

  // 3) main post doc
  await postRef.delete();
}


//save cover/profile
auth.onAuthStateChanged(user => {
  if (!user) return;

  db.collection("users").doc(user.uid).get().then(doc => {
    if (!doc.exists) return;

    const data = doc.data();

    const fullName = data.firstName + " " + data.lastName;
    MEMORY_PROFILE_NAME = fullName;

    document.getElementById("profileName").innerText = fullName;

    // ✅ profile badge uid set + hydrate
const pb = document.getElementById("profileVerifiedBadge");
if (pb) pb.dataset.verifiedUid = user.uid;

VERIFIED_CACHE.clear();
hydrateVerifiedBadges();


    // profile pic
    if (data.profilePic) {
      profilePic.src = data.profilePic;
      profilePicBig.src = data.profilePic;
    }

    // cover pic
    if (data.coverPic) {
      coverPic.src = data.coverPic;
    }
  });
});


/* ================= AUTH ELEMENTS ================= */
const authModal = document.getElementById("authModal");
const authMsg   = document.getElementById("authMsg");

const stepOne = document.getElementById("stepOne");
const stepTwo = document.getElementById("stepTwo");
//sinup model back aro//
const step1Arrow = document.getElementById("step1Arrow");
const step2Arrow = document.getElementById("step2Arrow");

function goStep1(){
  stepOne.style.display = "block";
  stepTwo.style.display = "none";
  if (authMsg) authMsg.textContent = "";

  // optional: password clear
  const p1 = document.getElementById("password");
  const p2 = document.getElementById("confirmPassword");
  if (p1) p1.value = "";
  if (p2) p2.value = "";
}

// STEP 1 arrow: close modal + open drawer
step1Arrow?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  goStep1();
  authModal.style.display = "none";

  // drawer open (তোমার already আছে)
  if (typeof openDrawer === "function") openDrawer();
});

// STEP 2 arrow: go back to step 1
step2Arrow?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  goStep1();
});

/* ================= SIGNUP PROMPT ================= */
function promptSignup(message = "Please signup to react") {
  alert(message);

  if (authModal) {
    authModal.style.display = "flex";
    if (stepOne) stepOne.style.display = "block";
    if (stepTwo) stepTwo.style.display = "none";
  }
}

document.addEventListener("click", (e) => {
  const clickedUser = e.target.closest(".post-user-pic[data-uid], .uname[data-uid]");
  if (!clickedUser) return;

  const uid = clickedUser.dataset.uid;
  if (!uid) return;

  // ✅ Guest allowed to view profiles from posts
  // (Navbar profile button still protected separately)

  // instant prefill from DOM (fast header render)
  const postEl = clickedUser.closest(".post");
  const nameEl = postEl?.querySelector(`.uname[data-uid="${uid}"]`);
  const imgEl  = postEl?.querySelector(`.post-user-pic[data-uid="${uid}"]`);

  const prefill = {
    name: (nameEl?.textContent || "").trim(),
    photo: imgEl?.getAttribute("src") || imgEl?.src || ""
  };

  // cache for speed
  cacheUserHeader(uid, prefill);

  // open profile (guest-safe)
  openUserProfile(uid, prefill);
});



const signupBtn   = document.getElementById("signupBtn");
const continueBtn = document.getElementById("continueBtn");
const authSubmitBtn = document.getElementById("authSubmit");

/* ================= OPEN SIGNUP MODAL ================= */
signupBtn.onclick = (e) => {
  e.preventDefault();

  authModal.style.display = "flex";
  stepOne.style.display = "block";
  stepTwo.style.display = "none";

  authMsg.innerText = "";
};

/* ================= CLOSE MODAL ================= */
authModal.onclick = (e) => {
  if (e.target === authModal) {
    authModal.style.display = "none";
  }
};

/* ================= STEP 1 → CONTINUE ================= */
continueBtn.onclick = () => {
  const contact   = document.getElementById("authContact").value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName  = document.getElementById("lastName").value.trim();
  const gender    = document.getElementById("gender").value;
  const dob       = document.getElementById("dob").value;

  if (!contact || !firstName || !lastName || !gender || !dob) {
    authMsg.textContent = "Please fill all fields";
    return;
  }

  authMsg.textContent = "";
  stepOne.style.display = "none";
  stepTwo.style.display = "block";
};

/* ================= STEP 2 → SIGNUP ================= */
/* ================= STEP 2 → SIGNUP ================= */
authSubmitBtn.onclick = () => {
  const contact   = document.getElementById("authContact").value.trim();
  const password  = document.getElementById("password").value;
  const confirm   = document.getElementById("confirmPassword").value;
  const firstName = document.getElementById("firstName").value.trim();
  const lastName  = document.getElementById("lastName").value.trim();
  const gender    = document.getElementById("gender").value;
  const dob       = document.getElementById("dob").value;

  if (!password || !confirm) {
    authMsg.textContent = "Password required";
    return;
  }

  if (password !== confirm) {
    authMsg.textContent = "Passwords do not match";
    return;
  }

  const email = contact.includes("@")
    ? contact
    : contact + "@everest.app";

  // ✅ Add loading spinner
  authSubmitBtn.classList.add("loading");
  authSubmitBtn.disabled = true;

  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      return db.collection("users").doc(cred.user.uid).set({
        contact,
        firstName,
        lastName,
        gender,
        dob,
        verified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      const fullName = firstName + " " + lastName;
      MEMORY_PROFILE_NAME = fullName;
      document.getElementById("profileName").innerText = fullName;

      // simulate 1.5s loading before showing success
      setTimeout(() => {
        authSubmitBtn.classList.remove("loading");
        authSubmitBtn.disabled = false;

        document.getElementById("signupSuccess").style.display = "block";

        setTimeout(() => {
          document.getElementById("signupSuccess").style.display = "none";
        }, 3000);

        // switch page
        homePage.style.display = "none";
        profilePage.style.display = "block";
        notificationPage.style.display = "none";
        messagePage.style.display = "none";
        setActive(profileIcon);

        authModal.style.display = "none";
      }, 1500);
    })
    .catch((err) => {
      authMsg.textContent = err.message;
      console.error(err);
      authSubmitBtn.classList.remove("loading");
      authSubmitBtn.disabled = false;
    });
};

      
   //cahnge id name section//
// ===== CHANGE NAME (FULL) =====
const changeNameBtn   = document.getElementById("changeNameBtn");
const changeNameModal = document.getElementById("changeNameModal");
const saveNameBtn     = document.getElementById("saveNameBtn");
const changeNameMsg   = document.getElementById("changeNameMsg");

function openChangeNameModal() {
  if (!auth.currentUser) {
    promptSignup("Please signup/login to change name");
    return;
  }

  // prefll current name
  const current = (MEMORY_PROFILE_NAME || "").trim().split(" ");
  const first = current.slice(0, 1).join(" ");
  const last  = current.slice(1).join(" ");

  document.getElementById("newFirstName").value = first || "";
  document.getElementById("newLastName").value  = last || "";

  if (changeNameMsg) changeNameMsg.textContent = "";
   openModalHistory("changeNameModal");
}

function closeChangeNameModal() {
  if (!changeNameModal) return;
  changeNameModal.style.display = "none";
}

if (changeNameBtn) {
  changeNameBtn.onclick = (e) => {
    e.preventDefault();
    openChangeNameModal();
  };
}

if (changeNameModal) {
  changeNameModal.onclick = (e) => {
    if (e.target === changeNameModal) closeChangeNameModal();
  };
}

async function saveUserName(firstName, lastName) {
  const uid = auth.currentUser.uid;

  await db.collection("users").doc(uid).update({
    firstName,
    lastName,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const fullName = (firstName + " " + lastName).trim();
  MEMORY_PROFILE_NAME = fullName;

  // Profile header update
  const pn = document.getElementById("profileName");
  if (pn) pn.textContent = fullName;

  // Also update all rendered post names (fast)
  updateRenderedNamesForUid(uid, fullName);
}

if (saveNameBtn) {
  saveNameBtn.onclick = async () => {
    if (!auth.currentUser) return;

    const fn = (document.getElementById("newFirstName").value || "").trim();
    const ln = (document.getElementById("newLastName").value || "").trim();

    if (!fn || !ln) {
      if (changeNameMsg) changeNameMsg.textContent = "First name এবং Last name দিন";
      return;
    }

    if ((fn + " " + ln).length > 40) {
      if (changeNameMsg) changeNameMsg.textContent = "Name অনেক বড় হয়ে গেছে (max ~40 chars)";
      return;
    }

    saveNameBtn.disabled = true;
    saveNameBtn.classList.add("loading");

    try {
      await saveUserName(fn, ln);
      closeChangeNameModal();
    } catch (err) {
      console.error(err);
      if (changeNameMsg) changeNameMsg.textContent = "Failed to update name";
    } finally {
      saveNameBtn.disabled = false;
      saveNameBtn.classList.remove("loading");
    }
  };
}



// ===== PROFILE SUB DROPDOWN (SIDE) =====
// ===== DROPDOWN PANEL SWITCH =====
const menuProfileEl      = document.getElementById("menuProfile");
const mainMenuPanel      = document.getElementById("mainMenuPanel");
const changeMenuPanel    = document.getElementById("changeMenuPanel");
const closeChangeMenuBtn = document.getElementById("closeChangeMenu");
const changeNameBtnEl    = document.getElementById("changeNameBtn");

function showMainMenu(){
  if (mainMenuPanel) mainMenuPanel.style.display = "block";
  if (changeMenuPanel) changeMenuPanel.style.display = "none";
}

function showChangeMenu(){
  if (mainMenuPanel) mainMenuPanel.style.display = "none";
  if (changeMenuPanel) changeMenuPanel.style.display = "block";
}

function closeAllDropdown(){
  const dropdownMenu =
    document.getElementById("dropdownMenu") || document.querySelector(".dropdown-menu");

  if (dropdownMenu) dropdownMenu.classList.remove("show");
  showMainMenu();
}


// Profile -> open change panel
if (menuProfileEl) {
  menuProfileEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showChangeMenu();
  });
}

// Change name -> open modal + close dropdown
if (changeNameBtnEl) {
  changeNameBtnEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openChangeNameModal();
    closeAllDropdown();
  });
}

// X -> close everything
if (closeChangeMenuBtn) {
  closeChangeMenuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllDropdown();
  });
}

// outside click -> close + reset
window.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrapper")) {
    closeAllDropdown();
  }
});





/* ================= BIO EDIT ================= */
const editBioBtn = document.getElementById("editBioBtn");
const saveBioBtn = document.getElementById("saveBioBtn");
const bioText    = document.getElementById("bioText");
const bioInput   = document.getElementById("bioInput");

editBioBtn.onclick = () => {
  bioInput.value = bioText.innerText;
  bioText.style.display = "none";
  bioInput.style.display = "block";
  saveBioBtn.style.display = "inline-block";
  editBioBtn.style.display = "none";
};

saveBioBtn.onclick = () => {
  const text = bioInput.value.trim();

  const wordCount = text.split(/\s+/).filter(w => w).length;

  if (wordCount > 100) {
    alert("Bio maximum 100 words allowed");
    return;
  }

  bioText.innerText = text;

  bioText.style.display = "block";
  bioInput.style.display = "none";
  saveBioBtn.style.display = "none";
  editBioBtn.style.display = "inline-block";
};


//post dropdown//

//post delet section
document.addEventListener("click", e => {

if (e.target.closest(".reaction-box")) return;


const item = e.target.closest(".pm-item");
if (item) {
  const post = item.closest(".post");
  const menu = post?.querySelector(".post-menu-dropdown");
  if (menu) menu.classList.remove("show");
}

  // CLOSE MENUS
  document.querySelectorAll(".post-menu-dropdown").forEach(m => {
    if (!m.parentElement.contains(e.target)) {
      m.classList.remove("show");
    }
  });

  // TOGGLE MENU
  if (e.target.closest(".post-menu")) {
  const btn = e.target.closest(".post-menu");
  const menu = btn.nextElementSibling;
  if (!menu) return;

  const willOpen = !menu.classList.contains("show");

  if (willOpen) {
    openPostMenu(menu);
  } else {
    closePostMenusFromUI();
  }

  return;
}
  // DELETE POST
if (e.target.classList.contains("delete")) {
  e.stopPropagation();

  const postEl = e.target.closest(".post");
  if (!postEl) return;

  const postId = postEl.dataset.id;

  // ✅ instant UI remove
  document.querySelectorAll(`.post[data-id="${postId}"]`).forEach(x => x.remove());

  // ✅ remove from cache so it can't re-render back
  FEED_CACHE_MAP?.delete?.(postId);
  FEED_CACHE = (FEED_CACHE || []).filter(p => p.postId !== postId);
  try { localStorage.setItem("everest_feed_cache_v1", JSON.stringify(FEED_CACHE.slice(0,40))); } catch(e){}

  // ✅ silent full delete
  deletePostWithAllData(postId).catch(err => {
    console.error("FULL DELETE FAILED:", err);
    alert("Delete failed");
  });

  return;
}




//copy link
if (e.target.closest(".copy")) {
  e.stopPropagation();

  const postEl = e.target.closest(".post");
  if (!postEl) return;

  const postId = postEl.dataset.id;
  if (!postId) return;

  // always create shareable hash link
  const baseUrl = window.location.href.split("#")[0].split("?")[0];
  const postUrl = `${baseUrl}#post=${encodeURIComponent(postId)}`;

  const copyFallback = () => {
    const temp = document.createElement("input");
    temp.value = postUrl;
    document.body.appendChild(temp);
    temp.select();
    temp.setSelectionRange(0, 99999);

    try {
      document.execCommand("copy");
      alert("Post link copied");
    } catch (err) {
      console.error("Fallback copy failed:", err);
      prompt("Copy this link:", postUrl);
    }

    document.body.removeChild(temp);
  };

  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(postUrl)
        .then(() => {
          alert("Post link copied");
        })
        .catch((err) => {
          console.error("Clipboard copy failed:", err);
          copyFallback();
        });
    } else {
      copyFallback();
    }
  } catch (err) {
    console.error("Copy failed:", err);
    copyFallback();
  }

  const menu = postEl.querySelector(".post-menu-dropdown");
  if (menu) menu.classList.remove("show");

  return;
}



 


  // DOWNLOAD
  if (e.target.classList.contains("download")) {
    const media = e.target.closest(".post")?.querySelector("img,video");
    if (!media) return;

    const a = document.createElement("a");
    a.href = media.src;
    a.download = "post";
    a.click();
  }

 
 // EDIT POST
if (e.target.closest(".edit")) {
  e.stopPropagation();

  const postEl = e.target.closest(".post");
  if (!postEl) return;

  const postId = postEl.dataset.id;
  if (!postId) return;

  EditPostModule.openByPostId(postId);
  return;
}


// REPORT
if (e.target.classList.contains("report")) {
  e.stopPropagation();

  const postEl = e.target.closest(".post");
  if (!postEl) return;

  if (!auth.currentUser) {
    promptSignup("Please signup to report");
    return;
  }

  const postId = postEl.dataset.id;
  const ownerId = postEl.dataset.ownerId || "";

  openReportModal(postId, ownerId);

  const menu = postEl.querySelector(".post-menu-dropdown");
  if (menu) menu.classList.remove("show");

  return;
}


// SAVE
if (e.target.closest(".save")) {
  e.stopPropagation();
  alert("This feature is still under development");

  const postEl = e.target.closest(".post");
  const menu = postEl?.querySelector(".post-menu-dropdown");
  if (menu) menu.classList.remove("show");

  return;
}

// HIDE
if (e.target.closest(".hide")) {
  e.stopPropagation();
  alert("This feature is still under development");

  const postEl = e.target.closest(".post");
  const menu = postEl?.querySelector(".post-menu-dropdown");
  if (menu) menu.classList.remove("show");

  return;
}

  // PIN
  if (e.target.classList.contains("pin")) {
    alert("This feature is still under development");
  }
  });

/* ================= REPORT POST ================= */
const reportModal = document.getElementById("reportModal");
const cancelReportBtn = document.getElementById("cancelReportBtn");
const confirmReportBtn = document.getElementById("confirmReportBtn");

let REPORTING_POST_ID = null;
let REPORTING_OWNER_ID = null;

function openReportModal(postId, ownerId) {
  REPORTING_POST_ID = postId;
  REPORTING_OWNER_ID = ownerId;
  if (reportModal) reportModal.style.display = "flex";
}

function closeReportModal() {
  REPORTING_POST_ID = null;
  REPORTING_OWNER_ID = null;
  if (reportModal) reportModal.style.display = "none";
}

cancelReportBtn?.addEventListener("click", () => {
  closeReportModal();
});

reportModal?.addEventListener("click", (e) => {
  if (e.target === reportModal) closeReportModal();
});

confirmReportBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) {
    closeReportModal();
    promptSignup("Please signup to report");
    return;
  }

  if (!REPORTING_POST_ID || !REPORTING_OWNER_ID) {
    alert("Invalid report data");
    return;
  }

  confirmReportBtn.disabled = true;
  confirmReportBtn.textContent = "Reporting...";

  try {
    await db.collection("reports").add({
      postId: REPORTING_POST_ID,
      ownerId: REPORTING_OWNER_ID,
      reportedBy: auth.currentUser.uid,
      reason: "post_report",
      message: "User reported this post for review",
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeReportModal();
    alert("Your report submitted");
  } catch (err) {
    console.error("Report failed:", err);
    alert(err?.message || "Report failed");
  } finally {
    confirmReportBtn.disabled = false;
    confirmReportBtn.textContent = "Report";
  }
});




//post dropdown mobile back btn
let POST_MENU_HISTORY_OPEN = false;

function closeAllPostMenus() {
  document.querySelectorAll(".post-menu-dropdown").forEach(menu => {
    menu.classList.remove("show");
  });
}

function openPostMenu(menu) {
  closeAllPostMenus();
  menu.classList.add("show");

  if (!POST_MENU_HISTORY_OPEN) {
    POST_MENU_HISTORY_OPEN = true;
    history.pushState({ postMenuOpen: true }, "");
  }
}

function closePostMenusFromUI() {
  closeAllPostMenus();
  POST_MENU_HISTORY_OPEN = false;
}

window.addEventListener("popstate", () => {
  if (POST_MENU_HISTORY_OPEN) {
    closeAllPostMenus();
    POST_MENU_HISTORY_OPEN = false;
  }
});

// ✅ Cloudinary upload এর জন্য file রাখবো
let selectedFile = null;
let selectedMediaType = null;

imageInput.onchange = () => {
  const file = imageInput.files[0];
  if (!file) return;

  selectedFile = file;
  selectedMediaType = file.type.startsWith("image") ? "image" : "video";

  // ✅ fast preview (no base64)
  const previewURL = URL.createObjectURL(file);

 openModalHistory("mediaCaptionModal");

  const img = document.getElementById("mediaPreview");
  const video = document.getElementById("videoPreview");

  if (selectedMediaType === "image") {
    img.src = previewURL;
    img.style.display = "block";
    video.style.display = "none";
  } else {
    video.src = previewURL;
    video.style.display = "block";
    img.style.display = "none";
  }

  // reset input (same file আবার select করতে পারবে)
  imageInput.value = "";
};




 
document.getElementById("mediaPostBtn").onclick = async () => {
  const modal = document.getElementById("mediaCaptionModal");
  const input = document.getElementById("mediaCaptionInput");
  const btn   = document.getElementById("mediaPostBtn");

  const caption = (input?.value || "").trim();
  const file = selectedFile;
  const type = selectedMediaType;

  if (!file || !type) {
    alert("Please select photo/video first");
    return;
  }

  // ✅ modal instantly close + red indicator ON
  if (modal) modal.style.display = "none";
  showUploadBusy(type === "video" ? "Uploading video..." : "Uploading photo...");

  // double click block
  if (btn) { btn.disabled = true; btn.classList.add("loading"); }

  try {
    const mediaUrl = await uploadToCloudinary(file);

    await savePostToFirebase({
      type,
      media: mediaUrl,
      caption
    });

    // cleanup
    if (input) input.value = "";
    selectedFile = null;
    selectedMediaType = null;

  } catch (err) {
    console.error(err);
    alert(err?.message || "Upload failed");
  } finally {
    hideUploadBusy();
    if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
  }
};


  //firebase
let MEMORY_PROFILE_PHOTO = "";

async function savePostToFirebase({
  type,
  media,
  caption = "",
  isProfileUpdate = false,
  updateType = ""
}) {
  if (!auth.currentUser) {
    alert("Post করতে login লাগবে");
    return;
  }

  const uid = auth.currentUser.uid;

  // ✅ always try from memory first
  let userName  = (MEMORY_PROFILE_NAME || "").trim();
  let userPhoto = (MEMORY_PROFILE_PHOTO || "").trim();

  // ✅ if name OR photo missing -> fetch once from users collection
  if (!userName || !userPhoto) {
    const snap = await db.collection("users").doc(uid).get();
    if (snap.exists) {
      const d = snap.data() || {};

      userName =
        userName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim();

      userPhoto =
        userPhoto || d.profilePic || "";

      // ✅ cache for next posts
      MEMORY_PROFILE_NAME  = userName || MEMORY_PROFILE_NAME;
      MEMORY_PROFILE_PHOTO = userPhoto || MEMORY_PROFILE_PHOTO;
    }
  }

await db.collection("posts").add({
  userId: uid,
  userName: userName || "User",
  userPhoto: userPhoto || MEMORY_PROFILE_PHOTO || "",
    type,
    media,
    caption,
    isProfileUpdate,
    updateType,
    reactions: {},
    createdAt: Date.now()
  });
}



let holdTimer = null;
let activePost = null;

// ================= LONG PRESS DETECTION =================
document.addEventListener("mousedown", startHold);
document.addEventListener("touchstart", startHold);

function startHold(e) {
  const likeBtn = e.target.closest(".like-btn");
  if (!likeBtn) return;

if (!auth.currentUser) {
  promptSignup("Please signup to react");
  return;
}


  const postEl = likeBtn.closest(".post");
  const box = likeBtn.querySelector(".reaction-box");
  if (!box) return;

  activePost = postEl;

  // 0.5s hold → reaction box open
  holdTimer = setTimeout(() => {
    closeAllReactionBoxes(); // ensure only this box open
    box.classList.add("open");

  }, 500);
}

// ================= CLICK OR HOLD END =================
document.addEventListener("mouseup", endHold);
document.addEventListener("touchend", endHold);

async function endHold(e) {
  if (!activePost) return;

  const likeBtn = e.target.closest(".like-btn");
  const postEl = activePost;
  const postId = postEl.dataset.id;
  const uid = auth.currentUser?.uid;
  const postRef = db.collection("posts").doc(postId);
  const box = postEl.querySelector(".reaction-box");

  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;

// Normal click → ❤️ toggle only if box not open
    if (!box.classList.contains("open")) {

  if (!auth.currentUser) {
    promptSignup("Please signup to react");
    return;
  }

  try {
    const uid = auth.currentUser.uid;
    const rRef = db.collection("posts").doc(postId).collection("reactions").doc(uid);
    const snap = await rRef.get();

    if (snap.exists && snap.data()?.emoji === "👍") {
      await rRef.delete(); // remove reaction
    } else {
     //show reaction 
let userName = (MEMORY_PROFILE_NAME || "").trim();
let userPhoto = "";

if (!userName || !userPhoto) {
  const us = await db.collection("users").doc(uid).get();
  if (us.exists) {
    const d = us.data();
    userName = userName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
    userPhoto = d.profilePic || "";
    MEMORY_PROFILE_NAME = userName || MEMORY_PROFILE_NAME;
  }
}

await rRef.set({
  type: "like",
  emoji: "👍",
  userId: uid,
  userName: userName || "User",
  userPhoto: userPhoto || "",
  createdAt: Date.now()
});


    }
  } catch (err) {
    console.error(err);
  }
}

  }

  activePost = null;
}

// ================= CLICK HANDLER (REACTION + CLOSE) =================
document.addEventListener("click", (e) => {
  const emojiEl = e.target.closest(".reaction-box span");
  if (!emojiEl) return;

  e.preventDefault();
  e.stopPropagation(); // ✅ important: outside click handler যেন interfere না করে

  const postEl = emojiEl.closest(".post");
  if (!postEl) return;

  const postId = postEl.dataset.id;

  // ✅ 0.01s এর মধ্যে close: আগে close করো, পরে save
  const box = postEl.querySelector(".reaction-box");
  if (box) box.classList.remove("open");

  if (!auth.currentUser) {
    promptSignup("Please signup to react");
    return;
  }

  // async কাজটা background-like (but still now) — UI already updated
  (async () => {
    try {
      const uid = auth.currentUser.uid;
      const rRef = db.collection("posts").doc(postId).collection("reactions").doc(uid);

      const type = emojiEl.dataset.type; // like/love/haha...
      let userName = (MEMORY_PROFILE_NAME || "").trim();
      let userPhoto = "";

      // ✅ single fetch (তোমার কোডে ডাবল fetch ছিল)
      const us = await db.collection("users").doc(uid).get();
      if (us.exists) {
        const d = us.data() || {};
        userName = userName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
        userPhoto = d.profilePic || "";
        MEMORY_PROFILE_NAME = userName || MEMORY_PROFILE_NAME;
      }

      await rRef.set({
        type: type || "like",
        emoji: emojiEl.innerText,
        userId: uid,
        userName: userName || "User",
        userPhoto: userPhoto || "",
        createdAt: Date.now()
      });

  // 🔔 Notification send
   NotificationSystem.notifyReaction(postId, {
    uid: uid,
    userName: userName,
   userPhoto: userPhoto
   });

    } catch (err) {
      console.error(err);
    }
  })();

  return;
});

// outside click -> close all boxes (keep this separate)
document.addEventListener("click", (e) => {
  if (!e.target.closest(".like-btn") && !e.target.closest(".reaction-box")) {
    closeAllReactionBoxes();
  }
});


// ================= CLOSE ALL BOXES =================
function closeAllReactionBoxes() {
  document.querySelectorAll(".reaction-box.open").forEach(box => {
    box.classList.remove("open");
  });
}

// ================= REACTION LISTENER CACHE =================
//reaction count//
const reactionEmoji = {
  like: "👍",
  love: "❤️",
  haha: "😆",
  wow:  "😮",
  sad:  "😥",
  angry:"😡",
};

const reactionLabel = {
  like: "Like",
  love: "Love",
  haha: "Haha",
  wow: "Wow",
  sad: "Sad",
  angry: "Angry"
};

const reactionColor = {
  like:  "#e0245e",
  love:  "#e0245e",
  angry: "#800000",
  haha:  "#f7b125",
  wow:   "#f7b125",
  sad:   "#f7b125",
};


function renderFbReactionSummary(reactions, container){
  if (!container) return;

  if (!reactions.length){
    container.innerHTML = "";
    return;
  }

  // count by type
  const typeCount = {};
  for (const r of reactions){
    const t = r.type || "like";
    typeCount[t] = (typeCount[t] || 0) + 1;
  }

  // top 3 types
  const topTypes = Object.entries(typeCount)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([t])=>t);

  // first reactor (oldest)
  const first = reactions.slice().sort((a,b)=>a.createdAt - b.createdAt)[0];
  const firstName = first.userName || "User";
  const total = reactions.length;

  const iconsHTML = topTypes
    .map(t => `<span>${reactionEmoji[t] || "👍"}</span>`)
    .join("");

const text = total > 1 ? `${firstName} +${total-1}` : firstName;

container.innerHTML = `
  <div class="reaction-icons">${iconsHTML}</div>
  <div class="reaction-text">${text}</div>
`;
}


// ===== REACTION LISTENER SYSTEM (PASTE THIS) =====
const REACTION_UNSUBS = new Map(); // key -> unsub

function getReactionKey(postId, postEl){
  const scope = postEl.closest("#profileFeed") ? "profile" : "home";
  return postId + "|" + scope;
}

function cleanupReactionListeners(scope = null){
  for (const [key, unsub] of REACTION_UNSUBS.entries()){
    if (!scope || key.endsWith("|" + scope)){
      try { unsub && unsub(); } catch(e){}
      REACTION_UNSUBS.delete(key);
    }
  }
}

// ✅ REPLACE your old attachReactionListener with this one
function attachReactionListener(postId, postEl) {
  const key = getReactionKey(postId, postEl);

  // already listening for this post in this feed
  if (REACTION_UNSUBS.has(key)) return;

  const summaryEl = postEl.querySelector(".reaction-summary");
  const likeTextEl = postEl.querySelector(".like-text");

  const unsub = db.collection("posts").doc(postId).collection("reactions")
    .onSnapshot((snap) => {
      const reactions = [];
      let myType = null;
      const myUid = auth.currentUser?.uid;

      snap.forEach((d) => {
        const data = d.data() || {};
        reactions.push({
          type: data.type,
          emoji: data.emoji,
          userName: data.userName,
          createdAt: data.createdAt || 0
        });

        if (myUid && d.id === myUid) myType = data.type || "like";
      });

      renderFbReactionSummary(reactions, summaryEl);

      if (likeTextEl) {
        if (myType) {
          const emoji = reactionEmoji[myType] || "👍";
          likeTextEl.textContent = emoji + " " + (reactionLabel[myType] || "Like");
          likeTextEl.style.color = reactionColor[myType] || "#65676b";
        } else {
          likeTextEl.textContent = "👍 Like";
          likeTextEl.style.color = "#65676b";
        }
      }
    });

  REACTION_UNSUBS.set(key, unsub);
}

//show reaction//
const reactorsModal = document.getElementById("reactorsModal");
const reactorsList  = document.getElementById("reactorsList");
const reactTabsEl   = document.getElementById("reactTabs");
const reactorsClose = document.getElementById("reactorsClose");

function openReactorsModal(){ openModalHistory("reactorsModal"); }
function closeReactorsModal(){ reactorsModal?.classList.remove("open"); }

reactorsClose?.addEventListener("click", closeReactorsModal);
reactorsModal?.addEventListener("click", (e) => {
  if (e.target === reactorsModal) closeReactorsModal();
});

const TAB_ORDER = ["all","love","like","haha","wow","sad","angry"];

function tabIcon(type){
  if (type === "all") return "";
  return reactionEmoji[type] || "👍";
}

function buildCounts(list){
  const counts = { all: list.length };
  for (const r of list){
    const t = r.type || "like";
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

function renderTabs(counts, active){
  if (!reactTabsEl) return;

  const html = TAB_ORDER
    .filter(t => t === "all" ? true : (counts[t] || 0) > 0)
    .map(t => {
      const isActive = t === active ? "active" : "";
      const icon = t === "all" ? "" : `<span class="ticon">${tabIcon(t)}</span>`;
      const label = t === "all" ? "All" : "";
      const num = t === "all" ? counts.all : counts[t];
      return `<div class="react-tab ${isActive}" data-tab="${t}">${icon}${label}${num}</div>`;
    })
    .join("");

  reactTabsEl.innerHTML = html;
}

function renderReactorsList(list, filterType){
  if (!reactorsList) return;

  const filtered = (filterType === "all")
    ? list
    : list.filter(r => (r.type || "like") === filterType);

  if (!filtered.length){
    reactorsList.innerHTML = `<div style="padding:14px;color:#666;">No reactions</div>`;
    return;
  }

  const rows = filtered.map(r => {
    const name = r.userName || "User";
    const pic = r.userPhoto || "";
    const badge = r.emoji || reactionEmoji[r.type] || "👍";

    return `
      <div class="reactor-row">
        <div class="reactor-pic-wrap">
          <img class="reactor-pic"
     src="${pic}"
     onerror="this.onerror=null; this.src='https://i.imgur.com/6VBx3io.png';" />

          <div class="reactor-badge">${badge}</div>
        </div>
        <div class="reactor-name">${name}</div>
      </div>
    `;
  }).join("");

  reactorsList.innerHTML = rows;
}

//reaction show model//
async function showReactorsForPost(postId){
  if (!reactorsList || !reactTabsEl) return;

  // ✅ open immediately (0ms)
  openReactorsModal();

  // ✅ show skeleton (no "Loading..." text)
  reactTabsEl.innerHTML = `
    <div class="react-tab active">All</div>
  `;
  reactorsList.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="reactor-row" style="opacity:.7;">
      <div class="reactor-pic-wrap">
        <div class="reactor-pic" style="width:40px;height:40px;border-radius:50%;background:#eee;"></div>
        <div class="reactor-badge" style="background:#eee;color:transparent;">🙂</div>
      </div>
      <div class="reactor-name" style="height:12px;width:140px;background:#eee;border-radius:6px;"></div>
    </div>
  `).join("");

  try {
    // 1) reactions list fetch
    const snap = await db.collection("posts").doc(postId)
      .collection("reactions")
      .orderBy("createdAt", "desc")
      .limit(50) // ✅ speed cap
      .get();

    const raw = snap.docs.map(doc => {
      const r = doc.data() || {};
      const uid = r.userId || doc.id;
      return {
        type: r.type || "like",
        emoji: r.emoji || (reactionEmoji[r.type] || "👍"),
        userId: uid,
        userName: r.userName || "User",
        userPhoto: r.userPhoto || "",
        createdAt: r.createdAt || 0
      };
    });

    // 2) find missing users (only those without photo or real name)
    const needUids = Array.from(new Set(
      raw
        .filter(x => !x.userPhoto || x.userName === "User")
        .map(x => x.userId)
    ));

    // ✅ parallel fetch users (fast)
    const userDocs = await Promise.all(
      needUids.map(uid => db.collection("users").doc(uid).get())
    );

    const userMap = new Map();
    userDocs.forEach((us, i) => {
      const uid = needUids[i];
      userMap.set(uid, us.exists ? us.data() : null);
    });

    // 3) merge
    const list = raw.map(x => {
      const ud = userMap.get(x.userId);
      const nameFromUser = ud ? [ud.firstName, ud.lastName].filter(Boolean).join(" ").trim() : "";
      const photoFromUser = ud ? (ud.profilePic || "") : "";

      return {
        ...x,
        userName: (x.userName !== "User" ? x.userName : (nameFromUser || "User")),
        userPhoto: (x.userPhoto || photoFromUser || ""),
      };
    });

    // 4) render real UI
    const counts = buildCounts(list);
    let active = "all";

    renderTabs(counts, active);
    renderReactorsList(list, active);

    reactTabsEl.onclick = (e) => {
      const tab = e.target.closest(".react-tab")?.dataset?.tab;
      if (!tab) return;
      active = tab;

      reactTabsEl.querySelectorAll(".react-tab").forEach(x => x.classList.remove("active"));
      reactTabsEl.querySelector(`.react-tab[data-tab="${tab}"]`)?.classList.add("active");

      renderReactorsList(list, active);
    };

  } catch (err) {
    console.error(err);
    reactTabsEl.innerHTML = "";
    reactorsList.innerHTML = `<div style="padding:14px;color:#c00;">Failed to load</div>`;
  }
}


// ✅ click reaction summary -> open modal
document.addEventListener("click", (e) => {
  const sum = e.target.closest(".reaction-summary");
  if (!sum) return;

  const postEl = sum.closest(".post");
  const postId = postEl?.dataset?.id;
  if (!postId) return;

  showReactorsForPost(postId);
});




// ===== FAST HOME FEED SYSTEM =====

function renderFeedFromCache(){
  const feed = document.getElementById("feed");
  if (!feed) return;

  if (!FEED_CACHE.length) return;
cleanupReactionListeners("home");
  feed.innerHTML = "";

  FEED_CACHE.forEach(p => {
    createPost({ ...p, target: "home" });
  });

  hydratePostUserPhoto?.();
  hydratePostUserNames?.();
  VERIFIED_CACHE?.clear?.();
  hydrateVerifiedBadges?.();
  initFeedVideoSystem?.();
}

function persistFeedCache(){
  try {
    localStorage.setItem("everest_feed_cache_v1", JSON.stringify(FEED_CACHE.slice(0,40)));
  } catch(e){}
}

function loadFeedCache(){
  try {
    const raw = localStorage.getItem("everest_feed_cache_v1");
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)){
      FEED_CACHE = arr;
      FEED_CACHE_MAP = new Map(arr.map(x => [x.postId, x]));
    }
  } catch(e){}
}

function startPostsListener(){
  if (typeof postsUnsub === "function") postsUnsub();

  postsUnsub = db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(60)
    .onSnapshot((snapshot) => {

      REELS_SNAPSHOT = snapshot;

      // ✅ handle add/modify/remove properly
      snapshot.docChanges().forEach((ch) => {
        if (ch.type === "removed") {
          FEED_CACHE_MAP.delete(ch.doc.id);
        } else {
          const p = normalizePost(ch.doc);
          FEED_CACHE_MAP.set(p.postId, p);
        }
      });

      FEED_CACHE = Array.from(FEED_CACHE_MAP.values())
        .sort((a,b)=> b.createdAt - a.createdAt)
        .slice(0,60);

      renderFeedFromCache();
      persistFeedCache();
    });
}
// 🔥 Boot instantly
document.addEventListener("DOMContentLoaded", () => {
  loadFeedCache();        // local cache
  renderFeedFromCache();  // instant paint (if #feed exists)
  startPostsListener();   // realtime update
});
//vdo system
// ================= HOME FEED: MANUAL PLAY ONLY + SINGLE VIDEO RULE + OUT-OF-VIEW AUTO PAUSE (CLEAN) =================

let FEED_VIDEO_OBSERVER = null;
let FEED_ACTIVE_VIDEO = null;

// ✅ cleanup hooks (prevents scroll listener leak)
let FEED_SCROLL_TARGET = null;
let FEED_SCROLL_HANDLER = null;
let FEED_RESIZE_HANDLER = null;

function getFeedVideos() {
  return Array.from(document.querySelectorAll("#feed video"));
}

function safePause(v) {
  if (!v) return;
  try { v.pause(); } catch (e) {}
}

function safePlay(v) {
  if (!v) return;
  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function pauseAllExcept(exceptVideo = null) {
  getFeedVideos().forEach(v => {
    if (exceptVideo && v === exceptVideo) return;
    safePause(v);
  });
}

function setActiveVideo(v) {
  FEED_ACTIVE_VIDEO = v || null;
}

// ✅ find real scroll root (feed container or viewport)
function getScrollRoot() {
  const feed = document.querySelector("#feed");
  if (!feed) return null;

  const style = getComputedStyle(feed);
  const canScroll = /(auto|scroll)/.test(style.overflowY) && feed.scrollHeight > feed.clientHeight;
  return canScroll ? feed : null; // null => viewport
}

// ✅ strict: fully out of view = pause (works for container or window)
function isFullyOutOfView(v, rootEl) {
  const r = v.getBoundingClientRect();

  if (rootEl) {
    const fr = rootEl.getBoundingClientRect();
    return (
      r.bottom <= fr.top ||
      r.top >= fr.bottom ||
      r.right <= fr.left ||
      r.left >= fr.right
    );
  }

  return (
    r.bottom <= 0 ||
    r.top >= window.innerHeight ||
    r.right <= 0 ||
    r.left >= window.innerWidth
  );
}

function bindVideoOnce(v) {
  if (!v || v.dataset.feedBound === "1") return;
  v.dataset.feedBound = "1";

  // Manual tap/click toggle only (when controls=false)
  v.addEventListener("click", (e) => {
    if (v.controls) return; // controls enabled হলে play listener handle করবে
    e.preventDefault();

    if (v.paused) {
      pauseAllExcept(v);
      setActiveVideo(v);
      safePlay(v);
    } else {
      safePause(v);
      if (FEED_ACTIVE_VIDEO === v) setActiveVideo(null);
    }
  });

  // Any play (controls/programmatic) => single play enforce
  v.addEventListener("play", () => {
    pauseAllExcept(v);
    setActiveVideo(v);
  });

  v.addEventListener("pause", () => {
    if (FEED_ACTIVE_VIDEO === v) setActiveVideo(null);
  });

  v.addEventListener("ended", () => {
    if (FEED_ACTIVE_VIDEO === v) setActiveVideo(null);
  });
}

// ✅ external hard stop (page change etc.)
function stopHomeFeedVideos() {
  getFeedVideos().forEach(v => safePause(v));
  setActiveVideo(null);
}

function initFeedVideoSystem() {
  // ---------- cleanup previous ----------
  if (FEED_VIDEO_OBSERVER) {
    try { FEED_VIDEO_OBSERVER.disconnect(); } catch (e) {}
    FEED_VIDEO_OBSERVER = null;
  }

  if (FEED_SCROLL_TARGET && FEED_SCROLL_HANDLER) {
    try { FEED_SCROLL_TARGET.removeEventListener("scroll", FEED_SCROLL_HANDLER); } catch(e){}
  }
  if (FEED_RESIZE_HANDLER) {
    try { window.removeEventListener("resize", FEED_RESIZE_HANDLER); } catch(e){}
  }

  FEED_SCROLL_TARGET = null;
  FEED_SCROLL_HANDLER = null;
  FEED_RESIZE_HANDLER = null;

  setActiveVideo(null);

  // ---------- bind current videos ----------
  const videos = getFeedVideos();
  if (!videos.length) return;

  videos.forEach(bindVideoOnce);

  const rootEl = getScrollRoot();

  // ---------- single source of truth: pause if out of view ----------
  const checkAll = () => {
    const vids = getFeedVideos();
    vids.forEach(v => {
      // playing + fully out => pause
      if (!v.paused && isFullyOutOfView(v, rootEl)) {
        safePause(v);
        if (FEED_ACTIVE_VIDEO === v) setActiveVideo(null);
      }
    });
  };

  // IntersectionObserver (fast path)
  FEED_VIDEO_OBSERVER = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const v = entry.target;

      // If not intersecting => fully out => pause
      if (!entry.isIntersecting) {
        safePause(v);
        if (FEED_ACTIVE_VIDEO === v) setActiveVideo(null);
      }
    }
  }, {
    root: rootEl,
    rootMargin: "0px",
    threshold: [0, 0.01]
  });

  videos.forEach(v => FEED_VIDEO_OBSERVER.observe(v));

  // Scroll/resize fallback (fixes any IO edge case)
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      checkAll();
    });
  };

  FEED_SCROLL_TARGET = rootEl || window;
  FEED_SCROLL_HANDLER = onScroll;
  FEED_RESIZE_HANDLER = onScroll;

  FEED_SCROLL_TARGET.addEventListener("scroll", FEED_SCROLL_HANDLER, { passive: true });
  window.addEventListener("resize", FEED_RESIZE_HANDLER, { passive: true });

  // run once
  checkAll();
}


//rells//
/* ================= REELS MODULE (TikTok style | FINAL REPLACE) ================= */

const reelsIcon    = document.getElementById("reelsIcon");
const reelsPage    = document.getElementById("reelsPage");
const reelsWrap    = document.getElementById("reelsWrap");
const reelsBackBtn = document.getElementById("reelsBackBtn");

let REELS_SNAPSHOT = null;     // তোমার posts onSnapshot snapshot এখানে assign হবে
let REELS_OBSERVER = null;

// sound rules
let REELS_SOUND_UNLOCKED = false; // user first tap
let REELS_USER_MUTED = false;     // user toggle (false => sound on)

const REELS_AVATAR_CACHE = new Map(); // uid -> photo

function esc(s=""){ return String(s).replace(/[<>]/g,""); }

/* ---- stop everything ---- */
function stopAllReels(){
  document.querySelectorAll("#reelsWrap video").forEach(v => {
    try { v.pause(); } catch(e){}
  });

  // ✅ stop like listeners
  REELS_LIKE_UNSUBS.forEach(un => { try{ un && un(); }catch(e){} });
  REELS_LIKE_UNSUBS.clear();

  if (REELS_OBSERVER) {
    try { REELS_OBSERVER.disconnect(); } catch(e){}
    REELS_OBSERVER = null;
  }
}


function hideReelsPage(){
  if (!reelsPage) return;
  stopAllReels();
  reelsPage.style.display = "none";
}

/* ---- IMPORTANT: show navbar/menu after leaving reels ---- */
function forceShowNav(){
  document.body.classList.remove("nav-hidden");
  document.querySelector(".navbar")?.classList.remove("fb-hide");
}

/* ---- go home safely ---- */
function goHomeFromReels(){
  hideReelsPage();
  gotoPage("home");

  homePage.style.display = "block";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  if (typeof settingsPage !== "undefined" && settingsPage) settingsPage.style.display = "none";

  forceShowNav();
  setActive(homeIcon);
  window.scrollTo(0,0);
}

/* ---- open reels ---- */
function openReelsPage(){
  stopHomeFeedVideos();
  gotoPage("reels");
  if (!reelsPage || !reelsWrap) return;

  homePage.style.display = "none";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  if (typeof settingsPage !== "undefined" && settingsPage) settingsPage.style.display = "none";

  reelsPage.style.display = "block";
  document.body.classList.add("reels-open");
  document.body.classList.remove("reels-open");
  icons.forEach(i => i.classList.remove("active"));
  reelsIcon?.classList.add("active");

  window.scrollTo(0,0);
 renderReelsFast();
}

/* ---- sound: only current can be unmuted ---- */
function setCurrentReelSound(currentVideo){
  // mute all other videos
  document.querySelectorAll("#reelsWrap video").forEach(v => {
    if (v !== currentVideo) v.muted = true;
  });

  if (!currentVideo) return;

  // browser policy: unlock ছাড়া auto sound হবে না
  currentVideo.muted = REELS_SOUND_UNLOCKED ? REELS_USER_MUTED : true;

  // update all icons based on user toggle
  document.querySelectorAll("#reelsWrap .reel-mute-btn").forEach(btn => {
    btn.textContent = REELS_USER_MUTED ? "🔇" : "🔊";
  });
}

/*like coment shere*/
/* ---- build reel ---- */
function buildReelCard({ postId, userId, media, caption, userName, userPhoto }) {
  const safeCaption = esc(caption || "");
  const safeName    = esc(userName || "User");

  const me = auth.currentUser?.uid || "";
  const isOwner = (me && me === userId);

  return `
    <div class="reel" data-id="${postId}" data-owner="${userId}">
      
      <video class="reel-video"
        src="${media}"
        playsinline
        webkit-playsinline
        preload="metadata"
        loop></video>

      <!-- TOP RIGHT (mute only) -->
      <div class="reel-top-actions">
        <button class="reel-mute-btn" data-act="mute" type="button">🔇</button>
      </div>

      <div class="reel-overlay">
        
        <!-- USER + CAPTION -->
        <div class="reel-user">
          <img class="reel-avatar"
               data-uid="${userId}"
               src="${userPhoto || "https://i.imgur.com/6VBx3io.png"}"
               onerror="this.onerror=null; this.src='https://i.imgur.com/6VBx3io.png';" />

          <div class="reel-meta">
            <div class="reel-name">
              <span class="uname" data-uid="${userId}">${safeName}</span>

              <span class="verified-badge"
                    data-verified-uid="${userId}"
                    style="display:none;">
                <svg class="verified-icon" viewBox="0 0 24 24">
                  <path d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z"
                        fill="#ff1f1f"/>
                  <path d="M9.3 12.6l1.9 1.9 4.2-4.3"
                        fill="none"
                        stroke="#ffffff"
                        stroke-width="2.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"/>
                </svg>
              </span>
            </div>

            ${safeCaption ? `<div class="reel-caption">${safeCaption}</div>` : ``}
          </div>
        </div>

        <!-- RIGHT SIDE ACTIONS -->
        <div class="reel-actions">

          <div class="reel-action-item" data-act="like">
            <i class="fa-regular fa-heart"></i>
            <div class="reel-count" data-kind="like"></div>
          </div>

          <div class="reel-action-item" data-act="comment">
            <i class="fa-regular fa-comment"></i>
            <div class="reel-count" data-kind="comment"></div>
          </div>

          <div class="reel-action-item" data-act="share">
            <i class="fa-solid fa-share"></i>
            <div class="reel-count" data-kind="share"></div>
          </div>

          <div class="reel-action-item" data-act="save">
            <i class="fa-regular fa-bookmark"></i>
            <div class="reel-count" data-kind="save"></div>
          </div>

          <!-- 3 DOT AT BOTTOM -->
          <div class="reel-action-item reel-more-wrap" data-act="more">
            <i class="fa-solid fa-ellipsis"></i>

            <div class="reel-more-menu">

              ${isOwner ? `
              <div class="rm-item" data-act="delete">
                <i class="fa-solid fa-trash"></i>
                <span>Delete</span>
              </div>` : ``}

              <div class="rm-item" data-act="download">
                <i class="fa-solid fa-download"></i>
                <span>Download</span>
              </div>

              <div class="rm-item" data-act="copylink">
                <i class="fa-solid fa-link"></i>
                <span>Copy link</span>
              </div>

              <div class="rm-item" data-act="report">
                <i class="fa-regular fa-flag"></i>
                <span>Report</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}

/* ---- avatar fix (real profilePic) ---- */
async function hydrateReelsAvatars(){
  const imgs = Array.from(document.querySelectorAll("#reelsWrap .reel-avatar[data-uid]"));
  const uids = Array.from(new Set(imgs.map(x => x.dataset.uid).filter(Boolean)));

  const need = uids.filter(uid => !REELS_AVATAR_CACHE.has(uid));
  if (need.length){
    const docs = await Promise.all(
      need.map(uid => db.collection("users").doc(uid).get().catch(()=>null))
    );
    docs.forEach((snap, i) => {
      const uid = need[i];
      const photo = (snap && snap.exists) ? (snap.data()?.profilePic || "") : "";
      REELS_AVATAR_CACHE.set(uid, photo || "");
    });
  }

  imgs.forEach(img => {
    const uid = img.dataset.uid;
    const photo = REELS_AVATAR_CACHE.get(uid) || "";
    if (photo) img.src = photo;
  });
}

/* ---- render reels from snapshot ---- */
function renderReels(){
  if (!reelsWrap) return;

  stopAllReels();
  reelsWrap.innerHTML = "";

  if (!REELS_SNAPSHOT){
    reelsWrap.innerHTML = `<div style="color:#fff;padding:18px;">No reels yet</div>`;
    return;
  }

  const docs = [];
  REELS_SNAPSHOT.forEach(d => docs.push(d));

  let html = "";
  docs.forEach((doc) => {
    const p = doc.data() || {};
    if (p.type !== "video") return;

    html += buildReelCard({
      postId: doc.id,
      userId: p.userId,
      media: p.media,
      caption: p.caption,
      userName: p.userName,
      userPhoto: p.userPhoto
    });
  });

  reelsWrap.innerHTML = html || `<div style="color:#fff;padding:18px;">No video posts</div>`;




  // ✅ hydrate save icon (logged-in only)
  setTimeout(async () => {
    if (!auth.currentUser) return;
    const reels = Array.from(document.querySelectorAll("#reelsWrap .reel"));
    for (const r of reels){
      const postId = r.dataset.id;
      const saved = await isReelSaved(postId);
      paintSaveIcon(r, saved);
    }
  }, 0);



  // your existing modules
  hydratePostUserNames?.();
  VERIFIED_CACHE?.clear?.();
  hydrateVerifiedBadges?.();

  // avatar fix
  hydrateReelsAvatars();

  setupReelsIntersectionObserver();
}

/* ---- autoplay visibility: current plays, current sound rules applied ---- */
function setupReelsIntersectionObserver(){
  const reels = Array.from(document.querySelectorAll("#reelsWrap .reel"));
  if (!reels.length) return;

  if (REELS_OBSERVER) {
    try { REELS_OBSERVER.disconnect(); } catch(e){}
    REELS_OBSERVER = null;
  }

  REELS_OBSERVER = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      const reel = ent.target;
      const v = reel.querySelector("video");
      if (!v) return;

      if (ent.isIntersecting && ent.intersectionRatio >= 0.75){
        // pause others
        document.querySelectorAll("#reelsWrap video").forEach(x => {
          if (x !== v) { try { x.pause(); } catch(e){} }
        });

        // ✅ current auto unmute (only if unlocked), others mute
        setCurrentReelSound(v);

        const p = v.play();
        if (p && p.catch) p.catch(()=>{});
      } else {
        try { v.pause(); } catch(e){}
      }
    });
  }, { threshold: [0.75] });

  reels.forEach(r => REELS_OBSERVER.observe(r));

  // start first (muted থাকবে, unlock না হওয়া পর্যন্ত)
  setTimeout(() => {
    const first = reels[0]?.querySelector("video");
    if (!first) return;
    setCurrentReelSound(first);
    const p = first.play();
    if (p && p.catch) p.catch(()=>{});
  }, 80);
}


function renderReelsFast(){
  if (!reelsWrap) return;

  stopAllReels();
  reelsWrap.innerHTML = "";

  const cachedVideos = FEED_CACHE.filter(p => p.type === "video");

  if (cachedVideos.length){
    reelsWrap.innerHTML = cachedVideos.map(p => buildReelCard(p)).join("");
    hydrateReelsAvatars?.();
    VERIFIED_CACHE?.clear?.();
    hydrateVerifiedBadges?.();
    setupReelsIntersectionObserver?.();
    return;
  }

  if (REELS_SNAPSHOT){
    renderReels();
  }
}


// ===== REELS LIKE/SAVE (MODULAR) =====
const REELS_LIKE_UNSUBS = new Map(); // postId -> unsub
const REELS_SAVE_CACHE = new Map();  // postId -> true/false (current user)

// login guard
function ensureLoggedInForReels(msg){
  if (!auth.currentUser){
    promptSignup(msg || "Please signup to use reels");
    return false;
  }
  return true;
}

// Like = use existing posts/{postId}/reactions/{uid}
// We store emoji ❤️ and type love so your system stays consistent.
async function toggleReelLike(postId){
  if (!ensureLoggedInForReels("Please signup to like")) return;

  const uid = auth.currentUser.uid;
  const rRef = db.collection("posts").doc(postId).collection("reactions").doc(uid);

  const snap = await rRef.get();
  if (snap.exists && snap.data()?.emoji === "❤️"){
    await rRef.delete();
    return;
  }

  // get user meta (reuse your cache)
  let userName = (MEMORY_PROFILE_NAME || "").trim();
  let userPhoto = "";

  const us = await db.collection("users").doc(uid).get();
  if (us.exists){
    const d = us.data() || {};
    userName = userName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
    userPhoto = d.profilePic || "";
    MEMORY_PROFILE_NAME = userName || MEMORY_PROFILE_NAME;
  }

  await rRef.set({
    type: "love",
    emoji: "❤️",
    userId: uid,
    userName: userName || "User",
    userPhoto: userPhoto || "",
    createdAt: Date.now()
  });
}





// ===== PROFILE VIEW STATE =====
let VIEW_PROFILE_UID = null;
let PROFILE_POSTS_UNSUB = null;

function stopProfilePostsListener(){
  if (typeof PROFILE_POSTS_UNSUB === "function") PROFILE_POSTS_UNSUB();
  PROFILE_POSTS_UNSUB = null;
}

function showOnlyProfilePage(){
  homePage.style.display = "none";
  profilePage.style.display = "block";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  setActive(profileIcon);
  window.scrollTo(0,0);
  document.body.classList.add("profile-mode");
}

let PROFILE_OPEN_TOKEN = 0;

// ===== VIEW OTHER USER PROFILE (STATE) =====
async function openUserProfile(uid, prefill = {}) {
  if (!uid) return;

  const token = ++PROFILE_OPEN_TOKEN;
  VIEW_PROFILE_UID = uid;

  const me = auth.currentUser?.uid || "";
  const isOwner = (me && me === uid);

  setProfileOwnerUI(isOwner);
  setProfileActionsForUid(uid);
  showOnlyProfilePage();



  const pn = document.getElementById("profileName");
  const profileFeed = document.getElementById("profileFeed");

  const fallbackAvatar = "https://i.imgur.com/6VBx3io.png";

  // ✅ pick best instant header: prefill > cache > minimal
  const cached = getCachedUserHeader(uid) || {};
  const instantName  = (prefill.name  || cached.name  || " ");
  const instantPhoto = (prefill.photo || cached.photo || fallbackAvatar);
  const instantCover = (prefill.cover || cached.cover || "");

  if (pn) pn.textContent = instantName;         // ✅ no "Loading..."
  if (profilePic) profilePic.src = instantPhoto;
  if (profilePicBig) profilePicBig.src = instantPhoto;
  if (coverPic) coverPic.src = instantCover;

  const pb = document.getElementById("profileVerifiedBadge");
  if (pb) pb.dataset.verifiedUid = uid;

  // ✅ show posts skeleton तुरंत
  if (profileFeed) {
    profileFeed.innerHTML = `
      <div style="padding:12px;">
        ${Array.from({length:4}).map(()=>`
          <div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,.06);opacity:.7;">
            <div style="display:flex;gap:10px;align-items:center;">
              <div style="width:38px;height:38px;border-radius:50%;background:#eee;"></div>
              <div style="height:12px;width:140px;background:#eee;border-radius:6px;"></div>
            </div>
            <div style="height:12px;width:90%;background:#eee;border-radius:6px;margin-top:12px;"></div>
            <div style="height:12px;width:70%;background:#eee;border-radius:6px;margin-top:8px;"></div>
          </div>
        `).join("")}
      </div>
    `;
  }

  stopProfilePostsListener();

  // ---- fetch user header (real) ----
  const uSnap = await db.collection("users").doc(uid).get();
  if (token !== PROFILE_OPEN_TOKEN) return;

  const u = uSnap.exists ? (uSnap.data() || {}) : {};
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "User";

  const profilePicUrl = u.profilePic || instantPhoto || fallbackAvatar;
  const coverPicUrl   = u.coverPic || instantCover || "";

  if (pn) pn.textContent = fullName;
  if (profilePic) profilePic.src = profilePicUrl;
  if (profilePicBig) profilePicBig.src = profilePicUrl;
  if (coverPic) coverPic.src = coverPicUrl;

  // ✅ cache for next time
  cacheUserHeader(uid, { name: fullName, photo: profilePicUrl, cover: coverPicUrl });

  VERIFIED_CACHE.clear();
  hydrateVerifiedBadges();

  // ---- load posts realtime ----
  PROFILE_POSTS_UNSUB = db.collection("posts")
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot((snap) => {
      if (token !== PROFILE_OPEN_TOKEN) return;

      if (profileFeed) profileFeed.innerHTML = "";

      snap.forEach((doc) => {
        const p = doc.data() || {};
        createPost({
          postId: doc.id,
          userId: p.userId,
          type: p.type,
          media: p.media,
          caption: p.caption,
          userName: p.userName,
          userPhoto: p.userPhoto,
          isProfileUpdate: p.isProfileUpdate,
          updateType: p.updateType,
          target: "profile"
        });
      });

      hydratePostUserPhoto();
      hydratePostUserNames();
      VERIFIED_CACHE.clear();
      hydrateVerifiedBadges();
      initFeedVideoSystem();
    }, (err) => console.error("profile posts error:", err));
}




// Listen like count for a reel (only once)
function bindReelLikeCount(postId, reelEl){
  if (REELS_LIKE_UNSUBS.has(postId)) return;

  const countEl = reelEl.querySelector('.reel-count[data-kind="like"]');
  const unsub = db.collection("posts").doc(postId).collection("reactions")
    .onSnapshot((snap)=>{
      // count only ❤️
      let c = 0;
      snap.forEach(d=>{
        const x = d.data() || {};
        if (x.emoji === "❤️") c++;
      });
     
     if (countEl) {
  countEl.textContent = (c > 0) ? String(c) : "";
}
});
  

  REELS_LIKE_UNSUBS.set(postId, unsub);
}

// Save system: users/{uid}/savedReels/{postId}
async function isReelSaved(postId){
  const uid = auth.currentUser?.uid;
  if (!uid) return false;

  if (REELS_SAVE_CACHE.has(postId)) return REELS_SAVE_CACHE.get(postId);

  const s = await db.collection("users").doc(uid).collection("savedReels").doc(postId).get();
  const saved = s.exists;
  REELS_SAVE_CACHE.set(postId, saved);
  return saved;
}

async function paintSaveIcon(reelEl, saved){
  const btn = reelEl.querySelector(".reel-save");
  if (!btn) return;
  btn.textContent = saved ? "✅" : "🔖";
}

async function toggleReelSave(postId, reelEl){
  if (!ensureLoggedInForReels("Please signup to save")) return;

  const uid = auth.currentUser.uid;
  const ref = db.collection("users").doc(uid).collection("savedReels").doc(postId);

  const snap = await ref.get();
  if (snap.exists){
    await ref.delete();
    REELS_SAVE_CACHE.set(postId, false);
    paintSaveIcon(reelEl, false);
  } else {
    await ref.set({ postId, createdAt: Date.now() });
    REELS_SAVE_CACHE.set(postId, true);
    paintSaveIcon(reelEl, true);
  }
}

// Close all 3dot menus
function closeAllReelMenus(){
  document.querySelectorAll("#reelsWrap .reel-more-menu.open").forEach(m => m.classList.remove("open"));
}





/* ---- interactions inside reels ---- */
document.addEventListener("click", async (e) => {
  if (!reelsPage || reelsPage.style.display !== "block") return;

  // back arrow => home
  if (e.target.closest("#reelsBackBtn")){
    e.preventDefault();
    e.stopPropagation();
    goHomeFromReels();
    return;
  }

  const reel = e.target.closest("#reelsWrap .reel");
  if (!reel) {
    // outside click -> close menus
    closeAllReelMenus();
    return;
  }

  const act = e.target.closest("[data-act]")?.dataset?.act;
  const postId = reel.dataset.id;
  const ownerId = reel.dataset.owner;
  const v = reel.querySelector("video");

  // bind count once (cheap)
  bindReelLikeCount(postId, reel);

  // ===== 3dot menu =====
  if (act === "more"){
    e.preventDefault();
    e.stopPropagation();
    const menu = reel.querySelector(".reel-more-menu");
    if (!menu) return;

    // close other menus first
    closeAllReelMenus();
    menu.classList.toggle("open");
    return;
  }

  if (act === "download"){
    const video = reel.querySelector("video");
    if (!video?.src) return;

    const a = document.createElement("a");
    a.href = video.src;
    a.download = "reel.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();

    closeAllReelMenus();
    return;
  }

  if (act === "copylink"){
    const url = location.href.split("#")[0] + "#reel=" + postId;
    navigator.clipboard?.writeText(url).then(()=> alert("Link copied"))
      .catch(()=> prompt("Copy this link:", url));
    closeAllReelMenus();
    return;
  }

  if (act === "report"){
    // lightweight: store a report doc
    if (!ensureLoggedInForReels("Please signup to report")) return;

    await db.collection("reports").add({
      postId,
      ownerId,
      reporterId: auth.currentUser.uid,
      createdAt: Date.now()
    });

    alert("Reported");
    closeAllReelMenus();
    return;
  }

  // ===== mute =====
  if (act === "mute"){
    REELS_SOUND_UNLOCKED = true;
    REELS_USER_MUTED = !REELS_USER_MUTED;
    setCurrentReelSound(v);
    if (v) { const p = v.play(); if (p && p.catch) p.catch(()=>{}); }
    return;
  }

  // ===== Like =====
  if (act === "like"){
    closeAllReelMenus();
    await toggleReelLike(postId);
    return;
  }

  // ===== Comment (reuse your existing modal) =====
  if (act === "comment"){
    closeAllReelMenus();
    if (typeof openCommentsModal === "function") openCommentsModal(postId);
    return;
  }

  // ===== Save =====
  if (act === "save"){
    closeAllReelMenus();
    await toggleReelSave(postId, reel);
    return;
  }

  // ===== Share =====
  if (act === "share"){
    closeAllReelMenus();
    const url = location.href.split("#")[0] + "#reel=" + postId;
    navigator.clipboard?.writeText(url).then(()=> alert("Link copied"))
      .catch(()=> prompt("Copy this link:", url));
    return;
  }

  // tap video: unlock sound + play/pause
  if (e.target.tagName === "VIDEO" && v){
    closeAllReelMenus();
    REELS_SOUND_UNLOCKED = true;
    setCurrentReelSound(v);

    if (v.paused) {
      const p = v.play();
      if (p && p.catch) p.catch(()=>{});
    } else {
      try { v.pause(); } catch(e){}
    }
  }
});


/* ---- open reels icon ---- */
reelsIcon?.addEventListener("click", (e) => {
  e.preventDefault();

  // ✅ user gesture = sound unlock ready
  REELS_SOUND_UNLOCKED = true;
  REELS_USER_MUTED = false;


  openReelsPage();
});


/* ---- LEAK FIX: any other nav icon clicked => reels hide ---- */
function wrapClick(originalFn){
  return function(){
    hideReelsPage();
    return (typeof originalFn === "function") ? originalFn.apply(this, arguments) : undefined;
  };
}

homeIcon.onclick         = wrapClick(homeIcon.onclick);
profileIcon.onclick      = wrapClick(profileIcon.onclick);
notificationIcon.onclick = wrapClick(notificationIcon.onclick);
messageIcon.onclick      = wrapClick(messageIcon.onclick);

/* ---- esc => go home ---- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && reelsPage?.style.display === "block"){
    goHomeFromReels();
  }
});



// ===== USER NAME CACHE (FAST) =====
const USER_NAME_CACHE = new Map(); // uid -> fullName

function updateRenderedNamesForUid(uid, fullName) {
  document.querySelectorAll(`.uname[data-uid="${uid}"]`).forEach(el => {
    el.textContent = fullName;
  });
}

async function getUserFullName(uid) {
  if (USER_NAME_CACHE.has(uid)) return USER_NAME_CACHE.get(uid);

  const snap = await db.collection("users").doc(uid).get();
  let full = "User";

  if (snap.exists) {
    const d = snap.data() || {};
    full = [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || "User";
  }

  USER_NAME_CACHE.set(uid, full);
  return full;
}

async function hydratePostUserNames() {
  const els = document.querySelectorAll(".uname[data-uid]");
  const uids = Array.from(new Set(Array.from(els).map(el => el.dataset.uid)));

  // fetch each uid once, then paint all elements
  await Promise.all(uids.map(async (uid) => {
    const full = await getUserFullName(uid);
    updateRenderedNamesForUid(uid, full);
  }));
}



//veryfi badge//
// ===== VERIFIED BADGE (FAST + GUEST FRIENDLY) =====
const VERIFIED_CACHE = new Map(); // uid -> true/false

async function hydrateVerifiedBadges() {
  const badges = Array.from(document.querySelectorAll(".verified-badge[data-verified-uid]"));
  if (!badges.length) return;

  const uids = Array.from(new Set(
    badges.map(b => (b.dataset.verifiedUid || "").trim()).filter(Boolean)
  ));

  const need = uids.filter(uid => !VERIFIED_CACHE.has(uid));

  if (need.length) {
    const docs = await Promise.all(
      need.map(uid => db.collection("users").doc(uid).get().catch(() => null))
    );

    docs.forEach((snap, i) => {
      const uid = need[i];
      const verified = !!(snap && snap.exists && snap.data()?.verified === true);
      VERIFIED_CACHE.set(uid, verified);
    });
  }

  for (const b of badges) {
    const uid = (b.dataset.verifiedUid || "").trim();
    b.style.display = (uid && VERIFIED_CACHE.get(uid) === true) ? "inline-flex" : "none";
  }
}




async function hydratePostUserPhoto() {
  const imgs = document.querySelectorAll(".post-user-pic[data-uid]");

  for (const img of imgs) {
    if (img.src && !img.src.endsWith("/") && img.getAttribute("src")) continue;

    const uid = img.dataset.uid;
    const snap = await db.collection("users").doc(uid).get();
    if (snap.exists) {
      const d = snap.data();
      if (d.profilePic) img.src = d.profilePic;
    }
  }
}



// ================= LOGIN OPTION (REPLACE FULL) =================

// ===== LOGIN MODAL OPEN/CLOSE =====
const loginMenuBtn = document.getElementById("loginMenuBtn");
const loginModal   = document.getElementById("loginModal");

const loginBtn     = document.getElementById("loginBtn");
const loginMsg     = document.getElementById("loginMsg");
const loginSuccess = document.getElementById("loginSuccess");

function normalizeContact(raw) {
  let c = (raw || "").trim();

  // remove spaces/dashes
  c = c.replace(/[\s-]/g, "");

  // +88017... -> 017...
  if (c.startsWith("+880")) c = "0" + c.slice(4);

  // 88017... -> 017...
  if (c.startsWith("880")) c = "0" + c.slice(3);

  return c;
}

function toAuthEmail(contact) {
  const c = normalizeContact(contact);
  return c.includes("@") ? c : (c + "@everest.app");
}

function setLoginLoading(isLoading) {
  if (!loginBtn) return;
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle("loading", isLoading);
  loginBtn.textContent = isLoading ? "Logging in..." : "Login";
}


// MODAL BACK (works for any modal)
function bindBack(btnId, modalId){
  const btn = document.getElementById(btnId);
  const modal = document.getElementById(modalId);
  if (!btn || !modal) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.style.display = "none";
  }, true); // ✅ capture phase, তাই stopPropagation থাকলেও কাজ করবে
}

bindBack("loginBackBtn", "loginModal");
bindBack("changeNameBackBtn", "changeNameModal");


if (loginMenuBtn) {
  loginMenuBtn.onclick = (e) => {
    e.preventDefault();
    if (!loginModal) return;

    openModalHistory("loginModal");
    if (loginMsg) loginMsg.textContent = "";
    if (loginSuccess) loginSuccess.style.display = "none";

    // optional: clear input
    const c = document.getElementById("loginContact");
    const p = document.getElementById("loginPassword");
    if (c) c.value = "";
    if (p) p.value = "";
  };
}

if (loginModal) {
  loginModal.onclick = (e) => {
    if (e.target === loginModal) loginModal.style.display = "none";
  };
}

if (loginBtn) {
  loginBtn.onclick = async () => {
    const rawContact = document.getElementById("loginContact")?.value || "";
    const pass = (document.getElementById("loginPassword")?.value || "").trim();

    if (loginMsg) loginMsg.textContent = "";
    if (loginSuccess) loginSuccess.style.display = "none";

    if (!rawContact.trim() || !pass) {
      if (loginMsg) loginMsg.textContent = "Email/Phone এবং Password দিন";
      return;
    }




    const email = toAuthEmail(rawContact);

    setLoginLoading(true);

    try {
      await auth.signInWithEmailAndPassword(email, pass);

      if (loginSuccess) loginSuccess.style.display = "block";

setTimeout(() => {
  if (loginSuccess) loginSuccess.style.display = "none";
  if (loginModal) loginModal.style.display = "none";

  // 🔥 IMPORTANT FIX
  document.body.classList.remove("nav-hidden");
  document.querySelector(".navbar")?.classList.remove("fb-hide");
  window.scrollTo(0, 0);

  // profile page show
  homePage.style.display = "none";
  profilePage.style.display = "block";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  setActive(profileIcon);

}, 700);


    } catch (err) {
      // Firebase মাঝে মাঝে INVALID_LOGIN_CREDENTIALS দেয়
      const code = err?.code || "";
      let msg = "Login failed. The email/phone or password is incorrect (account does not exist).//";

      if (code === "auth/user-not-found") msg = "এই account পাওয়া যায়নি";
      else if (code === "auth/wrong-password") msg = "Password ভুল";
      else if (code === "auth/invalid-email") msg = "Email/Phone ঠিক নেই";
      else if (code === "auth/too-many-requests") msg = "অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করো";

      if (loginMsg) loginMsg.textContent = msg;
      console.error("LOGIN ERROR:", err);

    } finally {
      setLoginLoading(false);
    }
  };
}

//scrol 
// ===== Scroll DOWN: hide navbar + lift menu-bar | Scroll UP: show navbar =====
(() => {
  const navbar = document.querySelector(".navbar");
  const body = document.body;
  if (!navbar) return;

  // ✅ যেসব page এ navbar একদমই দেখাবে না
  const NO_NAV_PAGES = new Set(["message", "notification"]);

  // ✅ current page detect করার function
  function getCurrentPage() {
    // Option A (recommended): window.currentPage global রাখলে
    if (window.currentPage) return window.currentPage;

    // Option B: display দিয়ে detect (fallback)
    const messagePage = document.getElementById("messagePage");
    const notificationPage = document.getElementById("notificationPage");

    if (messagePage && getComputedStyle(messagePage).display !== "none") return "message";
    if (notificationPage && getComputedStyle(notificationPage).display !== "none") return "notification";

    return "home"; // default
  }

  let lastY = window.scrollY;
  let ticking = false;

  const THRESHOLD = 8;
  const MIN_Y = 20;

  function forceHideNavbar() {
    navbar.classList.add("fb-hide");
    body.classList.add("nav-hidden");
  }

  function update() {
    // ✅ message/notification এ scroll করলে কখনোই show হবে না
    const page = getCurrentPage();
    if (NO_NAV_PAGES.has(page)) {
      forceHideNavbar();
      lastY = window.scrollY; // baseline update
      ticking = false;
      return;
    }

    const y = window.scrollY;
    const delta = y - lastY;

    if (y <= MIN_Y) {
      navbar.classList.remove("fb-hide");
      body.classList.remove("nav-hidden");
      lastY = y;
      ticking = false;
      return;
    }

    if (Math.abs(delta) < THRESHOLD) {
      ticking = false;
      return;
    }

    if (delta > 0) {
      navbar.classList.add("fb-hide");
      body.classList.add("nav-hidden");
    } else {
      navbar.classList.remove("fb-hide");
      body.classList.remove("nav-hidden");
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
})();




//post model of//
// ===== CLOSE MODALS ON OUTSIDE CLICK =====
function closeModal(modal) {
  if (!modal) return;
  modal.style.display = "none";
}

function wireOutsideClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // outside (overlay) click -> close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });

  // inside box click -> don't close
  const box = modal.querySelector(".auth-box, .create-post-box");
  if (box) {
    box.addEventListener("click", (e) => e.stopPropagation());
  }
}

wireOutsideClose("textPostModal");
wireOutsideClose("mediaCaptionModal");
wireOutsideClose("editPostModal");
wireOutsideClose("authModal");
wireOutsideClose("loginModal");

// Esc চাপলে close (optional)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["textPostModal","mediaCaptionModal","editPostModal","authModal","loginModal"].forEach(id=>{
    closeModal(document.getElementById(id));
  });
});


//coment section//
// ===== COMMENTS MODAL SYSTEM (FULL) =====
const commentsModal = document.getElementById("commentsModal");
const cmodalClose   = document.getElementById("cmodalClose");
const cmodalList    = document.getElementById("cmodalList");
const cmodalInput   = document.getElementById("cmodalInput");
const cmodalSend    = document.getElementById("cmodalSend");



const confirmModal  = document.getElementById("confirmModal");
const confirmTextEl = document.getElementById("confirmText");
const confirmOkBtn  = document.getElementById("confirmOk");
const confirmCancelBtn = document.getElementById("confirmCancel");

function confirmBox(message){
  return new Promise((resolve) => {
    if (!confirmModal) return resolve(false);

    confirmTextEl.textContent = message;
    openModalHistory("confirmModal");
    const cleanup = () => {
      confirmModal.classList.remove("open");
      confirmOkBtn.onclick = null;
      confirmCancelBtn.onclick = null;
      confirmModal.onclick = null;
    };

    confirmOkBtn.onclick = () => { cleanup(); resolve(true); };
    confirmCancelBtn.onclick = () => { cleanup(); resolve(false); };

    confirmModal.onclick = (e) => {
      if (e.target === confirmModal) { cleanup(); resolve(false); }
    };
  });
}





let ACTIVE_POST_ID = null;
let COMMENTS_UNSUB = null;
const REPLY_UNSUBS = new Map(); // commentId -> unsub

function openCommentsModal(postId){
  ACTIVE_POST_ID = postId;
 openModalHistory("commentsModal");
  cmodalList.innerHTML = "";
  cmodalInput.value = "";

  // stop old listener
  if (COMMENTS_UNSUB) COMMENTS_UNSUB();
  REPLY_UNSUBS.forEach(un => un && un());
  REPLY_UNSUBS.clear();

  COMMENTS_UNSUB = db.collection("posts").doc(postId)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .limit(50)
    .onSnapshot((snap)=>{
     
const myUid = auth.currentUser?.uid || "";

// ✅ যদি কোনো comment না থাকে
if (snap.empty) {
  cmodalList.innerHTML = `
    <div class="no-comments">No comments</div>
  `;
  return;
}

// ✅ comment থাকলে আগের লেখা মুছে নতুন render হবে
cmodalList.innerHTML = "";


      snap.forEach((d)=>{
        const c = d.data() || {};
        const cid = d.id;

        const isOwner = myUid && c.userId === myUid;
        const likeCount = c.likeCount || 0;
        const liked = !!(c.likedBy && myUid && c.likedBy[myUid]);

        const row = document.createElement("div");
        row.className = "crow";
        row.dataset.cid = cid;

        row.innerHTML = `
          <img class="cpic" src="${c.userPhoto || "https://i.imgur.com/6VBx3io.png"}"
           onerror="this.onerror=null; this.src='https://i.imgur.com/6VBx3io.png';"/>

          <div class="cbody">
            <div class="cbubble">
              <div class="cname">${c.userName || "User"}</div>
              <div class="ctext">${(c.text || "").replace(/[<>]/g,"")}</div>
            </div>

            <div class="cactions">
              <span class="cact c-like ${liked ? "active":""}" data-act="like">
                Like ${likeCount ? `(${likeCount})` : ""}
              </span>
              <span class="cact c-reply" data-act="reply">Reply</span>
              ${isOwner ? `
                <span class="cact c-edit" data-act="edit">Edit</span>
                <span class="cact c-del" data-act="del">Delete</span>
              ` : ``}
            </div>

            <div class="replybox">
              <input type="text" placeholder="Write a reply..." />
              <button data-act="replysend">Send</button>
            </div>

            <div class="editbox" style="display:none; gap:8px; margin-top:8px;">
              <input class="edit-input" type="text" />
              <button data-act="editsave">Save</button>
              <button data-act="editcancel">Cancel</button>
            </div>

            <div class="replies"></div>
          </div>
        `;

        cmodalList.appendChild(row);

        // replies realtime (limit 20)
        const ref = db.collection("posts").doc(postId)
          .collection("comments").doc(cid)
          .collection("replies")
          .orderBy("createdAt","asc")
          .limit(20);

        const oldUn = REPLY_UNSUBS.get(cid);
        if (oldUn) oldUn();

        const unsub = ref.onSnapshot((rsnap)=>{
          const repliesBox = row.querySelector(".replies");
          if (!repliesBox) return;
          repliesBox.innerHTML = "";

          rsnap.forEach(rdoc=>{
            const r = rdoc.data() || {};
            const isReplyOwner = myUid && r.userId === myUid;

            const div = document.createElement("div");
            div.className = "rrow";
            div.dataset.rid = rdoc.id;

            div.innerHTML = `
              <div style="display:flex; gap:10px; margin-top:10px;">
                <img class="cpic" style="width:30px;height:30px;"
                  src="${r.userPhoto || "https://i.imgur.com/6VBx3io.png"}"
                  onerror="this.onerror=null; this.src='https://i.imgur.com/6VBx3io.png';" />
                <div style="flex:1;">
                  <div class="cbubble">
                    <div class="cname">${r.userName || "User"}</div>
                    <div class="ctext">${(r.text || "").replace(/[<>]/g,"")}</div>
                  </div>
                  ${isReplyOwner ? `
                    <div class="cactions">
                      <span class="cact" data-act="rdel">Delete</span>
                    </div>
                  ` : ``}
                </div>
              </div>
            `;

            repliesBox.appendChild(div);
          });
        });

        REPLY_UNSUBS.set(cid, unsub);
      });

      // bottom
      cmodalList.scrollTop = cmodalList.scrollHeight;
    });
}

function closeCommentsModal(){
  commentsModal.classList.remove("open");
  ACTIVE_POST_ID = null;

  if (COMMENTS_UNSUB) COMMENTS_UNSUB();
  COMMENTS_UNSUB = null;

  REPLY_UNSUBS.forEach(un => un && un());
  REPLY_UNSUBS.clear();
}

cmodalClose?.addEventListener("click", closeCommentsModal);
commentsModal?.addEventListener("click",(e)=>{
  if (e.target === commentsModal) closeCommentsModal();
});

function ensureLoggedInForComment() {
  if (!auth.currentUser) {
    promptSignup("Please signup to comment");
    return false;
  }
  return true;
}

async function getMyUserMeta(){
  const uid = auth.currentUser.uid;

  let userName = (MEMORY_PROFILE_NAME || "").trim();
  let userPhoto = "";

  const us = await db.collection("users").doc(uid).get();
  if (us.exists){
    const d = us.data() || {};
    userName = userName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
    userPhoto = d.profilePic || "";
    MEMORY_PROFILE_NAME = userName || MEMORY_PROFILE_NAME;
  }

  return {
    uid,
    userName: userName || "User",
    userPhoto: userPhoto || ""
  };
}

// add comment
async function addCommentToPost(postId, text){
  if (!ensureLoggedInForComment()) return;

  const me = await getMyUserMeta();

  await db.collection("posts").doc(postId)
    .collection("comments")
    .add({
      userId: me.uid,
      userName: me.userName,
      userPhoto: me.userPhoto,
      text: text.trim(),
      createdAt: Date.now(),
      likeCount: 0,
      likedBy: {}
    });

   // 🔔 COMMENT NOTIFICATION
await NotificationSystem.sendCommentNotification(postId);
}

// FIX: Post button
cmodalSend.onclick = async ()=>{
  if (!ACTIVE_POST_ID) return;
  const t = (cmodalInput.value || "").trim();
  if (!t) return;
  await addCommentToPost(ACTIVE_POST_ID, t);
  cmodalInput.value = "";
};

cmodalInput.onkeydown = async (e)=>{
  if (e.key === "Enter"){
    e.preventDefault();
    cmodalSend.click();
  }
};

// open modal on comment btn click
document.addEventListener("click", (e)=>{
  const cb = e.target.closest(".comment-btn");
  if (!cb) return;
  openCommentsModal(cb.dataset.post);
});

// actions inside modal
document.addEventListener("click", async (e)=>{
  if (!commentsModal.classList.contains("open")) return;

  const btn = e.target.closest("[data-act]");
  if (!btn) return;

  const act = btn.dataset.act;
  const row = e.target.closest(".crow");
  const cid = row?.dataset?.cid;
  if (!ACTIVE_POST_ID || !cid) return;

  const cRef = db.collection("posts").doc(ACTIVE_POST_ID).collection("comments").doc(cid);

  // LIKE comment (anyone can like)
  if (act === "like"){
    if (!ensureLoggedInForComment()) return;
    const uid = auth.currentUser.uid;

    await db.runTransaction(async (tx)=>{
      const snap = await tx.get(cRef);
      const d = snap.data() || {};
      const likedBy = d.likedBy || {};
      let likeCount = d.likeCount || 0;

      if (likedBy[uid]) {
        delete likedBy[uid];
        likeCount = Math.max(0, likeCount - 1);
      } else {
        likedBy[uid] = true;
        likeCount = likeCount + 1;
      }

      tx.update(cRef, { likedBy, likeCount });
    });

    return;
  }

  // REPLY toggle
  if (act === "reply"){
    if (!ensureLoggedInForComment()) return;
    row.querySelector(".replybox")?.classList.toggle("open");
    row.querySelector(".replybox input")?.focus();
    return;
  }

  // SEND reply (anyone can reply)
  if (act === "replysend"){
    if (!ensureLoggedInForComment()) return;

    const input = row.querySelector(".replybox input");
    const text = (input?.value || "").trim();
    if (!text) return;

    const me = await getMyUserMeta();

    await cRef.collection("replies").add({
      userId: me.uid,
      userName: me.userName,
      userPhoto: me.userPhoto,
      text,
      createdAt: Date.now()
    });

    input.value = "";
    row.querySelector(".replybox")?.classList.remove("open");
    return;
  }

  // EDIT comment (only owner UI দেখায়, কিন্তু আবারও check)
  if (act === "edit"){
    if (!ensureLoggedInForComment()) return;
    const snap = await cRef.get();
    const d = snap.data() || {};
    if (d.userId !== auth.currentUser.uid) return;

    const editBox = row.querySelector(".editbox");
    const editInput = row.querySelector(".edit-input");
    if (!editBox || !editInput) return;

    editInput.value = d.text || "";
    editBox.style.display = "flex";
    editInput.focus();
    return;
  }

  if (act === "editsave"){
    if (!ensureLoggedInForComment()) return;
    const snap = await cRef.get();
    const d = snap.data() || {};
    if (d.userId !== auth.currentUser.uid) return;

    const editInput = row.querySelector(".edit-input");
    const newText = (editInput?.value || "").trim();
    if (!newText) return;

    await cRef.update({ text: newText });
    row.querySelector(".editbox").style.display = "none";
    return;
  }

  if (act === "editcancel"){
    row.querySelector(".editbox").style.display = "none";
    return;
  }

  // DELETE comment (only owner)
 if (act === "del"){
  if (!ensureLoggedInForComment()) return;

  const snap = await cRef.get();
  const d = snap.data() || {};
  if (d.userId !== auth.currentUser.uid) return;

  const yes = await confirmBox("Do you want to delete your comment?");
  if (!yes) return;

  await cRef.delete();
  return;
}

  // DELETE reply (only owner)
  if (act === "rdel"){
    if (!ensureLoggedInForComment()) return;

    const rrow = e.target.closest(".rrow");
    const rid = rrow?.dataset?.rid;
    if (!rid) return;

    const rRef = cRef.collection("replies").doc(rid);
    const snap = await rRef.get();
    const d = snap.data() || {};
    if (d.userId !== auth.currentUser.uid) return;

    await rRef.delete();
    return;
  }
});


//coment delet section//
function renderCommentRow(c, canDelete) {
  const name = c.userName || "User";
  const pic = c.userPhoto || "https://i.imgur.com/6VBx3io.png";
  const text = (c.text || "").replace(/[<>]/g, "");

  return `
    <div class="comment-row" data-cid="${c.id}">
      <img class="comment-pic" src="${pic}" onerror="this.onerror=null; this.src='https://i.imgur.com/6VBx3io.png';" />
      <div class="comment-body">
        <div class="comment-name">${name}</div>
        <div class="comment-text">${text}</div>

        <div class="comment-actions">
          <span class="comment-like">Like</span>
          <span class="comment-reply">Reply</span>
          ${canDelete ? `<span class="comment-del">Delete</span>` : ``}
        </div>
      </div>
    </div>
  `;
}


// change send button color based on input
cmodalInput.addEventListener("input", () => {
  const hasText = cmodalInput.value.trim().length > 0;

  if (hasText) {
    cmodalSend.style.color = "#ff2d2d";  // red
  } else {
    cmodalSend.style.color = "#cfd2d6";  // light grey
  }
});


// ================= INIT THEME =================
(function initTheme(){
  const toggle = document.getElementById("darkModeToggle");
  if (!toggle) return;

  // ✅ default always LIGHT if nothing saved
  const saved = localStorage.getItem("theme"); // "dark" | "light" | null
  const theme = (saved === "dark" || saved === "light") ? saved : "light";

  document.body.classList.toggle("dark", theme === "dark");
  toggle.checked = (theme === "dark");

  toggle.addEventListener("change", () => {
    const isDark = toggle.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }); 
})();

//friend//
/* ================= FRIENDS PAGE ================= */
const friendIcon   = document.getElementById("friendIcon");
const friendsPage  = document.getElementById("friendsPage");
const friendsBackBtn = document.getElementById("friendsBackBtn");
const friendsList  = document.getElementById("friendsList");
const friendsTabs  = document.querySelectorAll(".ftab");

let FRIENDS_UNSUB = null;
let FRIENDS_ACTIVE_TAB = "followers";

function stopFriendsListener(){
  if (typeof FRIENDS_UNSUB === "function") FRIENDS_UNSUB();
  FRIENDS_UNSUB = null;
}

function openFriendsPage(){
gotoPage("friends");
  setNavbarVisible(false);
 
  if (!auth.currentUser){
    alert("Please signup/login to view friends");
    return;
  }

  // hide all pages (use your helper if exists)
  if (typeof hideAllPages === "function") hideAllPages();
  friendsPage.style.display = "block";

  // active icon
  icons.forEach(i => i.classList.remove("active"));
  friendIcon?.classList.add("active");

  window.scrollTo(0,0);

  // default tab
  setFriendsTab(FRIENDS_ACTIVE_TAB || "followers");
}

function closeFriendsPage(){
  setNavbarVisible(true);
  stopFriendsListener();
  if (typeof showPrevPage === "function") {
    // settings logic এর মত previous page দেখাতে চাইলে এটা ইউজ করতে পারো
    // কিন্তু এখানে we go home by default:
  }
  // default: go home
  homePage.style.display = "block";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  friendsPage.style.display = "none";
  setActive(homeIcon);
  gotoPage("home");
  window.scrollTo(0,0);
}

friendIcon?.addEventListener("click", (e)=>{
  e.preventDefault();
  openFriendsPage();
});

friendsBackBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  closeFriendsPage();
});

friendsTabs.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const tab = btn.dataset.tab;
    setFriendsTab(tab);
  });
});

function setFriendsTab(tab){
  FRIENDS_ACTIVE_TAB = tab;

  friendsTabs.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));

  // reset ui instantly
  if (friendsList) friendsList.innerHTML = "";

  stopFriendsListener();
  listenFriendsList(tab);
}

function esc(s=""){ return String(s).replace(/[<>]/g,""); }

function renderFriendsEmpty(tab){
  const txt = tab === "followers" ? "No followers yet" : "Not following anyone yet";
  friendsList.innerHTML = `<div class="friends-empty">${txt}</div>`;
}

function renderFriendRow(userDoc, tab){
  const u = userDoc || {};
  const uid = u.uid || u.userId || "";
  const name = esc(u.fullName || u.name || "User");
  const pic  = u.profilePic || u.photo || "https://i.imgur.com/6VBx3io.png";

  // following tab এ "Unfollow" দেখাব
  // followers tab এ optional: "Remove" (চাইলে করতে পারো)
  const actionText = (tab === "following") ? "Unfollow" : "";
  const actionBtn = actionText ? `<button class="friend-action danger" data-act="unfollow" data-uid="${uid}">${actionText}</button>` : "";

  return `
    <div class="friend-row" data-uid="${uid}">
      <img class="friend-pic" src="${pic}" onerror="this.onerror=null;this.src='https://i.imgur.com/6VBx3io.png';">
      <div class="friend-meta">
        <div class="friend-name">${name}</div>
        <div class="friend-sub">@${uid.slice(0,6)}</div>
      </div>
      ${actionBtn}
    </div>
  `;
}

async function fetchUsersMeta(uids){
  // parallel fetch (fast)
  const docs = await Promise.all(
    uids.map(uid => db.collection("users").doc(uid).get().catch(()=>null))
  );

  const list = [];
  docs.forEach((snap, i)=>{
    const uid = uids[i];
    if (!snap || !snap.exists) return;
    const d = snap.data() || {};
    list.push({
      uid,
      fullName: [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || "User",
      profilePic: d.profilePic || ""
    });
  });

  return list;
}

function listenFriendsList(tab){
  const me = auth.currentUser.uid;
  const sub = (tab === "followers") ? "followers" : "following";

  FRIENDS_UNSUB = db.collection("users").doc(me).collection(sub)
    .orderBy("createdAt", "desc")
    .limit(200)
    .onSnapshot(async (snap)=>{
      if (!friendsList) return;

      if (snap.empty){
        renderFriendsEmpty(tab);
        return;
      }

      // collect uids
      const uids = snap.docs.map(d => (d.data()?.userId || d.id)).filter(Boolean);

      // show quick skeleton (instant)
      friendsList.innerHTML = uids.slice(0,10).map(()=>`
        <div class="friend-row" style="opacity:.7;">
          <div class="friend-pic" style="width:44px;height:44px;border-radius:50%;background:#eee;"></div>
          <div class="friend-meta">
            <div style="height:12px;width:160px;background:#eee;border-radius:6px;"></div>
            <div style="height:10px;width:90px;background:#eee;border-radius:6px;margin-top:8px;"></div>
          </div>
        </div>
      `).join("");

      // fetch real meta
      const meta = await fetchUsersMeta(uids);

      // render
      friendsList.innerHTML = meta.map(u => renderFriendRow(u, tab)).join("");
    });
}

/* click row => open profile */
document.addEventListener("click", (e)=>{
  if (!friendsPage || friendsPage.style.display !== "block") return;

  const row = e.target.closest(".friend-row[data-uid]");
  if (!row) return;

  // unfollow button
  const unf = e.target.closest('[data-act="unfollow"]');
  if (unf){
    e.preventDefault();
    e.stopPropagation();
    const targetUid = unf.dataset.uid;
    unfollowUser(targetUid);
    return;
  }

  // open profile
  const uid = row.dataset.uid;
  if (uid) openUserProfile(uid, { name: row.querySelector(".friend-name")?.textContent || "", photo: row.querySelector("img")?.src || "" });
});

/* ===== FOLLOW / UNFOLLOW (core) ===== */
async function followUser(targetUid){
  if (!auth.currentUser) return;
  const me = auth.currentUser.uid;
  if (!targetUid || targetUid === me) return;

  const now = Date.now();

  // me -> following
  await db.collection("users").doc(me)
    .collection("following").doc(targetUid)
    .set({ userId: targetUid, createdAt: now });

  // target -> followers
  await db.collection("users").doc(targetUid)
    .collection("followers").doc(me)
    .set({ userId: me, createdAt: now });
}

async function unfollowUser(targetUid){
  if (!auth.currentUser) return;
  const me = auth.currentUser.uid;
  if (!targetUid || targetUid === me) return;

  // me -> following remove
  await db.collection("users").doc(me)
    .collection("following").doc(targetUid)
    .delete();

  // target -> followers remove
  await db.collection("users").doc(targetUid)
    .collection("followers").doc(me)
    .delete();
}



function hideAllPages(){
  homePage.style.display = "none";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  if (settingsPage) settingsPage.style.display = "none";
  if (friendsPage) friendsPage.style.display = "none"; // ✅ add
}


function detectCurrentPage(){
  if (friendsPage?.style.display === "block") return "friends";
  if (profilePage.style.display === "block") return "profile";
  if (notificationPage.style.display === "block") return "notification";
  if (messagePage.style.display === "block") return "message";
  return "home";
}


function hideFriendsPage() {
  // realtime listener বন্ধ
  if (typeof stopFriendsListener === "function") {
    stopFriendsListener();
  }
  // UI hide
  if (friendsPage) {
    friendsPage.style.display = "none";
  }
}

function wrapHideFriends(originalFn){
  return function(){
    hideFriendsPage();
    return (typeof originalFn === "function")
      ? originalFn.apply(this, arguments)
      : undefined;
  };
}


function hideFriendsPage() {
  // realtime listener বন্ধ
  if (typeof stopFriendsListener === "function") stopFriendsListener();

  // UI hide
  if (friendsPage) friendsPage.style.display = "none";
}

function hideAllPages(){
  // ✅ ALWAYS close friends first
  hideFriendsPage();

  homePage.style.display = "none";
  profilePage.style.display = "none";
  notificationPage.style.display = "none";
  messagePage.style.display = "none";
  if (settingsPage) settingsPage.style.display = "none";
}

function withFriendsClosed(fn){
  return function(){
    hideFriendsPage();
    return (typeof fn === "function") ? fn.apply(this, arguments) : undefined;
  };
}

homeIcon.onclick         = withFriendsClosed(homeIcon.onclick);
profileIcon.onclick      = withFriendsClosed(profileIcon.onclick);
notificationIcon.onclick = withFriendsClosed(notificationIcon.onclick);
messageIcon.onclick      = withFriendsClosed(messageIcon.onclick);

// যদি reelsIcon আলাদা handler থাকে
reelsIcon?.addEventListener("click", (e) => {
  hideFriendsPage();
  // তোমার existing reels open logic
}, true);

// settings open
settingsBtn?.addEventListener("click", (e)=>{
  hideFriendsPage();
}, true);


//page swise nav bar hide//
function setNavbarVisible(yes){
  document.body.classList.toggle("no-navbar", !yes);
  // scroll hide/show class যাতে interfere না করে
  if (!yes){
    document.body.classList.add("nav-hidden");
    document.querySelector(".navbar")?.classList.add("fb-hide");
  } else {
    document.body.classList.remove("nav-hidden");
    document.querySelector(".navbar")?.classList.remove("fb-hide");
  }
}

//message//
// ===== REAL USERS IN MESSAGE PAGE (WITH VERIFIED BADGE) =====
(function realMessageUsers(){

  const list = document.querySelector(".message-list");
  if (!list) return;

  const PRIVACY =
    "This conversation is fully private and secure. Only the participants in this chat have access to the messages and calls.";

  const FALLBACK_AVATAR = "https://i.imgur.com/6VBx3io.png";

  // small escape to avoid HTML break
  function esc(s=""){ return String(s).replace(/[<>]/g, ""); }

  function badgeHTML(uid){
    return `
      <span class="verified-badge"
            data-verified-uid="${esc(uid)}"
            title="Verified"
            style="display:none;">
        <svg class="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z"
            fill="#ff1f1f"
          />
          <path
            d="M9.3 12.6l1.9 1.9 4.2-4.3"
            fill="none"
            stroke="#ffffff"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    `;
  }

  db.collection("users")
    .orderBy("createdAt", "desc")
    .onSnapshot(async (snapshot)=>{

      list.innerHTML = "";

      snapshot.forEach(doc=>{
        const u = doc.data() || {};

        const fullName = [u.firstName, u.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "User";

        const photo = u.profilePic || FALLBACK_AVATAR;

        list.insertAdjacentHTML("beforeend", `
          <div class="chat-item" data-uid="${esc(doc.id)}">
            <div class="chat-avatar-wrap">
              <img class="chat-avatar"
                   src="${photo}"
                   onerror="this.onerror=null;this.src='${FALLBACK_AVATAR}';" />
              <div class="chat-online"></div>
            </div>

            <div class="chat-content">
              <div class="chat-name">
                <span class="chat-name-text">${esc(fullName)}</span>
                ${badgeHTML(doc.id)}
              </div>
              <div class="chat-text">${PRIVACY}</div>
            </div>
          </div>
        `);
      });

      // ✅ badge hydrate (তোমার existing function)
      if (typeof VERIFIED_CACHE !== "undefined" && VERIFIED_CACHE?.clear) VERIFIED_CACHE.clear();
      if (typeof hydrateVerifiedBadges === "function") hydrateVerifiedBadges();

    });

})();

//chat box//
// ================= CHAT MODULE (CLEAN + INTRO ALWAYS + VERIFIED BADGE) =================
(() => {
  const chatThreadPage   = document.getElementById("chatThreadPage");
  const chatBackBtn      = document.getElementById("chatBackBtn");
  const chatHeadName     = document.getElementById("chatHeadName");
  const chatHeadAvatar   = document.getElementById("chatHeadAvatar");
  const chatHeadVerified = document.getElementById("chatHeadVerified");

  const chatMessages = document.getElementById("chatMessages");
  const chatInput    = document.getElementById("chatInput");
  const chatSendBtn  = document.getElementById("chatSendBtn");

  const FALLBACK_AVATAR = "https://i.imgur.com/6VBx3io.png";

  if (!chatThreadPage || !chatBackBtn || !chatHeadName || !chatHeadAvatar || !chatMessages || !chatInput || !chatSendBtn) {
    console.warn("CHAT UI elements missing. Check IDs in HTML.");
    return;
  }

  // ---------- state ----------
  let OPEN_UID = null;
  let CONV_ID  = null;
  let UNSUB    = null;
  let TOKEN    = 0;
  let SENDING  = false;

  // Cached verified state for the currently opened user
  let OPEN_VERIFIED = false;

  // ---------- helpers ----------
  const esc = (s = "") => String(s).replace(/[<>]/g, "");
  const convIdFor = (a, b) => [a, b].sort().join("_");
  const SVT = () => firebase.firestore.FieldValue.serverTimestamp();
  const INC = (n) => firebase.firestore.FieldValue.increment(n);

  function showChat() {
    chatThreadPage.style.display = "flex";
    chatThreadPage.style.flexDirection = "column";
  }

  function hideChat() {
    chatThreadPage.style.display = "none";
  }

  function stop() {
    if (typeof UNSUB === "function") UNSUB();
    UNSUB = null;
  }

  function setHeaderVerified(isVerified) {
    OPEN_VERIFIED = !!isVerified;
    if (!chatHeadVerified) return;
    chatHeadVerified.style.display = isVerified ? "inline-flex" : "none";
  }

  function getVerifiedSVG() {
    return `
      <svg class="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z" fill="#ff1f1f"/>
        <path d="M9.3 12.6l1.9 1.9 4.2-4.3" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function ensureIntroNode() {
    let intro = document.getElementById("chatIntro");
    if (intro) return intro;

    intro = document.createElement("div");
    intro.id = "chatIntro";
    intro.className = "mchat-intro";
    intro.innerHTML = `
      <img id="chatIntroAvatar" class="mchat-intro-avatar" src="${FALLBACK_AVATAR}">
      <div class="mchat-intro-name-line">
        <div id="chatIntroName" class="mchat-intro-name">User</div>

        <span id="chatIntroVerified"
              class="verified-badge"
              style="display:none;"
              title="Verified">
          ${getVerifiedSVG()}
        </span>
      </div>

      <button class="mchat-view-profile" type="button">View profile</button>

      <div class="mchat-privacy">
        This conversation is fully private and secure.
        Only the participants in this chat have access to the messages and calls.
      </div>
    `;
    return intro;
  }

  // Always paint the center intro (profile + secure + view profile + verified)
  function paintIntro(name, photo, isVerified = false) {
    const node = ensureIntroNode();

    const nmEl = node.querySelector("#chatIntroName");
    const avEl = node.querySelector("#chatIntroAvatar");
    const vbEl = node.querySelector("#chatIntroVerified");

    if (nmEl) nmEl.textContent = (name || "User").trim() || "User";
    if (avEl) avEl.src = photo || FALLBACK_AVATAR;
    if (vbEl) vbEl.style.display = isVerified ? "inline-flex" : "none";

    if (chatMessages.firstChild !== node) {
      chatMessages.insertBefore(node, chatMessages.firstChild);
    }
  }

  function paintLoadingRows() {
    const wrap = document.createElement("div");
    wrap.id = "chatLoadingRows";
    wrap.style.padding = "12px";
    wrap.style.opacity = ".7";
    wrap.innerHTML = `
      <div style="height:12px;width:60%;background:#e9eaee;border-radius:8px;margin:10px 0;"></div>
      <div style="height:12px;width:40%;background:#e9eaee;border-radius:8px;margin:10px 0;"></div>
      <div style="height:12px;width:70%;background:#e9eaee;border-radius:8px;margin:10px 0;"></div>
    `;
    chatMessages.appendChild(wrap);
  }

  function clearLoadingRows() {
    const el = document.getElementById("chatLoadingRows");
    if (el) el.remove();
  }

  function renderBubble(isMe, text) {
    return `
      <div class="msg-row ${isMe ? "me" : ""}">
        <div class="msg-bubble">${esc(text || "")}</div>
      </div>
    `;
  }

  function scrollBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function paintHeader(otherUid, prefill, token) {
    const nm = (prefill?.name || "User").trim() || "User";
    const ph = prefill?.photo || FALLBACK_AVATAR;

    // Instant header
    chatHeadName.textContent = nm;
    chatHeadAvatar.src = ph;

    // Default hide badge until fetched
    setHeaderVerified(false);

    // Keep intro in sync immediately
    paintIntro(nm, ph, false);

    try {
      const snap = await db.collection("users").doc(otherUid).get();
      if (!snap.exists) return;
      if (TOKEN !== token) return;
      if (OPEN_UID !== otherUid) return;

      const u = snap.data() || {};
      const full =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.name ||
        "User";

      const photo = u.profilePic || u.photoURL || FALLBACK_AVATAR;
      const isV = (u.verified === true);

      chatHeadName.textContent = full;
      chatHeadAvatar.src = photo;

      // ✅ VERIFIED BADGE (HEADER + INTRO)
      setHeaderVerified(isV);
      paintIntro(full, photo, isV);
    } catch (e) {
      console.error("header fetch error:", e);
    }
  }

  async function ensureConversation(convId, meUid, otherUid) {
    const ref = db.collection("conversations").doc(convId);
    const snap = await ref.get();
    if (snap.exists) return;

    await ref.set({
      participants: [meUid, otherUid],
      updatedAt: SVT(),
      lastMessage: { text: "", senderId: "", createdAt: 0 },
      unreadCountMap: { [meUid]: 0, [otherUid]: 0 }
    });
  }

  async function resetMyUnread(meUid) {
    if (!CONV_ID) return;
    try {
      await db.collection("conversations").doc(CONV_ID).set({
        [`unreadCountMap.${meUid}`]: 0
      }, { merge: true });
    } catch (e) {
      console.warn("unread reset failed:", e?.code || e);
    }
  }

  function listenMessages(meUid, otherUid, token) {
    const convRef = db.collection("conversations").doc(CONV_ID);

    UNSUB = convRef.collection("messages")
      .orderBy("createdAt", "asc")
      .limit(300)
      .onSnapshot((snap) => {
        if (TOKEN !== token) return;
        if (OPEN_UID !== otherUid) return;

        const nm = chatHeadName.textContent || "User";
        const ph = chatHeadAvatar.src || FALLBACK_AVATAR;
        const isV = OPEN_VERIFIED;

        chatMessages.innerHTML = "";
        paintIntro(nm, ph, isV);

        if (snap.empty) return;

        snap.forEach(d => {
          const m = d.data() || {};
          chatMessages.insertAdjacentHTML(
            "beforeend",
            renderBubble(m.senderId === meUid, m.text || "")
          );
        });

        scrollBottom();
      }, (err) => {
        console.error("messages listener error:", err);

        const nm = chatHeadName.textContent || "User";
        const ph = chatHeadAvatar.src || FALLBACK_AVATAR;
        const isV = OPEN_VERIFIED;

        chatMessages.innerHTML = "";
        paintIntro(nm, ph, isV);
        chatMessages.insertAdjacentHTML(
          "beforeend",
          `<div style="padding:14px;color:#c00;">Failed to load messages</div>`
        );
      });
  }

  async function openChat(otherUid, prefill = {}) {
    if (!auth.currentUser) {
      if (typeof promptSignup === "function") promptSignup("Please signup to message");
      return;
    }

    const meUid = auth.currentUser.uid;
    if (!otherUid || otherUid === meUid) return;

    const token = ++TOKEN;

    stop();
    OPEN_UID = otherUid;
    CONV_ID  = convIdFor(meUid, otherUid);

    showChat();
    chatInput.value = "";

    const nm0 = (prefill?.name || "User").trim() || "User";
    const ph0 = prefill?.photo || FALLBACK_AVATAR;

    // Reset state per open
    OPEN_VERIFIED = false;

    chatMessages.innerHTML = "";
    paintIntro(nm0, ph0, false);
    paintLoadingRows();

    // default hide badge until fetched
    setHeaderVerified(false);

    paintHeader(otherUid, prefill, token);

    try {
      await ensureConversation(CONV_ID, meUid, otherUid);
      if (TOKEN !== token) return;

      await resetMyUnread(meUid);

      clearLoadingRows();
      listenMessages(meUid, otherUid, token);
    } catch (e) {
      console.error("open chat error:", e);
      clearLoadingRows();

      const nm = chatHeadName.textContent || nm0;
      const ph = chatHeadAvatar.src || ph0;

      chatMessages.innerHTML = "";
      paintIntro(nm, ph, OPEN_VERIFIED);
      chatMessages.insertAdjacentHTML(
        "beforeend",
        `<div style="padding:14px;color:#c00;"></div>`
      );
    }
  }



// ================= SEND + EVENTS (REPLACE THIS WHOLE BLOCK) =================

function updateSendButton() {
  const hasText = (chatInput.value || "").trim().length > 0;

  if (hasText) {
    chatSendBtn.classList.add("enabled");
    chatSendBtn.disabled = false;
  } else {
    chatSendBtn.classList.remove("enabled");
    chatSendBtn.disabled = true;
  }
}

async function send() {
  if (!auth.currentUser) return;
  if (!CONV_ID || !OPEN_UID) return;

  const text = (chatInput.value || "").trim();
  if (!text) return;

  if (SENDING) return;
  SENDING = true;

  const meUid = auth.currentUser.uid;

  // clear input + update UI instantly
  chatInput.value = "";
  updateSendButton();

  const convRef = db.collection("conversations").doc(CONV_ID);
  const msgRef  = convRef.collection("messages").doc();
  const batch   = db.batch();

  const ts = SVT();

  batch.set(msgRef, {
    senderId: meUid,
    receiverId: OPEN_UID,
    text,
    createdAt: ts,
    type: "text"
  });

  batch.set(convRef, {
    participants: [meUid, OPEN_UID],
    updatedAt: ts,
    lastMessage: { text, senderId: meUid, createdAt: ts },
    [`unreadCountMap.${OPEN_UID}`]: INC(1),
    [`unreadCountMap.${meUid}`]: 0
  }, { merge: true });

  try {
    await batch.commit();
  } catch (e) {
    console.error("SEND ERROR:", e);
    alert(e?.code ? `${e.code}: ${e.message}` : "Failed to send");

    // if send failed, restore text back (optional but nicer)
    chatInput.value = text;
    updateSendButton();
  } finally {
    SENDING = false;
  }
}

// ---------- events ----------
chatSendBtn.addEventListener("click", send);

// ✅ this is what makes the button turn red while typing
chatInput.addEventListener("input", updateSendButton);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

chatBackBtn.addEventListener("click", (e) => {
  e.preventDefault();
  stop();

  OPEN_UID = null;
  CONV_ID = null;
  OPEN_VERIFIED = false;

  chatHeadName.textContent = "User";
  chatHeadAvatar.src = FALLBACK_AVATAR;
  setHeaderVerified(false);

  chatMessages.innerHTML = "";
  chatInput.value = "";
  updateSendButton();

  hideChat();
});

document.addEventListener("click", (e) => {
  const item = e.target.closest(".chat-item[data-uid]");
  if (!item) return;

  const uid = item.dataset.uid;
  if (!uid) return;

  const name  = (item.querySelector(".chat-name-text")?.textContent || "").trim() || "User";
  const photo = item.querySelector("img.chat-avatar")?.getAttribute("src") || FALLBACK_AVATAR;

  openChat(uid, { name, photo });

  // reset button state when opening chat
  chatInput.value = "";
  updateSendButton();
});

window.__openChat = openChat;

// initial state on load
updateSendButton();

hideChat();
})();

//shere section//
// ===== SHARE (Native Share Sheet) =====
async function sharePost({ postId, text = "", url = "", files = null }) {
  const shareData = {
    title: "Everest",
    text: text || "Check this post",
    url: url || (location.origin + location.pathname + "#post=" + postId)
  };

  try {
    if (navigator.share) {
      // files share (optional) - only if supported
      if (files && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }
      await navigator.share(shareData);
      return true;
    }
  } catch (err) {
    // user cancelled => ignore
    if (err?.name !== "AbortError") console.error("share error:", err);
    return false;
  }

  // Fallback: copy link
  const fallbackLink = shareData.url;
  try {
    await navigator.clipboard.writeText(fallbackLink);
    alert("Link copied");
  } catch (e) {
    prompt("Copy this link:", fallbackLink);
  }
  return false;
}

// ✅ SHARE BUTTON
document.addEventListener("click", async (e) => {
  const sb = e.target.closest(".share-btn");
  if (!sb) return;

  const postId = sb.dataset.post;
  if (!postId) return;

  // Optional: post caption/name fetch করে share text সুন্দর করা
  let text = "Check this post on Everest";
  try {
    const snap = await db.collection("posts").doc(postId).get();
    if (snap.exists) {
      const p = snap.data() || {};
      const cap = (p.caption || "").trim();
      text = cap ? cap : text;
    }
  } catch (err) {}

  sharePost({
    postId,
    text,
    url: location.origin + location.pathname + "#post=" + postId
  });
});

//back to home//
// ===== SPA HISTORY: pages + modals (Back: modal close -> home -> exit) =====
const PAGE_IDS = {
  home: "homePage",
  profile: "profilePage",
  notification: "notificationPage",
  message: "messagePage",
  reels: "reelsPage",
  friends: "friendsPage",
  settings: "settingsPage",
};

const MODAL_IDS = [
  "textPostModal",
  "mediaCaptionModal",
  "editPostModal",
  "authModal",
  "loginModal",
  "changeNameModal",
  "commentsModal",
  "reactorsModal",
  "confirmModal"
];

function isModalOpen(modalId){
  const el = document.getElementById(modalId);
  if (!el) return false;

  // your project uses both display:flex and classList "open"
  const disp = getComputedStyle(el).display;
  const byDisplay = disp !== "none";
  const byClass = el.classList.contains("open");
  return byDisplay || byClass;
}

function closeModalById(modalId){
  const el = document.getElementById(modalId);
  if (!el) return;

  // support both systems
  el.classList.remove("open");
  el.style.display = "none";
}

// closes the top-most currently open modal (if any)
function closeTopOpenModal(){
  for (let i = MODAL_IDS.length - 1; i >= 0; i--){
    const id = MODAL_IDS[i];
    if (isModalOpen(id)){
      closeModalById(id);
      return true;
    }
  }
  return false;
}

function hideAllPagesSPA(){
  Object.values(PAGE_IDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function renderPageSPA(page){
  if (!PAGE_IDS[page]) page = "home";

  hideAllPagesSPA();
 

  const el = document.getElementById(PAGE_IDS[page]);
  if (el) el.style.display = "block";

  if (page === "profile") document.body.classList.add("profile-mode");
  else document.body.classList.remove("profile-mode");

  if (typeof setNavbarVisible === "function") {
    if (page === "message" || page === "notification") setNavbarVisible(false);
    else setNavbarVisible(true);
  }

  window.scrollTo(0, 0);
}

function gotoPage(page, { push = true } = {}){
  renderPageSPA(page);

  if (page === "home") {
    history.replaceState({ page: "home" }, "", location.pathname + location.search);
    return;
  }

  if (push) history.pushState({ page }, "", "#" + page);
  else history.replaceState({ page }, "", "#" + page);
}

// modal open => pushState so back closes modal first
function openModalHistory(modalId){
  const el = document.getElementById(modalId);
  if (!el) return;

  // open (support both)
  if (modalId === "commentsModal" || modalId === "reactorsModal" || modalId === "confirmModal"){
    el.classList.add("open");
  } else {
    el.style.display = "flex";
  }

  // add history state for modal
  history.pushState({ modal: modalId }, "", "#m-" + modalId);
}

// modal close (UI only). Back handler will manage history.
function closeModalHistory(modalId){
  closeModalById(modalId);
}

// init base state
(function initSpaHistory(){
  history.replaceState({ page: "home" }, "", location.pathname + location.search);

  window.addEventListener("popstate", (e) => {
    const st = e.state || {};

    // 1) if we were on a modal state -> back should close any open modal
    if (st.modal){
      closeModalById(st.modal);
      return;
    }

    // 2) if ANY modal is open (safety) close it and stay on current page
    if (closeTopOpenModal()) return;

    // 3) page navigation
    const page = st.page;
    if (!page) {
      // no state => first back goes home
      gotoPage("home", { push: false });
      return;
    }

    renderPageSPA(page);
  });
})();

//mobile back btn menu active//
function syncActiveIcon(page){
  // সব active remove
  icons.forEach(i => i.classList.remove("active"));

  if (page === "profile") profileIcon?.classList.add("active");
  else if (page === "notification") notificationIcon?.classList.add("active");
  else if (page === "message") messageIcon?.classList.add("active");
  else if (page === "reels") reelsIcon?.classList.add("active");
  else if (page === "friends") friendIcon?.classList.add("active");
  else homeIcon?.classList.add("active"); // default home
}


function renderPageSPA(page){
  if (!PAGE_IDS[page]) page = "home";

  hideAllPagesSPA();
  
  if (page !== "settings") {
    document.body.classList.remove("settings-open");
  }
  const el = document.getElementById(PAGE_IDS[page]);
  if (el) el.style.display = "block";
  // ✅ profile-mode class
  if (page === "profile") document.body.classList.add("profile-mode");
  else document.body.classList.remove("profile-mode");
  // ✅ navbar visibility
  if (typeof setNavbarVisible === "function") {
    if (page === "message" || page === "notification") setNavbarVisible(false);
    else setNavbarVisible(true);
  }
// ✅ ACTIVE ICON SYNC (THIS FIXES MOBILE BACK)
  syncActiveIcon(page);
  window.scrollTo(0, 0);
}


//mobile back btn//
/* ================= BOOT + HOME SCROLL BACK (REPLACE FULL) ================= */
(() => {
  // ---------- 1) BOOT DEFAULT PAGE (NO AUTO PROFILE) ----------
  function bootDefaultPage() {
    // normalize hash
    const raw = (location.hash || "").replace("#", "");

    // modal hash হলে home এ নাও (modal auto-open করবো না)
    if (raw.startsWith("m-")) {
      gotoPage("home", { push: false });
      return;
    }

    // allow only known pages
    const allowed = new Set(["home", "profile", "notification", "message", "reels", "friends", "settings"]);

    if (allowed.has(raw)) {
      // open that page without pushing new history entry
      gotoPage(raw, { push: false });
    } else {
      // default: home
      gotoPage("home", { push: false });
    }
  }

  // run after your initSpaHistory has set replaceState({page:"home"})
  // but safe to run anyway
  try { bootDefaultPage(); } catch (e) { try { gotoPage("home", { push: false }); } catch(_){} }

  // ---------- 2) HOME scroll -> push a scroll state so back goes to top ----------
  let homeScrollStatePushed = false;

  function isHomeVisible() {
    const st = history.state || {};
    const homeEl = document.getElementById("homePage");
    const homeVisible = homeEl && getComputedStyle(homeEl).display !== "none";
    return st.page === "home" || homeVisible;
  }

  function onHomeScroll() {
    if (!isHomeVisible()) return;

    const y = window.scrollY || 0;

    // push only once when user scrolls down a bit
    if (y > 180 && !homeScrollStatePushed) {
      const st = history.state || {};
      if (!st.homeScroll) {
        history.pushState({ page: "home", homeScroll: true }, "", "#home");
      }
      homeScrollStatePushed = true;
    }

    // reset flag when user returns to top
    if (y <= 30) homeScrollStatePushed = false;
  }

  window.addEventListener("scroll", onHomeScroll, { passive: true });

  // ---------- 3) popstate helper: back to home base => force top ----------
  window.addEventListener("popstate", () => {
    const st = history.state || {};

    if (st.page === "home" && !st.homeScroll) {
      if (typeof closeTopOpenModal === "function") closeTopOpenModal();
      if (typeof renderPageSPA === "function") renderPageSPA("home");
      window.scrollTo(0, 0);
    }
  });
})();



function bindNav(id, fn){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    fn();
  }, true); // capture=true so overwritten onclick doesn't matter
}

// ✅ bind
bindNav("homeIcon", () => {
  hideReelsPage?.();
  hideFriendsPage?.();
  gotoPage("home");
});

bindNav("profileIcon", () => {
  hideReelsPage?.();
  hideFriendsPage?.();
  window.__openMyProfile();//only sinup user//
});

bindNav("notificationIcon", () => {
  hideReelsPage?.();
  hideFriendsPage?.();
  gotoPage("notification");
});

bindNav("messageIcon", () => {
  hideReelsPage?.();
  hideFriendsPage?.();
  gotoPage("message");
});

//plus icon//
const plusWrap = document.getElementById("plusWrap");
const plusMenu = document.getElementById("plusMenu");

let plusMenuOpen = false;

function closePlusMenu({ popHistory = false } = {}) {
  if (!plusMenuOpen) return;

  plusMenu.classList.remove("open");
  plusMenuOpen = false;

  if (popHistory && history.state?.plusMenuOpen) {
    history.back();
  }
}

function openPlusMenu() {
  // ✅ guest allowed: menu can open
  plusMenu.classList.add("open");
  plusMenuOpen = true;

  // push state so BACK closes it
  history.pushState({ plusMenuOpen: true }, "");
}

function togglePlusMenu() {
  plusMenuOpen ? closePlusMenu({ popHistory: true }) : openPlusMenu();
}

// ✅ only plus icon toggles menu
plusWrap?.addEventListener("click", (e) => {
  if (!e.target.closest("#plusIcon")) return;
  e.stopPropagation();
  togglePlusMenu();
});

// ✅ menu item actions
plusMenu?.addEventListener("click", (e) => {
  const item = e.target.closest(".pmx-item");
  if (!item) return;

  const act = item.dataset.act;
  const isGuest = !auth?.currentUser;

  // close menu UI (don't touch history here)
  closePlusMenu({ popHistory: false });

  // ✅ guest restriction only for creating posts
  if (isGuest && (act === "text" || act === "media")) {
    // তুমি চাইলে alert এর বদলে promptSignup() দিতে পারো
    alert("Please signup to create post");
    // promptSignup("Please signup to create post");
    return;
  }

  if (act === "text") {
    openModalHistory("textPostModal");
    return;
  }

  if (act === "media") {
    imageInput?.click();
    return;
  }

  if (act === "reels") {
    REELS_SOUND_UNLOCKED = true;
    REELS_USER_MUTED = false;
    openReelsPage?.();
    return;
  }

  if (act === "story") {
    alert("Story feature coming soon");
    return;
  }

  if (act === "ai") {
    window.open("https://tinyurl.com/Murad-Ai", "_blank");
    return;
  }
});

// ✅ outside click closes (and clears history state)
document.addEventListener("click", (e) => {
  if (!e.target.closest("#plusWrap")) {
    closePlusMenu({ popHistory: true });
  }
});

// ✅ ESC closes
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePlusMenu({ popHistory: true });
  }
});

// ✅ Mobile back closes menu
window.addEventListener("popstate", () => {
  if (plusMenuOpen) {
    closePlusMenu({ popHistory: false });
  }
});

//follow/message//
// ================= PROFILE ACTIONS (FAST FOLLOW + REALTIME STATE + COUNTS) =================
function setProfileActionsForUid(profileUid) {
  const followBtn = document.querySelector(".profile-actions .follow-btn");
  const msgBtn    = document.querySelector(".profile-actions .message-btn");
  if (!followBtn || !msgBtn || !profileUid) return () => {};

  const meUid = auth.currentUser?.uid || "";
  const isOwner = meUid && meUid === profileUid;

  // ---- cleanup holders (avoid duplicate listeners / memory leaks)
  let unsubCounts = null;
  let unsubFollowState = null;

  // ---- refs
  const userRef = (uid) => db.collection("users").doc(uid);
  const followingDoc = (fromUid, toUid) => userRef(fromUid).collection("following").doc(toUid);
  const followersDoc = (targetUid, fromUid) => userRef(targetUid).collection("followers").doc(fromUid);

  // ================= UI HELPERS =================
  function setFollowUI(following, loading = false) {
    followBtn.disabled = !!loading;
    followBtn.textContent = loading
      ? (following ? "Following..." : "Follow...")
      : (following ? "Following" : "Follow");

    followBtn.classList.toggle("is-following", !!following);
  }

  function setOwnerUI() {
    followBtn.disabled = false;
    followBtn.classList.remove("is-following");
    followBtn.textContent = "Create Post";
    msgBtn.textContent = "Add Story";
  }

  // ================= REALTIME COUNTS =================
  function startCounts(uid) {
    const uref = userRef(uid);

    const unsub1 = uref.collection("followers").onSnapshot((snap) => {
      const el = document.getElementById("followersCount");
      if (el) el.textContent = String(snap.size || 0);
    });

    const unsub2 = uref.collection("following").onSnapshot((snap) => {
      const el = document.getElementById("followingCount");
      if (el) el.textContent = String(snap.size || 0);
    });

    return () => { unsub1(); unsub2(); };
  }

  // ================= REALTIME FOLLOW STATE =================
  function startFollowState(targetUid) {
    if (!auth.currentUser || !meUid) {
      setFollowUI(false, false);
      return () => {};
    }

    // Listen to "am I following this user?"
    const ref = followingDoc(meUid, targetUid);
    return ref.onSnapshot((doc) => {
      // This will also correct the UI if write fails / or changes from other device.
      const isFollowing = doc.exists;
      setFollowUI(isFollowing, false);
    });
  }

  // ================= FAST TOGGLE (BATCH) =================
  async function toggleFollowFast(targetUid, shouldFollow) {
    const now = Date.now();

    const meFollowingRef = followingDoc(meUid, targetUid);
    const targetFollowersRef = followersDoc(targetUid, meUid);

    const batch = db.batch();

    if (shouldFollow) {
      batch.set(meFollowingRef, { userId: targetUid, createdAt: now }, { merge: true });
      batch.set(targetFollowersRef, { userId: meUid, createdAt: now }, { merge: true });
    } else {
      batch.delete(meFollowingRef);
      batch.delete(targetFollowersRef);
    }

    await batch.commit();
    return shouldFollow;
  }

  // ================= RESET HANDLERS =================
  followBtn.onclick = null;
  msgBtn.onclick = null;

  // ================= OWNER VIEW =================
  if (isOwner) {
    setOwnerUI();

    followBtn.onclick = () => imageInput?.click();
    msgBtn.onclick = () => alert("Story feature coming soon");

    unsubCounts?.();
    unsubCounts = startCounts(profileUid);

    // no follow-state listener for owner
    return () => { unsubCounts?.(); unsubCounts = null; };
  }

  // ================= OTHER USER VIEW =================
  msgBtn.textContent = "Message";

  // counts listener
  unsubCounts?.();
  unsubCounts = startCounts(profileUid);

  // follow-state listener (instant state sync)
  unsubFollowState?.();
  unsubFollowState = startFollowState(profileUid);

  // follow click (optimistic UI)
  followBtn.onclick = async () => {
    if (!auth.currentUser) {
      promptSignup("Please signup to follow");
      return;
    }

    const currentlyFollowing = followBtn.classList.contains("is-following");
    const next = !currentlyFollowing;

    // 0s-feel: update UI instantly
    setFollowUI(next, true);

    try {
      await toggleFollowFast(profileUid, next);
      // onSnapshot will finalize UI; but we also unlock instantly
      setFollowUI(next, false);
    } catch (e) {
      console.error(e);
      // revert instantly if failed
      setFollowUI(currentlyFollowing, false);
      alert("Follow failed");
    }
  };

  // message click
  msgBtn.onclick = () => {
    if (!auth.currentUser) {
      promptSignup("Please signup to message");
      return;
    }

    const name = (document.getElementById("profileName")?.textContent || "User").trim();
    const photo =
      document.getElementById("profilePicBig")?.src ||
      document.getElementById("profilePic")?.src ||
      "https://i.imgur.com/6VBx3io.png";

    gotoPage("message");

    if (typeof window.__openChat === "function") {
      window.__openChat(profileUid, { name, photo });
    }
  };

  // return cleanup function (call this when leaving profile page)
  return () => {
    unsubCounts?.(); unsubCounts = null;
    unsubFollowState?.(); unsubFollowState = null;
  };
}

//search section//
(() => {
  const ALGOLIA_APP_ID = "ISIAJ0VOPF";
  const ALGOLIA_SEARCH_KEY = "2b2d1959f16482266e968fee717ee2bb";
  const ALGOLIA_INDEX = "users";

  const FALLBACK_AVATAR = "https://i.imgur.com/6VBx3io.png";

  const esc = (s = "") => String(s).replace(/[<>]/g, "");
  const debounce = (fn, wait = 180) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // uid -> { verified, profilePic, title, fullName }
  const USER_META_CACHE = new Map();

  function badgeHTML(uid) {
    return `
      <span class="verified-badge" data-uid="${esc(uid)}" title="Verified" style="display:none;">
        <svg class="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z" fill="#ff1f1f"/>
          <path d="M9.3 12.6l1.9 1.9 4.2-4.3" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;
  }

  function setEmpty(resultsList, text) {
    resultsList.innerHTML = `<div class="empty-state">${esc(text)}</div>`;
  }

  function renderLoading(resultsList) {
    resultsList.innerHTML = Array.from({ length: 7 }).map(() => `
      <div class="srow" style="cursor:default; opacity:.7;">
        <div style="width:44px;height:44px;border-radius:50%;background:#eee;"></div>
        <div class="meta" style="flex:1;">
          <div style="height:12px;width:170px;background:#eee;border-radius:6px;"></div>
          <div style="height:10px;width:130px;background:#eee;border-radius:6px;margin-top:8px;"></div>
        </div>
      </div>
    `).join("");
  }

  function normalizeHit(h) {
    const uid = (h.objectID || h.uid || h.userUid || h.userId || "").toString().trim();
    const fullName = (
      (h.fullName || h.name || [h.firstName, h.lastName].filter(Boolean).join(" "))
    ).toString().trim() || "User";

    const photo = (h.profilePic || h.photo || h.userPhoto || "").toString().trim();
    // optional, final title will come from Firestore anyway
    const title = (h.title || h.bioTitle || h.tagline || h.role || h.userId || "").toString().trim();

    return { uid, fullName, photo, title };
  }

  async function warmUserMeta(uids) {
    const need = Array.from(new Set((uids || []).filter(Boolean)))
      .filter(uid => !USER_META_CACHE.has(uid));

    if (!need.length) return;

    const snaps = await Promise.all(
      need.map(uid => db.collection("users").doc(uid).get().catch(() => null))
    );

    snaps.forEach((snap, i) => {
      const uid = need[i];
      const d = (snap && snap.exists) ? (snap.data() || {}) : {};

      const fullName =
        [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
        d.fullName ||
        d.name ||
        "User";

      const meta = {
        verified: d.verified === true,
        profilePic: (d.profilePic || d.photoURL || d.photo || "").toString().trim(),
        // ✅ title priority: title / bioTitle / tagline / role / userId
        title: (d.title || d.bioTitle || d.tagline || d.role || d.userId || "").toString().trim(),
        fullName
      };

      USER_META_CACHE.set(uid, meta);
    });
  }

  function applyMetaToRow(rowEl, uid) {
    const meta = USER_META_CACHE.get(uid);
    if (!meta) return;

    // name
    const nameEl = rowEl.querySelector(".ntext");
    if (nameEl && meta.fullName) nameEl.textContent = meta.fullName;

    // photo
    const img = rowEl.querySelector("img");
    if (img) img.src = (meta.profilePic || rowEl.dataset.photo || FALLBACK_AVATAR);

    // ✅ title line uses existing .uid class (so your CSS shows it)
    const titleEl = rowEl.querySelector(".uid");
    if (titleEl) {
      const t = meta.title || "";
      titleEl.textContent = t;
      titleEl.style.display = t ? "block" : "none";
    }

    // badge
    const badge = rowEl.querySelector(".verified-badge");
    if (badge) badge.style.display = meta.verified ? "inline-flex" : "none";

    // dataset for instant open
    rowEl.dataset.name = meta.fullName || rowEl.dataset.name || "User";
    rowEl.dataset.photo = meta.profilePic || rowEl.dataset.photo || FALLBACK_AVATAR;
  }

  async function hydrateRenderedRows(resultsList) {
    const rows = Array.from(resultsList.querySelectorAll(".srow[data-uid]"));
    const uids = rows.map(r => (r.dataset.uid || "").trim()).filter(Boolean);

    await warmUserMeta(uids);
    rows.forEach(r => applyMetaToRow(r, (r.dataset.uid || "").trim()));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const searchIcon = document.getElementById("searchIcon");
    const searchOverlay = document.getElementById("searchOverlay");
    const searchInput = document.getElementById("searchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    const resultsList = document.getElementById("searchResultsList");
    const searchBackBtn = document.getElementById("searchBackBtn");

    if (!searchIcon || !searchOverlay || !searchInput || !searchClearBtn || !resultsList || !searchBackBtn) {
      console.warn("Search UI elements missing. Check IDs.");
      return;
    }

    if (typeof algoliasearch !== "function") {
      console.error("Algolia CDN not loaded. Add algoliasearch script tag before this JS.");
      return;
    }

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    const openSearch = () => {
      searchOverlay.style.display = "flex";
      searchOverlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("search-open");

      history.pushState({searchOpen:true}, "", "#search");

      searchInput.value = "";
      setEmpty(resultsList, "Type to search users");
      setTimeout(() => searchInput.focus(), 10);
    };

    const closeSearch = () => {
      searchOverlay.style.display = "none";
      searchOverlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("search-open");

      searchInput.value = "";
      resultsList.innerHTML = "";
    };

    const renderResults = async (hits) => {
      if (!hits || !hits.length) {
        setEmpty(resultsList, "users not found");
        return;
      }

      const rows = hits.map(normalizeHit).filter(x => x.uid);

      // instant paint (title uses .uid class)
      resultsList.innerHTML = rows.map(r => `
        <div class="srow"
             data-uid="${esc(r.uid)}"
             data-name="${esc(r.fullName)}"
             data-photo="${esc(r.photo || FALLBACK_AVATAR)}">
          <img src="${esc(r.photo || FALLBACK_AVATAR)}"
               loading="lazy"
               decoding="async"
               onerror="this.onerror=null;this.src='${FALLBACK_AVATAR}';" />

          <div class="meta">
            <div class="name" style="display:flex;align-items:center;gap:6px;">
              <span class="ntext">${esc(r.fullName)}</span>
              ${badgeHTML(r.uid)}
            </div>

            <!-- ✅ title line (same class .uid that your UI already supports) -->
            <div class="uid" style="${r.title ? "display:block" : "display:none"}">
              ${esc(r.title || "")}
            </div>
          </div>
        </div>
      `).join("");

      // hydrate from Firestore (guarantee title/verified/pic)
      await hydrateRenderedRows(resultsList);
    };

    const doSearch = debounce(async () => {
      const q = (searchInput.value || "").trim();
      if (!q) {
        setEmpty(resultsList, "Type to search users");
        return;
      }

      renderLoading(resultsList);

      try {
        const res = await index.search(q, { hitsPerPage: 20 });
        await renderResults(res.hits || []);
      } catch (e) {
        console.error("Algolia search error:", e);
        setEmpty(resultsList, "Search failed");
      }
    }, 180);

    // events
    searchIcon.addEventListener("click", (e) => {
      e.preventDefault();
      openSearch();
    });

    searchBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSearch();
    });

    searchClearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      searchInput.focus();
      setEmpty(resultsList, "Type to search users");
    });

    searchInput.addEventListener("input", doSearch);

    // click -> open profile
    resultsList.addEventListener("click", (e) => {
      const row = e.target.closest(".srow[data-uid]");
      if (!row) return;

      const uid = (row.dataset.uid || "").trim();
      if (!uid) return;

      const name = (row.dataset.name || "User").trim() || "User";
      const photo = (row.dataset.photo || "").trim() || FALLBACK_AVATAR;

      closeSearch();

      if (typeof cacheUserHeader === "function") cacheUserHeader(uid, { name, photo });
      if (typeof openUserProfile === "function") openUserProfile(uid, { name, photo });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && searchOverlay.style.display === "flex") closeSearch();
    });

    setEmpty(resultsList, "Type to search users");
  });
})();



window.addEventListener("popstate", function () {

  if (searchOverlay && searchOverlay.style.display === "flex") {

    searchOverlay.style.display = "none";
    searchOverlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("search-open");

  }

});
//privecy policy//
document.addEventListener("DOMContentLoaded", function(){

const privacyBtn = document.getElementById("privacyBtn");
const privacyPage = document.getElementById("privacyPage");
const privacyBack = document.getElementById("privacyBack");
const settingsPage = document.getElementById("settingsPage");

if(privacyBtn){
  privacyBtn.addEventListener("click", function(){
    settingsPage.style.display = "none";
    privacyPage.style.display = "block";

    history.pushState({page:"privacy"}, "", "");
  });
}

if(privacyBack){
  privacyBack.addEventListener("click", function(){
    privacyPage.style.display = "none";
    settingsPage.style.display = "block";
  });
}

window.addEventListener("popstate", function(){
  if(privacyPage.style.display === "block"){
    privacyPage.style.display = "none";
    settingsPage.style.display = "block";
  }
});

});

//about//
document.addEventListener("DOMContentLoaded", function(){

const aboutBtn = document.getElementById("aboutBtn");
const aboutPage = document.getElementById("aboutPage");
const aboutBack = document.getElementById("aboutBack");
const settingsPage = document.getElementById("settingsPage");

if(aboutBtn){
  aboutBtn.addEventListener("click", function(){
    settingsPage.style.display = "none";
    aboutPage.style.display = "block";

    history.pushState({page:"about"}, "", "");
  });
}

if(aboutBack){
  aboutBack.addEventListener("click", function(){
    aboutPage.style.display = "none";
    settingsPage.style.display = "block";
  });
}

window.addEventListener("popstate", function(){
  if(aboutPage.style.display === "block"){
    aboutPage.style.display = "none";
    settingsPage.style.display = "block";
  }
});

});

//language//
/* ================= LANGUAGE SYSTEM ================= */
const languageItem   = document.getElementById("languageItem");
const languagePage   = document.getElementById("languagePage");
const languageBack   = document.getElementById("languageBack");
const englishToggle  = document.getElementById("englishToggle");
const banglaToggle   = document.getElementById("banglaToggle");
const privacyPageEl  = document.getElementById("privacyPage");
const aboutPageEl    = document.getElementById("aboutPage");

const LANG_DATA = {
  en: {
    settingsTitle: "Settings",
    settingsLanguageText: "Language",
    settingsDarkModeText: "Dark Mode",
    settingsPersonalDetailsText: "Personal Details",
    settingsChangePasswordText: "Change Password",
    settingsGetVerifiedText: "Get Verified",
    settingsPrivacyText: "Privacy Policy",
    settingsHelpText: "Help and support",
    settingsAboutText: "About",

    langPageTitle: "Change Language",
    langEnglishText: "English",
    langBanglaText: "Bangla",

    privacyTitle: "Privacy Policy",
    privacyIntro: "Welcome to Everest. Your privacy is important to us. This Privacy Policy explains how Everest collects, uses, and protects your information when you use our platform.",
    privacyH1: "1. Information We Collect",
    privacyP1: "When you use Everest, we may collect the following information:",
    privacyLi1: "Personal information such as your name, email address, and profile details.",
    privacyLi2: "Content you create such as posts, comments, photos, and messages.",
    privacyLi3: "Device and usage information including browser type, IP address, and activity on the platform.",
    privacyH2: "2. How We Use Your Information",
    privacyLi4: "Provide and improve Everest services.",
    privacyLi5: "Allow you to create posts and interact with users.",
    privacyLi6: "Keep the platform safe and prevent spam.",
    privacyLi7: "Improve user experience.",
    privacyH3: "3. Data Protection",
    privacyP2: "Everest takes appropriate security measures to protect your personal information from unauthorized access, misuse, or loss. We use modern security practices and restricted access systems to safeguard user data. However, because the internet is not completely secure, we cannot guarantee absolute protection of all information.",
    privacyH4: "4. Sharing Information",
    privacyP3: "Everest does not sell or trade your personal data to third parties. Information may only be shared when necessary to operate the platform, comply with legal obligations, or protect the safety and rights of our users and services.",
    privacyH5: "5. User Control",
    privacyLi8: "Edit your personal information.",
    privacyLi9: "Delete posts or content.",
    privacyLi10: "Request account deletion.",
    privacyH6: "6. Cookies",
    privacyP4: "Everest may use cookies to enhance site performance, remember user preferences, and improve the overall browsing experience. Disabling cookies may limit certain features of the platform.",
    privacyH7: "7. Changes to Privacy Policy",
    privacyP5: "We may update this Privacy Policy occasionally to reflect improvements or legal requirements. The updated version will always be published on this page with the latest revision date.",
    privacyH8: "8. Contact Us",
    privacyP6: "If you have any questions or concerns about this Privacy Policy, you can contact us through the Everest support system within the platform.",

    aboutTitle: "About – Everest",
    aboutH1: "Welcome to Everest",
    aboutP1: "Everest is a modern and innovative social networking platform created to bring people closer together in the digital world. It is a place where users can connect, communicate, share ideas, and express themselves freely. Everest is designed to make online interaction simple, enjoyable, and meaningful for everyone.",
    aboutH2: "1. Our Platform",
    aboutP2: "Everest allows users to create their own profiles and build their online identity. On the platform, people can share posts, upload photos and videos, and interact with others through likes, comments, and shares.",
    aboutP3: "The platform is built to make communication easy and engaging so that users can stay connected with friends, family, and new people from around the world.",
    aboutH3: "2. Our Mission",
    aboutP4: "Our mission is to connect people from different cultures, places, and backgrounds through one simple platform. Everest aims to create a friendly and welcoming online space where everyone can share their thoughts, experiences, creativity, and moments without barriers.",
    aboutH4: "3. What You Can Do",
    aboutLi1: "Creating and sharing posts with the community",
    aboutLi2: "Uploading photos and videos",
    aboutLi3: "Following friends and discovering new people",
    aboutLi4: "Liking, commenting, and sharing content",
    aboutLi5: "Expressing thoughts, ideas, and daily moments",
    aboutH5: "4. Community",
    aboutP5: "Everest focuses on building a positive and respectful online community. The platform encourages users to communicate kindly, support each other, and share meaningful content.",
    aboutH6: "5. Our Vision",
    aboutP6: "Our vision is to grow Everest into a global social networking platform where people from every corner of the world can easily connect, communicate, and share their stories.",
    aboutH7: "6. Our Goal",
    aboutP7: "Our goal is to build a simple, fast, and user-friendly social media platform that anyone can use easily."
  },

  bn: {
    settingsTitle: "সেটিংস",
    settingsLanguageText: "ভাষা",
    settingsDarkModeText: "ডার্ক মোড",
    settingsPersonalDetailsText: "ব্যক্তিগত তথ্য",
    settingsChangePasswordText: "পাসওয়ার্ড পরিবর্তন",
    settingsGetVerifiedText: "ভেরিফাইড নিন",
    settingsPrivacyText: "প্রাইভেসি পলিসি",
    settingsHelpText: "হেল্প এবং সাপোর্ট",
    settingsAboutText: "অ্যাবাউট",

    langPageTitle: "ভাষা পরিবর্তন",
    langEnglishText: "ইংলিশ",
    langBanglaText: "বাংলা",

    privacyTitle: "প্রাইভেসি পলিসি",
    privacyIntro: "Everest-এ আপনাকে স্বাগতম। আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। এই Privacy Policy ব্যাখ্যা করে Everest কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষা করে যখন আপনি আমাদের প্ল্যাটফর্ম ব্যবহার করেন।",
    privacyH1: "১. আমরা কী তথ্য সংগ্রহ করি",
    privacyP1: "আপনি Everest ব্যবহার করলে আমরা নিচের তথ্য সংগ্রহ করতে পারি:",
    privacyLi1: "আপনার নাম, ইমেইল ঠিকানা এবং প্রোফাইল সম্পর্কিত ব্যক্তিগত তথ্য।",
    privacyLi2: "আপনার তৈরি করা কনটেন্ট যেমন পোস্ট, কমেন্ট, ছবি এবং মেসেজ।",
    privacyLi3: "ডিভাইস ও ব্যবহারসংক্রান্ত তথ্য যেমন browser type, IP address, এবং platform activity।",
    privacyH2: "২. আপনার তথ্য কীভাবে ব্যবহার করি",
    privacyLi4: "Everest সেবা প্রদান ও উন্নত করতে।",
    privacyLi5: "আপনাকে পোস্ট তৈরি ও অন্যদের সাথে যোগাযোগ করতে দিতে।",
    privacyLi6: "প্ল্যাটফর্ম নিরাপদ রাখতে এবং spam প্রতিরোধ করতে।",
    privacyLi7: "ব্যবহারকারীর অভিজ্ঞতা উন্নত করতে।",
    privacyH3: "৩. তথ্য সুরক্ষা",
    privacyP2: "Everest আপনার ব্যক্তিগত তথ্যকে অননুমোদিত প্রবেশ, অপব্যবহার বা ক্ষতি থেকে রক্ষা করতে উপযুক্ত নিরাপত্তা ব্যবস্থা গ্রহণ করে। আমরা আধুনিক নিরাপত্তা পদ্ধতি এবং সীমিত access system ব্যবহার করি। তবে ইন্টারনেট সম্পূর্ণ নিরাপদ নয়, তাই আমরা সব তথ্যের শতভাগ নিরাপত্তা নিশ্চিত করতে পারি না।",
    privacyH4: "৪. তথ্য শেয়ারিং",
    privacyP3: "Everest আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা বাণিজ্য করে না। শুধুমাত্র প্ল্যাটফর্ম পরিচালনা, আইনগত বাধ্যবাধকতা পালন, অথবা ব্যবহারকারী ও সেবার নিরাপত্তা রক্ষার প্রয়োজন হলে তথ্য শেয়ার করা হতে পারে।",
    privacyH5: "৫. ব্যবহারকারীর নিয়ন্ত্রণ",
    privacyLi8: "নিজের ব্যক্তিগত তথ্য সম্পাদনা করতে পারবেন।",
    privacyLi9: "পোস্ট বা কনটেন্ট মুছতে পারবেন।",
    privacyLi10: "অ্যাকাউন্ট ডিলিটের অনুরোধ করতে পারবেন।",
    privacyH6: "৬. কুকিজ",
    privacyP4: "Everest site performance উন্নত করতে, user preference মনে রাখতে এবং browsing experience ভালো করতে cookies ব্যবহার করতে পারে। Cookies বন্ধ করলে কিছু feature সীমিত হতে পারে।",
    privacyH7: "৭. Privacy Policy পরিবর্তন",
    privacyP5: "উন্নয়ন বা আইনগত প্রয়োজন অনুযায়ী আমরা সময় সময় এই Privacy Policy আপডেট করতে পারি। আপডেটেড version সবসময় এই page-এ প্রকাশ করা হবে।",
    privacyH8: "৮. যোগাযোগ করুন",
    privacyP6: "এই Privacy Policy সম্পর্কে আপনার কোনো প্রশ্ন বা উদ্বেগ থাকলে Everest support system-এর মাধ্যমে আমাদের সাথে যোগাযোগ করতে পারেন।",

    aboutTitle: "অ্যাবাউট – Everest",
    aboutH1: "Everest-এ স্বাগতম",
    aboutP1: "Everest একটি আধুনিক ও উদ্ভাবনী social networking platform, যা মানুষকে ডিজিটাল দুনিয়ায় আরও কাছাকাছি নিয়ে আসার জন্য তৈরি। এখানে ব্যবহারকারীরা connect করতে, যোগাযোগ করতে, ধারণা শেয়ার করতে এবং নিজেদের স্বাধীনভাবে প্রকাশ করতে পারে।",
    aboutH2: "১. আমাদের প্ল্যাটফর্ম",
    aboutP2: "Everest ব্যবহারকারীদের নিজস্ব profile তৈরি এবং online identity গড়ার সুযোগ দেয়। এখানে মানুষ পোস্ট শেয়ার করতে, ছবি ও ভিডিও upload করতে এবং likes, comments ও shares-এর মাধ্যমে অন্যদের সাথে interact করতে পারে।",
    aboutP3: "এই প্ল্যাটফর্মটি সহজ ও আকর্ষণীয় যোগাযোগের জন্য তৈরি, যাতে ব্যবহারকারীরা বন্ধু, পরিবার এবং বিশ্বের নতুন মানুষের সাথে সংযুক্ত থাকতে পারে।",
    aboutH3: "২. আমাদের মিশন",
    aboutP4: "আমাদের মিশন হলো বিভিন্ন সংস্কৃতি, স্থান ও পটভূমির মানুষকে একটি সহজ প্ল্যাটফর্মে সংযুক্ত করা। Everest এমন একটি বন্ধুত্বপূর্ণ ও স্বাগতপূর্ণ online space তৈরি করতে চায় যেখানে সবাই নিজের চিন্তা, অভিজ্ঞতা, সৃজনশীলতা ও মুহূর্ত শেয়ার করতে পারে।",
    aboutH4: "৩. আপনি কী করতে পারবেন",
    aboutLi1: "কমিউনিটির সাথে পোস্ট তৈরি ও শেয়ার করা",
    aboutLi2: "ছবি ও ভিডিও আপলোড করা",
    aboutLi3: "বন্ধুদের follow করা এবং নতুন মানুষ খুঁজে পাওয়া",
    aboutLi4: "লাইক, কমেন্ট এবং শেয়ার করা",
    aboutLi5: "নিজের চিন্তা, আইডিয়া ও দৈনন্দিন মুহূর্ত প্রকাশ করা",
    aboutH5: "৪. কমিউনিটি",
    aboutP5: "Everest একটি ইতিবাচক ও সম্মানজনক online community গড়ে তুলতে গুরুত্ব দেয়। প্ল্যাটফর্মটি ব্যবহারকারীদের সদয়ভাবে যোগাযোগ করতে, একে অপরকে support করতে এবং meaningful content শেয়ার করতে উৎসাহ দেয়।",
    aboutH6: "৫. আমাদের ভিশন",
    aboutP6: "আমাদের ভিশন হলো Everest-কে একটি global social networking platform-এ পরিণত করা যেখানে বিশ্বের সব প্রান্তের মানুষ সহজে connect, communicate এবং নিজেদের গল্প শেয়ার করতে পারে।",
    aboutH7: "৬. আমাদের লক্ষ্য",
    aboutP7: "আমাদের লক্ষ্য হলো একটি সহজ, দ্রুত এবং user-friendly social media platform তৈরি করা যা সবাই সহজে ব্যবহার করতে পারে।"
  }
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function applyLanguage(lang) {
  const data = LANG_DATA[lang] || LANG_DATA.en;

  Object.keys(data).forEach((key) => {
    setText(key, data[key]);
  });

  localStorage.setItem("appLanguage", lang);

  if (englishToggle) englishToggle.checked = (lang === "en");
  if (banglaToggle) banglaToggle.checked = (lang === "bn");
}

function openLanguagePage() {
  if (settingsPage) settingsPage.style.display = "none";
  if (privacyPageEl) privacyPageEl.style.display = "none";
  if (aboutPageEl) aboutPageEl.style.display = "none";
  if (languagePage) languagePage.style.display = "block";
  history.pushState({ page: "language" }, "");
}

function closeLanguagePage() {
  if (languagePage) languagePage.style.display = "none";
  if (settingsPage) settingsPage.style.display = "block";
}

languageItem?.addEventListener("click", () => {
  openLanguagePage();
});

languageBack?.addEventListener("click", () => {
  closeLanguagePage();
});

englishToggle?.addEventListener("change", () => {
  if (!englishToggle.checked) {
    englishToggle.checked = true;
    return;
  }
  banglaToggle.checked = false;
  applyLanguage("en");
});

banglaToggle?.addEventListener("change", () => {
  if (!banglaToggle.checked) {
    banglaToggle.checked = true;
    return;
  }
  englishToggle.checked = false;
  applyLanguage("bn");
});

document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("appLanguage") || "en";
  applyLanguage(savedLang);
});

languageBack.addEventListener("click", () => {
  history.back();
});

window.addEventListener("popstate", function () {
  if (languagePage.style.display === "block") {
    languagePage.style.display = "none";
    settingsPage.style.display = "block";
  }
});

//change password model//
document.addEventListener("DOMContentLoaded", function () {
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const changePasswordPage = document.getElementById("changePasswordPage");
  const changePasswordBackBtn = document.getElementById("changePasswordBackBtn");
  const settingsPage = document.getElementById("settingsPage");

  const cpSubmitBtn = document.getElementById("cpSubmitBtn");
  const cpBtnText = document.querySelector(".cp-btn-text");
  const cpBtnSpinner = document.querySelector(".cp-btn-spinner");

  if (
    !changePasswordBtn ||
    !changePasswordPage ||
    !changePasswordBackBtn ||
    !settingsPage ||
    !cpSubmitBtn ||
    !cpBtnText ||
    !cpBtnSpinner
  ) {
    return;
  }

  let cpPageOpened = false;

  function openChangePasswordPage() {
    settingsPage.style.display = "none";
    changePasswordPage.style.display = "block";
    cpPageOpened = true;

    history.pushState({ changePasswordOpen: true }, "");
  }

  function closeChangePasswordPage() {
    changePasswordPage.style.display = "none";
    settingsPage.style.display = "block";
    cpPageOpened = false;
  }

  changePasswordBtn.addEventListener("click", function () {
    openChangePasswordPage();
  });

  changePasswordBackBtn.addEventListener("click", function () {
    closeChangePasswordPage();
  });

  window.addEventListener("popstate", function () {
    if (cpPageOpened) {
      closeChangePasswordPage();
    }
  });

  cpSubmitBtn.addEventListener("click", function () {
    cpSubmitBtn.disabled = true;
    cpBtnText.textContent = "Please wait...";
    cpBtnSpinner.style.display = "inline-block";

    setTimeout(function () {
      cpBtnSpinner.style.display = "none";
      cpBtnText.textContent = "Change Password";
      cpSubmitBtn.disabled = false;

      alert("This feature is still under development");
    }, 2000);
  });
});

// help and support section
document.addEventListener("DOMContentLoaded", function () {

  const helpSupportBtn = document.getElementById("helpSupportBtn");
  const helpSupportPage = document.getElementById("helpSupportPage");
  const helpSupportBackBtn = document.getElementById("helpSupportBackBtn");
  const settingsPage = document.getElementById("settingsPage");

  if (!helpSupportBtn || !helpSupportPage || !helpSupportBackBtn || !settingsPage) {
    return;
  }

  // open help page
  helpSupportBtn.addEventListener("click", function () {
    settingsPage.style.display = "none";
    helpSupportPage.style.display = "block";

    // add history state
    history.pushState({ page: "helpSupport" }, "", "#help-support");
  });

  // header back arrow
  helpSupportBackBtn.addEventListener("click", function () {
    history.back();
  });

  // mobile browser back button
  window.addEventListener("popstate", function () {
    if (helpSupportPage.style.display === "block") {
      helpSupportPage.style.display = "none";
      settingsPage.style.display = "block";
    }
  });

});

// community guidelines section//
document.addEventListener("DOMContentLoaded", function () {

  const communityGuidelinesBtn = document.getElementById("communityGuidelinesBtn");
  const communityGuidelinesPage = document.getElementById("communityGuidelinesPage");
  const communityGuidelinesBackBtn = document.getElementById("communityGuidelinesBackBtn");
  const leftDrawer = document.getElementById("leftDrawer");
  const drawerOverlay = document.getElementById("drawerOverlay");

  if (!communityGuidelinesBtn || !communityGuidelinesPage || !communityGuidelinesBackBtn) {
    return;
  }

  // open page
  communityGuidelinesBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (leftDrawer) {
      leftDrawer.classList.remove("open");
      leftDrawer.setAttribute("aria-hidden", "true");
    }

    if (drawerOverlay) {
      drawerOverlay.classList.remove("show");
    }

    communityGuidelinesPage.style.display = "block";

    // add history state
    history.pushState({ page: "communityGuidelines" }, "", "#community-guidelines");
  });

  // header back arrow
  communityGuidelinesBackBtn.addEventListener("click", function () {
    history.back();
  });

  // mobile browser back button
  window.addEventListener("popstate", function () {
    communityGuidelinesPage.style.display = "none";
  });

});
//mobile app section//
document.addEventListener("DOMContentLoaded", function () {

  const mobileAppBtn = document.getElementById("mobileAppBtn");
  const mobileAppPage = document.getElementById("mobileAppPage");
  const mobileAppBackBtn = document.getElementById("mobileAppBackBtn");
  const leftDrawer = document.getElementById("leftDrawer");
  const drawerOverlay = document.getElementById("drawerOverlay");

  if (!mobileAppBtn || !mobileAppPage || !mobileAppBackBtn) return;

  // Open Mobile App page
  mobileAppBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (leftDrawer) {
      leftDrawer.classList.remove("open");
      leftDrawer.setAttribute("aria-hidden", "true");
    }

    if (drawerOverlay) {
      drawerOverlay.classList.remove("show");
    }

    mobileAppPage.style.display = "block";

    // Add history state
    history.pushState({ page: "mobileApp" }, "", "#mobile-app");
  });

  // Back arrow button
  mobileAppBackBtn.addEventListener("click", function () {
    history.back();
  });

  // Mobile browser back button
  window.addEventListener("popstate", function () {
    mobileAppPage.style.display = "none";
  });

});

//profile/my activity/saved items alart message//
document.addEventListener("DOMContentLoaded", function () {
  const menuProfileBtn = document.getElementById("menuProfileBtn");
  const myActivityBtn = document.getElementById("myActivityBtn");
  const savedItemsBtn = document.getElementById("savedItemsBtn");

  function showUnderDevelopmentAlert(e) {
    e.preventDefault();
    alert("This feature is still under development");
  }

  if (menuProfileBtn) {
    menuProfileBtn.addEventListener("click", showUnderDevelopmentAlert);
  }

  if (myActivityBtn) {
    myActivityBtn.addEventListener("click", showUnderDevelopmentAlert);
  }

  if (savedItemsBtn) {
    savedItemsBtn.addEventListener("click", showUnderDevelopmentAlert);
  }
});

//veryfication//
document.addEventListener("DOMContentLoaded", function () {
  const getVerifiedBtn = document.getElementById("getVerifiedBtn");
  const getVerifiedPage = document.getElementById("getVerifiedPage");
  const getVerifiedBackBtn = document.getElementById("getVerifiedBackBtn");
  const settingsPage = document.getElementById("settingsPage");

  if (!getVerifiedBtn || !getVerifiedPage || !getVerifiedBackBtn || !settingsPage) {
    return;
  }

  getVerifiedBtn.addEventListener("click", function () {
    settingsPage.style.display = "none";
    getVerifiedPage.style.display = "block";

    history.pushState({ page: "getVerified" }, "", "#get-verified");
  });

  getVerifiedBackBtn.addEventListener("click", function () {
    history.back();
  });

  window.addEventListener("popstate", function () {
    if (getVerifiedPage.style.display === "block") {
      getVerifiedPage.style.display = "none";
      settingsPage.style.display = "block";
    }
  });
});

//personal details section//
document.addEventListener("DOMContentLoaded", function () {
  const personalDetailsBtn = document.getElementById("personalDetailsBtn");

  if (!personalDetailsBtn) return;

  personalDetailsBtn.addEventListener("click", function () {
    alert("This feature is still under development");
  });
});


//single post model//
(() => {
  if (window.__IMAGE_ONLY_VIEWER_MODULE__) return;
  window.__IMAGE_ONLY_VIEWER_MODULE__ = true;

  const modal = document.getElementById("imageViewerModal");
  const overlay = modal?.querySelector(".image-viewer-overlay");
  const closeBtn = document.getElementById("imageViewerCloseBtn");
  const imgEl = document.getElementById("imageViewerImg");

  if (!modal || !overlay || !closeBtn || !imgEl) {
    console.warn("Image viewer modal HTML not found");
    return;
  }

  let IMAGE_VIEWER_OPEN = false;
  let IMAGE_VIEWER_HISTORY_OPEN = false;

  function lockScroll(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function openImageViewer(src, postId = "", pushHash = true) {
    if (!src) return;

    imgEl.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    lockScroll(true);

    IMAGE_VIEWER_OPEN = true;

    if (pushHash && postId) {
      if (!IMAGE_VIEWER_HISTORY_OPEN) {
        IMAGE_VIEWER_HISTORY_OPEN = true;
        history.pushState({ imageViewerOpen: true, postId }, "", `#post=${encodeURIComponent(postId)}`);
      } else {
        const base = window.location.href.split("#")[0];
        history.replaceState({ imageViewerOpen: true, postId }, "", `${base}#post=${encodeURIComponent(postId)}`);
      }
    }
  }

  function closeImageViewer(fromPopState = false) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    imgEl.src = "";
    lockScroll(false);

    IMAGE_VIEWER_OPEN = false;

    if (!fromPopState && IMAGE_VIEWER_HISTORY_OPEN) {
      IMAGE_VIEWER_HISTORY_OPEN = false;
      history.back();
      return;
    }

    if (fromPopState) {
      IMAGE_VIEWER_HISTORY_OPEN = false;
    }
  }

  async function openImageViewerByPostId(postId, pushHash = false) {
    if (!postId || typeof db === "undefined") return;

    const domPost = document.querySelector(`.post[data-id="${postId}"]`);
    const domImg = domPost?.querySelector(".post-media img");

    if (domImg) {
      const src = domImg.getAttribute("src") || domImg.src || "";
      if (src) {
        openImageViewer(src, postId, pushHash);
      }
    }

    try {
      const snap = await db.collection("posts").doc(postId).get();
      if (!snap.exists) return;

      const p = snap.data() || {};
      if (p.type !== "image" || !p.media) return;

      if (!IMAGE_VIEWER_OPEN) {
        openImageViewer(p.media, postId, pushHash);
      } else {
        imgEl.src = p.media;
      }
    } catch (err) {
      console.error("Failed to open image viewer by post id:", err);
    }
  }

  // image click -> open full image
  document.addEventListener("click", (e) => {
    const imageNode = e.target.closest(".post .post-media img");
    if (!imageNode) return;

    const postEl = imageNode.closest(".post");
    const postId = postEl?.dataset?.id || "";
    const src = imageNode.getAttribute("src") || imageNode.src || "";

    if (!src) return;

    openImageViewer(src, postId, true);
  });

  // close button
  closeBtn.addEventListener("click", () => {
    closeImageViewer(false);
  });

  // overlay click
  overlay.addEventListener("click", () => {
    closeImageViewer(false);
  });

  // esc key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && IMAGE_VIEWER_OPEN) {
      closeImageViewer(false);
    }
  });

  // browser/mobile back button support
  window.addEventListener("popstate", () => {
    const hash = window.location.hash || "";

    if (IMAGE_VIEWER_OPEN && !hash.startsWith("#post=")) {
      closeImageViewer(true);
      return;
    }

    if (!IMAGE_VIEWER_OPEN && hash.startsWith("#post=")) {
      const postId = decodeURIComponent(hash.replace(/^#post=/, "").trim());
      if (postId) {
        openImageViewerByPostId(postId, false);
      }
    }
  });

  // direct open from link
  window.addEventListener("load", () => {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#post=")) return;

    const postId = decodeURIComponent(hash.replace(/^#post=/, "").trim());
    if (!postId) return;

    openImageViewerByPostId(postId, false);
  });
})();

//signup model to login model//
document.addEventListener("DOMContentLoaded", function () {
  const authModal = document.getElementById("authModal");
  const loginModal = document.getElementById("loginModal");

  const openLoginFromSignup = document.getElementById("openLoginFromSignup");
  const openSignupFromLogin = document.getElementById("openSignupFromLogin");

  if (openLoginFromSignup) {
    openLoginFromSignup.addEventListener("click", function (e) {
      e.preventDefault();
      authModal.style.display = "none";
      loginModal.style.display = "flex";
    });
  }

  if (openSignupFromLogin) {
    openSignupFromLogin.addEventListener("click", function (e) {
      e.preventDefault();
      loginModal.style.display = "none";
      authModal.style.display = "flex";
    });
  }
});


// edit post model
/* ================= EDIT POST MODULE START ================= */
const EditPostModule = (() => {
  const modal = document.getElementById("editPostModal");
  const captionInput = document.getElementById("editPostCaption");
  const imageEl = document.getElementById("editPostImage");
  const videoEl = document.getElementById("editPostVideo");
  const mediaInput = document.getElementById("editPostMediaInput");
  const saveBtn = document.getElementById("saveEditPostBtn");
  const cancelBtn = document.getElementById("cancelEditPostBtn");

  let editingPostId = null;
  let editingPostNewFile = null;
  let editingPostCurrentType = "";
  let editingPostCurrentMedia = "";

  function resetVideo() {
    if (!videoEl) return;
    try {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    } catch (err) {
      console.warn("Video reset failed:", err);
    }
  }

  function resetState() {
    editingPostId = null;
    editingPostNewFile = null;
    editingPostCurrentType = "";
    editingPostCurrentMedia = "";

    if (captionInput) captionInput.value = "";

    if (imageEl) {
      imageEl.style.display = "none";
      imageEl.removeAttribute("src");
    }

    if (videoEl) {
      resetVideo();
      videoEl.style.display = "none";
    }

    if (mediaInput) mediaInput.value = "";
  }

  function open() {
    if (!modal) return;
    modal.style.display = "block";
    document.body.classList.add("editing-post");
  }

  function close() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.classList.remove("editing-post");
    resetState();
  }

  function renderMedia(type, src) {
    if (type === "image") {
      if (imageEl) {
        imageEl.src = src || "";
        imageEl.style.display = "block";
      }
      if (videoEl) {
        resetVideo();
        videoEl.style.display = "none";
      }
      return;
    }

    if (type === "video") {
      if (videoEl) {
        videoEl.src = src || "";
        videoEl.style.display = "block";
      }
      if (imageEl) {
        imageEl.style.display = "none";
        imageEl.removeAttribute("src");
      }
      return;
    }

    if (imageEl) {
      imageEl.style.display = "none";
      imageEl.removeAttribute("src");
    }

    if (videoEl) {
      resetVideo();
      videoEl.style.display = "none";
    }
  }

  async function openByPostId(postId) {
    if (!postId) return;

    try {
      const snap = await db.collection("posts").doc(postId).get();
      if (!snap.exists) return;

      const data = snap.data() || {};

      editingPostId = postId;
      editingPostNewFile = null;
      editingPostCurrentType = data.type || "";
      editingPostCurrentMedia = data.media || "";

      if (captionInput) {
        captionInput.value = data.caption || "";
      }

      renderMedia(editingPostCurrentType, editingPostCurrentMedia);
      if (mediaInput) mediaInput.value = "";

      open();
    } catch (err) {
      console.error("Edit load failed:", err);
      alert("Failed to open edit post");
    }
  }

  async function save() {
    if (!editingPostId) return;

    const newCaption = captionInput ? captionInput.value.trim() : "";

    try {
      if (saveBtn) saveBtn.disabled = true;

      let updatedType = editingPostCurrentType;
      let updatedMedia = editingPostCurrentMedia;

      if (editingPostNewFile) {
        showUploadBusy("Updating post media...");

        const uploadedUrl = await uploadToCloudinary(editingPostNewFile);
        updatedMedia = uploadedUrl;

        if (editingPostNewFile.type.startsWith("image/")) {
          updatedType = "image";
        } else if (editingPostNewFile.type.startsWith("video/")) {
          updatedType = "video";
        }
      }

      await db.collection("posts").doc(editingPostId).update({
        caption: newCaption,
        media: updatedMedia,
        type: updatedType,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      updateRenderedPostUI(editingPostId, {
        caption: newCaption,
        media: updatedMedia,
        type: updatedType
      });

      close();
    } catch (err) {
      console.error("Edit save failed:", err);
      alert("Failed to update post");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      hideUploadBusy();
    }
  }

  function updateRenderedPostUI(postId, data) {
    const postEls = document.querySelectorAll(`.post[data-id="${postId}"]`);
    if (!postEls.length) return;

    postEls.forEach((postEl) => {
      const captionWrap = postEl.querySelector(".post-text[data-full]");
      const readMoreEl = postEl.querySelector(".read-more");
      const mediaWrap = postEl.querySelector(".post-media");

      if (captionWrap) {
        const c = formatCaption(data.caption || "");
        captionWrap.textContent = c.preview;
        captionWrap.setAttribute("data-full", c.full);

        if (c.showReadMore) {
          captionWrap.classList.add("collapsed");
          if (readMoreEl) {
            readMoreEl.style.display = "";
          } else {
            captionWrap.insertAdjacentHTML(
              "afterend",
              `<span class="read-more">Read more</span>`
            );
          }
        } else {
          captionWrap.classList.remove("collapsed");
          if (readMoreEl) readMoreEl.remove();
        }
      }

      if (mediaWrap && data.type !== "text") {
        if (data.type === "image") {
          mediaWrap.innerHTML = `<img src="${data.media}" loading="lazy" decoding="async">`;
        } else if (data.type === "video") {
          mediaWrap.innerHTML = `
            <video controls playsinline preload="metadata">
              <source src="${data.media}" type="video/mp4">
            </video>
          `;
        }
      }
    });

    if (FEED_CACHE_MAP && FEED_CACHE_MAP.has(postId)) {
      const oldItem = FEED_CACHE_MAP.get(postId);
      const nextItem = {
        ...oldItem,
        caption: data.caption,
        media: data.media,
        type: data.type
      };
      FEED_CACHE_MAP.set(postId, nextItem);
      FEED_CACHE = (FEED_CACHE || []).map((p) => p.postId === postId ? nextItem : p);
      try {
        localStorage.setItem("everest_feed_cache_v1", JSON.stringify(FEED_CACHE.slice(0, 40)));
      } catch (e) {}
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    editingPostNewFile = file;
    const localUrl = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      renderMedia("image", localUrl);
    } else if (file.type.startsWith("video/")) {
      renderMedia("video", localUrl);
    } else {
      alert("Only image or video allowed");
    }
  }

  function bindEvents() {
    if (imageEl && mediaInput) {
      imageEl.addEventListener("click", () => mediaInput.click());
    }

    if (videoEl && mediaInput) {
      videoEl.addEventListener("click", () => mediaInput.click());
    }

    if (mediaInput) {
      mediaInput.addEventListener("change", handleFileChange);
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", save);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", close);
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
    }
  }

  bindEvents();

  return {
    openByPostId,
    close
  };
})();

//followers follwing section//
(() => {
  if (window.__followPageModuleLoaded) return;
  window.__followPageModuleLoaded = true;

  const DEFAULT_AVATAR = "https://i.imgur.com/6VBx3io.png";

  let currentProfileUid = "";
  let unsubFollowList = null;
  let followPageHistoryOpen = false;

  function userRef(uid) {
    return db.collection("users").doc(uid);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function firstNonEmpty(...values) {
    for (const v of values) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  function cleanupFollowListListener() {
    if (typeof unsubFollowList === "function") {
      unsubFollowList();
      unsubFollowList = null;
    }
  }

  function getBestName(data = {}, fallback = {}) {
    return firstNonEmpty(
      data.name,
      data.fullName,
      data.displayName,
      data.display_name,
      data.userName,
      data.username,
      data.nickName,
      data.nickname,
      data.profileName,
      data.realName,
      data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : "",
      data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : "",
      data.firstName,
      data.lastName,
      data.first_name,
      data.last_name,

      fallback.name,
      fallback.fullName,
      fallback.displayName,
      fallback.display_name,
      fallback.userName,
      fallback.username,
      fallback.nickName,
      fallback.nickname,
      fallback.profileName,
      fallback.realName,
      fallback.firstName && fallback.lastName ? `${fallback.firstName} ${fallback.lastName}` : "",
      fallback.first_name && fallback.last_name ? `${fallback.first_name} ${fallback.last_name}` : "",
      fallback.firstName,
      fallback.lastName,
      fallback.first_name,
      fallback.last_name
    );
  }

  function getBestPhoto(data = {}, fallback = {}) {
    return firstNonEmpty(
      data.photoURL,
      data.profilePic,
      data.avatar,
      data.photo,
      data.image,
      data.profileImage,
      data.picture,

      fallback.photoURL,
      fallback.profilePic,
      fallback.avatar,
      fallback.photo,
      fallback.image,
      fallback.profileImage,
      fallback.picture,

      DEFAULT_AVATAR
    );
  }

  function badgeHTML(uid) {
    return `
      <span class="verified-badge"
            data-verified-uid="${escapeHtml(uid)}"
            title="Verified"
            style="display:none;">
        <svg class="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2l2.09 2.09 2.96-.39 1.2 2.73 2.73 1.2-.39 2.96L22 12l-2.09 2.09.39 2.96-2.73 1.2-1.2 2.73-2.96-.39L12 22l-2.09-2.09-2.96.39-1.2-2.73-2.73-1.2.39-2.96L2 12l2.09-2.09-.39-2.96 2.73-1.2 1.2-2.73 2.96.39L12 2z"
            fill="#ff1f1f"
          />
          <path
            d="M9.3 12.6l1.9 1.9 4.2-4.3"
            fill="none"
            stroke="#ffffff"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    `;
  }

  async function getProfileName(profileUid) {
    try {
      const doc = await userRef(profileUid).get();
      if (doc.exists) {
        const data = doc.data() || {};
        const name = getBestName(data);
        if (name) return name;
      }
    } catch (err) {
      console.error("Failed to load profile name:", err);
    }

    return firstNonEmpty(document.getElementById("profileName")?.textContent) || "User";
  }

  async function getUserInfo(uid, fallback = {}) {
    try {
      const doc = await userRef(uid).get();

      if (doc.exists) {
        const data = doc.data() || {};
        return {
          uid,
          name: getBestName(data, fallback) || "User",
          photo: getBestPhoto(data, fallback) || DEFAULT_AVATAR
        };
      }
    } catch (err) {
      console.error("Failed to load user info:", uid, err);
    }

    return {
      uid,
      name: getBestName({}, fallback) || "User",
      photo: getBestPhoto({}, fallback) || DEFAULT_AVATAR
    };
  }

  function setActiveTab(tab) {
    const followersTabBtn = document.getElementById("followersTabBtn");
    const followingTabBtn = document.getElementById("followingTabBtn");

    followersTabBtn?.classList.toggle("active", tab === "followers");
    followingTabBtn?.classList.toggle("active", tab === "following");
  }

  function openFollowPageUI() {
    const page = document.getElementById("followPage");
    if (!page) return;

    const alreadyOpen = !page.classList.contains("hidden");
    page.classList.remove("hidden");

    if (!alreadyOpen) {
      followPageHistoryOpen = true;
      history.pushState({ followPage: true }, "", "#follow");
    }
  }

  function closeFollowPageUI(fromPopState = false) {
    const page = document.getElementById("followPage");
    if (!page) return;

    const wasOpen = !page.classList.contains("hidden");
    page.classList.add("hidden");
    cleanupFollowListListener();

    if (!fromPopState && wasOpen && followPageHistoryOpen) {
      followPageHistoryOpen = false;
      history.back();
      return;
    }

    if (fromPopState) {
      followPageHistoryOpen = false;
    }
  }

  function openUserProfile(uid) {
    if (!uid) return;

    const row = document.querySelector(`.follow-user-row[data-uid="${uid}"]`);
    const name =
      row?.querySelector(".follow-user-name")?.textContent?.trim() || "User";
    const photo =
      row?.querySelector(".follow-user-avatar")?.getAttribute("src") || DEFAULT_AVATAR;

    closeFollowPageUI(true);

    if (typeof window.cacheUserHeader === "function") {
      window.cacheUserHeader(uid, { name, photo });
    }

    if (typeof window.openUserProfile === "function") {
      window.openUserProfile(uid, { name, photo });
      return;
    }

    if (typeof window.loadUserProfileByUid === "function") {
      window.loadUserProfileByUid(uid);
      return;
    }

    if (typeof window.openProfilePage === "function") {
      window.openProfilePage(uid, { name, photo });
      return;
    }

    if (typeof window.renderUserProfile === "function") {
      if (typeof window.gotoPage === "function") window.gotoPage("profile");
      window.renderUserProfile(uid);
      return;
    }

    if (typeof window.showProfilePage === "function") {
      window.showProfilePage(uid);
      return;
    }

    if (typeof window.gotoProfile === "function") {
      window.gotoProfile(uid);
      return;
    }

    if (typeof window.gotoPage === "function") {
      window.gotoPage("profile");
      return;
    }

    console.log("Open profile:", uid);
  }

  function setFollowListLoading() {
    const list = document.getElementById("followUsersList");
    if (list) {
      list.innerHTML = `<div class="follow-loading">Loading...</div>`;
    }
  }

  function setFollowListEmpty(type) {
    const list = document.getElementById("followUsersList");
    if (list) {
      list.innerHTML = `<div class="follow-empty">No ${type} found</div>`;
    }
  }

  function setFollowListError(type) {
    const list = document.getElementById("followUsersList");
    if (list) {
      list.innerHTML = `<div class="follow-error">Failed to load ${type}</div>`;
    }
  }

  function bindUserRowClicks() {
    const list = document.getElementById("followUsersList");
    if (!list) return;

    list.querySelectorAll(".follow-user-row").forEach((row) => {
      if (row.dataset.bound === "1") return;
      row.dataset.bound = "1";
      row.style.cursor = "pointer";

      row.addEventListener("click", () => {
        const uid = row.dataset.uid;
        if (!uid) return;
        openUserProfile(uid);
      });
    });
  }

  function hydrateFollowListVerifiedBadges() {
    if (typeof VERIFIED_CACHE !== "undefined" && VERIFIED_CACHE?.clear) {
      VERIFIED_CACHE.clear();
    }

    if (typeof hydrateVerifiedBadges === "function") {
      hydrateVerifiedBadges();
    }
  }

  async function renderFollowList(profileUid, type = "followers") {
    const pageName = document.getElementById("followPageName");
    const countTitle = document.getElementById("followCountTitle");
    const list = document.getElementById("followUsersList");

    if (!pageName || !countTitle || !list || !profileUid) return;

    currentProfileUid = profileUid;

    setActiveTab(type);
    openFollowPageUI();
    setFollowListLoading();

    const profileName = await getProfileName(profileUid);
    pageName.textContent = profileName || "User";

    cleanupFollowListListener();

    try {
      unsubFollowList = userRef(profileUid)
        .collection(type)
        .orderBy("createdAt", "desc")
        .onSnapshot(
          async (snap) => {
            countTitle.textContent = `${snap.size} ${type}`;

            if (snap.empty) {
              setFollowListEmpty(type);
              return;
            }

            try {
              const items = await Promise.all(
                snap.docs.map(async (doc) => {
                  const data = doc.data() || {};
                  const uid = data.userId || doc.id;
                  const user = await getUserInfo(uid, data);

                  return `
                    <div class="follow-user-row" data-uid="${escapeHtml(user.uid)}" style="cursor:pointer;">
                      <img
                        class="follow-user-avatar"
                        src="${escapeHtml(user.photo)}"
                        alt="${escapeHtml(user.name)}"
                        onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';"
                      />
                      <div class="follow-user-meta">
                        <div class="follow-user-name-wrap">
                          <span class="follow-user-name">${escapeHtml(user.name || "User")}</span>
                          ${badgeHTML(user.uid)}
                        </div>
                      </div>
                    </div>
                  `;
                })
              );

              list.innerHTML = items.join("");
              bindUserRowClicks();
              hydrateFollowListVerifiedBadges();
            } catch (err) {
              console.error("Render follow list error:", err);
              setFollowListError(type);
            }
          },
          (err) => {
            console.error("Follow list snapshot error:", err);
            setFollowListError(type);
          }
        );
    } catch (err) {
      console.error("Follow list load error:", err);
      setFollowListError(type);
    }
  }

  function bindFollowPageEvents() {
    const backBtn = document.getElementById("followBackBtn");
    const followersTabBtn = document.getElementById("followersTabBtn");
    const followingTabBtn = document.getElementById("followingTabBtn");

    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = "1";
      backBtn.onclick = () => closeFollowPageUI(false);
    }

    if (followersTabBtn && !followersTabBtn.dataset.bound) {
      followersTabBtn.dataset.bound = "1";
      followersTabBtn.onclick = () => {
        if (!currentProfileUid) return;
        renderFollowList(currentProfileUid, "followers");
      };
    }

    if (followingTabBtn && !followingTabBtn.dataset.bound) {
      followingTabBtn.dataset.bound = "1";
      followingTabBtn.onclick = () => {
        if (!currentProfileUid) return;
        renderFollowList(currentProfileUid, "following");
      };
    }
  }

  function attachFollowButtons(profileUid) {
    const followersBtn = document.getElementById("followersBtn");
    const followingBtn = document.getElementById("followingBtn");

    if (followersBtn) {
      followersBtn.onclick = () => renderFollowList(profileUid, "followers");
    }

    if (followingBtn) {
      followingBtn.onclick = () => renderFollowList(profileUid, "following");
    }
  }

  function patchSetProfileActionsForUid() {
    if (typeof window.setProfileActionsForUid !== "function") return;
    if (window.__followPagePatched) return;

    window.__followPagePatched = true;

    const original = window.setProfileActionsForUid;

    window.setProfileActionsForUid = function (profileUid) {
      bindFollowPageEvents();
      attachFollowButtons(profileUid);

      const cleanup = original.apply(this, arguments);

      return function () {
        cleanupFollowListListener();
        if (typeof cleanup === "function") cleanup();
      };
    };
  }

  function bindMobileBackSupport() {
    if (window.__followPagePopstateBound) return;
    window.__followPagePopstateBound = true;

    window.addEventListener("popstate", () => {
      const page = document.getElementById("followPage");
      if (!page) return;

      const isOpen = !page.classList.contains("hidden");
      if (isOpen) {
        closeFollowPageUI(true);
      }
    });
  }

  function initFollowPageModule() {
    bindFollowPageEvents();
    patchSetProfileActionsForUid();
    bindMobileBackSupport();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFollowPageModule);
  } else {
    initFollowPageModule();
  }

  window.__openFollowPage = renderFollowList;
  window.__closeFollowPage = closeFollowPageUI;
  window.__openUserProfileFromFollowList = openUserProfile;
})();


//notification section//
/* ================= NOTIFICATION SYSTEM (FINAL CLEAN REPLACE) ================= */
(() => {
  if (window.EverestNotificationSystemLoaded) return;
  window.EverestNotificationSystemLoaded = true;

  const DEFAULT_AVATAR = "https://i.imgur.com/6VBx3io.png";
  let NOTIF_UNSUB = null;

  function safeText(s) {
    return String(s || "").replace(/[<>]/g, "");
  }

  function timeAgo(ts) {
    const n = Number(ts || 0);
    if (!n) return "";
    const diff = Math.max(1, Math.floor((Date.now() - n) / 1000));

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  async function getActorMeta() {
    if (!auth.currentUser) return null;

    const uid = auth.currentUser.uid;

    try {
      if (typeof getMyUserMeta === "function") {
        const me = await getMyUserMeta();
        return {
          uid,
          userName: me?.userName || "User",
          userPhoto: me?.userPhoto || ""
        };
      }
    } catch (err) {
      console.warn("getMyUserMeta failed, fallback used", err);
    }

    try {
      const us = await db.collection("users").doc(uid).get();
      const d = us.exists ? (us.data() || {}) : {};
      return {
        uid,
        userName: [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || "User",
        userPhoto: d.profilePic || ""
      };
    } catch (err) {
      console.error("getActorMeta error:", err);
      return {
        uid,
        userName: "User",
        userPhoto: ""
      };
    }
  }

  async function getPostOwnerId(postId) {
    if (!postId) return "";

    try {
      const snap = await db.collection("posts").doc(postId).get();
      if (!snap.exists) return "";
      const d = snap.data() || {};
      return d.userId || "";
    } catch (err) {
      console.error("getPostOwnerId error:", err);
      return "";
    }
  }

  async function createNotification({ toUserId, fromUserId, fromUserName, fromUserPhoto, type, postId, text, docId = null }) {
    try {
      if (!toUserId || !fromUserId || !postId) return;
      if (toUserId === fromUserId) return;

      const payload = {
        toUserId,
        fromUserId,
        fromUserName: fromUserName || "User",
        fromUserPhoto: fromUserPhoto || "",
        type: type || "",
        postId: postId || "",
        text: text || "",
        seen: false,
        createdAt: Date.now()
      };

      if (docId) {
        await db.collection("notifications").doc(docId).set(payload, { merge: true });
      } else {
        await db.collection("notifications").add(payload);
      }
    } catch (err) {
      console.error("createNotification error:", err);
    }
  }

  async function sendReactionNotification(postId) {
    if (!auth.currentUser || !postId) return;

    try {
      const actor = await getActorMeta();
      if (!actor?.uid) return;

      const ownerId = await getPostOwnerId(postId);
      if (!ownerId || ownerId === actor.uid) return;

      // same user same post reaction => one notification doc
      const docId = `reaction_${postId}_${actor.uid}`;

      await createNotification({
        toUserId: ownerId,
        fromUserId: actor.uid,
        fromUserName: actor.userName,
        fromUserPhoto: actor.userPhoto,
        type: "reaction",
        postId,
        text: "reacted to your post",
        docId
      });
    } catch (err) {
      console.error("sendReactionNotification error:", err);
    }
  }

  async function sendCommentNotification(postId) {
    if (!auth.currentUser || !postId) return;

    try {
      const actor = await getActorMeta();
      if (!actor?.uid) return;

      const ownerId = await getPostOwnerId(postId);
      if (!ownerId || ownerId === actor.uid) return;

      await createNotification({
        toUserId: ownerId,
        fromUserId: actor.uid,
        fromUserName: actor.userName,
        fromUserPhoto: actor.userPhoto,
        type: "comment",
        postId,
        text: "commented on your post"
      });
    } catch (err) {
      console.error("sendCommentNotification error:", err);
    }
  }

  function renderNotificationItem(docId, n) {
    const photo = n.fromUserPhoto || DEFAULT_AVATAR;
    const name = safeText(n.fromUserName || "User");
    const text = safeText(n.text || "");
    const ago = timeAgo(n.createdAt);

    return `
      <div class="notification-item ${n.seen ? "" : "notif-unread"}"
           data-id="${docId}"
           data-post-id="${n.postId || ""}"
           style="display:flex;gap:10px;align-items:flex-start;padding:12px;border-bottom:1px solid #eee;cursor:pointer;">
        <img
          src="${photo}"
          onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';"
          style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 44px;"
        />
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;line-height:1.35;color:#111;">
            <strong>${name}</strong> ${text}
          </div>
          <div style="margin-top:4px;font-size:12px;color:#777;">${ago}</div>
        </div>
      </div>
    `;
  }

  function renderEmptyState() {
    return `
      <div style="padding:18px;text-align:center;color:#777;">
        No notifications yet
      </div>
    `;
  }

  function startNotificationListener() {
    if (!auth.currentUser) return;

    const list = document.getElementById("notificationList");
    if (!list) return;

    if (NOTIF_UNSUB) {
      try { NOTIF_UNSUB(); } catch (e) {}
      NOTIF_UNSUB = null;
    }

    NOTIF_UNSUB = db.collection("notifications")
      .where("toUserId", "==", auth.currentUser.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .onSnapshot((snap) => {
        if (!list) return;

        if (snap.empty) {
          list.innerHTML = renderEmptyState();
          return;
        }

        list.innerHTML = "";
        snap.forEach((doc) => {
          const n = doc.data() || {};
          list.insertAdjacentHTML("beforeend", renderNotificationItem(doc.id, n));
        });
      }, (err) => {
        console.error("notification listener error:", err);
      });
  }

  function stopNotificationListener() {
    if (NOTIF_UNSUB) {
      try { NOTIF_UNSUB(); } catch (e) {}
      NOTIF_UNSUB = null;
    }
  }

  function markSeen(docId) {
    if (!docId) return;
    db.collection("notifications").doc(docId).update({
      seen: true
    }).catch(() => {});
  }

  function setupNotificationClick() {
    document.addEventListener("click", (e) => {
      const item = e.target.closest(".notification-item[data-id]");
      if (!item) return;

      const docId = item.dataset.id;
      const postId = item.dataset.postId || "";

      markSeen(docId);

      if (postId) {
        const baseUrl = window.location.href.split("#")[0];
        window.location.href = `${baseUrl}#post=${encodeURIComponent(postId)}`;
      }
    });
  }

  /* ===== COMMENT PATCH ===== */
  function patchAddCommentToPost() {
    if (typeof addCommentToPost !== "function") {
      console.warn("NotificationSystem: addCommentToPost not found");
      return;
    }

    if (addCommentToPost.__notifPatched) return;

    const originalAddComment = addCommentToPost;

    window.addCommentToPost = async function(postId, text) {
      const clean = String(text || "").trim();
      const result = await originalAddComment.apply(this, arguments);

      try {
        if (clean) {
          await sendCommentNotification(postId);
        }
      } catch (err) {
        console.error("patched comment notification error:", err);
      }

      return result;
    };

    window.addCommentToPost.__notifPatched = true;
    console.log("NotificationSystem: addCommentToPost patched");
  }

  /* ===== REACTION PATCH ===== */
  function setupReactionHooks() {
    // emoji reaction click
    document.addEventListener("click", (e) => {
      const emojiEl = e.target.closest(".reaction-box span");
      if (!emojiEl) return;
      if (!auth.currentUser) return;

      const postEl = emojiEl.closest(".post");
      const postId = postEl?.dataset?.id;
      if (!postId) return;

      setTimeout(() => {
        sendReactionNotification(postId);
      }, 300);
    }, true);

    // normal like click
    document.addEventListener("click", (e) => {
      const likeBtn = e.target.closest(".like-btn");
      if (!likeBtn) return;
      if (e.target.closest(".reaction-box")) return;
      if (!auth.currentUser) return;

      const postEl = likeBtn.closest(".post");
      const postId = postEl?.dataset?.id;
      if (!postId) return;

      setTimeout(async () => {
        try {
          const uid = auth.currentUser.uid;
          const snap = await db.collection("posts")
            .doc(postId)
            .collection("reactions")
            .doc(uid)
            .get();

          if (snap.exists) {
            await sendReactionNotification(postId);
          }
        } catch (err) {
          console.error("normal like notification error:", err);
        }
      }, 450);
    }, true);
  }

  function authBoot() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        startNotificationListener();
      } else {
        stopNotificationListener();
        const list = document.getElementById("notificationList");
        if (list) list.innerHTML = renderEmptyState();
      }
    });
  }

  function init() {
    patchAddCommentToPost();
    setupReactionHooks();
    setupNotificationClick();
    authBoot();
    console.log("NotificationSystem ready");
  }

  init();

  window.NotificationSystem = {
    startNotificationListener,
    stopNotificationListener,
    sendReactionNotification,
    sendCommentNotification
  };
})();
