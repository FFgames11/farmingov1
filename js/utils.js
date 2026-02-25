/* =========================================================
   CORE UTIL
========================================================= */
const $ = (id) => document.getElementById(id);
const modal = $("modal");
const modalTitle = $("modalTitle");
const modalContent = $("modalContent");
const toast = $("toast");
const toastText = $("toastText");

function escapeHtml(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function openModal(title, html){
  if(tutorialState?.active) return; // prevent random popups during tutorial
  modal.style.display = "flex";
  modalTitle.textContent = title;
  modalTitle.setAttribute('data-title', title);
  modalContent.innerHTML = html;
}
function closeModal(){
  modal.style.display = "none";
  // resume only if a quiz paused the wild pet
  if(activeWildPet && activeWildPet.paused){
    const now = Date.now();
    const pausedFor = now - activeWildPet.pauseStartedAt;
    activeWildPet.eatEndAt += pausedFor;
    activeWildPet.paused = false;
    activeWildPet.pauseStartedAt = 0;
  }
}
// showMessage is an alias for openModal kept for backward compatibility
const showMessage = openModal;
function normalizeAnswer(s){ return String(s||"").trim().toLowerCase().replace(/\s+/g," "); }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function weightedPick(list){
  const total = list.reduce((sum,x)=>sum+(x.weight||1),0);
  let r = Math.random() * total;
  for(const x of list){
    r -= (x.weight||1);
    if(r <= 0) return x;
  }
  return list[list.length-1];
}
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function showToast(msg, ms=1100){
  toastText.textContent = msg;
  toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.style.display="none", ms);
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

