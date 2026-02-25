/* =========================================================
   INIT DEFAULTS
========================================================= */
(function init(){
  CROPS.forEach(c => { if(!(c.emoji in seeds)) seeds[c.emoji] = 0; });
  seeds["🥕"] = 3;
  seeds["🌽"] = 2;
  selectedSeed = "🥕";

  unlockedTiles.fill(false);
  unlockedTiles[0] = true;
  unlockedTiles[1] = true;

  tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));

  loadState();
  loadDaily();
  initDailySystem();

  if(!Array.isArray(unlockedTiles) || unlockedTiles.length !== TILE_COUNT){
    const old = unlockedTiles;
    unlockedTiles = new Array(TILE_COUNT).fill(false);
    unlockedTiles[0]=true; unlockedTiles[1]=true;
    if(Array.isArray(old)){
      for(let i=0;i<Math.min(old.length, TILE_COUNT);i++) unlockedTiles[i] = !!old[i];
    }
  }
  if(!Array.isArray(tileStates) || tileStates.length !== TILE_COUNT){
    const old = tileStates;
    tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));
    if(Array.isArray(old)){
      for(let i=0;i<Math.min(old.length, TILE_COUNT);i++){
        if(old[i] && typeof old[i]==="object") tileStates[i] = {
          state: old[i].state || "empty",
          crop: old[i].crop || "",
          plantedAt: Number(old[i].plantedAt||0),
          finishAt: Number(old[i].finishAt||0)
        };
      }
    }
  }

  // ensureStarterDog();

  if(!nextPetSpawnAt || nextPetSpawnAt < Date.now()){
    scheduleNextPetSpawn();
  }
  if(!nextBossSpawnAt || nextBossSpawnAt < Date.now()){
    scheduleNextBossSpawn();
  }

  $("playerNameDisplay").textContent = playerName;
  $("playerNameDisplay").setAttribute('data-title',playerName);
  $("playerTitleDisplay").textContent = playerTitle;

  initTiles();
  updateUI();
  updateToolUI();
})();


// 1. MARKET SYSTEM
function openHarvestShop() {
  let html = `<div class="resLine">Market • Sell Crops</div>`;
  let has = false;
  CROPS.forEach(c => {
    const qty = inventory[c.emoji] || 0;
    if(qty > 0){
      has = true;
      html += `<div class="itemCard">
        <div class="itemLeft"><div class="itemIcon">${c.isImage?`<img src="${c.grown}" style="width:30px">`:c.emoji}</div>
        <div><b>${c.name}</b> (x${qty})</div></div>
        <div class="rowBtns">
          <button onclick="sellCrop('${c.emoji}', 1)"><span><small data-title="Sell 1">Sell 1</small></span></button>
          <button onclick="sellCrop('${c.emoji}', ${qty})"><span><small data-title="All">All</small></span></button>
        </div>
      </div>`;
    }
  });
  if(!has) html += `<div class="smallNote">Inventory empty. Harvest crops first!</div>`;
  else html += `<div style="margin-top:10px"><button onclick="sellAllCrops()" style="width:100%; background:#74DE34; color:white; padding:10px; border-radius:10px;">Sell Everything</button></div>`;
  html += `<div style="margin-top:10px"><button onclick="closeModal()" style="width:100%; padding:10px; border-radius:10px;">Close</button></div>`;
  openModal("Market", html);
}
function sellCrop(e, amt){
  if((inventory[e]||0) >= amt){
    inventory[e] -= amt;
    coins += cropByEmoji(e).harvestCoins * amt;
    saveState(); updateUI(); openHarvestShop();
    showToast(`Sold for ${cropByEmoji(e).harvestCoins * amt} coins`);
  }
}
function sellAllCrops(){
  let gained = 0;
  Object.keys(inventory).forEach(k=>{
    if(inventory[k]>0){
      gained += inventory[k] * cropByEmoji(k).harvestCoins;
      inventory[k] = 0;
    }
  });
  coins += gained;
  saveState(); updateUI(); openHarvestShop();
  showToast(`Sold all for ${gained}!`);
}
// 2. UPGRADED PROFILE
function getExamTitle(){
  // Tries to read library exam data (if available)
  try {
    const ex = JSON.parse(localStorage.getItem(LIB_EXAM_KEY)||"{}");
    const tk = todayKey();
    if(ex[tk]?.advanced) return "Advanced Learner";
    if(ex[tk]?.intermediate) return "Intermediate Learner";
  } catch(e) {}
  return "Beginner Learner";
}
// Replace your existing openProfile function with this one
function openProfile(){
  const title = getExamTitle();
  let scHtml = "";
  for(let i=0; i<4; i++){
    const item = showcase[i];
    const display = item ? (cropByEmoji(item).isImage ? `<img src="${cropByEmoji(item).grown}" style="width:40px;">` : item) : "";
    // Click to change showcase
    scHtml += `<div class="showbox" onclick="pickShowcase(${i})" style="cursor:pointer;">${display}</div>`;
  }
  openModal("Profile", `
    <div class="playerProfileContent">
      <div class="playerheadercon">
          <div class="playerdp">
            <img src="images/profile.png" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2NjYyIvPjwvc3ZnPg=='">
          </div>
          <h3 class="modalPlayerName">
            ${escapeHtml(playerName)} 
            <span class="editable-field" onclick="editName()">✏️</span>
          </h3>
          <div class="playerlocation">
            📍 ${escapeHtml(playerCountry)} 
            <span class="editable-field" onclick="editCountry()">✏️</span>
          </div>
          <div class="badge">${title}</div>
      </div>
      <div class="sectionTitle" >Crop Showcase (Tap Box)</div>
      <div class="showcase-container">${scHtml}</div>
      <div class="streak-zone" >
        🔥 Login Streak: ${dailyStreak} Days
      </div>
      <div class="modalCloseCon"><button onclick="closeModal()">Close</button></div>
    </div>
  `);
}
function pickShowcase(idx){
  let html = `<div class="resLine">Pick item for Slot ${idx+1}</div><div class="modalGrid" style="display:grid; gap:10px;">`;
  let has = false;
  Object.keys(inventory).forEach(k=>{
    if(inventory[k]>0){
      has=true;
      const c = cropByEmoji(k);
      html += `<div class="itemCard" onclick="setShowcase(${idx},'${k}')" style="cursor:pointer; background:white; padding:10px; border-radius:10px; border:1px solid #ccc;">
        <div class="itemLeft">${c.isImage?`<img src="${c.grown}" style="width:30px">`:c.emoji} <b>${c.name}</b></div>
      </div>`;
    }
  });
  if(!has) html += `<div class="smallNote">No crops in bag.</div>`;
  html += `<button onclick="setShowcase(${idx}, null)" style="width:100%; margin-top:10px;">Clear Slot</button>`;
  html += `</div>`;
  openModal("Select Showcase", html);
}
function setShowcase(idx, val){
  showcase[idx] = val;
  saveState(); openProfile();
}
// 3. CUSTOM EDIT MODALS (No Browser Alerts)
function editName(){
  openModal("Edit Name", `
    <div class="resLine">Enter your new name:</div>
    <div class="fillWrap" style="display:flex; gap:5px; margin-top:10px;">
      <input id="newNameInput" value="${escapeHtml(playerName)}" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc;">
      <button onclick="saveName()">Save</button>
    </div>
  `);
}
function saveName(){
  const val = $("newNameInput").value.trim();
  if(val) playerName = val;
  saveState();
  updateUI();
  openProfile();
  // Push name change to cloud immediately (updates players table + game_saves)
  if (typeof window.saveToCloud === "function") window.saveToCloud();
}
function editCountry(){
  openModal("Edit Country", `
    <div class="resLine">Enter your country:</div>
    <div class="fillWrap" style="display:flex; gap:5px; margin-top:10px;">
      <input id="newCountryInput" value="${escapeHtml(playerCountry)}" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc;">
      <button onclick="saveCountry()">Save</button>
    </div>
  `);
}
function saveCountry(){
  const val = $("newCountryInput").value.trim();
  if(val) playerCountry = val;
  saveState();
  updateUI();
  openProfile();
  // Push country change to cloud immediately
  if (typeof window.saveToCloud === "function") window.saveToCloud();
}
