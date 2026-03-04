/* =========================================================
   ZOO SCREEN (PETS ROAM HERE)
========================================================= */
let zooRoamEls = new Map();

function zooBounds(){
  if(!zooYard) return { w:0, h:0 };
  const rect = zooYard.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

function openPetDetails(uid){
  const pet = zooPets.find(p=>p.uid===uid);
  if(!pet) return;

  const meta = (pet.animalId && BATTLE_ANIMALS[pet.animalId]) ? BATTLE_ANIMALS[pet.animalId] : null;
  const lvl = meta ? (pet.level || 1) : null;
  const stats = meta ? battleStats(pet.animalId, lvl) : null;

  let combineBtn = "";
  let combineNote = "";
  if(meta && lvl < 10){
    const dupCount = zooPets.filter(p=>p.uid!==uid && p.animalId===pet.animalId && (p.level||1)===lvl).length;
    combineBtn = `<button ${dupCount ? "" : "disabled"} onclick="combinePet('${pet.uid}')"><span><small data-title="Combine">Combine</small></span></button>`;
    combineNote = `<div class="smallNote" style="text-align:left;">Combine needs 2 copies of the same animal and the same level. (${dupCount ? "Ready" : "Need 1 more"})</div>`;
  }

  openModal("Pet", `
    <div class="petItem">
        <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${pet.imagepath}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(pet.name)}${meta ? ` <span style="opacity:.65;">Lv${lvl}</span>` : ""}</div>
            <div class="itemSub">${escapeHtml(pet.rarity || (meta ? meta.rarity : "Captured"))}</div>
            <div class="badgeRow">
              <div class="badge">${escapeHtml(pet.rarity || (meta ? meta.rarity : "Captured"))}</div>
              ${meta ? `<div class="badge">ATK ${stats.atk} • DEF ${stats.def} • SPD ${stats.spd}</div>` : `<div class="badge">Captured</div>`}
            </div>
          </div>
        </div>
        ${combineNote}
        <div class="rowBtns">
          ${combineBtn}
          <button onclick="closeModal()"><span><small data-title="Close">Close</small></span></button>
        </div>
      </div>
    </div>
  `);
}

function isPetCombinable(pet){
  const lv = clamp(parseInt(pet.level||1,10)||1,1,10);
  if(!pet.animalId || lv >= 10) return false;
  return zooPets.filter(p=>p.uid!==pet.uid && p.animalId===pet.animalId && clamp(parseInt(p.level||1,10)||1,1,10)===lv).length > 0;
}

function spawnZooPetElement(pet){
  if(!zooRoamLayer) return;
  const el = document.createElement("div");
  el.className = "zooPet" + (isPetCombinable(pet) ? " canCombine" : "");
  el.innerHTML = pet.imagepath;
  el.style.left = "18px";
  el.style.top = "18px";
  el.dataset.uid = pet.uid;
  el.title = `${pet.name} • ${pet.rarity}`;
  el.onclick = (e)=>{ e.stopPropagation(); if(window.visitMode) return; openPetDetails(pet.uid); };
  zooRoamLayer.appendChild(el);
  zooRoamEls.set(pet.uid, el);
  randomMoveZooPet(pet.uid, true);
}

function randomMoveZooPet(uid, instant=false){
  const el = zooRoamEls.get(uid);
  if(!el || !zooYard) return;
  const b = zooBounds();
  const pad = 18;
  const size = 34;
  const x = pad + Math.random() * Math.max(1, (b.w - pad*2 - size));
  const y = pad + Math.random() * Math.max(1, (b.h - pad*2 - size));

  const flip = (Math.random() < 0.5) ? -1 : 1;

  if(instant){
    el.style.transition = "none";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scaleX(${flip})`;
    requestAnimationFrame(()=>{ el.style.transition = ""; });
  }else{
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scaleX(${flip})`;
  }
}

function renderZooRoamingPets(){
  if(!zooRoamLayer) return;

  // Remove extras
  for(const [uid, el] of zooRoamEls.entries()){
    if(!zooPets.some(p=>p.uid===uid)){
      try{ el.remove(); }catch(e){}
      zooRoamEls.delete(uid);
    }
  }

  // Add missing
  for(const pet of zooPets){
    if(zooRoamEls.has(pet.uid)) continue;
    spawnZooPetElement(pet);
  }

  if(zooEmpty){
    zooEmpty.style.display = zooPets.length ? "none" : "flex";
  }
  if(zooStats){
    zooStats.innerHTML = `Pets: <b>${zooPets.length}</b>`;
  }

  // Refresh glow on all existing pet elements
  for(const [uid, el] of zooRoamEls.entries()){
    const pet = zooPets.find(p=>p.uid===uid);
    if(!pet) continue;
    if(isPetCombinable(pet)) el.classList.add("canCombine");
    else el.classList.remove("canCombine");
  }

  renderSpeciesPanel();
}

setInterval(()=>{
  if(activeScreen !== "zoo") return;
  if(tutorialIsActive()) return;
  for(const uid of zooRoamEls.keys()){
    randomMoveZooPet(uid);
  }
}, 2200);

function capturePet(type){
  const p = {
    uid: uid(),
    typeId: type.id,
    animalId: type.id,
    level: 1,
    emoji: type.emoji,
    imagepath: type.imagepath,
    headimage: type.headimage,
    name: type.name,
    rarity: type.rarity
  };
  zooPets.unshift(p);

  // If the Zoo screen is open, show the new pet immediately.
  if(activeScreen === "zoo"){
    requestAnimationFrame(()=>renderZooRoamingPets());
  }
}



/* =========================================================
   SPECIES BREAKDOWN PANEL + AUTO COMBINE
========================================================= */
function renderSpeciesPanel(){
  const panel = document.getElementById("speciesPanel");
  if(!panel) return;

  const counts = {};
  for(const pet of zooPets){
    if(!pet.animalId) continue;
    counts[pet.animalId] = (counts[pet.animalId] || 0) + 1;
  }

  const ids = Object.keys(counts);
  if(ids.length === 0){ panel.innerHTML = ""; return; }

  panel.innerHTML = ids.map(id => {
    const meta = BATTLE_ANIMALS[id];
    if(!meta) return "";
    const count = counts[id];
    const hasCombinable = zooPets.some(p => p.animalId === id && isPetCombinable(p));
    return `<button class="speciesChip${hasCombinable ? " speciesChipGlow" : ""}" onclick="openSpeciesModal('${id}')">
      <span class="speciesChipImg">${meta.imagepath}</span>
      <span class="speciesChipCount">${count}</span>
      ${hasCombinable ? '<span class="speciesChipBadge">✨</span>' : ""}
    </button>`;
  }).join("");
}

function openSpeciesModal(animalId){
  const meta = BATTLE_ANIMALS[animalId];
  if(!meta) return;

  const pets = zooPets.filter(p => p.animalId === animalId);

  // Check if any same-level pair exists below max
  const levelGroups = {};
  for(const p of pets){
    const lv = clamp(parseInt(p.level||1,10)||1,1,10);
    if(!levelGroups[lv]) levelGroups[lv] = [];
    levelGroups[lv].push(p);
  }
  const hasCombinablePair = Object.values(levelGroups).some(g => g.length >= 2 && clamp(parseInt(g[0].level||1,10)||1,1,10) < 10);

  

  const petCards = pets.map(p => {
    const lv = clamp(parseInt(p.level||1,10)||1,1,10);
    const stats = battleStats(p.animalId, lv);
    const combinable = isPetCombinable(p);
    return `<div class="speciesPetRow${combinable ? " speciesPetRowGlow" : ""}">
      <div class="speciesPetImg">${meta.headimage}<div class="petNameandLevel"><span class="petLabel" data-title="${escapeHtml(meta.name)}">${escapeHtml(meta.name)} </span><span class="petLvl" data-title="Lv ${lv}">Lv ${lv}</span></div></div>
      <div class="speciesPetInfo">
        <div class="statInfo"><span data-title="ATK ${stats.atk}">ATK ${stats.atk}</span> <img src="images/statbar.png" alt="stat bar"></div>
        <div class="statInfo"><span data-title="DEF ${stats.def}">DEF ${stats.def}</span> <img src="images/statbar.png" alt="stat bar"></div>
        <div class="statInfo"><span data-title="SPD ${stats.spd}">SPD ${stats.spd}</span> <img src="images/statbar.png" alt="stat bar"></div>
      </div>
      ${combinable ? '<span class="speciesCombineReady"><img src="images/upgrade-arrow.png" alt="upgrade arrow"></span>' : ""}
    </div>`;
  }).join("");

  const autoCombineBtn = hasCombinablePair
    ? `<button onclick="autoCombineSpecies('${animalId}')" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#f4a427,#e8851a);color:#fff;border:none;border-radius:12px;padding:10px;font-family:'Fredoka One',cursive;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #c06a10;">⚡ Auto Combine</button>`
    : `<button disabled style="width:100%;margin-top:12px;border-radius:12px;padding:10px;font-size:14px;opacity:0.5;">No pairs ready</button>`;

  openModal(escapeHtml(meta.name) + " — Ranch", `
    ${autoCombineBtn}
    <div class="animalInfoCon">${meta.imagepath} ${escapeHtml(meta.name)} • ${pets.length} in Ranch</div>
    <div style="display:flex;flex-direction: row;gap: 6px;margin-top:30px;flex-wrap: wrap;justify-content: center;">
      ${petCards}
    </div>
    
  `);
}

function autoCombineSpecies(animalId){
  let combinedCount = 0;
  let keepGoing = true;

  while(keepGoing){
    keepGoing = false;
    const byLevel = {};
    for(let i = 0; i < zooPets.length; i++){
      const p = zooPets[i];
      if(p.animalId !== animalId) continue;
      const lv = clamp(parseInt(p.level||1,10)||1,1,10);
      if(lv >= 10) continue;
      if(!byLevel[lv]) byLevel[lv] = [];
      byLevel[lv].push(p);
    }
    for(const entries of Object.values(byLevel)){
      if(entries.length >= 2){
        combinePet(entries[0].uid);
        combinedCount++;
        keepGoing = true;
        break;
      }
    }
  }

  if(combinedCount > 0){
    const meta = BATTLE_ANIMALS[animalId];
    showToast(`Auto-combined ${combinedCount}x ${meta?.name || animalId}!`, 1600);
    openSpeciesModal(animalId);
  } else {
    showToast("No pairs to combine.", 1200);
  }
}