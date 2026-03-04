/* =========================================================
   ARENA (PVP) — 1v1 Card Battle
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
          <div class="statInfo"><span data-title="ATK ${st.atk}">ATK ${st.atk}</span> <div class="statBarContainer"><div class="statBarFill atkBar statBarGrow" style="--target-width: ${Math.min(100, (st.atk / 20) * 100)}%"></div></div></div>
          <div class="statInfo"><span data-title="DEF ${st.def}">DEF ${st.def}</span> <div class="statBarContainer"><div class="statBarFill defBar statBarGrow" style="--target-width: ${Math.min(100, (st.def / 20) * 100)}%"></div></div></div>
          <div class="statInfo"><span data-title="SPD ${st.spd}">SPD ${st.spd}</span> <div class="statBarContainer"><div class="statBarFill spdBar statBarGrow" style="--target-width: ${Math.min(100, (st.spd / 20) * 100)}%"></div></div></div>
        </div>
      </div>
    `;
  }).join("");

  const title = (side === "p1") ? "Select your animal" : "Select opponent animal";

  openModal(title, `
    <div class="petSelectionContent">
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <button style="flex:1;" onclick="toggleArenaQuiz()">${(arenaDraft && arenaDraft.quizOn) ? "Quiz: ON ✅" : "Quiz: OFF"}</button>
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
  const lv = clamp((parseInt(level || 1, 10) || 1) + delta, 1, 10);
  return { ai: true, uid: "ai_" + uid(), animalId, level: lv };
}

function buildCombatantFrom(source, sideLabel) {
  // AI source is object, player source is pet uid
  if (source && typeof source === "object" && source.ai) {
    const meta = BATTLE_ANIMALS[source.animalId];
    const lv = clamp(parseInt(source.level || 1, 10) || 1, 1, 10);
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
  const lv = clamp(parseInt(pet.level || 1, 10) || 1, 1, 10);

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
  if (!tags.length) return `<div class="badge">${c.side.toUpperCase()}: —</div>`;
  return `<div class="badge">${c.side.toUpperCase()}: ${escapeHtml(tags.join(" • "))}</div>`;
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