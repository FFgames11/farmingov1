/* =========================================================
   BOSS FIGHT: Pig 🐷 vs Scarecrow
========================================================= */
let bossBattle = null;

function scheduleNextBossSpawn(){
  // slower than pets: ~5–9 minutes
  let min = 300_000;
  let max = 540_000;
  if(petSpawnsBlocked()){
    min += 120_000;
    max += 180_000;
  }
  nextBossSpawnAt = Date.now() + (min + Math.random()*(max-min));
}

function trySpawnBoss(){
  if(tutorialIsActive()) return;
  if(window.visitMode) return; // read-only during farm visit
  if(bossBattle && bossBattle.active) return;
  if(activeWildPet) return;
  if(modal.style.display === "flex") return;
  if(activeScreen !== "farm") return;

  const now = Date.now();
  if(now < nextBossSpawnAt) return;

  // schedule next attempt regardless
  scheduleNextBossSpawn();

  // needs at least one crop on farm to matter
  const cropTiles = getActiveCropTiles();
  if(cropTiles.length === 0) return;

  // chance per attempt
  let chance = 0.35 + (level * 0.02);
  chance = Math.min(0.65, chance);
  if(Math.random() > chance) return;

  showToast("A wild boss appeared!", 1400);

  openModal("A wild boss appeared!", `
    <div class="resLine">You: <b>Dog 🐶</b> vs Wild Boss: <b>Scarecrow</b></div>
    <div class="smallNote" style="text-align:left;">
      Turn-based fight.<br>
      • Normal Attack = Beginner question<br>
      • Heavy Attack = Intermediate/Advanced question<br>
      Correct = deal damage • Wrong = lose turn
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;font-weight:900;" onclick="startBossBattle()">Fight</button>
      <button style="flex:1;" onclick="runFromBoss()">Run</button>
    </div>
  `);
}

// function ensureStarterDog(){
//   const hasDog = zooPets.some(p => p.typeId === "dog_starter");
//   if(hasDog) return;
//   const dog = { uid: uid(), typeId:"dog_starter", emoji:"🐶", name:"Dog", rarity:"Starter" };
//   zooPets.push(dog);
// }

function runFromBoss(){
  // penalty: boss eats one random crop (if any)
  const cropTiles = getActiveCropTiles();
  if(cropTiles.length){
    const t = cropTiles[Math.floor(Math.random()*cropTiles.length)];
    tileStates[t] = { state:"empty", crop:"", plantedAt:0, finishAt:0 };
    saveState();
    updateUI();
    renderFarm();
    closeModal();
    showMessage("You ran!", `<div class="smallNote">The boss scared your farm and ruined 1 crop 😿</div>`);
  }else{
    closeModal();
  }
}

function startBossBattle(){
  // ensureStarterDog();

  // Create a list of available pets for the player to choose from.
  const petOptions = zooPets.map(pet => {
    return `<button class="petChoiceBtn" onclick="selectPetForBossFight('${pet.uid}')">${pet.imagepath} ${pet.name}</button>`;
  }).join("");

  // Show the modal to select a pet
  openModal("A wild boss appeared!", `
    <div class="bossBattleModalContent">
      <div class="bossbattleBanner"><img src="images/bossbattlebanner.png" alt="boss battle banner" style="margin-bottom:10px;"></div>
      <div class="resLine">You: <b>Pig 🐷</b> vs Wild Boss: <b>Scarecrow</b></div>
      <div class="smallNote" style="text-align:left;">
        Choose a pet to fight the boss.
      </div>
      <div class="modalGrid" style="margin-top: 10px;">
        ${petOptions}
      </div>
      <div class="smallNote" style="text-align:left;margin-top:12px;">
        Normal Attack: Beginner question (safe).<br>
        Heavy Attack: Intermediate/Advanced question (more damage).
      </div>
    </div>
  `);
}

function selectPetForBossFight(petUid){
  const selectedPet = zooPets.find(pet => pet.uid === petUid);
  if (!selectedPet) return;

  // Start the boss battle with the selected pet
  bossBattle = {
    active: true,
    turn: "player",
    playerName: selectedPet.name,
    playerEmoji: selectedPet.emoji,
    playerHp: 100,
    playerHpMax: 100,
    bossName: "Scarecrow",
    bossEmoji: "🪵",
    bossHp: 140,
    bossHpMax: 140,
    log: [`You selected ${selectedPet.name} 🐾 for the battle!`],
    awaitingAnswer: false,
    lastSkill: null
  };

  // Close the modal and start the battle
  closeModal();
  renderBossBattle();
}

function renderBossBattle(){
  if(!bossBattle || !bossBattle.active) return;

  const pPct = clamp(bossBattle.playerHp / bossBattle.playerHpMax, 0, 1);
  const bPct = clamp(bossBattle.bossHp / bossBattle.bossHpMax, 0, 1);

  openModal("Boss Fight", `
    <div class="bossWrap">
      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.playerEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">You: ${escapeHtml(bossBattle.playerName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Your turn: ${bossBattle.turn === "player" ? "YES" : "NO"}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(pPct*100)}%;"></div></div>
          <div class="hpText">${bossBattle.playerHp}/${bossBattle.playerHpMax}</div>
        </div>
      </div>

      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.bossEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">Wild Boss: ${escapeHtml(bossBattle.bossName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Lose a turn if wrong.</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(bPct*100)}%;background:linear-gradient(90deg,#ffb36b,#ff6b6b);"></div></div>
          <div class="hpText">${bossBattle.bossHp}/${bossBattle.bossHpMax}</div>
        </div>
      </div>

      <div class="bossLog">${bossBattle.log.map(x=>`• ${escapeHtml(x)}`).join("<br>")}</div>

      <div class="skillRow">
        <button id="skillNormal" onclick="bossUseSkill('normal')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Normal Attack
          <small>(Beginner question)</small>
        </button>
        <button id="skillHeavy" onclick="bossUseSkill('heavy')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Heavy Attack
          <small>(Intermediate/Advanced)</small>
        </button>
      </div>

      <hr class="sep">

      <div id="bossQ"></div>
      <div id="bossFB" class="quizFeedback"></div>

      <div style="display:flex;gap:10px;margin-top:4px;">
        <button style="flex:1;" onclick="endBossBattle('forfeit')">Forfeit</button>
        <button style="flex:1;" onclick="closeModal()">Close</button>
      </div>
      <div class="smallNote">Anti-exploit: each question locks after 1 answer.</div>
    </div>
  `);
}

function bossLogPush(msg){
  if(!bossBattle) return;
  bossBattle.log.unshift(msg);
  bossBattle.log = bossBattle.log.slice(0, 18);
}

function bossDamageRange(skill){
  // tuned for 100 vs 140 hp fight ~6-9 turns
  if(skill === "normal") return [18, 26];
  return [30, 42];
}
function bossEnemyDamage(){
  return [14, 22];
}

function heavyDifficulty(){
  // heavy uses intermediate early, advanced later
  if(level >= 5) return (Math.random()<0.55 ? "advanced" : "intermediate");
  return "intermediate";
}

function renderBossBattle(){
  if(!bossBattle || !bossBattle.active) return;

  const pPct = clamp(bossBattle.playerHp / bossBattle.playerHpMax, 0, 1);
  const bPct = clamp(bossBattle.bossHp / bossBattle.bossHpMax, 0, 1);

  openModal("Boss Fight", `
    <div class="bossWrap">
      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.playerEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">You: ${escapeHtml(bossBattle.playerName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Your turn: ${bossBattle.turn === "player" ? "YES" : "NO"}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(pPct*100)}%;"></div></div>
          <div class="hpText">${bossBattle.playerHp}/${bossBattle.playerHpMax}</div>
        </div>
      </div>

      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.bossEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">Wild Boss: ${escapeHtml(bossBattle.bossName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Lose a turn if wrong.</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(bPct*100)}%;background:linear-gradient(90deg,#ffb36b,#ff6b6b);"></div></div>
          <div class="hpText">${bossBattle.bossHp}/${bossBattle.bossHpMax}</div>
        </div>
      </div>

      <div class="bossLog">${bossBattle.log.map(x=>`• ${escapeHtml(x)}`).join("<br>")}</div>

      <div class="skillRow">
        <button id="skillNormal" onclick="bossUseSkill('normal')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Normal Attack
          <small>(Beginner question)</small>
        </button>
        <button id="skillHeavy" onclick="bossUseSkill('heavy')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Heavy Attack
          <small>(Intermediate/Advanced)</small>
        </button>
      </div>

      <hr class="sep">

      <div id="bossQ"></div>
      <div id="bossFB" class="quizFeedback"></div>

      <div style="display:flex;gap:10px;margin-top:4px;">
        <button style="flex:1;" onclick="endBossBattle('forfeit')">Forfeit</button>
        <button style="flex:1;" onclick="closeModal()">Close</button>
      </div>
      <div class="smallNote">Anti-exploit: each question locks after 1 answer.</div>
    </div>
  `);
}

function bossUseSkill(skill){
  if(!bossBattle || !bossBattle.active) return;
  if(bossBattle.turn !== "player") return;
  if(bossBattle.awaitingAnswer) return;

  bossBattle.awaitingAnswer = true;
  bossBattle.lastSkill = skill;

  const diff = (skill === "normal") ? "beginner" : heavyDifficulty();
  const q = pickQuestion(diff);
  let resolved = false;

  const qRoot = document.getElementById("bossQ");
  if(qRoot){
    qRoot.innerHTML = `
      <div class="resLine"><b>${skill === "normal" ? "Normal" : "Heavy"}</b> • ${tileLevelLabel(diff)} question</div>
      <div id="bossQInner"></div>
    `;
  }
  const fb = document.getElementById("bossFB");
  if(fb){
    fb.className = "quizFeedback";
    fb.style.display = "none";
    fb.textContent = "";
  }

  renderQuestionUI(q, "bossQInner", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);
    const fb2 = document.getElementById("bossFB");

    if(ok){
      const [mn,mx] = bossDamageRange(skill);
      const dmg = Math.floor(mn + Math.random()*(mx-mn+1));
      bossBattle.bossHp = Math.max(0, bossBattle.bossHp - dmg);
      if(fb2){
        fb2.className = "quizFeedback good";
        fb2.innerHTML = `Correct! You dealt <b>${dmg}</b> damage.`;
      }
      bossLogPush(`Correct! ${bossBattle.playerName} used ${skill==="normal"?"Normal":"Heavy"} and hit for ${dmg}.`);
    }else{
      if(fb2){
        fb2.className = "quizFeedback bad";
        fb2.innerHTML = `Wrong! You lost your turn.`;
      }
      bossLogPush(`Wrong answer... ${bossBattle.playerName} missed and lost the turn.`);
    }

    if(bossBattle.bossHp <= 0){
      setTimeout(()=> endBossBattle("win"), 500);
      return;
    }

    bossBattle.turn = "boss";
    bossBattle.awaitingAnswer = false;

    setTimeout(()=> bossEnemyTurn(), 650);
  });
}

function bossEnemyTurn(){
  if(!bossBattle || !bossBattle.active) return;

  const [mn,mx] = bossEnemyDamage();
  const dmg = Math.floor(mn + Math.random()*(mx-mn+1));

  bossBattle.playerHp = Math.max(0, bossBattle.playerHp - dmg);
  bossLogPush(`Scarecrow attacked and hit you for ${dmg}.`);

  if(bossBattle.playerHp <= 0){
    endBossBattle("lose");
    return;
  }

  bossBattle.turn = "player";
  bossBattle.awaitingAnswer = false;
  renderBossBattle();
}

function endBossBattle(result){
  if(!bossBattle) return;

  bossBattle.active = false;

  scheduleNextBossSpawn();

  if(result === "win"){
    const coinReward = 180 + Math.floor(level*8);
    const xpReward = 55 + Math.floor(level*4);
    coins += coinReward;
    gainXP(xpReward);
    boosts.fertilizer = (boosts.fertilizer||0) + 1;

    saveState();
    updateUI();
    renderFarm();

    showMessage("Victory! 🐷🏁", `
      <div class="resLine">You defeated the Scarecrow!</div>
      <div class="smallNote">
        Rewards:<br>
        • +${coinReward} coins<br>
        • +${xpReward} XP<br>
        • +1 Fertilizer 🧪
      </div>
    `);
    return;
  }

  if(result === "lose"){
    const loss = Math.min(coins, 40);
    coins -= loss;
    saveState();
    updateUI();
    showMessage("Defeat... 😿", `
      <div class="resLine">Scarecrow won.</div>
      <div class="smallNote">You dropped ${loss} coins while escaping.</div>
    `);
    return;
  }

  if(result === "forfeit"){
    const loss = Math.min(coins, 25);
    coins -= loss;
    saveState();
    updateUI();
    showMessage("Forfeit", `<div class="smallNote">You forfeited and lost ${loss} coins.</div>`);
    return;
  }
}