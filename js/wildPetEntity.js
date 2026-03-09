/* =========================================================
   WILD PET ENTITY (ENTRANCE -> WALK -> EAT)
========================================================= */
let activeWildPet = null;

function farmBounds() {
  const wrap = $("farmWrap");
  const rect = wrap.getBoundingClientRect();
  return { w: rect.width, h: rect.height, rect };
}
function tileCenterInWrap(tileIndex) {
  const wrapRect = $("farmWrap").getBoundingClientRect();
  const tileRect = tiles[tileIndex].getBoundingClientRect();
  const cx = (tileRect.left + tileRect.width / 2) - wrapRect.left;
  const cy = (tileRect.top + tileRect.height / 2) - wrapRect.top;
  return { x: cx, y: cy };
}

function trySpawnWildPet() {
  if (tutorialIsActive()) return;
  if (activeScreen !== "farm") return; // NEW: Prevent spawning in background
  if (window.gameUIHidden) return;     // NEW: Prevent spawning at login
  if (bossBattle && bossBattle.active) return;
  if (activeWildPet) return;
  const now = Date.now();
  if (now < nextPetSpawnAt) return;

  const cropTiles = getActiveCropTiles();
  scheduleNextPetSpawn();

  if (cropTiles.length === 0) return;

  let chance = 0.55 + cropTiles.length * 0.03 + level * 0.01;
  chance = Math.min(0.90, chance);
  if (petSpawnsBlocked()) chance *= 0.35;
  if (Math.random() > chance) return;

  const grown = cropTiles.filter(i => tileStates[i].state === "grown");
  const pool = (grown.length && Math.random() < 0.6) ? grown : cropTiles;
  const targetTileIndex = pool[Math.floor(Math.random() * pool.length)];

  const type = weightedPick(PET_TYPES);
  spawnWildPetEntity(type, targetTileIndex);
}

function spawnWildPetEntity(type, targetTileIndex) {
  showToast("A wild pet has appeared!");

  const b = farmBounds();
  const startSideLeft = Math.random() < 0.5;

  const startX = startSideLeft ? -16 : (b.w + 16);
  const startY = 20 + Math.random() * Math.max(1, (b.h - 40));

  const target = tileCenterInWrap(targetTileIndex);
  const targetX = target.x - 12;
  const targetY = target.y - 22;

  const entityEl = document.createElement("div");
  entityEl.className = "wildEntity";
  entityEl.innerHTML = type.imagepath;
  entityEl.title = `${type.name} (${type.rarity})`;
  entityEl.style.left = `${startX}px`;
  entityEl.style.top = `${startY}px`;
  // Instantly flip to face direction of travel — no rotation, no transition on transform
  entityEl.style.transform = startSideLeft ? "scaleX(1)" : "scaleX(-1)";
  entityEl.onclick = (e) => {
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

  const approachMs = 3200;

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

  requestAnimationFrame(() => {
    entityEl.style.left = `${targetX}px`;
    entityEl.style.top = `${targetY}px`;
    barEl.style.left = `${targetX - 6}px`;
    barEl.style.top = `${targetY + 30}px`;
  });

  setTimeout(() => {
    if (!activeWildPet) return;
    if (activeWildPet.phase !== "approach") return;

    const st = tileStates[targetTileIndex];
    if (!st || st.state === "empty") {
      despawnWildPet("It left because there was no crop.");
      return;
    }
    activeWildPet.phase = "eating";
    activeWildPet.eatStartAt = Date.now();
    activeWildPet.eatEndAt = Date.now() + type.eatMs;
  }, approachMs + 30);
}

function schedulePoops(type, approachMs) {
  if (!activeWildPet) return;
  const count = Math.floor(type.poopMin + Math.random() * (type.poopMax - type.poopMin + 1));
  for (let i = 0; i < count; i++) {
    const t = 250 + Math.random() * (approachMs - 450);
    const tid = setTimeout(() => {
      if (!activeWildPet) return;
      if (activeWildPet.phase !== "approach") return;
      dropPoopAtEntity();
    }, Math.max(150, t));
    activeWildPet.poopTimers.push(tid);
  }
}

function getEntityPosition() {
  if (!activeWildPet) return { x: 0, y: 0 };
  const el = activeWildPet.entityEl;
  const x = parseFloat(el.style.left || "0");
  const y = parseFloat(el.style.top || "0");
  return { x, y };
}

function dropPoopAtEntity() {
  const pos = getEntityPosition();
  const poopEl = document.createElement("div");
  poopEl.className = "poop";
  poopEl.textContent = "💩";
  const px = pos.x + 10 + (Math.random() * 10 - 5);
  const py = pos.y + 28 + (Math.random() * 10 - 5);
  poopEl.style.left = `${px}px`;
  poopEl.style.top = `${py}px`;
  poopEl.title = "Click to clean";
  poopEl.onclick = (e) => {
    e.stopPropagation();
    cleanPoop(poopEl);
  };
  eventLayer.appendChild(poopEl);
}

function cleanPoop(poopEl) {
  try { poopEl.remove(); } catch (e) { }
  coins += 2;
  gainXP(2);
  questProgress("clean", 1);
  saveState();
  updateUI();
  showToast("Poop cleaned! +2 coins");
}

function tickWildPet() {
  // FIX: Stop eating if player is in Town/Zoo or a menu is open
  if (activeScreen !== "farm" || modal.style.display === "flex") return;

  if (tutorialIsActive()) return;
  if (!activeWildPet) return;
  const st = tileStates[activeWildPet.targetTileIndex];
  if (!st || st.state === "empty") {
    despawnWildPet("The pet got bored and left.");
    return;
  }

  if (activeWildPet.phase !== "eating") {
    activeWildPet.barFillEl.style.width = "0%";
    return;
  }
  if (activeWildPet.paused) return;

  const now = Date.now();
  const duration = activeWildPet.eatEndAt - activeWildPet.eatStartAt;
  const elapsed = now - activeWildPet.eatStartAt;
  const pct = clamp(elapsed / Math.max(1, duration), 0, 1);
  activeWildPet.barFillEl.style.width = `${Math.floor(pct * 100)}%`;

  if (now >= activeWildPet.eatEndAt) {
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

function despawnWildPet(optionalToast) {
  if (!activeWildPet) return;
  for (const t of activeWildPet.poopTimers) {
    try { clearTimeout(t); } catch (e) { }
  }
  try { activeWildPet.entityEl.remove(); } catch (e) { }
  try { activeWildPet.barEl.remove(); } catch (e) { }
  activeWildPet = null;
  if (optionalToast) showToast(optionalToast, 1200);
}

function getPetQuizDifficulty(tileIndex) {
  const st = tileStates[tileIndex];
  if (st && (st.state === "planted" || st.state === "grown")) {
    const c = cropByEmoji(st.crop);
    return c ? c.level : "beginner";
  }
  if (level >= 5) return "advanced";
  if (level >= 3) return "intermediate";
  return "beginner";
}

const PET_DIALOGUES = {
  pig: [
    "Oink? Are those... premium carrots I smell?",
    "I was just passing through, but your farm looks delicious!",
    "If you want me to stay, you'll have to prove you're a top-tier farmer!"
  ],
  rabbit: [
    "*Twitches nose rapidly* You're fast, but I'm faster!",
    "I bet you can't even keep track of where I'll hop next.",
    "Show me you have the wits to match my speed!"
  ],
  dog: [
    "Woof! This place looks like it needs a good guardian.",
    "I've been looking for a pack. Do you have what it takes to be my leader?",
    "Answer this, and maybe I'll consider sticking around!"
  ],
  deer: [
    "The forest is quiet, but your farm is full of life...",
    "I usually avoid humans, but there's something different about you.",
    "Tell me, traveler... do you truly understand the nature of this land?"
  ],
  cat: [
    "Oh, it's you. I suppose this dirt is acceptable for lounging.",
    "Don't look so surprised. I go where the snacks are.",
    "If you want my respect, you'll need to answer a very specific question."
  ],
  snake: [
    "Sssss... a new face in the tall grassss.",
    "Your garden has many hiding sspots, very cozy.",
    "Let uss see if your mind is as sharp as my fangs."
  ],
  fox: [
    "Heh, I almost had those crops! You've got sharp eyes.",
    "The others say you're a clever one. Let's put that to the test, shall we?",
    "A little riddle for a little farm. Ready?"
  ],
  panda: [
    "Zzz... oh! Is it lunchtime already?",
    "I was looking for a nice bamboo thicket, but this looks peaceful too.",
    "I'll stay if you can help me remember something important..."
  ],
  lion: [
    "Roar! This territory... it has potential.",
    "A true king knows how to manage his domain. Do you?",
    "Prove your wisdom, and I might lend you my strength."
  ],
  tiger: [
    "I've been watching you from the shadows. You're persistent.",
    "A hunter respects a hard worker. But are you a smart worker?",
    "Let's see if you can handle a real challenge."
  ],
  alligator: [
    "Snap! This pond of yours is looking a bit crowded.",
    "I like the way you run things here. Very efficient.",
    "But can you handle the pressure of a real question?"
  ],
  dragon: [
    "Mortal, you've built quite a hoard of crops here.",
    "I haven't seen such dedication in a long time.",
    "Answer correctly, and I shall grace your ranch with my presence."
  ],
  wolf: [
    "The moon led me here. Your farm has a strange energy.",
    "I seek a master who is both strong and wise.",
    "Are you the one the legends spoke of?"
  ]
};

function onWildPetClicked() {
  if (tutorialIsActive()) return;
  if (!activeWildPet) return;

  activeWildPet.paused = true;
  activeWildPet.pauseStartedAt = Date.now();

  const type = activeWildPet.type;
  const dialogues = PET_DIALOGUES[type.id] || [
    `Hello there! I'm a ${type.name}.`,
    "Your farm looks wonderful!",
    "Let's see if we can be friends!"
  ];

  let currentStep = 0;

  function renderEncounter() {
    const isDialogue = currentStep < dialogues.length;
    const title = isDialogue ? `Encounter: ${type.name}` : `Capture ${type.name}!`;

    let content = "";
    if (isDialogue) {
      content = `
        <div class="encounterContainer">
          <div class="encounterSprite">${type.imagepath}</div>
          <div class="encounterSpeechBubble">
            <div class="speechText">"${dialogues[currentStep]}"</div>
            <div class="speechHint">Click to continue...</div>
          </div>
        </div>
      `;
    } else {
      const diff = getPetQuizDifficulty(activeWildPet.targetTileIndex);
      const q = pickQuestion(diff);
      let resolved = false;

      // We need to store the question temporarily to use it in the callback
      content = `
        <div class="encounterContainer">
          <div class="encounterSprite small">${type.imagepath}</div>
          <div class="encounterQuizBox">
            <div class="resLine">${type.name} is waiting for your answer...</div>
            <div class="smallNote">Correct = Capture • Wrong = Vanishes</div>
            <div id="petQ"></div>
            <div id="petFB" class="quizFeedback"></div>
          </div>
        </div>
      `;

      // Update modal first then render question
      openModal(title, content);
      renderQuestionUI(q, "petQ", (yourAnswer) => {
        if (resolved) return;
        resolved = true;
        questProgress("answer", 1);
        const fb = $("petFB");
        const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);

        if (!ok) {
          fb.className = "quizFeedback bad";
          fb.innerHTML = `Wrong! ${type.name} ran away.`;
          setTimeout(() => {
            despawnWildPet();
            closeModal();
            saveState();
            updateUI();
            renderFarm();
          }, 1000);
        } else {
          fb.className = "quizFeedback good";
          fb.innerHTML = `Correct! ${type.name} joined your Ranch! 🐾`;
          capturePet(type);
          questProgress("capture", 1);
          setTimeout(() => {
            despawnWildPet();
            closeModal();
            saveState();
            updateUI();
            renderFarm();
          }, 1200);
        }
      });
      return; // Exit early as we handled the modal update
    }

    openModal(title, content);

    // Add click listener to advance dialogue
    const modalContent = document.querySelector(".modal-content");
    // Some project use .modal-content or #modalContent, let's be safe and check both or use #modalBox
    const targetBox = document.querySelector(".modalBox") || modalContent;

    if (targetBox) {
      const advance = (e) => {
        // Only advance if clicking the dialogue or the overlay, not buttons if any were there
        currentStep++;
        targetBox.removeEventListener("click", advance);
        renderEncounter();
      };
      // Delay slightly so the click that opened the modal doesn't trigger it
      setTimeout(() => {
        targetBox.addEventListener("click", advance);
      }, 50);
    }
  }

  renderEncounter();
}