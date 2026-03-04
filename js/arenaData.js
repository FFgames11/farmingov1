/* =========================================================
   ARENA / PVP DATA (from Farmingo [PVP])
========================================================= */

// Cell table: universal scaling per level
const LEVEL_SCALING_TABLE = [
  ["Level", "ATK", "DEF", "SPEED"],
  ["Each level up", "+1", "+1", "+1"]
];


// Cell table: animal roster base stats
const ANIMAL_BASE_TABLE = [
  ["Animal", "Role", "ATK (Lv1)", "DEF (Lv1)", "SPEED (Lv1)"],
  ["Rabbit", "Speed hitter", "5", "3", "9"],
  ["Dog", "Balanced fighter", "6", "6", "6"],
  ["Deer", "Evasive support", "4", "5", "8"],
  ["Cat", "Crit trickster", "7", "4", "8"],
  ["Lion", "Heavy bruiser", "9", "7", "4"],
  ["Panda", "Tank healer", "5", "9", "3"],
  ["Fox", "Debuff controller", "6", "4", "9"],
  ["Alligator", "Armor shredder", "8", "6", "5"]
];


// Cell table: per-level stats (Lv1-Lv5)
const ANIMAL_LEVEL_TABLE = [
  ["Animal", "Level", "ATK", "DEF", "SPEED"],
  ["Rabbit", "Lv1", "5", "3", "9"],
  ["Rabbit", "Lv2", "6", "4", "10"],
  ["Rabbit", "Lv3", "7", "5", "11"],
  ["Rabbit", "Lv4", "8", "6", "12"],
  ["Rabbit", "Lv5", "9", "7", "13"],
  ["Dog", "Lv1", "6", "6", "6"],
  ["Dog", "Lv2", "7", "7", "7"],
  ["Dog", "Lv3", "8", "8", "8"],
  ["Dog", "Lv4", "9", "9", "9"],
  ["Dog", "Lv5", "10", "10", "10"],
  ["Deer", "Lv1", "4", "5", "8"],
  ["Deer", "Lv2", "5", "6", "9"],
  ["Deer", "Lv3", "6", "7", "10"],
  ["Deer", "Lv4", "7", "8", "11"],
  ["Deer", "Lv5", "8", "9", "12"],
  ["Cat", "Lv1", "7", "4", "8"],
  ["Cat", "Lv2", "8", "5", "9"],
  ["Cat", "Lv3", "9", "6", "10"],
  ["Cat", "Lv4", "10", "7", "11"],
  ["Cat", "Lv5", "11", "8", "12"],
  ["Lion", "Lv1", "9", "7", "4"],
  ["Lion", "Lv2", "10", "8", "5"],
  ["Lion", "Lv3", "11", "9", "6"],
  ["Lion", "Lv4", "12", "10", "7"],
  ["Lion", "Lv5", "13", "11", "8"],
  ["Panda", "Lv1", "5", "9", "3"],
  ["Panda", "Lv2", "6", "10", "4"],
  ["Panda", "Lv3", "7", "11", "5"],
  ["Panda", "Lv4", "8", "12", "6"],
  ["Panda", "Lv5", "9", "13", "7"],
  ["Fox", "Lv1", "6", "4", "9"],
  ["Fox", "Lv2", "7", "5", "10"],
  ["Fox", "Lv3", "8", "6", "11"],
  ["Fox", "Lv4", "9", "7", "12"],
  ["Fox", "Lv5", "10", "8", "13"],
  ["Alligator", "Lv1", "8", "6", "5"],
  ["Alligator", "Lv2", "9", "7", "6"],
  ["Alligator", "Lv3", "10", "8", "7"],
  ["Alligator", "Lv4", "11", "9", "8"],
  ["Alligator", "Lv5", "12", "10", "9"]
];


const BATTLE_ANIMALS = {
  "pig": {
    "name": "Pig",
    "emoji": "🐷",
    "imagepath": '<img src="images/pig.png" alt="pig">',
    "headimage": '<img src="images/pighead.png" alt="pig">',
    "rarity": "Starter",
    "base": {
      "atk": 5,
      "def": 5,
      "spd": 5
    },
    "skills":
    {
      "attack":
      {
        "name": "Tackle",
        "power": 5
      },
      "buff":
      {
        "name": "Mud Bath",
        "desc": "Heal 5"
      },
      "ultimate": {
        "name":
          "Oink Blast",
        "power": 8
      }
    }
  },
  "rabbit": {
    "name": "Rabbit",
    "emoji": "🐰",
    "imagepath": '<img src="images/rabbit.png" alt="rabbit">',
    "headimage": '<img src="images/rabbithead.png" alt="rabbit">',
    "rarity": "Common",
    "base": {
      "atk": 5,
      "def": 3,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Quick Kick",
        "power": 5,
        "desc": "If Rabbit acts first this round, deal +2 extra damage."
      },
      "buff": {
        "name": "Burst Step",
        "desc": "+3 SPEED for 2 turns. Next attack gains +1 SkillPower."
      },
      "ultimate": {
        "name": "Lightning Combo",
        "power": 3,
        "desc": "3 hits. Each hit uses SkillPower 3."
      }
    }
  },
  "dog": {
    "name": "Dog",
    "emoji": "🐶",
    "imagepath": '<img src="images/dog.png" alt="dog">',
    "headimage": '<img src="images/doghead.png" alt="dog">',
    "rarity": "Common",
    "base": {
      "atk": 6,
      "def": 6,
      "spd": 6
    },
    "skills": {
      "attack": {
        "name": "Bite",
        "power": 6,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Guard Stance",
        "desc": "+3 DEF for 2 turns. Reduce next incoming damage by 2."
      },
      "ultimate": {
        "name": "Loyal Rush",
        "power": 9,
        "desc": "If Dog is below 50% HP, heal 3."
      }
    }
  },
  "deer": {
    "name": "Deer",
    "emoji": "🦌",
    "imagepath": '<img src="images/deer.png" alt="deer">',
    "headimage": '<img src="images/deerhead.png" alt="deer">',
    "rarity": "Uncommon",
    "base": {
      "atk": 4,
      "def": 5,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Antler Jab",
        "power": 5,
        "desc": "30% chance: enemy SPEED -2 for 1 turn."
      },
      "buff": {
        "name": "Calm Breath",
        "desc": "Heal 4. Gain +2 DEF for 1 turn."
      },
      "ultimate": {
        "name": "Forest Grace",
        "power": 0,
        "desc": "Heal 7. Gain evasion for 1 turn (next hit deals 0)."
      }
    }
  },
  "cat": {
    "name": "Cat",
    "emoji": "🐱",
    "imagepath": '<img src="images/cat.png" alt="cat">',
    "headimage": '<img src="images/cathead.png" alt="cat">',
    "rarity": "Uncommon",
    "base": {
      "atk": 7,
      "def": 4,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Claw Swipe",
        "power": 5,
        "desc": "25% crit chance. Crit adds +4 damage."
      },
      "buff": {
        "name": "Pounce Setup",
        "desc": "Next attack gains +3 SkillPower and ignores 2 DEF."
      },
      "ultimate": {
        "name": "Nine-Lives Trick",
        "power": 8,
        "desc": "If Cat would be KO'd in the next 2 turns, survive once at 1 HP."
      }
    }
  },
  "lion": {
    "name": "Lion",
    "emoji": "🦁",
    "imagepath": '<img src="images/lion.png" alt="lion">',
    "headimage": '<img src="images/lionhead.png" alt="lion">',
    "rarity": "Epic",
    "base": {
      "atk": 9,
      "def": 7,
      "spd": 4
    },
    "skills": {
      "attack": {
        "name": "Heavy Slash",
        "power": 7,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Roar",
        "desc": "+3 ATK for 2 turns. Enemy ATK -2 for 1 turn."
      },
      "ultimate": {
        "name": "King's Verdict",
        "power": 10,
        "desc": "If enemy has any debuff, deal +4 extra damage."
      }
    }
  },
  "tiger": {
    "name": "Tiger",
    "emoji": "🐯",
    "imagepath": '<img src="images/tiger.png" alt="tiger">',
    "headimage": '<img src="images/tigerhead.png" alt="tiger">',
    "rarity": "Epic",
    "base": {
      "atk": 9,
      "def": 6,
      "spd": 6
    },
    "skills": {
      "attack": {
        "name": "Stripe Strike",
        "power": 7,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Focus",
        "desc": "+4 ATK for 2 turns."
      },
      "ultimate": {
        "name": "Tiger Rush",
        "power": 11,
        "desc": "High damage attack."
      }
    }
  },
  "panda": {
    "name": "Panda",
    "emoji": "🐼",
    "imagepath": '<img src="images/panda.png" alt="panda">',
    "headimage": '<img src="images/pandahead.png" alt="panda">',
    "rarity": "Rare",
    "base": {
      "atk": 5,
      "def": 9,
      "spd": 3
    },
    "skills": {
      "attack": {
        "name": "Palm Strike",
        "power": 5,
        "desc": "Gain +1 DEF permanently this fight (max +3)."
      },
      "buff": {
        "name": "Bamboo Snack",
        "desc": "Heal 5. Gain +2 DEF for 2 turns."
      },
      "ultimate": {
        "name": "Soft But Strong",
        "power": 6,
        "desc": "Deal damage. Reduce damage taken by 3 for 2 turns."
      }
    }
  },
  "fox": {
    "name": "Fox",
    "emoji": "🦊",
    "imagepath": '<img src="images/fox.png" alt="fox">',
    "headimage": '<img src="images/foxhead.png" alt="fox">',
    "rarity": "Rare",
    "base": {
      "atk": 6,
      "def": 4,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Sneak Fang",
        "power": 5,
        "desc": "Apply Hex: enemy DEF -2 for 2 turns."
      },
      "buff": {
        "name": "Illusion Veil",
        "desc": "+2 SPEED for 2 turns. Gain 20% dodge for 1 turn."
      },
      "ultimate": {
        "name": "Mind Game",
        "power": 8,
        "desc": "Steal 2 ATK or 2 DEF (whichever is higher) for 2 turns."
      }
    }
  },
  "alligator": {
    "name": "Alligator",
    "emoji": "🐊",
    "imagepath": '<img src="images/alligator.png" alt="alligator">',
    "headimage": '<img src="images/alligatorhead.png" alt="alligator">',
    "rarity": "Epic",
    "base": {
      "atk": 8,
      "def": 6,
      "spd": 5
    },
    "skills": {
      "attack": {
        "name": "Chomp",
        "power": 6,
        "desc": "If enemy DEF \u2265 6, deal +2 extra damage."
      },
      "buff": {
        "name": "Iron Hide",
        "desc": "+4 DEF for 2 turns. SPEED -1 for 2 turns."
      },
      "ultimate": {
        "name": "Death Roll",
        "power": 9,
        "desc": "Enemy DEF -4 for 2 turns. If enemy already has a debuff, stun for 1 turn."
      }
    }
  },
  "dragon": {
    "name": "Dragon",
    "emoji": "🐉",
    "imagepath": '<img src="images/dragon.png" alt="dragon">',
    "headimage": '<img src="images/dragonhead.png" alt="dragon">',
    "rarity": "Legendary",
    "base": {
      "atk": 12,
      "def": 10,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Flame Breath",
        "power": 10,
        "desc": "High damage."
      },
      "buff": {
        "name": "Dragon Soul",
        "desc": "Boost all stats."
      },
      "ultimate": {
        "name": "Cataclysm",
        "power": 15,
        "desc": "Extreme damage."
      }
    }
  },
  "wolf": {
    "name": "Wolf",
    "emoji": "🐺",
    "imagepath": '<img src="images/wolf.png" alt="wolf">',
    "headimage": '<img src="images/wolfhead.png" alt="wolf">',
    "rarity": "Legendary",
    "base": {
      "atk": 10,
      "def": 8,
      "spd": 10
    },
    "skills": {
      "attack": {
        "name": "Howl Attack",
        "power": 8,
        "desc": "High speed attack."
      },
      "buff": {
        "name": "Pack Leader",
        "desc": "Boost ATK and SPD."
      },
      "ultimate": {
        "name": "Moon Slash",
        "power": 14,
        "desc": "High damage."
      }
    }
  }
};

// Stat scaling (Lv2 = Lv1 +1/1/1, etc.)
function battleStats(animalId, level = 1) {
  const meta = BATTLE_ANIMALS[animalId];
  const lv = clamp(parseInt(level || 1, 10) || 1, 1, 10);
  if (!meta) return { atk: 1, def: 1, spd: 1 };
  const add = lv - 1;
  return { atk: meta.base.atk + add, def: meta.base.def + add, spd: meta.base.spd + add };
}

// Optional HP extension (makes healing meaningful)
function battleHpMax(level) {
  const lv = clamp(parseInt(level || 1, 10) || 1, 1, 10);
  return 30 + (lv - 1) * 5;
}

function combinePet(uidToUpgrade) {
  const idxA = zooPets.findIndex(p => p.uid === uidToUpgrade);
  if (idxA < 0) return;
  const a = zooPets[idxA];
  if (!a.animalId) { showToast("This pet can't be combined.", 1200); return; }
  const lv = clamp(parseInt(a.level || 1, 10) || 1, 1, 10);
  if (lv >= 10) { showToast("Already max level.", 1200); return; }

  const idxB = zooPets.findIndex((p, i) => i !== idxA && p.animalId === a.animalId && clamp(parseInt(p.level || 1, 10) || 1, 1, 10) === lv);
  if (idxB < 0) {
    showToast("Need a duplicate of the same level.", 1400);
    return;
  }

  // Remove both (remove larger index first)
  const rem = [idxA, idxB].sort((x, y) => y - x);
  for (const r of rem) zooPets.splice(r, 1);

  const meta = BATTLE_ANIMALS[a.animalId];
  const nextLv = Math.min(10, lv + 1);
  const upgraded = {
    uid: uid(),
    typeId: a.animalId,
    animalId: a.animalId,
    level: nextLv,
    emoji: meta.emoji,
    imagepath: meta.imagepath,
    name: meta.name,
    rarity: meta.rarity
  };
  zooPets.unshift(upgraded);

  saveState();
  updateUI();
  if (activeScreen === "zoo") requestAnimationFrame(() => renderZooRoamingPets());

  showToast(`${meta.name} upgraded to Lv${nextLv}!`, 1400);
  openPetDetails(upgraded.uid);
}


/* =========================================================
   ARENA (PVP) \u2014 1v1 Card Battle
========================================================= */

let arenaDraft = null;
let arenaBattle = null;

function listBattlePets() {
  return (zooPets || []).filter(p => p && p.animalId && BATTLE_ANIMALS[p.animalId]);
}

function openArena() {
  const pets = listBattlePets();
  const hasPets = pets.length > 0;

  openModal("Arena", `
    <div class="resLine">1v1 turn-based battles using your Zoo animals.</div>
    <div class="smallNote" style="text-align:left;">
      Pick one animal,  then use Attack/Buff/Ultimate cards. Ultimate charges from actions and taking damage.
    </div>

    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;font-weight:900;" ${hasPets ? "" : "disabled"} onclick="startArenaFlow('ai')">Practice (vs AI)</button>
      <button style="flex:1;font-weight:900;" ${hasPets ? "" : "disabled"} onclick="startArenaFlow('local')">Local PvP (2P)</button>
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;">
      <button style="flex:1;" onclick="openBattleGuide()">Battle Guide</button>
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>

    ${!hasPets ? `<div class="smallNote" style="text-align:left;margin-top:10px;">Capture animals on the farm first (answer pet questions) to use Arena.</div>` : ""}
  `);
}

function startArenaFlow(mode) {
  arenaDraft = { mode, p1: null, p2: null, quizOn: true };
  openArenaPetSelect("p1");
}

function openArenaPetSelect(side) {
  const pets = listBattlePets();
  if (!pets.length) {
    openArena();
    return;
  }

  const cards = pets.map(p => {
    const lvl = clamp(parseInt(p.level || 1, 10) || 1, 1, 10);
    const meta = BATTLE_ANIMALS[p.animalId];
    const st = battleStats(p.animalId, lvl);
    return `
      <div class="speciesPetRow" style="cursor:pointer;" onclick="selectArenaPet('${side}','${p.uid}')">
        <div class="speciesPetImg">${meta.headimage}
          <div class="petNameandLevel">
            <span class="petLabel" data-title="${escapeHtml(meta.name)}">${escapeHtml(meta.name)}</span>
            <span class="petLvl" data-title="Lv ${lvl}">Lv ${lvl}</span>
          </div>
        </div>
        <div class="speciesPetInfo">
          <div class="statInfo"><span data-title="ATK ${st.atk}">ATK ${st.atk}</span> <img src="images/statbar.png" alt="stat bar"></div>
          <div class="statInfo"><span data-title="DEF ${st.def}">DEF ${st.def}</span> <img src="images/statbar.png" alt="stat bar"></div>
          <div class="statInfo"><span data-title="SPD ${st.spd}">SPD ${st.spd}</span> <img src="images/statbar.png" alt="stat bar"></div>
        </div>
      </div>
    `;
  }).join("");

  const title = (side === "p1") ? "Select your animal" : "Select opponent animal";

  openModal(title, `
    <div class="petSelectionContent">
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <button style="flex:1;" onclick="toggleArenaQuiz()">${(arenaDraft && arenaDraft.quizOn) ? "Quiz: ON \u2705" : "Quiz: OFF"}</button>
        <button style="flex:1;" onclick="openArena()">Back</button>
      </div>
      <div style="display:flex;flex-direction:row;gap:6px;flex-wrap:wrap;justify-content:center;">
        ${cards}
      </div>
    </div>
  `);
}

function toggleArenaQuiz() {
  if (!arenaDraft) return;
  arenaDraft.quizOn = !arenaDraft.quizOn;
  // rerender current selection
  if (!arenaDraft.p1) openArenaPetSelect("p1");
  else if (arenaDraft.mode === "local" && !arenaDraft.p2) openArenaPetSelect("p2");
  else openArena();
}

function selectArenaPet(side, uid) {
  const pet = zooPets.find(p => p.uid === uid);
  if (!pet || !pet.animalId || !BATTLE_ANIMALS[pet.animalId]) return;

  if (side === "p1") {
    arenaDraft.p1 = uid;
    if (arenaDraft.mode === "local") {
      openArenaPetSelect("p2");
    } else {
      arenaDraft.p2 = pickAiOpponent(pet.level || 1);
      startArenaBattle();
    }
    return;
  }

  arenaDraft.p2 = uid;
  startArenaBattle();
}

function pickAiOpponent(level) {
  const ids = Object.keys(BATTLE_ANIMALS);
  const animalId = ids[Math.floor(Math.random() * ids.length)];
  // small level variance
  const delta = (Math.random() < 0.5) ? 0 : (Math.random() < 0.5 ? 1 : -1);
  const lv = clamp((parseInt(level || 1, 10) || 1) + delta, 1, 5);
  return { ai: true, uid: "ai_" + uid(), animalId, level: lv };
}

function buildCombatantFrom(source, sideLabel) {
  // AI source is object, player source is pet uid
  if (source && typeof source === "object" && source.ai) {
    const meta = BATTLE_ANIMALS[source.animalId];
    const lv = clamp(parseInt(source.level || 1, 10) || 1, 1, 5);
    return {
      side: sideLabel,
      control: "ai",
      animalId: source.animalId,
      name: meta.name,
      emoji: meta.emoji,
      rarity: meta.rarity,
      level: lv,
      hpMax: battleHpMax(lv),
      hp: battleHpMax(lv),
      charge: 0,
      permDefBonus: 0,
      statuses: [],
      temp: {}
    };
  }

  const pet = zooPets.find(p => p.uid === source);
  const meta = BATTLE_ANIMALS[pet.animalId];
  const lv = clamp(parseInt(pet.level || 1, 10) || 1, 1, 5);

  return {
    side: sideLabel,
    control: "human",
    petUid: pet.uid,
    animalId: pet.animalId,
    name: meta.name,
    emoji: meta.emoji,
    rarity: meta.rarity,
    level: lv,
    hpMax: battleHpMax(lv),
    hp: battleHpMax(lv),
    charge: 0,
    permDefBonus: 0,
    statuses: [],
    temp: {}
  };
}

function startArenaBattle() {
  const mode = arenaDraft.mode;
  const quizOn = arenaDraft.quizOn;

  const p1 = buildCombatantFrom(arenaDraft.p1, "p1");
  const p2 = buildCombatantFrom(arenaDraft.p2, "p2");
  p2.control = (mode === "local") ? "human" : "ai";

  arenaBattle = {
    mode,
    quizOn,
    round: 1,
    order: [],
    idx: 0,
    p1,
    p2,
    log: [],
    active: true,
    waiting: false
  };

  closeModal();
  showArenaScreen(); // opens the new full screen with loading
}

function getCombatant(side) {
  return (side === "p1") ? arenaBattle.p1 : arenaBattle.p2;
}
function otherSide(side) { return (side === "p1") ? "p2" : "p1"; }
function currentArenaSide() { return arenaBattle.order[arenaBattle.idx]; }

function addArenaLog(line) {
  if (!arenaBattle) return;
  arenaBattle.log.unshift(line);
  arenaBattle.log = arenaBattle.log.slice(0, 18);
}

function getEffStats(c) {
  const base = battleStats(c.animalId, c.level);
  let atk = base.atk;
  let def = base.def + (c.permDefBonus || 0);
  let spd = base.spd;

  for (const st of c.statuses) {
    if (st.kind === "stat") {
      atk += (st.atk || 0);
      def += (st.def || 0);
      spd += (st.spd || 0);
    }
  }
  return { atk, def, spd };
}

function hasDebuff(c) {
  for (const st of c.statuses) {
    if (st.kind === "stun") return true;
    if (st.kind === "stat" && ((st.atk || 0) < 0 || (st.def || 0) < 0 || (st.spd || 0) < 0)) return true;
  }
  return false;
}

function startNewArenaRound(first = false) {
  if (!arenaBattle || !arenaBattle.active) return;
  const b = arenaBattle;

  const s1 = getEffStats(b.p1).spd;
  const s2 = getEffStats(b.p2).spd;

  if (s1 > s2) b.order = ["p1", "p2"];
  else if (s2 > s1) b.order = ["p2", "p1"];
  else b.order = (Math.random() < 0.5) ? ["p1", "p2"] : ["p2", "p1"];

  b.idx = 0;
  if (!first) b.round += 1;

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function renderArenaBattle() {
  const b = arenaBattle;
  if (!b) return;
  // If the arena screen is active, update it there
  if ($("arenaScreen") && $("arenaScreen").style.display !== "none") {
    arenaScreenRender();
    return;
  }
  // Fallback: old modal path (battle ended display)
  if (!b.active) {
    const winner = b.log[0] || "";
    showMessage("Battle Over", `<div class="resLine">${escapeHtml(winner)}</div><div style="margin-top:10px;"><button onclick="hideArenaScreen();openArena()">Back to Arena</button></div>`);
  }
}

function renderArenaStatusBadges(c) {
  if (!arenaBattle) return "";
  const tags = [];
  for (const st of c.statuses) {
    if (st.kind === "stat") {
      const parts = [];
      if (st.atk) parts.push(`${st.atk > 0 ? "+" : ""}${st.atk}ATK`);
      if (st.def) parts.push(`${st.def > 0 ? "+" : ""}${st.def}DEF`);
      if (st.spd) parts.push(`${st.spd > 0 ? "+" : ""}${st.spd}SPD`);
      tags.push(`${parts.join(" ")}(${st.turns})`);
    } else if (st.kind === "dodge") {
      tags.push(`Dodge ${Math.round((st.pct || 0) * 100)}%(${st.turns})`);
    } else if (st.kind === "dmgReduce") {
      tags.push(`DR-${st.amount}(${st.turns})`);
    } else if (st.kind === "guard") {
      tags.push(`Guard-${st.amount}(${st.turns})`);
    } else if (st.kind === "evasion") {
      tags.push(`Evasion(${st.turns})`);
    } else if (st.kind === "stun") {
      tags.push(`Stun(${st.turns})`);
    } else if (st.kind === "nextAtk") {
      tags.push(`NextAtk +${st.power || 0} / ignore ${st.ignore || 0}(${st.turns})`);
    } else if (st.kind === "cheatDeath") {
      tags.push(`NineLives(${st.turns})`);
    }
  }
  if (c.permDefBonus) tags.push(`+${c.permDefBonus}DEF(perma)`);
  if (!tags.length) return `<div class="badge">${c.side.toUpperCase()}: \u2014</div>`;
  return `<div class="badge">${c.side.toUpperCase()}: ${escapeHtml(tags.join(" \u2022 "))}</div>`;
}

function toggleArenaQuizMid() {
  if (!arenaBattle) return;
  arenaBattle.quizOn = !arenaBattle.quizOn;
  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function arenaUseSkill(kind) {
  const b = arenaBattle;
  if (!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  if (actor.control !== "human") return;

  // Stun skip
  if (hasStatus(actor, "stun")) {
    addArenaLog(`${actor.name} is stunned!`);
    consumeStatus(actor, "stun", 1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  if (kind === "ultimate" && actor.charge < 100) {
    showToast("Ultimate not ready!");
    return;
  }

  if (!b.quizOn) {
    resolveArenaSkill(kind);
    return;
  }

  // Quiz path
  b.waiting = true;
  const diff = (actor.level >= 4) ? "advanced" : (actor.level >= 2 ? "intermediate" : "beginner");
  const q = pickQuestion(diff);

  renderArenaBattle(); // update UI to show waiting
  openArenaQuiz(q, (correct) => {
    b.waiting = false;
    if (correct) {
      addArenaLog(`${actor.name} answered correctly!`);
      resolveArenaSkill(kind);
    } else {
      addArenaLog(`${actor.name} failed the quiz.`);
      tickStatusesEndTurn(actor);
      endArenaTurn();
    }
  });
}

function resolveArenaSkill(kind) {
  const b = arenaBattle;
  if (!b) return;
  const side = currentArenaSide();
  const actor = getCombatant(side);
  const foe = getCombatant(otherSide(side));

  if (kind === "attack") doArenaAttack(actor, foe);
  else if (kind === "buff") doArenaBuff(actor, foe);
  else if (kind === "ultimate") {
    doArenaUltimate(actor, foe);
    actor.charge = 0;
  }

  // check win
  if (foe.hp <= 0) {
    foe.hp = 0;
    endArenaBattle(false, side);
    return;
  }

  tickStatusesEndTurn(actor);
  endArenaTurn();
}

function doArenaAttack(actor, foe) {
  const meta = BATTLE_ANIMALS[actor.animalId];
  const pwr = meta.skills.attack.power;
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  const dmg = calcBaseDamage(pwr, a.atk, f.def);
  const dealt = applyDamage(actor, foe, dmg);

  addArenaLog(`${actor.name} used ${meta.skills.attack.name} (${dealt} dmg).`);
  actor.charge = Math.min(100, actor.charge + 25);
}

function doArenaBuff(actor, foe) {
  const id = actor.animalId;
  actor.charge = Math.min(100, actor.charge + 20);

  if (id === "pig") {
    actor.hp = Math.min(actor.hpMax, actor.hp + 5);
    addArenaLog(`${actor.name} used Mud Bath (+5 HP).`);
  }
  else if (id === "rabbit") {
    addStatus(actor, { kind: "stat", spd: +3, turns: 2 });
    addStatus(actor, { kind: "nextAtk", power: +1, turns: 2 });
    addArenaLog(`${actor.name} used Burst Step.`);
  }
  else if (id === "dog") {
    addStatus(actor, { kind: "stat", def: +3, turns: 2 });
    addStatus(actor, { kind: "guard", amount: 2, turns: 2 });
    addArenaLog(`${actor.name} used Guard Stance.`);
  }
  else if (id === "deer") {
    actor.hp = Math.min(actor.hpMax, actor.hp + 4);
    addStatus(actor, { kind: "stat", def: +2, turns: 1 });
    addArenaLog(`${actor.name} used Calm Breath (+HP).`);
  }
  else if (id === "cat") {
    addStatus(actor, { kind: "nextAtk", power: +3, ignore: 2, turns: 2 });
    addArenaLog(`${actor.name} used Pounce Setup.`);
  }
  else if (id === "lion") {
    addStatus(actor, { kind: "stat", atk: +3, turns: 2 });
    addStatus(foe, { kind: "stat", atk: -2, turns: 1 });
    addArenaLog(`${actor.name} used Roar.`);
  }
  else if (id === "tiger") {
    addStatus(actor, { kind: "stat", atk: +4, turns: 2 });
    addArenaLog(`${actor.name} used Focus.`);
  }
  else if (id === "panda") {
    actor.hp = Math.min(actor.hpMax, actor.hp + 5);
    addStatus(actor, { kind: "stat", def: +2, turns: 2 });
    addArenaLog(`${actor.name} used Bamboo Snack (+HP).`);
  }
  else if (id === "fox") {
    addStatus(actor, { kind: "stat", spd: +2, turns: 2 });
    addStatus(actor, { kind: "dodge", pct: 0.20, turns: 1 });
    addArenaLog(`${actor.name} used Illusion Veil.`);
  }
  else if (id === "alligator") {
    addStatus(actor, { kind: "stat", def: +4, turns: 2 });
    addStatus(actor, { kind: "stat", spd: -1, turns: 2 });
    addArenaLog(`${actor.name} used Iron Hide.`);
  }
  else if (id === "dragon") {
    addStatus(actor, { kind: "stat", atk: +2, def: +2, spd: +2, turns: 3 });
    addArenaLog(`${actor.name} used Dragon Soul.`);
  }
  else if (id === "wolf") {
    addStatus(actor, { kind: "stat", atk: +3, spd: +3, turns: 2 });
    addArenaLog(`${actor.name} used Pack Leader.`);
  }
}

function doArenaUltimate(actor, foe) {
  const id = actor.animalId;
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  if (id === "rabbit") {
    addArenaLog(`${actor.name} used Lightning Combo!`);
    for (let i = 0; i < 3; i++) {
      const dmg = calcBaseDamage(3, a.atk, f.def);
      applyDamage(actor, foe, dmg);
      if (foe.hp <= 0) break;
    }
  }
  else if (id === "dog") {
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Loyal Rush! (${dealt} dmg)`);
    if (actor.hp < (actor.hpMax / 2)) {
      actor.hp = Math.min(actor.hpMax, actor.hp + 3);
      addArenaLog(`${actor.name} healed 3.`);
    }
  }
  else if (id === "deer") {
    actor.hp = Math.min(actor.hpMax, actor.hp + 7);
    addStatus(actor, { kind: "evasion", turns: 1 });
    addArenaLog(`${actor.name} used Forest Grace (+HP +Evasion).`);
  }
  else if (id === "cat") {
    const dmg = calcBaseDamage(8, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind: "cheatDeath", turns: 2, used: false });
    addArenaLog(`${actor.name} used Nine-Lives Trick! (${dealt} dmg)`);
  }
  else if (id === "lion") {
    let dmg = calcBaseDamage(10, a.atk, f.def);
    if (hasDebuff(foe)) dmg += 4;
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used King's Verdict! (${dealt} dmg)`);
  }
  else if (id === "tiger") {
    const dmg = calcBaseDamage(11, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Tiger Rush! (${dealt} dmg)`);
  }
  else if (id === "panda") {
    const dmg = calcBaseDamage(6, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind: "dmgReduce", amount: 3, turns: 2 });
    addArenaLog(`${actor.name} used Soft But Strong! (${dealt} dmg)`);
  }
  else if (id === "fox") {
    // Steal higher stat for 2 turns, then hit
    const statToSteal = (f.def > f.atk) ? "def" : "atk";
    if (statToSteal === "atk") {
      addStatus(actor, { kind: "stat", atk: +2, turns: 2 });
      addStatus(foe, { kind: "stat", atk: -2, turns: 2 });
      addArenaLog(`${actor.name} stole 2 ATK for 2 turns!`);
    } else {
      addStatus(actor, { kind: "stat", def: +2, turns: 2 });
      addStatus(foe, { kind: "stat", def: -2, turns: 2 });
      addArenaLog(`${actor.name} stole 2 DEF for 2 turns!`);
    }
    const a2 = getEffStats(actor);
    const f2 = getEffStats(foe);
    const dmg = calcBaseDamage(8, a2.atk, f2.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Mind Game! (${dealt} dmg)`);
  }
  else if (id === "alligator") {
    const alreadyDebuffed = hasDebuff(foe);
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(foe, { kind: "stat", def: -4, turns: 2 });
    if (alreadyDebuffed) {
      addStatus(foe, { kind: "stun", turns: 1 });
      addArenaLog(`${foe.name} is stunned!`);
    }
    addArenaLog(`${actor.name} used Death Roll! (${dealt} dmg)`);
  }
  else if (id === "dragon") {
    const dmg = calcBaseDamage(15, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Cataclysm! (${dealt} dmg)`);
  }
  else if (id === "wolf") {
    const dmg = calcBaseDamage(14, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Moon Slash! (${dealt} dmg)`);
  }
}

function endArenaTurn() {
  const b = arenaBattle;
  if (!b || !b.active) return;

  b.idx += 1;
  if (b.idx >= 2) {
    // new round
    b.p1.temp = {};
    b.p2.temp = {};
    startNewArenaRound(false);
    return;
  }

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function handleArenaAutoIfNeeded() {
  const b = arenaBattle;
  if (!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  if (actor.control !== "ai") return;

  setTimeout(() => {
    if (!arenaBattle || !arenaBattle.active) return;
    const s = currentArenaSide();
    const a = getCombatant(s);
    if (a.control !== "ai") return;

    // Stun skip
    if (hasStatus(a, "stun")) {
      addArenaLog(`${a.name} is stunned and loses the turn!`);
      consumeStatus(a, "stun", 1);
      tickStatusesEndTurn(a);
      endArenaTurn();
      return;
    }

    const hpPct = a.hp / a.hpMax;

    if (a.charge >= 100) {
      resolveArenaSkill("ultimate");
      return;
    }

    // Prefer buff when low,  sometimes buff otherwise
    if (hpPct < 0.55 && Math.random() < 0.70) resolveArenaSkill("buff");
    else if (Math.random() < 0.18) resolveArenaSkill("buff");
    else resolveArenaSkill("attack");
  }, 650);
}

function endArenaBattle(exitOnly = false, winnerSide = null) {
  const b = arenaBattle;
  if (!b) return;

  if (exitOnly) {
    arenaBattle = null;
    hideArenaScreen();
    openArena();
    return;
  }

  b.active = false;

  if (winnerSide) {
    const winner = getCombatant(winnerSide);
    addArenaLog(`${winner.name} wins!`);

    // Rewards only for Practice vs AI when Player 1 wins
    if (b.mode === "ai" && winnerSide === "p1") {
      const reward = 35 + winner.level * 10;
      coins += reward;
      gainXP(20 + winner.level * 5);
      saveState();
      updateUI();
      addArenaLog(`You earned +${reward} coins.`);
    }
  }

  renderArenaBattle();
}

function openBattleGuide() {
  const scalingHead = LEVEL_SCALING_TABLE[0].map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const scalingBody = LEVEL_SCALING_TABLE.slice(1).map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const baseHead = ANIMAL_BASE_TABLE[0].map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const baseBody = ANIMAL_BASE_TABLE.slice(1).map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const lvlHead = ANIMAL_LEVEL_TABLE[0].map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const lvlBody = ANIMAL_LEVEL_TABLE.slice(1).map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const skillCards = Object.keys(BATTLE_ANIMALS).map(id => {
    const a = BATTLE_ANIMALS[id];
    const s = a.skills;
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${a.emoji}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(a.name)}</div>
            <div class="itemSub">Attack: <b>${escapeHtml(s.attack.name)}</b> \u2014 ${escapeHtml(s.attack.desc || "")}</div>
            <div class="itemSub">Buff: <b>${escapeHtml(s.buff.name)}</b> \u2014 ${escapeHtml(s.buff.desc || "")}</div>
            <div class="itemSub">Ultimate: <b>${escapeHtml(s.ultimate.name)}</b> \u2014 ${escapeHtml(s.ultimate.desc || "")}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  openModal("Battle Guide", `
    <div class="resLine">Damage: <b>max(1, SkillPower + ATK - DEF)</b></div>
    <div class="smallNote" style="text-align:left;">
      Ultimate charge: Attack +25, Buff +20, Taking damage +10. Use Ultimate at 100, then reset to 0.<br>
      Speed bonus: every 2 SPEED above opponent gives +5% dodge, cap 25%.<br>
      Combine duplicates in the Zoo: same animal + same level \u2192 +1 level (max Lv5).
    </div>

    <div class="sectionTitle">Cell tables</div>

    <div class="sectionTitle">Level scaling</div>
    <div style="overflow:auto;">
      <table class="guideTable">
        <thead><tr>${scalingHead}</tr></thead>
        <tbody>${scalingBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Roster base stats</div>
    <div style="overflow:auto;">
      <table class="guideTable">
        <thead><tr>${baseHead}</tr></thead>
        <tbody>${baseBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Per-level stats</div>
    <div style="overflow:auto;">
      <table class="guideTable guideTableSmall">
        <thead><tr>${lvlHead}</tr></thead>
        <tbody>${lvlBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Skills</div>
    <div class="modalGrid" style="margin-top:8px;">
      ${skillCards}
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;">
      <button style="flex:1;" onclick="openArena()">Back</button>
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>
  `);
}


// ensure global hook for HTML onclick
window.openArena = openArena;