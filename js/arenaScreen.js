/* =========================================================
   ARENA SCREEN — Full-screen battle UI
========================================================= */
const arenaScreen = $("arenaScreen");
const arenaLoadingOverlay = $("arenaLoadingOverlay");
const arenaLoadingBarFill = $("arenaLoadingBarFill");
const arenaLoadingHint = $("arenaLoadingHint");

const WS_WORDS = {
  normal: ["CAT","DOG","COW","PIG","FISH","BIRD","SUN","MOON","STAR","SKY","RAIN","SNOW","FIRE","WIND","EGG","MILK","CUP","BALL","TOY","BOOK","PEN","BAG","HAT","SHOE","TREE","LEAF","ROCK","SAND","MUD","CAR","BEAR","WOLF","FROG","MOUSE","DEER","GOAT","DUCK","OWL","BEE","ANT","RAT","HEN","SHARK","PEAR","BEAN","RICE","CORN","ROSE","BARK","FORK","SPOON","KNIFE","PLATE","RULER","BELT","COAT","VEST","DRUM"],
  heavy: ["HORSE","SHEEP","TIGER","LION","PLANE","TRAIN","TRUCK","SHIP","BOAT","GOLD","SILVER","IRON","LEAD","PANDA","ZEBRA","CAMEL","HYENA","EAGLE","HAWK","RAVEN","CASTLE","BRIDGE","TUNNEL","ROCKET","WAGON","CART","CANOE","SWORD","SHIELD","ARROW","BOW","SPEAR","AXE","CHEST","CROWN","THRONE","JEWEL"]
};

// pending skill kind while word-connect runs
let arenaScreenPendingSkill = null;

/* ---------- Show / hide ---------- */
function showArenaScreen(){
  activeScreen = "arena";
  farmScreen.style.display = "none";
  townScreen.style.display = "none";
  if(zooScreen) zooScreen.style.display = "none";
  arenaScreen.style.display = "flex";
  const header = document.querySelector(".header");
  if(header) header.style.display = "none";

  // Reset challenge panel
  $("arenaSkillButtons").style.display = "flex";
  $("arenaWordChallenge").style.display = "none";

  // Show loading overlay then animate
  arenaLoadingOverlay.style.display = "flex";
  arenaLoadingBarFill.style.width = "0%";
  arenaLoadingHint.textContent = "Loading battle assets…";

  runArenaLoadingSequence();
}

function hideArenaScreen(){
  arenaScreen.style.display = "none";
  activeScreen = "town";
  townScreen.style.display = "flex";
  const header = document.querySelector(".header");
  if(header) header.style.display = "";
}

function exitArenaScreen(){
  // Step 1: confirm forfeit
  openModal("Forfeit Battle?", `
    <div style="text-align:center; padding: 8px 0 12px;">
      <div style="font-size:14px; color:#fff; opacity:0.85; margin-bottom:16px;">Are you sure you want to give up?</div>
      <div style="display:flex; gap:10px;">
        <button style="flex:1;" onclick="closeModal()">Keep Fighting</button>
        <button style="flex:1; background:#e53935; color:#fff; border:none; border-radius:10px; padding:10px; cursor:pointer; font-family:var(--ui-font);" onclick="confirmForfeit()">Forfeit</button>
      </div>
    </div>
  `);
}

function confirmForfeit(){
  closeModal();
  endArenaBattle(true);
  setTimeout(() => {
    openModal("You Lose 💀", `
      <div style="text-align:center; padding: 8px 0 12px;">
        <div style="font-size:32px; margin-bottom:8px;">😿</div>
        <div style="font-size:14px; opacity:0.85; margin-bottom:16px;">You forfeited the battle.</div>
        <div style="display:flex; gap:10px;">
          <button style="flex:1;" onclick="hideArenaScreen(); closeModal(); openArena()">Back to Arena</button>
          <button style="flex:1;" onclick="hideArenaScreen(); closeModal(); showFarm()">Back to Farm</button>
        </div>
      </div>
    `);
  }, 150);
}

/* ---------- Loading sequence ---------- */
function runArenaLoadingSequence(){
  const hints = [
    "Loading battle assets…",
    "Preparing your warrior…",
    "Summoning the enemy…",
    "Sharpening claws…",
    "Battle begins soon!"
  ];
  let pct = 0;
  let step = 0;
  const iv = setInterval(()=>{
    pct += (5 + Math.random() * 18);
    if(pct >= 100) pct = 100;
    arenaLoadingBarFill.style.width = pct + "%";
    if(step < hints.length){
      arenaLoadingHint.textContent = hints[step];
      step++;
    }
    if(pct >= 100){
      clearInterval(iv);
      setTimeout(()=>{
        arenaLoadingOverlay.style.display = "none";
        addArenaLog("Battle start!");
        startNewArenaRound(true);
      }, 350);
    }
  }, 260);
}

/* ---------- Screen renderer ---------- */
function arenaScreenRender(){
  const b = arenaBattle;
  if(!b) return;

  const p1 = b.p1;
  const p2 = b.p2;

  // HP bars
  const p1Pct = Math.max(0, Math.floor((p1.hp / p1.hpMax) * 100));
  const p2Pct = Math.max(0, Math.floor((p2.hp / p2.hpMax) * 100));
  $("arenaP1HpFill").style.width = p1Pct + "%";
  $("arenaP2HpFill").style.width = p2Pct + "%";
  $("arenaP1HpFill").style.background = p1Pct > 50 ? "linear-gradient(90deg,#43e97b,#f9d423)"
    : p1Pct > 25 ? "linear-gradient(90deg,#f9d423,#ffa000)" : "linear-gradient(90deg,#e53935,#ff7043)";
  $("arenaP2HpFill").style.background = p2Pct > 50 ? "linear-gradient(90deg,#43e97b,#f9d423)"
    : p2Pct > 25 ? "linear-gradient(90deg,#f9d423,#ffa000)" : "linear-gradient(90deg,#e53935,#ff7043)";
  $("arenaP1HpLabel").textContent = `${p1.hp}/${p1.hpMax} HP`;
  $("arenaP2HpLabel").textContent = `${p2.hp}/${p2.hpMax} HP`;


  // Sprites (only set once to avoid flicker)
  if(!$("arenaP1Sprite").dataset.set){
    const meta1 = BATTLE_ANIMALS[p1.animalId];
    $("arenaP1Sprite").innerHTML = meta1.imagepath
      || `<span class="arenaEmojiSprite">${meta1.emoji}</span>`;
    $("arenaP1Sprite").dataset.set = "1";
  }
  if(!$("arenaP2Sprite").dataset.set){
    const meta2 = BATTLE_ANIMALS[p2.animalId];
    $("arenaP2Sprite").innerHTML = meta2.imagepath
      || `<span class="arenaEmojiSprite">${meta2.emoji}</span>`;
    $("arenaP2Sprite").dataset.set = "1";
  }

  // Names
  $("arenaP1Name").textContent = `${p1.name} Lv${p1.level}`;
  $("arenaP2Name").textContent = `${p2.name} Lv${p2.level}`;

  // Status badges
  $("arenaP1Status").innerHTML = arenaScreenStatusHtml(p1);
  $("arenaP2Status").innerHTML = arenaScreenStatusHtml(p2);

  // Battle log — show only latest line
  $("arenaBattleLog").textContent = b.log[0] || "";

  // Round label
  const side = b.active ? currentArenaSide() : null;
  const turnLabel = !b.active ? "Battle Over"
    : side === "p1" ? "Your Turn"
    : b.mode === "local" ? "Player 2's Turn" : "Enemy's Turn";
  $("arenaRoundLabel").textContent = `Round ${b.round} • ${turnLabel}`;

  // Skill buttons
  if(b.active && side){
    const actor = getCombatant(side);
    const skillMeta = BATTLE_ANIMALS[actor.animalId].skills;
    const canAct = actor.control === "human" && !b.waiting;
    $("arenaAttackSkillName").textContent = skillMeta.attack.name;
    $("arenaHeavySkillName").textContent = skillMeta.buff.name;

    $("btnArenaAttack").disabled = !canAct;
    $("btnArenaHeavy").disabled = !canAct;
  }

  // Battle ended?
  if(!b.active){
    $("btnArenaAttack").disabled = true;
    $("btnArenaHeavy").disabled = true;
    // Show result banner via log then offer exit
    setTimeout(()=>{
      openModal("Battle Over", `
        <div class="resLine">${escapeHtml(b.log[0] || "Battle ended.")}</div>
        <div style="margin-top:12px;display:flex;gap:10px;">
          <button style="flex:1;" onclick="hideArenaScreen();closeModal();openArena()">Back to Arena</button>
        </div>
      `);
    }, 600);
  }
}

function arenaScreenStatusHtml(c){
  return c.statuses.map(s => {
    let label = "";
    if(s.kind === "stat"){
      const parts = [];
      if(s.atk) parts.push(`${s.atk>0?"+":""}${s.atk}ATK`);
      if(s.def) parts.push(`${s.def>0?"+":""}${s.def}DEF`);
      if(s.spd) parts.push(`${s.spd>0?"+":""}${s.spd}SPD`);
      label = parts.join(" ");
    } else {
      label = s.kind;
    }
    return `<span class="arenaStatusBadge">${escapeHtml(label)}(${s.turns})</span>`;
  }).join("");
}

/* ---------- Skill buttons on screen ---------- */
function arenaScreenUseSkill(kind){
  const b = arenaBattle;
  if(!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  if(actor.control !== "human") return;

  // Stun check
  if(hasStatus(actor, "stun")){
    addArenaLog(`${actor.name} is stunned and loses the turn!`);
    consumeStatus(actor, "stun", 1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  // No quiz mode — resolve immediately
  if(!b.quizOn){
    resolveArenaSkill(kind === "heavy" ? "attack" : kind);
    return;
  }

  // Show word connect challenge
  arenaScreenPendingSkill = kind;
  const pool = kind === "normal" ? WS_WORDS.normal : WS_WORDS.heavy;
  const word = pool[Math.floor(Math.random() * pool.length)];
  $("arenaSkillButtons").style.display = "none";
  $("arenaWordChallenge").style.display = "flex";
  startWordConnect(word, kind);
}

/* ---------- Word Connect mechanic ---------- */
let wc = null; // active word-connect state

function startWordConnect(word, skillKind){
  $("arenaWordTarget").textContent = word;
  $("arenaWordProgress").textContent = "";

  const canvas = $("arenaWordCanvas");
  const bgCanvas = $("arenaWordBgCanvas");
  const dpr = window.devicePixelRatio || 1;

  // Scale canvas and radius to fit exactly the number of letters
  const letters = buildLetterPool(word);
  const n = letters.length;
  const nodeR = 22;
  const minArc = nodeR * 2 + 10;
  const minCircumference = n * minArc;
  const minRadius = minCircumference / (2 * Math.PI);
  const radius = Math.max(55, Math.min(minRadius, 110));
  const SIZE = Math.round(radius * 2 + nodeR * 2 + 20);

  canvas.width = bgCanvas.width = SIZE * dpr;
  canvas.height = bgCanvas.height = SIZE * dpr;
  canvas.style.width = bgCanvas.style.width = SIZE + "px";
  canvas.style.height = bgCanvas.style.height = SIZE + "px";

  const wrapper = canvas.closest(".arenaWordCanvas");
  if(wrapper){ wrapper.style.width = wrapper.style.height = SIZE + "px"; }

  const ctx = canvas.getContext("2d");
  const bgCtx = bgCanvas.getContext("2d");
  ctx.scale(dpr, dpr);
  bgCtx.scale(dpr, dpr);

  const nodes = placeLettersInCircle(letters, SIZE / 2, SIZE / 2, radius);

  wc = {
    word,
    skillKind,
    letters,
    nodes,
    selected: [],      // indices of selected nodes in order
    dragging: false,
    currentPos: null,
    ctx,
    bgCtx,
    SIZE
  };

  drawWordConnectBg();
  drawWordConnect();
  bindWordConnectEvents(canvas);
}

function buildLetterPool(word){
  // Only the letters of the chosen word, shuffled
  const pool = word.split("");
  for(let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function placeLettersInCircle(letters, cx, cy, radius){
  const n = letters.length;
  return letters.map((letter, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      letter,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      r: 22
    };
  });
}

function drawWordConnectBg(){
  const { bgCtx, nodes, SIZE } = wc;
  bgCtx.clearRect(0, 0, SIZE, SIZE);

  // Background circle
  bgCtx.save();
  bgCtx.beginPath();
  bgCtx.arc(SIZE/2, SIZE/2, SIZE/2 - 2, 0, Math.PI*2);
  bgCtx.fillStyle = "rgba(255,255,255,0.05)";
  bgCtx.fill();
  bgCtx.strokeStyle = "rgba(255,255,255,0.12)";
  bgCtx.lineWidth = 1.5;
  bgCtx.stroke();
  bgCtx.restore();

  // Draw all nodes (static)
  for(const node of nodes){
    bgCtx.save();
    bgCtx.beginPath();
    bgCtx.arc(node.x, node.y, node.r, 0, Math.PI*2);
    bgCtx.fillStyle = "rgba(255,255,255,0.12)";
    bgCtx.fill();
    bgCtx.strokeStyle = "rgba(255,255,255,0.35)";
    bgCtx.lineWidth = 2;
    bgCtx.stroke();
    bgCtx.restore();

    bgCtx.save();
    bgCtx.font = `900 16px 'ArialRounded', sans-serif`;
    bgCtx.fillStyle = "#fff";
    bgCtx.textAlign = "center";
    bgCtx.textBaseline = "middle";
    bgCtx.fillText(node.letter, node.x, node.y);
    bgCtx.restore();
  }
}

function drawWordConnect(){
  const { ctx, nodes, selected, dragging, currentPos, SIZE } = wc;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw connection lines
  if(selected.length > 0){
    ctx.save();
    ctx.strokeStyle = "rgba(249,212,35,0.7)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(nodes[selected[0]].x, nodes[selected[0]].y);
    for(let i = 1; i < selected.length; i++){
      ctx.lineTo(nodes[selected[i]].x, nodes[selected[i]].y);
    }
    if(dragging && currentPos){
      ctx.lineTo(currentPos.x, currentPos.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Draw selected nodes on top
  for(let i = 0; i < selected.length; i++){
    const node = nodes[selected[i]];
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI*2);
    ctx.fillStyle = i === 0 ? "rgba(249,212,35,0.9)" : "rgba(249,180,35,0.75)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `900 16px 'ArialRounded', sans-serif`;
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.letter, node.x, node.y);
    ctx.restore();
  }

  // Update progress display
  $("arenaWordProgress").textContent = selected.map(i => nodes[i].letter).join(" ");
}

function arenaWordReset(){
  if(!wc) return;
  wc.selected = [];
  wc.dragging = false;
  wc.currentPos = null;
  $("arenaWordProgress").textContent = "";
  drawWordConnect();
}

function bindWordConnectEvents(canvas){
  // Remove old listeners by cloning
  const fresh = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(fresh, canvas);
  // Re-assign reference
  wc.ctx = fresh.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  wc.ctx.scale(dpr, dpr);

  function getPos(e){
    const rect = fresh.getBoundingClientRect();
    const scaleX = wc.SIZE / rect.width;
    const scaleY = wc.SIZE / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function nodeAt(pos){
    return wc.nodes.findIndex(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= n.r + 4);
  }

  function onStart(e){
    e.preventDefault();
    const pos = getPos(e);
    const idx = nodeAt(pos);
    if(idx < 0) return;
    wc.selected = [idx];
    wc.dragging = true;
    wc.currentPos = pos;
    drawWordConnect();
  }

  function onMove(e){
    e.preventDefault();
    if(!wc.dragging) return;
    const pos = getPos(e);
    wc.currentPos = pos;
    const idx = nodeAt(pos);
    if(idx >= 0 && !wc.selected.includes(idx)){
      wc.selected.push(idx);
    }
    drawWordConnect();
  }

  function onEnd(e){
    e.preventDefault();
    if(!wc.dragging) return;
    wc.dragging = false;
    wc.currentPos = null;
    evaluateWordConnect();
  }

  fresh.addEventListener("mousedown", onStart);
  fresh.addEventListener("mousemove", onMove);
  fresh.addEventListener("mouseup", onEnd);
  fresh.addEventListener("touchstart", onStart, { passive: false });
  fresh.addEventListener("touchmove", onMove, { passive: false });
  fresh.addEventListener("touchend", onEnd, { passive: false });
}

function evaluateWordConnect(){
  if(!wc) return;
  const formed = wc.selected.map(i => wc.nodes[i].letter).join("");
  const correct = formed === wc.word;

  $("arenaWordProgress").textContent = formed;

  const skillKind = wc.arenaScreenPendingSkill || arenaScreenPendingSkill;

  if(correct){
    // Flash green
    $("arenaWordProgress").style.color = "#43e97b";
    addArenaLog(`${wc.word} — Correct! Action lands.`);
    questProgress("answer", 1);
    setTimeout(()=>{
      $("arenaWordProgress").style.color = "";
      $("arenaWordChallenge").style.display = "none";
      $("arenaSkillButtons").style.display = "flex";
      wc = null;
      // Map "normal"/"heavy" → existing arena skill kinds
      const mappedKind = arenaScreenPendingSkill === "heavy" ? "attack" : arenaScreenPendingSkill;
      arenaBattle.waiting = false;
      resolveArenaSkill(mappedKind || "attack");
    }, 600);
  } else {
    // Flash red
    $("arenaWordProgress").style.color = "#e53935";
    addArenaLog(`Wrong! Lost turn.`);
    questProgress("answer", 1);
    setTimeout(()=>{
      $("arenaWordProgress").style.color = "";
      $("arenaWordChallenge").style.display = "none";
      $("arenaSkillButtons").style.display = "flex";
      wc = null;
      arenaScreenPendingSkill = null;
      arenaBattle.waiting = false;
      const side = currentArenaSide();
      tickStatusesEndTurn(getCombatant(side));
      endArenaTurn();
    }, 700);
  }
}

/* ---------- Projectile animation ---------- */
function fireProjectile(fromSide) {
  const field = document.getElementById("arenaBattleField");
  if (!field) return;

  const fromEl = document.getElementById(fromSide === "p1" ? "arenaP1Sprite" : "arenaP2Sprite");
  const toEl   = document.getElementById(fromSide === "p1" ? "arenaP2Sprite" : "arenaP1Sprite");
  if (!fromEl || !toEl) return;

  const fieldRect = field.getBoundingClientRect();
  const fromRect  = fromEl.getBoundingClientRect();
  const toRect    = toEl.getBoundingClientRect();

  const startX = fromRect.left - fieldRect.left + fromRect.width  / 2;
  const startY = fromRect.top  - fieldRect.top  + fromRect.height / 2;
  const endX   = toRect.left   - fieldRect.left + toRect.width    / 2;
  const endY   = toRect.top    - fieldRect.top  + toRect.height   / 2;

  const proj = document.createElement("div");
  proj.textContent = "⚡";
  proj.style.cssText = `
    position: absolute;
    font-size: 28px;
    pointer-events: none;
    z-index: 99;
    left: ${startX}px;
    top:  ${startY}px;
    transform: translate(-50%, -50%);
    transition: left 0.28s ease-in, top 0.28s ease-in, opacity 0.28s ease-in;
    opacity: 1;
  `;
  field.appendChild(proj);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      proj.style.left    = `${endX}px`;
      proj.style.top     = `${endY}px`;
      proj.style.opacity = "0";
    });
  });

  // Flash hit effect on target sprite
  setTimeout(() => {
    toEl.style.transition = "filter 0.08s ease";
    toEl.style.filter = "brightness(3) saturate(0)";
    setTimeout(() => { toEl.style.filter = ""; }, 160);
    proj.remove();
  }, 300);
}

// Also hide the arena screen from showFarm/showTown/showZoo
const _origShowFarm = showFarm;
showFarm = function(){
  arenaScreen.style.display = "none";
  _origShowFarm();
};