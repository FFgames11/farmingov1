/* =========================================================
   AVATAR UPLOAD & CROP
   - Canvas-based circular cropper
   - Drag to reposition, slider/pinch to zoom
   - Saves cropped image to Supabase Storage
   - Falls back to localStorage data URL if not logged in
========================================================= */

let _avatarCropState = {
  img: null,        // HTMLImageElement of the loaded photo
  scale: 1,         // current zoom
  offsetX: 0,       // pan offset X (canvas coords)
  offsetY: 0,       // pan offset Y
  dragging: false,
  lastX: 0,
  lastY: 0,
  // pinch touch
  lastPinchDist: null,
};

const CANVAS_SIZE = 260; // px — size of the circular crop canvas

// ── Open / Close ────────────────────────────────────────
function openAvatarCropModal(){
  const modal = document.getElementById("avatarCropModal");
  const choiceScreen = document.getElementById("avatarChoiceScreen");
  const cropScreen   = document.getElementById("avatarCropScreen");
  if(!modal) return;
  choiceScreen.style.display = "flex";
  cropScreen.style.display   = "none";
  modal.style.display        = "flex";
}

function closeAvatarCropModal(){
  const modal = document.getElementById("avatarCropModal");
  if(modal) modal.style.display = "none";
  _avatarCropState.img = null;
}

function backToAvatarChoice(){
  document.getElementById("avatarChoiceScreen").style.display = "flex";
  document.getElementById("avatarCropScreen").style.display   = "none";
}

// ── File selected ────────────────────────────────────────
function onAvatarFileSelected(e){
  const file = e.target.files[0];
  if(!file) return;
  // Reset input so same file can be re-selected
  e.target.value = "";

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      _avatarCropState.img     = img;
      _avatarCropState.scale   = 1;
      _avatarCropState.offsetX = 0;
      _avatarCropState.offsetY = 0;

      // Switch to crop screen
      document.getElementById("avatarChoiceScreen").style.display = "none";
      document.getElementById("avatarCropScreen").style.display   = "flex";
      document.getElementById("avatarZoomSlider").value = "1";

      _initCropCanvas();
      _drawCrop();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Canvas setup ─────────────────────────────────────────
function _initCropCanvas(){
  const canvas = document.getElementById("avatarCropCanvas");
  if(!canvas) return;
  canvas.width  = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  // Mouse events
  canvas.onmousedown  = _onDragStart;
  canvas.onmousemove  = _onDragMove;
  canvas.onmouseup    = _onDragEnd;
  canvas.onmouseleave = _onDragEnd;

  // Touch events
  canvas.ontouchstart  = _onTouchStart;
  canvas.ontouchmove   = _onTouchMove;
  canvas.ontouchend    = _onDragEnd;
}

function _drawCrop(){
  const canvas = document.getElementById("avatarCropCanvas");
  if(!canvas || !_avatarCropState.img) return;
  const ctx  = canvas.getContext("2d");
  const img  = _avatarCropState.img;
  const s    = _avatarCropState.scale;
  const size = CANVAS_SIZE;

  // Fit image to canvas at scale=1 (cover: shortest side = canvas size)
  const baseScale = Math.max(size / img.width, size / img.height);
  const drawW = img.width  * baseScale * s;
  const drawH = img.height * baseScale * s;

  // Center + pan offset
  const x = (size - drawW) / 2 + _avatarCropState.offsetX;
  const y = (size - drawH) / 2 + _avatarCropState.offsetY;

  ctx.clearRect(0, 0, size, size);

  // Fill white background first — prevents black on PNG transparency when saving as JPEG
  ctx.save();
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();

  // Draw circle border
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth   = 3;
  ctx.stroke();
}

// ── Drag ─────────────────────────────────────────────────
function _onDragStart(e){
  _avatarCropState.dragging = true;
  _avatarCropState.lastX = e.clientX;
  _avatarCropState.lastY = e.clientY;
}
function _onDragMove(e){
  if(!_avatarCropState.dragging) return;
  _avatarCropState.offsetX += e.clientX - _avatarCropState.lastX;
  _avatarCropState.offsetY += e.clientY - _avatarCropState.lastY;
  _avatarCropState.lastX = e.clientX;
  _avatarCropState.lastY = e.clientY;
  _drawCrop();
}
function _onDragEnd(){ _avatarCropState.dragging = false; }

// ── Touch (drag + pinch) ──────────────────────────────────
function _onTouchStart(e){
  e.preventDefault();
  if(e.touches.length === 1){
    _avatarCropState.dragging = true;
    _avatarCropState.lastX = e.touches[0].clientX;
    _avatarCropState.lastY = e.touches[0].clientY;
    _avatarCropState.lastPinchDist = null;
  } else if(e.touches.length === 2){
    _avatarCropState.lastPinchDist = _pinchDist(e.touches);
  }
}
function _onTouchMove(e){
  e.preventDefault();
  if(e.touches.length === 1 && _avatarCropState.dragging){
    _avatarCropState.offsetX += e.touches[0].clientX - _avatarCropState.lastX;
    _avatarCropState.offsetY += e.touches[0].clientY - _avatarCropState.lastY;
    _avatarCropState.lastX = e.touches[0].clientX;
    _avatarCropState.lastY = e.touches[0].clientY;
    _drawCrop();
  } else if(e.touches.length === 2){
    const dist = _pinchDist(e.touches);
    if(_avatarCropState.lastPinchDist){
      const delta = dist / _avatarCropState.lastPinchDist;
      _avatarCropState.scale = Math.min(3, Math.max(1, _avatarCropState.scale * delta));
      document.getElementById("avatarZoomSlider").value = _avatarCropState.scale;
      _drawCrop();
    }
    _avatarCropState.lastPinchDist = dist;
  }
}
function _pinchDist(touches){
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// ── Zoom slider ───────────────────────────────────────────
function onAvatarZoom(val){
  _avatarCropState.scale = parseFloat(val);
  _drawCrop();
}

// ── Save ─────────────────────────────────────────────────
async function saveAvatarCrop(){
  const canvas = document.getElementById("avatarCropCanvas");
  if(!canvas || !_avatarCropState.img){
    showToast("No image to save.", 1200);
    return;
  }

  // Export canvas as JPEG blob (smaller than PNG for photos)
  canvas.toBlob(async (blob) => {
    if(!blob){ showToast("Failed to process image.", 1200); return; }

    // If logged in, upload to Supabase Storage
    if(typeof window._supabaseClient !== "undefined" && window._currentUser){
      try {
        const supabase  = window._supabaseClient;
        const userId    = window._currentUser.id;
        const fileName  = `avatars/${userId}.jpg`;

        showToast("Uploading...", 2000);

        const { error: upErr } = await supabase
          .storage
          .from("avatars")           // <-- your bucket name
          .upload(fileName, blob, {
            contentType: "image/jpeg",
            upsert: true             // overwrite existing
          });

        if(upErr) throw upErr;

        const { data: urlData } = supabase
          .storage
          .from("avatars")
          .getPublicUrl(fileName);

        // Add cache-busting timestamp so the browser loads the new image
        playerAvatarUrl = urlData.publicUrl + "?t=" + Date.now();

        // Write avatar_url into the players table immediately
        if (typeof window.saveToCloud === "function") await window.saveToCloud();

      } catch(err) {
        console.error("Avatar upload failed:", err);
        // Fallback: save as data URL in localStorage
        playerAvatarUrl = canvas.toDataURL("image/jpeg", 0.85);
        showToast("Cloud upload failed — saved locally.", 1800);
      }
    } else {
      // Not logged in — save as data URL locally
      playerAvatarUrl = canvas.toDataURL("image/jpeg", 0.85);
    }

    // Apply avatar everywhere
    _applyAvatarEverywhere(playerAvatarUrl);
    saveState();
    if(typeof window.saveToCloud === "function") window.saveToCloud();

    closeAvatarCropModal();
    showToast("Profile photo updated! 🐾", 1400);

    // Refresh profile modal if open
    if(document.getElementById("modal").style.display === "flex"){
      openProfile();
    }

  }, "image/jpeg", 0.88);
}

// ── Apply avatar to all img elements ─────────────────────
function _applyAvatarEverywhere(url){
  if(!url) return;
  const src = url;
  // Header avatar
  const headerAvatar = document.getElementById("headerAvatar");
  if(headerAvatar) headerAvatar.src = src;
  // Profile modal avatar
  const modalAvatar = document.getElementById("profileModalAvatar");
  if(modalAvatar) modalAvatar.src = src;
}

// Call this on game load to restore saved avatar
function restoreAvatar(){
  if(playerAvatarUrl) _applyAvatarEverywhere(playerAvatarUrl);
}