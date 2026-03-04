/* =========================================================
   BOSS FIGHT — Full-screen wordscape battle (mirrors Arena)
========================================================= */
let bossBattle = null;
let bossScreenPendingSkill = null;
let bossWc = null;

const BOSS_WS_WORDS = {
  normal: ["CAT", "DOG", "COW", "PIG", "FISH", "BIRD", "SUN", "MOON", "STAR", "SKY", "RAIN", "SNOW", "FIRE", "WIND", "EGG", "MILK", "CUP", "BALL", "TOY", "BOOK", "PEN", "BAG", "HAT", "SHOE", "TREE", "LEAF", "ROCK", "SAND", "MUD", "CAR", "BEAR", "FROG", "DUCK", "OWL", "BEE", "ANT", "HEN", "PEAR", "BEAN", "RICE", "CORN", "ROSE", "BARK", "FORK", "DRUM"],
  heavy: ["HORSE", "SHEEP", "TIGER", "LION", "PLANE", "TRAIN", "TRUCK", "SHIP", "GOLD", "SILVER", "PANDA", "ZEBRA", "CAMEL", "EAGLE", "HAWK", "CASTLE", "BRIDGE", "ROCKET", "SWORD", "SHIELD", "ARROW", "CROWN", "THRONE", "JEWEL", "SPIDER", "GHOST", "FLAME", "STORM", "CHAOS"]
};

/* ── Schedule / Spawn ─────────────────────────────────── */
function scheduleNextBossSpawn() {
  let min = 300000, max = 540000;
  if (petSpawnsBlocked()) { min += 120000; max += 180000; }
  nextBossSpawnAt = Date.now() + (min + Math.random() * (max - min));
}

function trySpawnBoss() {
  if (tutorialIsActive()) return;
  if (bossBattle && bossBattle.active) return;
  if (activeWildPet) return;
  if (modal.style.display === "flex") return;
  if (activeScreen !== "farm") return;
  if (window.gameUIHidden) return; // NEW: Prevent spawning at login
  if (window.visitMode) return;
  const now = Date.now();
  if (now < nextBossSpawnAt) return;
  scheduleNextBossSpawn();
  const cropTiles = getActiveCropTiles();
  if (cropTiles.length === 0) return;
  let chance = Math.min(0.65, 0.35 + level * 0.02);
  if (Math.random() > chance) return;
  showToast("A wild boss appeared! 🪵", 1400);
  openModal("⚔️ Wild Boss!", `
    <div class="bossBattleModalContent">
      <div class="bossbattleBanner"><img src="images/bossbattlebanner.png" alt="boss battle banner" style="margin-bottom:10px;width:100%;border-radius:10px;"></div>
      <div class="resLine">Wild Boss: <b>Scarecrow 🪵</b> has appeared!</div>
      <div class="smallNote" style="text-align:left;margin-top:6px;">
        Choose a pet to fight. Connect letter tiles to form words — correct = deal damage, wrong = lose your turn!
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button style="flex:1;font-weight:900;" onclick="startBossBattle()">⚔️ Fight</button>
        <button style="flex:1;" onclick="runFromBoss()">🏃 Run</button>
      </div>
    </div>
  `);
}

function runFromBoss() {
  const cropTiles = getActiveCropTiles();
  if (cropTiles.length) {
    const t = cropTiles[Math.floor(Math.random() * cropTiles.length)];
    tileStates[t] = { state: "empty", crop: "", plantedAt: 0, finishAt: 0 };
    saveState(); updateUI(); renderFarm(); closeModal();
    showMessage("You ran!", `<div class="smallNote">The boss scared your farm and ruined 1 crop 😿</div>`);
  } else {
    closeModal();
  }
}

/* ── Pet Selection ─────────────────────────────────────── */
function startBossBattle() {
  const pets = zooPets.filter(p => p.animalId && BATTLE_ANIMALS[p.animalId]);
  if (!pets.length) {
    openModal("No Pets!", `
      <div class="smallNote">You need at least one animal in your Ranch to fight the boss!</div>
      <button onclick="closeModal()" style="width:100%;margin-top:12px;">OK</button>
    `);
    return;
  }
  const cards = pets.map(p => {
    const lv = clamp(parseInt(p.level || 1, 10) || 1, 1, 10);
    const meta = BATTLE_ANIMALS[p.animalId];
    const st = battleStats(p.animalId, lv);
    return `<div class="speciesPetRow" style="cursor:pointer;" onclick="selectPetForBoss('${p.uid}')">
      <div class="speciesPetImg">${meta.headimage}
        <div class="petNameandLevel">
          <span class="petLabel" data-title="${escapeHtml(meta.name)}">${escapeHtml(meta.name)}</span>
          <span class="petLvl" data-title="Lv ${lv}">Lv ${lv}</span>
        </div>
      </div>
      <div class="speciesPetInfo">
        <div class="statInfo"><span data-title="ATK ${st.atk}">ATK ${st.atk}</span> <img src="images/statbar.png" alt="stat bar"></div>
        <div class="statInfo"><span data-title="DEF ${st.def}">DEF ${st.def}</span> <img src="images/statbar.png" alt="stat bar"></div>
        <div class="statInfo"><span data-title="SPD ${st.spd}">SPD ${st.spd}</span> <img src="images/statbar.png" alt="stat bar"></div>
      </div>
    </div>`;
  }).join("");
  openModal("Choose Your Fighter", `
    <div class="animalInfoCon">🪵 Scarecrow awaits — pick your champion!</div>
    <div style="display:flex;flex-direction:row;gap:6px;margin-top:12px;flex-wrap:wrap;justify-content:center;">${cards}</div>
    <button onclick="closeModal()" style="width:100%;margin-top:14px;">Cancel</button>
  `);
}

function selectPetForBoss(petUid) {
  const pet = zooPets.find(p => p.uid === petUid);
  if (!pet) return;
  const lv = clamp(parseInt(pet.level || 1, 10) || 1, 1, 10);
  const meta = BATTLE_ANIMALS[pet.animalId];
  const st = battleStats(pet.animalId, lv);
  const hp = battleHpMax(lv);
  bossBattle = {
    active: true, round: 1, turn: "player", waiting: false,
    p1: { uid: pet.uid, animalId: pet.animalId, name: meta.name, emoji: meta.emoji, level: lv, hp, hpMax: hp, atk: st.atk, def: st.def, spd: st.spd },
    boss: { name: "Scarecrow", emoji: "🪵", hp: 140 + level * 5, hpMax: 140 + level * 5, atk: 14 + Math.floor(level * 0.8), def: 4, spd: 5 },
    log: [`${meta.name} steps up to fight Scarecrow!`]
  };
  closeModal();
  showBossScreen();
}

/* ── Screen show/hide ─────────────────────────────────── */
function showBossScreen() {
  activeScreen = "boss";
  farmScreen.style.display = "none";
  townScreen.style.display = "none";
  if (zooScreen) zooScreen.style.display = "none";
  const arenaEl = document.getElementById("arenaScreen");
  if (arenaEl) arenaEl.style.display = "none";
  document.getElementById("bossScreen").style.display = "flex";
  const header = document.querySelector(".header");
  if (header) header.style.display = "none";
  document.getElementById("bossSkillButtons").style.display = "flex";
  document.getElementById("bossWordChallenge").style.display = "none";

  const overlay = document.getElementById("bossLoadingOverlay");
  const bar = document.getElementById("bossLoadingBarFill");
  const hint = document.getElementById("bossLoadingHint");
  overlay.style.display = "flex";
  bar.style.width = "0%";
  const hints = ["Preparing battle…", "Summoning Scarecrow…", "Sharpening claws…", "Battle begins soon!"];
  let pct = 0, step = 0;
  const iv = setInterval(() => {
    pct += 6 + Math.random() * 20;
    if (pct >= 100) pct = 100;
    bar.style.width = pct + "%";
    if (step < hints.length) hint.textContent = hints[step++];
    if (pct >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        overlay.style.display = "none";
        bossScreenRender();
        bossAddLog("Battle start! Defeat the Scarecrow!");
      }, 350);
    }
  }, 260);
}

function hideBossScreen() {
  document.getElementById("bossScreen").style.display = "none";
  // Clear sprite set flags so next battle renders fresh
  const p1s = document.getElementById("bossP1Sprite");
  const p2s = document.getElementById("bossP2Sprite");
  if (p1s) { p1s.innerHTML = ""; delete p1s.dataset.set; }
  if (p2s) { p2s.innerHTML = ""; delete p2s.dataset.set; }
  activeScreen = "farm";
  farmScreen.style.display = "flex";
  const header = document.querySelector(".header");
  if (header) header.style.display = "";
}

function exitBossScreen() {
  openModal("Forfeit Boss Battle?", `
    <div style="text-align:center;padding:8px 0 12px;">
      <div style="font-size:14px;color:#fff;opacity:0.85;margin-bottom:16px;">Are you sure you want to give up?</div>
      <div style="display:flex;gap:10px;">
        <button style="flex:1;" onclick="closeModal()">Keep Fighting</button>
        <button style="flex:1;background:#e53935;color:#fff;border:none;border-radius:10px;padding:10px;cursor:pointer;font-family:var(--ui-font);" onclick="confirmBossForfeit()">Forfeit</button>
      </div>
    </div>
  `);
}
function confirmBossForfeit() { closeModal(); endBossBattleNew("forfeit"); }

/* ── Screen renderer ──────────────────────────────────── */
function bossScreenRender() {
  const b = bossBattle;
  if (!b) return;
  const p1Pct = Math.max(0, Math.floor((b.p1.hp / b.p1.hpMax) * 100));
  const bossPct = Math.max(0, Math.floor((b.boss.hp / b.boss.hpMax) * 100));
  const hpColor = pct => pct > 50 ? "linear-gradient(90deg,#43e97b,#f9d423)" : pct > 25 ? "linear-gradient(90deg,#f9d423,#ffa000)" : "linear-gradient(90deg,#e53935,#ff7043)";
  document.getElementById("bossP1HpFill").style.width = p1Pct + "%";
  document.getElementById("bossP1HpFill").style.background = hpColor(p1Pct);
  document.getElementById("bossP1HpLabel").textContent = `${b.p1.hp}/${b.p1.hpMax} HP`;
  document.getElementById("bossP2HpFill").style.width = bossPct + "%";
  document.getElementById("bossP2HpFill").style.background = hpColor(bossPct);
  document.getElementById("bossP2HpLabel").textContent = `${b.boss.hp}/${b.boss.hpMax} HP`;
  document.getElementById("bossP1Name").textContent = `${b.p1.name} Lv${b.p1.level}`;
  document.getElementById("bossP2Name").textContent = `Boss: ${b.boss.name}`;
  document.getElementById("bossRoundLabel").textContent = `Round ${b.round}`;
  const p1Sprite = document.getElementById("bossP1Sprite");
  if (!p1Sprite.dataset.set) {
    const meta = BATTLE_ANIMALS[b.p1.animalId];
    p1Sprite.innerHTML = meta.imagepath || `<span>${meta.emoji}</span>`;
    p1Sprite.dataset.set = "1";
  }
  const p2Sprite = document.getElementById("bossP2Sprite");
  if (!p2Sprite.dataset.set) {
    p2Sprite.innerHTML = `<img src="images/scarecrow.png" alt="scarecrow" onerror="this.parentElement.textContent='🪵'">`;
    p2Sprite.dataset.set = "1";
  }
  document.getElementById("btnBossAttack").disabled = !!(b.turn !== "player" || b.waiting);
  document.getElementById("btnBossHeavy").disabled = !!(b.turn !== "player" || b.waiting);
  const logEl = document.getElementById("bossBattleLog");
  if (logEl) logEl.textContent = b.log[0] || "";
}

function bossAddLog(msg) {
  if (!bossBattle) return;
  bossBattle.log.unshift(msg);
  bossBattle.log = bossBattle.log.slice(0, 20);
  const logEl = document.getElementById("bossBattleLog");
  if (logEl) logEl.textContent = msg;
}

/* ── Skill use ─────────────────────────────────────────── */
function bossScreenUseSkill(kind) {
  const b = bossBattle;
  if (!b || !b.active || b.waiting || b.turn !== "player") return;
  b.waiting = true;
  bossScreenPendingSkill = kind;
  const pool = kind === "normal" ? BOSS_WS_WORDS.normal : BOSS_WS_WORDS.heavy;
  const word = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById("bossSkillButtons").style.display = "none";
  document.getElementById("bossWordChallenge").style.display = "flex";
  bossStartWordConnect(word, kind);
}

/* ── Word Connect ─────────────────────────────────────── */
function bossStartWordConnect(word, skillKind) {
  document.getElementById("bossWordTarget").textContent = word;
  document.getElementById("bossWordProgress").textContent = "";
  const canvas = document.getElementById("bossWordCanvas"), bgCanvas = document.getElementById("bossWordBgCanvas");
  const dpr = window.devicePixelRatio || 1;
  const letters = _bossShuffleWord(word), n = letters.length;
  const radius = Math.max(55, Math.min((n * (22 * 2 + 10)) / (2 * Math.PI), 110));
  const SIZE = Math.round(radius * 2 + 22 * 2 + 20);
  canvas.width = bgCanvas.width = SIZE * dpr; canvas.height = bgCanvas.height = SIZE * dpr;
  canvas.style.width = bgCanvas.style.width = SIZE + "px"; canvas.style.height = bgCanvas.style.height = SIZE + "px";
  const wrapper = canvas.closest(".arenaWordCanvas");
  if (wrapper) { wrapper.style.width = wrapper.style.height = SIZE + "px"; }
  const ctx = canvas.getContext("2d"), bgCtx = bgCanvas.getContext("2d");
  ctx.scale(dpr, dpr); bgCtx.scale(dpr, dpr);
  const nodes = _bossPlaceLetters(letters, SIZE / 2, SIZE / 2, radius);
  bossWc = { word, skillKind, letters, nodes, selected: [], dragging: false, currentPos: null, ctx, bgCtx, SIZE };
  _bossDrawBg(); _bossDrawWc(); _bossBindEvents(canvas);
}
function _bossShuffleWord(word) { const p = word.split(""); for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[p[i], p[j]] = [p[j], p[i]]; } return p; }
function _bossPlaceLetters(letters, cx, cy, radius) { return letters.map((letter, i) => { const a = (i / letters.length) * Math.PI * 2 - Math.PI / 2; return { letter, x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), r: 22 }; }); }
function _bossDrawBg() {
  const { bgCtx, nodes, SIZE } = bossWc;
  bgCtx.clearRect(0, 0, SIZE, SIZE);
  bgCtx.save(); bgCtx.beginPath(); bgCtx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2); bgCtx.fillStyle = "rgba(255,255,255,0.05)"; bgCtx.fill(); bgCtx.strokeStyle = "rgba(255,255,255,0.12)"; bgCtx.lineWidth = 1.5; bgCtx.stroke(); bgCtx.restore();
  for (const node of nodes) {
    bgCtx.save(); bgCtx.beginPath(); bgCtx.arc(node.x, node.y, node.r, 0, Math.PI * 2); bgCtx.fillStyle = "rgba(255,255,255,0.12)"; bgCtx.fill(); bgCtx.strokeStyle = "rgba(255,255,255,0.35)"; bgCtx.lineWidth = 2; bgCtx.stroke(); bgCtx.restore();
    bgCtx.save(); bgCtx.font = "900 16px 'ArialRounded',sans-serif"; bgCtx.fillStyle = "#fff"; bgCtx.textAlign = "center"; bgCtx.textBaseline = "middle"; bgCtx.fillText(node.letter, node.x, node.y); bgCtx.restore();
  }
}
function _bossDrawWc() {
  const { ctx, nodes, selected, dragging, currentPos, SIZE } = bossWc;
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (selected.length > 0) {
    ctx.save(); ctx.strokeStyle = "rgba(249,212,35,0.7)"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(nodes[selected[0]].x, nodes[selected[0]].y);
    for (let i = 1; i < selected.length; i++) ctx.lineTo(nodes[selected[i]].x, nodes[selected[i]].y);
    if (dragging && currentPos) ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke(); ctx.restore();
  }
  for (let i = 0; i < selected.length; i++) {
    const node = nodes[selected[i]];
    ctx.save(); ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2); ctx.fillStyle = i === 0 ? "rgba(249,212,35,0.9)" : "rgba(249,180,35,0.75)"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.font = "900 16px 'ArialRounded',sans-serif"; ctx.fillStyle = "#1a1a2e"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(node.letter, node.x, node.y); ctx.restore();
  }
  document.getElementById("bossWordProgress").textContent = selected.map(i => nodes[i].letter).join(" ");
}
function bossWordReset() { if (!bossWc) return; bossWc.selected = []; bossWc.dragging = false; bossWc.currentPos = null; document.getElementById("bossWordProgress").textContent = ""; _bossDrawWc(); }
function _bossBindEvents(canvas) {
  const fresh = canvas.cloneNode(true); canvas.parentNode.replaceChild(fresh, canvas);
  const dpr = window.devicePixelRatio || 1; bossWc.ctx = fresh.getContext("2d"); bossWc.ctx.scale(dpr, dpr);
  function getPos(e) { const rect = fresh.getBoundingClientRect(); const sx = bossWc.SIZE / rect.width, sy = bossWc.SIZE / rect.height; const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy }; }
  function nodeAt(pos) { return bossWc.nodes.findIndex(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= n.r + 4); }
  function onStart(e) { e.preventDefault(); const pos = getPos(e); const idx = nodeAt(pos); if (idx < 0) return; bossWc.selected = [idx]; bossWc.dragging = true; bossWc.currentPos = pos; _bossDrawWc(); }
  function onMove(e) { e.preventDefault(); if (!bossWc.dragging) return; const pos = getPos(e); bossWc.currentPos = pos; const idx = nodeAt(pos); if (idx >= 0 && !bossWc.selected.includes(idx)) bossWc.selected.push(idx); _bossDrawWc(); }
  function onEnd(e) { e.preventDefault(); if (!bossWc.dragging) return; bossWc.dragging = false; bossWc.currentPos = null; _bossEvaluate(); }
  fresh.addEventListener("mousedown", onStart); fresh.addEventListener("mousemove", onMove); fresh.addEventListener("mouseup", onEnd);
  fresh.addEventListener("touchstart", onStart, { passive: false }); fresh.addEventListener("touchmove", onMove, { passive: false }); fresh.addEventListener("touchend", onEnd, { passive: false });
}
function _bossEvaluate() {
  if (!bossWc) return;
  const formed = bossWc.selected.map(i => bossWc.nodes[i].letter).join("");
  const correct = formed === bossWc.word;
  const progEl = document.getElementById("bossWordProgress");
  progEl.textContent = formed;
  if (correct) {
    progEl.style.color = "#43e97b"; questProgress("answer", 1);
    setTimeout(() => { progEl.style.color = ""; document.getElementById("bossWordChallenge").style.display = "none"; document.getElementById("bossSkillButtons").style.display = "flex"; const skill = bossScreenPendingSkill; bossWc = null; bossScreenPendingSkill = null; bossBattle.waiting = false; _bossResolveDamage(skill, true); }, 600);
  } else {
    progEl.style.color = "#e53935"; questProgress("answer", 1); bossAddLog("Wrong! You lost your turn.");
    setTimeout(() => { progEl.style.color = ""; document.getElementById("bossWordChallenge").style.display = "none"; document.getElementById("bossSkillButtons").style.display = "flex"; bossWc = null; bossScreenPendingSkill = null; bossBattle.waiting = false; bossBattle.turn = "boss"; bossScreenRender(); setTimeout(() => _bossEnemyTurn(), 700); }, 700);
  }
}

/* ── Damage resolution ─────────────────────────────────── */
function _bossResolveDamage(skill, hit) {
  const b = bossBattle; if (!b || !b.active) return;
  if (hit) {
    const [mn, mx] = skill === "normal" ? [18, 26] : [30, 42];
    const atkBonus = Math.max(0, b.p1.atk - b.boss.def);
    const dmg = Math.floor(mn + Math.random() * (mx - mn + 1) + atkBonus * 0.5);
    b.boss.hp = Math.max(0, b.boss.hp - dmg);
    bossAddLog(`${b.p1.name} used ${skill === "normal" ? "Normal" : "Heavy"} Attack — dealt ${dmg} damage!`);
    _bossFireProjectile("p1");
  }
  bossScreenRender();
  if (b.boss.hp <= 0) { setTimeout(() => endBossBattleNew("win"), 500); return; }
  b.turn = "boss"; bossScreenRender(); setTimeout(() => _bossEnemyTurn(), 800);
}
function _bossEnemyTurn() {
  const b = bossBattle; if (!b || !b.active) return;
  const mn = 14 + Math.floor(level * 0.5), mx = 22 + Math.floor(level * 0.8);
  const dmg = Math.max(1, Math.floor(mn + Math.random() * (mx - mn + 1)) - Math.floor((b.p1.def || 0) * 0.3));
  b.p1.hp = Math.max(0, b.p1.hp - dmg);
  bossAddLog(`Scarecrow attacks — hits you for ${dmg}!`);
  _bossFireProjectile("boss");
  bossScreenRender();
  if (b.p1.hp <= 0) { endBossBattleNew("lose"); return; }
  b.round++; b.turn = "player"; b.waiting = false; bossScreenRender();
}
function _bossFireProjectile(from) {
  const field = document.getElementById("bossBattleField"); if (!field) return;
  const fromEl = document.getElementById(from === "p1" ? "bossP1Sprite" : "bossP2Sprite");
  const toEl = document.getElementById(from === "p1" ? "bossP2Sprite" : "bossP1Sprite");
  if (!fromEl || !toEl) return;
  const fR = field.getBoundingClientRect(), fr = fromEl.getBoundingClientRect(), tr = toEl.getBoundingClientRect();
  const startX = fr.left - fR.left + fr.width / 2, startY = fr.top - fR.top + fr.height / 2;
  const endX = tr.left - fR.left + tr.width / 2, endY = tr.top - fR.top + tr.height / 2;
  const proj = document.createElement("div");
  proj.textContent = from === "p1" ? "⚡" : "💢";
  proj.style.cssText = `position:absolute;font-size:28px;pointer-events:none;z-index:99;left:${startX}px;top:${startY}px;transform:translate(-50%,-50%);transition:left 0.28s ease-in,top 0.28s ease-in,opacity 0.28s ease-in;opacity:1;`;
  field.appendChild(proj);
  requestAnimationFrame(() => { proj.style.left = endX + "px"; proj.style.top = endY + "px"; proj.style.opacity = "0"; });
  setTimeout(() => { try { proj.remove(); } catch (e) { } }, 450);
}

/* ── End battle ─────────────────────────────────────────── */
function endBossBattleNew(result) {
  if (!bossBattle) return;
  bossBattle.active = false; bossWc = null; scheduleNextBossSpawn();
  if (result === "win") {
    const cr = 180 + Math.floor(level * 8), xr = 55 + Math.floor(level * 4);
    coins += cr; gainXP(xr); boosts.fertilizer = (boosts.fertilizer || 0) + 1;
    saveState(); updateUI(); renderFarm();
    setTimeout(() => { hideBossScreen(); openModal("Victory! 🐷🏁", `<div style="text-align:center;padding:8px 0 12px;"><div style="font-size:36px;margin-bottom:8px;">🏆</div><div class="resLine">You defeated the Scarecrow!</div><div class="smallNote" style="margin-top:8px;">+${cr} coins &nbsp;•&nbsp; +${xr} XP &nbsp;•&nbsp; +1 Fertilizer 🧪</div><button onclick="closeModal()" style="width:100%;margin-top:14px;">Awesome!</button></div>`); }, 300);
  } else if (result === "lose") {
    const loss = Math.min(coins, 40); coins -= loss; saveState(); updateUI();
    setTimeout(() => { hideBossScreen(); openModal("Defeat… 😿", `<div style="text-align:center;padding:8px 0 12px;"><div style="font-size:36px;margin-bottom:8px;">💀</div><div class="resLine">Scarecrow won.</div><div class="smallNote">You dropped ${loss} coins while escaping.</div><button onclick="closeModal()" style="width:100%;margin-top:14px;">OK</button></div>`); }, 300);
  } else if (result === "forfeit") {
    const loss = Math.min(coins, 25); coins -= loss; saveState(); updateUI();
    setTimeout(() => { hideBossScreen(); openModal("Forfeit", `<div class="smallNote">You forfeited and lost ${loss} coins.</div><button onclick="closeModal()" style="width:100%;margin-top:12px;">OK</button>`); }, 150);
  }
}