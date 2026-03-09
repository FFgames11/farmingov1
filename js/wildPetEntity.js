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

const PET_ENCOUNTERS = {
  pig: {
    script: [
      { speaker: "animal", text: "Oink! Are those premium carrots?" },
      { speaker: "player", text: "I grow only the best for my friends!" },
      { speaker: "animal", text: "Friends? Prove you're a real farmer first!" }
    ],
    successText: "Delicious! I'm moving in!",
    failureText: "Those carrots look fake... I'm out of here!"
  },
  rabbit: {
    script: [
      { speaker: "animal", text: "*Twitches nose rapidly* You're fast, but I'm faster!" },
      { speaker: "player", text: "We'll see about that!" },
      { speaker: "animal", text: "Show me you have the wits to match my speed!" }
    ],
    successText: "You kept up! Let's be friends!",
    failureText: "Too slow! Catch me if you can!"
  },
  dog: {
    script: [
      { speaker: "animal", text: "Woof! This place looks like it needs a good guardian." },
      { speaker: "player", text: "I could always use some help around here." },
      { speaker: "animal", text: "Answer this, and maybe I'll consider sticking around!" }
    ],
    successText: "You're a great leader! I'll protect this farm!",
    failureText: "I'll find another pack. See ya!"
  },
  deer: {
    script: [
      { speaker: "animal", text: "The forest is quiet, but your farm is full of life..." },
      { speaker: "player", text: "You're welcome to stay if you like it." },
      { speaker: "animal", text: "Tell me, traveler... do you truly understand the nature of this land?" }
    ],
    successText: "Your wisdom is deep like the roots. I will stay.",
    failureText: "The wind calls me elsewhere..."
  },
  cat: {
    script: [
      { speaker: "animal", text: "Oh, it's you. I suppose this dirt is acceptable for lounging." },
      { speaker: "player", text: "You're too kind." },
      { speaker: "animal", text: "If you want my respect, you'll need to answer a very specific question." }
    ],
    successText: "Purr-fect. I'll take the sunny spot over there.",
    failureText: "How disappointing. Goodbye."
  },
  snake: {
    script: [
      { speaker: "animal", text: "Sssss... a new face in the tall grassss." },
      { speaker: "player", text: "Don't bite my crops!" },
      { speaker: "animal", text: "Let uss see if your mind is as sharp as my fangs." }
    ],
    successText: "Sssss-plendid answer. We are allies.",
    failureText: "Sssss... not quite. I slither away."
  },
  fox: {
    script: [
      { speaker: "animal", text: "Heh, I almost had those crops! You've got sharp eyes." },
      { speaker: "player", text: "Not today, sneaky fox!" },
      { speaker: "animal", text: "A little riddle for a little farm. Ready?" }
    ],
    successText: "You're clever! I'll stick around... for now.",
    failureText: "Too easy! Better luck next time!"
  },
  panda: {
    script: [
      { speaker: "animal", text: "Zzz... oh! Is it lunchtime already?" },
      { speaker: "player", text: "You were fast asleep!" },
      { speaker: "animal", text: "I'll stay if you can help me remember something important..." }
    ],
    successText: "Oh right! Now, back to sleep... *yawn*",
    failureText: "I forgot... I'm just going to roll away..."
  },
  lion: {
    script: [
      { speaker: "animal", text: "Roar! This territory... it has potential." },
      { speaker: "player", text: "Welcome to my farm!" },
      { speaker: "animal", text: "Prove your wisdom, and I might lend you my strength." }
    ],
    successText: "A worthy ally! I shall join you.",
    failureText: "You lack the courage. Farewell."
  },
  tiger: {
    script: [
      { speaker: "animal", text: "I've been watching you from the shadows. You're persistent." },
      { speaker: "player", text: "I work hard on my farm." },
      { speaker: "animal", text: "Let's see if you can handle a real challenge." }
    ],
    successText: "Impressive. You have my respect.",
    failureText: "A disappointment. Back to the jungle."
  },
  alligator: {
    script: [
      { speaker: "animal", text: "Snap! This pond of yours is looking a bit crowded." },
      { speaker: "player", text: "It's a very busy farm." },
      { speaker: "animal", text: "But can you handle the pressure of a real question?" }
    ],
    successText: "You've got guts. I like that.",
    failureText: "Not tough enough for the swamp!"
  },
  dragon: {
    script: [
      { speaker: "animal", text: "Mortal, you've built quite a hoard of crops here." },
      { speaker: "player", text: "It took a lot of work!" },
      { speaker: "animal", text: "Answer correctly, and I shall grace your ranch with my presence." }
    ],
    successText: "A brilliant mind! I shall stay and guard this hoard.",
    failureText: "Foolish mortal! I take my leave."
  },
  wolf: {
    script: [
      { speaker: "animal", text: "The moon led me here. Your farm has a strange energy." },
      { speaker: "player", text: "It's a peaceful place." },
      { speaker: "animal", text: "Are you the one the legends spoke of?" }
    ],
    successText: "You are worthy of the pack. I pledge my loyalty.",
    failureText: "The legends were wrong. *Howls*"
  }
};

function onWildPetClicked() {
  if (tutorialIsActive()) return;
  if (!activeWildPet) return;

  activeWildPet.paused = true;
  activeWildPet.pauseStartedAt = Date.now();

  const type = activeWildPet.type;
  
  let encounter = PET_ENCOUNTERS[type.id];
  if (!encounter) {
    encounter = {
      script: [
        { speaker: "animal", text: `Hello there! I'm a ${type.name}.` },
        { speaker: "player", text: "Your farm looks wonderful!" },
        { speaker: "animal", text: "Let's see if we can be friends!" }
      ],
      successText: "Yay! Let's be friends!",
      failureText: "Oh well, maybe next time!"
    };
  }

  let currentStep = 0;
  const scriptLen = encounter.script.length;

  function renderEncounter() {
    const isDialogue = currentStep < scriptLen;
    const title = isDialogue ? `Encounter: ${type.name}` : `Capture ${type.name}!`;

    let content = "";
    
    // Progress bar for the top of the modal content
    const totalSteps = scriptLen + 1; // Dialogues + 1 for Quiz
    const currentProgress = currentStep + 1;
    const pct = Math.floor((currentProgress / totalSteps) * 100);
    
    const progressHtml = `
      <div class="encounterProgressContainer">
        <div class="encounterProgressFill" style="width: ${pct}%;"></div>
      </div>
    `;

    if (isDialogue) {
      const line = encounter.script[currentStep];
      const isPlayer = line.speaker === "player";
      
      const avatarHtml = isPlayer 
        ? `<div class="encounterSprite small"><img src="images/profile.png" alt="Player"></div>` 
        : `<div class="encounterSprite small">${type.imagepath}</div>`;
        
      const bubbleClass = isPlayer ? "encounterSpeechBubble playerBubble" : "encounterSpeechBubble animalBubble";
      
      content = `
        ${progressHtml}
        <div class="encounterDialogueArea ${isPlayer ? 'playerTurn' : 'animalTurn'}">
          ${!isPlayer ? avatarHtml : ''}
          <div class="${bubbleClass}">
            <div class="speechText">"${line.text}"</div>
          </div>
          ${isPlayer ? avatarHtml : ''}
        </div>
        <button id="btnEncounterNext" class="encounterNextBtn">Next</button>
      `;
    } else {
      const diff = getPetQuizDifficulty(activeWildPet.targetTileIndex);
      const q = pickQuestion(diff);
      let resolved = false;

      content = `
        ${progressHtml}
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
          fb.innerHTML = `Wrong! ${encounter.failureText}`;
          setTimeout(() => {
            despawnWildPet();
            closeModal();
            saveState();
            updateUI();
            renderFarm();
          }, 1500);
        } else {
          fb.className = "quizFeedback good";
          fb.innerHTML = `Correct! ${encounter.successText} 🐾`;
          capturePet(type);
          questProgress("capture", 1);
          setTimeout(() => {
            despawnWildPet();
            closeModal();
            saveState();
            updateUI();
            renderFarm();
          }, 1500);
        }
      });
      return; // Exit early as we handled the modal update
    }

    openModal(title, content);

    if (isDialogue) {
      const nextBtn = document.getElementById("btnEncounterNext");
      const targetBox = document.querySelector(".modalBox") || document.querySelector(".modal-content");
      
      const advance = (e) => {
        e.stopPropagation();
        currentStep++;
        if (targetBox) targetBox.removeEventListener("click", advance);
        renderEncounter();
      };
      
      if (nextBtn) {
        nextBtn.onclick = advance;
      }
      
      if (targetBox) {
        setTimeout(() => {
          targetBox.addEventListener("click", advance);
        }, 50);
      }
    }
  }

  renderEncounter();
}