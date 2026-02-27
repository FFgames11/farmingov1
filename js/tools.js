/* =========================================================
   TOOLS (PLANT / REMOVE / MOVE)
========================================================= */
function setTool(tool){
  if(tutorialIsActive()) return;
  currentTool = tool;

  // Update the toggle button icon
  if (currentToolIcon) {
    currentToolIcon.src = `images/${tool}tool.png`;
  }

  // Optional: close panel after selecting
  // if (toolsPanel) {
  //   toolsPanel.classList.remove("toolsOpen");
  // }

  if (toolsArrow) {
    toolsArrow.classList.remove("toolsOpenArrow");
  }

  moveSourceIndex = null;
  updateToolUI();
  applyMoveHighlights();

  if(tool === "plant") showToast("Tool: Plant", 900);
  if(tool === "remove") showToast("Tool: Remove plant", 1100);
  if(tool === "move") showToast("Tool: Move plant", 1100);
  if(tool === "harvest") showToast("Tool: Harvest", 900);  
}

function updateToolUI(){
  const p = $("toolPlantBtn");
  const r = $("toolRemoveBtn");
  const h = $("toolHarvestBtn");
  const m = $("toolMoveBtn");
  if(p) p.classList.toggle("active", currentTool==="plant");
  if(r) r.classList.toggle("active", currentTool==="remove");
  if(h) h.classList.toggle("active", currentTool==="harvest");
  if(m) m.classList.toggle("active", currentTool==="move");
}

function hasEmptyTile(exceptIndex){
  for(let i=0;i<TILE_COUNT;i++){
    if(i === exceptIndex) continue;
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st && st.state === "empty") return true;
  }
  return false;
}

function applyMoveHighlights(){
  if(!tiles || !tiles.length) return;
  for(const t of tiles){
    t.classList.remove("moveSource", "moveTarget");
  }
  if(currentTool !== "move" || moveSourceIndex === null) return;

  if(tiles[moveSourceIndex]) tiles[moveSourceIndex].classList.add("moveSource");
  for(let i=0;i<TILE_COUNT;i++){
    if(i === moveSourceIndex) continue;
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st && st.state === "empty") tiles[i].classList.add("moveTarget");
  }
}

function clearMoveSelection(){
  moveSourceIndex = null;
  applyMoveHighlights();
}

function clickTile(i){
  if(tutorialIsActive()) return;
  if(bossBattle && bossBattle.active) return; // avoid weird overlap
  if(window.visitMode) return; // visiting another farm — read-only

  // MOVE tool: if a source is selected, this click is treated as destination pick
  if(currentTool === "move" && moveSourceIndex !== null){
    if(i === moveSourceIndex){
      clearMoveSelection();
      showToast("Move cancelled", 900);
      return;
    }
    if(!unlockedTiles[i]){
      showToast("Tile locked", 1000);
      return;
    }
    const dst = tileStates[i];
    if(dst.state !== "empty"){
      showToast("Tile not empty", 1000);
      return;
    }

    const src = tileStates[moveSourceIndex];
    tileStates[i] = { state: src.state, crop: src.crop, plantedAt: src.plantedAt, finishAt: src.finishAt };

    src.state = "empty";
    src.crop = "";
    src.plantedAt = 0;
    src.finishAt = 0;

    saveState();
    updateUI();
    renderFarm();
    clearMoveSelection();
    showToast("Plant moved!", 1000);
    return;
  }

  // locked tiles
  if(!unlockedTiles[i]){
    if(currentTool === "plant"){
      const cost = tileUnlockCost(unlockedCount());
      openModal("Unlock Tile", `
        <div class="resLine">Unlock this tile for <b>${cost}</b> coins?</div>
        <div style="display:flex;gap:10px;">
          <button style="flex:1;" ${coins<cost?"disabled":""} onclick="unlockTile(${i})">Unlock</button>
          <button style="flex:1;" onclick="closeModal()">Cancel</button>
        </div>
        <div class="smallNote">No quiz needed — coins only.</div>
      `);
    }else{
      showToast("Tile locked", 1000);
    }
    return;
  }

  const st = tileStates[i];

  // REMOVE tool
  if(currentTool === "remove"){
    if(st.state === "planted" || st.state === "grown"){
      st.state = "empty";
      st.crop = "";
      st.plantedAt = 0;
      st.finishAt = 0;

      saveState();
      updateUI();
      renderFarm();
      showToast("Plant removed", 1000);
    }else{
      showToast("Nothing to remove", 900);
    }
    return;
  }

  // MOVE tool: selecting a source plant
  if(currentTool === "move"){
    if(st.state !== "planted" && st.state !== "grown"){
      showToast("Select a planted crop to move", 1100);
      return;
    }
    if(!hasEmptyTile(i)){
      showToast("No available tile", 1200);
      return;
    }
    moveSourceIndex = i;
    applyMoveHighlights();
    showToast("Pick an empty tile to move to", 1200);
    return;
  }

  // HARVEST tool
  if(currentTool === "harvest"){
    if(st.state === "grown"){
      harvestQuiz(i);
    }else if(st.state === "planted"){
      showToast("Still growing...", 900);
    }else{
      showToast("Nothing to harvest", 900);
    }
    return;
  }

  // PLANT tool
  if(currentTool === "plant"){
    if(st.state === "empty"){
    const seed = getFirstAvailableSeed();
    if(!seed){
      showMessage("No Seeds", `<div class="smallNote">Buy seeds in Crops.</div>`);
      return;
    }
    const cropInfo = cropByEmoji(seed);
    if(!cropInfo){
      showMessage("Error", `<div class="smallNote">Unknown seed.</div>`);
      return;
    }

    seeds[seed]--;
    st.state = "planted";
    st.crop = seed;
    st.plantedAt = Date.now();
    st.finishAt = Date.now() + applyGrowBoost(cropInfo.growMs);

    questProgress("plant", 1);
    saveState();
    updateUI();
    renderFarm();
    return;
  }
    if(st.state === "grown"){
      showToast("Use Harvest tool to harvest", 1200);
      return;
    }
    if(st.state === "planted"){
      showToast("Still growing...", 900);
      return;
    }
  }

  // Fallback
  if(st.state === "grown"){
    showToast("Use Harvest tool to harvest", 1200);
    return;
  }
  if(st.state === "planted"){
    showToast("Still growing...", 900);
    return;
  }
}

/* harvest quiz */
function harvestQuiz(tileIndex){
  const st = tileStates[tileIndex];
  const cropInfo = cropByEmoji(st.crop);
  const diff = cropInfo ? cropInfo.level : "beginner";
  const q = pickQuestion(diff);

  let resolved = false;

  openModal(`Harvest Quiz (${tileLevelLabel(diff)})`, `
    <div class="resLine">Answer 1 question to harvest.</div>
    <div id="harvestQ"></div>
    <div id="harvestFB" class="quizFeedback"></div>
  `);

  renderQuestionUI(q, "harvestQ", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const fb = $("harvestFB");
    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);

    if(ok){
      fb.className = "quizFeedback good";
      // Update logic: Add to Inventory instead of Coin
      const invKey = cropInfo.emoji;
      inventory[invKey] = (inventory[invKey] || 0) + 1;

      fb.innerHTML = `Correct! <b>${cropInfo.name}</b> added to Bag! +<b>${cropInfo.harvestXP}</b> XP`;

      // coins += cropInfo.harvestCoins; // Removed direct coin gain
      gainXP(cropInfo.harvestXP);

      questProgress("harvest", 1);

      // Keep the plant in the tile and let it regrow
      st.state = "planted";
      st.plantedAt = Date.now();
      st.finishAt = Date.now() + applyGrowBoost(cropInfo.growMs);

      saveState();
      updateUI();
      renderFarm();

      setTimeout(()=>closeModal(), 1000); // slightly longer delay to read
    }else{
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Wrong. The plant needs time to regrow 😿`;

      // Keep the plant, but reset its grow time
      st.state = "planted";
      st.plantedAt = Date.now();
      st.finishAt = Date.now() + applyGrowBoost((cropInfo && cropInfo.growMs) ? cropInfo.growMs : 8000);

      saveState();
      updateUI();
      renderFarm();

      setTimeout(()=>closeModal(), 850);
    }
  });
}