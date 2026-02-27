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
  if(meta && lvl < 5){
    const dupCount = zooPets.filter(p=>p.uid!==uid && p.animalId===pet.animalId && (p.level||1)===lvl).length;
    combineBtn = `<button ${dupCount ? "" : "disabled"} onclick="combinePet('${pet.uid}')"><span><small data-title="Combine">Combine</small></span></button>`;
    combineNote = `<div class="smallNote" style="text-align:left;">Combine needs 2 copies of the same animal and the same level. (${dupCount ? "Ready" : "Need 1 more"})</div>`;
  }

  openModal("Pet", `
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
  `);
}

function spawnZooPetElement(pet){
  if(!zooRoamLayer) return;
  const el = document.createElement("div");
  el.className = "zooPet";
  el.innerHTML = pet.imagepath;
  el.style.left = "18px";
  el.style.top = "18px";
  el.dataset.uid = pet.uid;
  el.title = `${pet.name} • ${pet.rarity}`;
  el.onclick = (e)=>{ e.stopPropagation(); openPetDetails(pet.uid); };
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
    name: type.name,
    rarity: type.rarity
  };
  zooPets.unshift(p);

  // If the Zoo screen is open, show the new pet immediately.
  if(activeScreen === "zoo"){
    requestAnimationFrame(()=>renderZooRoamingPets());
  }
}


