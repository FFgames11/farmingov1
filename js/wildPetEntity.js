/* =========================================================
   WILD PET ENTITY (ENTRANCE -> WALK -> EAT)
========================================================= */
let activeWildPet = null;

function farmBounds(){
  const wrap = $("farmWrap");
  const rect = wrap.getBoundingClientRect();
  return { w: rect.width, h: rect.height, rect };
}
function tileCenterInWrap(tileIndex){
  const wrapRect = $("farmWrap").getBoundingClientRect();
  const tileRect = tiles[tileIndex].getBoundingClientRect();
  const cx = (tileRect.left + tileRect.width/2) - wrapRect.left;
  const cy = (tileRect.top + tileRect.height/2) - wrapRect.top;
  return { x: cx, y: cy };
}

function trySpawnWildPet(){
  if(tutorialIsActive()) return;
  if(bossBattle && bossBattle.active) return;
  if(activeWildPet) return;
  const now = Date.now();
  if(now < nextPetSpawnAt) return;

  const cropTiles = getActiveCropTiles();
  scheduleNextPetSpawn();

  if(cropTiles.length === 0) return;

  let chance = 0.55 + cropTiles.length*0.03 + level*0.01;
  chance = Math.min(0.90, chance);
  if(petSpawnsBlocked()) chance *= 0.35;
  if(Math.random() > chance) return;

  const grown = cropTiles.filter(i => tileStates[i].state==="grown");
  const pool = (grown.length && Math.random()<0.6) ? grown : cropTiles;
  const targetTileIndex = pool[Math.floor(Math.random()*pool.length)];

  const type = weightedPick(PET_TYPES);
  spawnWildPetEntity(type, targetTileIndex);
}

function spawnWildPetEntity(type, targetTileIndex){
  showToast("A wild pet has appeared!");

  const b = farmBounds();
  const startSideLeft = Math.random() < 0.5;

  const startX = startSideLeft ? -16 : (b.w + 16);
  const startY = 20 + Math.random() * Math.max(1,(b.h - 40));

  const target = tileCenterInWrap(targetTileIndex);
  const targetX = target.x - 12;
  const targetY = target.y - 22;

  const entityEl = document.createElement("div");
  entityEl.className = "wildEntity";
  entityEl.innerHTML = type.imagepath;
  entityEl.title = `${type.name} (${type.rarity})`;
  entityEl.style.left = `${startX}px`;
  entityEl.style.top = `${startY}px`;
  entityEl.onclick = (e)=>{
    e.stopPropagation();
    onWildPetClicked();
  
  };

  const barEl = document.createElement("div");
  barEl.className = "entityBar";
  const barFillEl = document.createElement("div");
  barFillEl.className = "entityBarFill";
  barEl.appendChild(barFillEl);

  entityEl.appendChild(barEl);
  eventLayer.appendChild(entityEl);

  const approachMs = 1400;

  activeWildPet = {
    type,
    targetTileIndex,
    phase: "approach",
    entityEl,
    barEl,
    barFillEl,
    approachStartAt: Date.now(),
    approachArriveAt: Date.now() + approachMs,
    eatStartAt: 0,
    eatEndAt: 0,
    paused: false,
    pauseStartedAt: 0,
    poopTimers: []
  };

  schedulePoops(type, approachMs);

  requestAnimationFrame(()=>{
    entityEl.style.left = `${targetX}px`;
    entityEl.style.top = `${targetY}px`;
    barEl.style.left = `${targetX - 6}px`;
    barEl.style.top = `${targetY + 30}px`;
  });

  setTimeout(()=>{
    if(!activeWildPet) return;
    if(activeWildPet.phase !== "approach") return;

    const st = tileStates[targetTileIndex];
    if(!st || st.state==="empty"){
      despawnWildPet("It left because there was no crop.");
      return;
    }
    activeWildPet.phase = "eating";
    activeWildPet.eatStartAt = Date.now();
    activeWildPet.eatEndAt = Date.now() + type.eatMs;
  }, approachMs + 30);
}

function schedulePoops(type, approachMs){
  if(!activeWildPet) return;
  const count = Math.floor(type.poopMin + Math.random()*(type.poopMax - type.poopMin + 1));
  for(let i=0;i<count;i++){
    const t = 250 + Math.random()*(approachMs - 450);
    const tid = setTimeout(()=>{
      if(!activeWildPet) return;
      if(activeWildPet.phase !== "approach") return;
      dropPoopAtEntity();
    }, Math.max(150, t));
    activeWildPet.poopTimers.push(tid);
  }
}

function getEntityPosition(){
  if(!activeWildPet) return {x:0,y:0};
  const el = activeWildPet.entityEl;
  const x = parseFloat(el.style.left || "0");
  const y = parseFloat(el.style.top || "0");
  return { x, y };
}

function dropPoopAtEntity(){
  const pos = getEntityPosition();
  const poopEl = document.createElement("div");
  poopEl.className = "poop";
  poopEl.textContent = "💩";
  const px = pos.x + 10 + (Math.random()*10 - 5);
  const py = pos.y + 28 + (Math.random()*10 - 5);
  poopEl.style.left = `${px}px`;
  poopEl.style.top = `${py}px`;
  poopEl.title = "Click to clean";
  poopEl.onclick = (e)=>{
    e.stopPropagation();
    cleanPoop(poopEl);
  };
  eventLayer.appendChild(poopEl);
}

function cleanPoop(poopEl){
  try{ poopEl.remove(); }catch(e){}
  coins += 2;
  gainXP(2);
  questProgress("clean", 1);
  saveState();
  updateUI();
  showToast("Poop cleaned! +2 coins");
}

function tickWildPet(){
  // FIX: Stop eating if player is in Town/Zoo or a menu is open
  if(activeScreen !== "farm" || modal.style.display === "flex") return; 

  if(tutorialIsActive()) return;
  if(!activeWildPet) return;
  const st = tileStates[activeWildPet.targetTileIndex];
  if(!st || st.state==="empty"){
    despawnWildPet("The pet got bored and left.");
    return;
  }

  if(activeWildPet.phase !== "eating") {
    activeWildPet.barFillEl.style.width = "0%";
    return;
  }
  if(activeWildPet.paused) return;

  const now = Date.now();
  const duration = activeWildPet.eatEndAt - activeWildPet.eatStartAt;
  const elapsed = now - activeWildPet.eatStartAt;
  const pct = clamp(elapsed / Math.max(1, duration), 0, 1);
  activeWildPet.barFillEl.style.width = `${Math.floor(pct*100)}%`;

  if(now >= activeWildPet.eatEndAt){
    st.state = "empty";
    st.crop = "";
    st.plantedAt = 0;
    st.finishAt = 0;

    showMessage("Oh no!", `<div class="smallNote">A wild pet ate your crop 😿</div>`);
    despawnWildPet();
    saveState();
    updateUI();
    renderFarm();
  }
}

function despawnWildPet(optionalToast){
  if(!activeWildPet) return;
  for(const t of activeWildPet.poopTimers){
    try{ clearTimeout(t); }catch(e){}
  }
  try{ activeWildPet.entityEl.remove(); }catch(e){}
  try{ activeWildPet.barEl.remove(); }catch(e){}
  activeWildPet = null;
  if(optionalToast) showToast(optionalToast, 1200);
}

function getPetQuizDifficulty(tileIndex){
  const st = tileStates[tileIndex];
  if(st && (st.state==="planted" || st.state==="grown")){
    const c = cropByEmoji(st.crop);
    return c ? c.level : "beginner";
  }
  if(level >= 5) return "advanced";
  if(level >= 3) return "intermediate";
  return "beginner";
}

function onWildPetClicked(){
  if(tutorialIsActive()) return;
  if(!activeWildPet) return;

  activeWildPet.paused = true;
  activeWildPet.pauseStartedAt = Date.now();

  const diff = getPetQuizDifficulty(activeWildPet.targetTileIndex);
  const q = pickQuestion(diff);

  let resolved = false;

  openModal(`Wild Pet! (${tileLevelLabel(diff)})`, `
    <div class="resLine">${escapeHtml(activeWildPet.type.name)} is causing trouble!</div>
    <div class="smallNote" style="margin-top:-2px;">Correct = chance to capture • Wrong = disappears</div>
    <div id="petQ"></div>
    <div id="petFB" class="quizFeedback"></div>
  `);

  renderQuestionUI(q, "petQ", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const fb = $("petFB");
    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);

    if(!ok){
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Wrong! The pet vanished.`;
      setTimeout(()=>{
        despawnWildPet();
        closeModal();
        saveState();
        updateUI();
        renderFarm();
      }, 750);
      return;
    }

    const base = activeWildPet.type.capture;
    const bonus = captureBonusByBoost();
    const finalChance = Math.min(0.99, base + bonus);
    const roll = Math.random();

    if(roll <= finalChance){
      fb.className = "quizFeedback good";
      fb.innerHTML = `Correct! Capture success! 🐾`;
      capturePet(activeWildPet.type);
      questProgress("capture", 1);
    }else{
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Correct, but it escaped!`;
    }

    setTimeout(()=>{
      despawnWildPet();
      closeModal();
      saveState();
      updateUI();
      renderFarm();
    }, 850);
  });
}

