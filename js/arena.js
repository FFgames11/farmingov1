/* =========================================================
   ARENA (PVP) — 1v1 Card Battle
========================================================= */

let arenaDraft = null;
let arenaBattle = null;

function listBattlePets(){
  return (zooPets||[]).filter(p=>p && p.animalId && BATTLE_ANIMALS[p.animalId]);
}

function openArena(){
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

function startArenaFlow(mode){
  arenaDraft = { mode, p1:null, p2:null, quizOn:true };
  openArenaPetSelect("p1");
}

function openArenaPetSelect(side){
  const pets = listBattlePets();
  if(!pets.length){
    openArena();
    return;
  }

  const cards = pets.map(p=>{
    const lvl = clamp(parseInt(p.level||1,10)||1,1,5);
    const meta = BATTLE_ANIMALS[p.animalId];
    const st = battleStats(p.animalId, lvl);
    const hp = battleHpMax(lvl);
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${meta.imagepath}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(meta.name)} <span style="opacity:.65;">Lv${lvl}</span></div>
            <div class="itemSub">ATK ${st.atk} • DEF ${st.def} • SPD ${st.spd} • HP ${hp}</div>
            <div class="badgeRow">
              <div class="badge">${escapeHtml(meta.rarity)}</div>
              <div class="badge">UID ${escapeHtml(p.uid.slice(-6))}</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button onclick="selectArenaPet('${side}','${p.uid}')"><span><small data-title="Select">Select</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  const title = (side==="p1") ? "Select your animal" : "Select opponent animal";

  openModal(title, `
    <div class="petSelectionContent">
      <div class="smallNote" style="text-align:left;">
      Quiz Mode decides whether each action requires answering a question.
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button style="flex:1;" onclick="toggleArenaQuiz()">${arenaDraft?.quizOn ? "Quiz: ON" : "Quiz: OFF"}</button>
        <button style="flex:1;" onclick="openArena()">Back</button>
      </div>
      <div class="modalGrid" style="margin-top:10px;">
        ${cards}
      </div>
    </div>
  `);
}

function toggleArenaQuiz(){
  if(!arenaDraft) return;
  arenaDraft.quizOn = !arenaDraft.quizOn;
  // rerender current selection
  if(!arenaDraft.p1) openArenaPetSelect("p1");
  else if(arenaDraft.mode==="local" && !arenaDraft.p2) openArenaPetSelect("p2");
  else openArena();
}

function selectArenaPet(side, uid){
  const pet = zooPets.find(p=>p.uid===uid);
  if(!pet || !pet.animalId || !BATTLE_ANIMALS[pet.animalId]) return;

  if(side==="p1"){
    arenaDraft.p1 = uid;
    if(arenaDraft.mode==="local"){
      openArenaPetSelect("p2");
    }else{
      arenaDraft.p2 = pickAiOpponent(pet.level||1);
      startArenaBattle();
    }
    return;
  }

  arenaDraft.p2 = uid;
  startArenaBattle();
}

function pickAiOpponent(level){
  const ids = Object.keys(BATTLE_ANIMALS);
  const animalId = ids[Math.floor(Math.random()*ids.length)];
  // small level variance
  const delta = (Math.random()<0.5) ? 0 : (Math.random()<0.5 ? 1 : -1);
  const lv = clamp((parseInt(level||1,10)||1) + delta, 1, 5);
  return { ai:true, uid:"ai_"+uid(), animalId, level:lv };
}

function buildCombatantFrom(source, sideLabel){
  // AI source is object, player source is pet uid
  if(source && typeof source==="object" && source.ai){
    const meta = BATTLE_ANIMALS[source.animalId];
    const lv = clamp(parseInt(source.level||1,10)||1,1,5);
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

  const pet = zooPets.find(p=>p.uid===source);
  const meta = BATTLE_ANIMALS[pet.animalId];
  const lv = clamp(parseInt(pet.level||1,10)||1,1,5);

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

function startArenaBattle(){
  const mode = arenaDraft.mode;
  const quizOn = arenaDraft.quizOn;

  const p1 = buildCombatantFrom(arenaDraft.p1, "p1");
  const p2 = buildCombatantFrom(arenaDraft.p2, "p2");
  p2.control = (mode==="local") ? "human" : "ai";

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

function getCombatant(side){
  return (side==="p1") ? arenaBattle.p1 : arenaBattle.p2;
}
function otherSide(side){ return (side==="p1") ? "p2" : "p1"; }
function currentArenaSide(){ return arenaBattle.order[arenaBattle.idx]; }

function addArenaLog(line){
  if(!arenaBattle) return;
  arenaBattle.log.unshift(line);
  arenaBattle.log = arenaBattle.log.slice(0, 18);
}

function getEffStats(c){
  const base = battleStats(c.animalId, c.level);
  let atk = base.atk;
  let def = base.def + (c.permDefBonus||0);
  let spd = base.spd;

  for(const st of c.statuses){
    if(st.kind==="stat"){
      atk += (st.atk||0);
      def += (st.def||0);
      spd += (st.spd||0);
    }
  }
  return { atk, def, spd };
}

function hasDebuff(c){
  for(const st of c.statuses){
    if(st.kind==="stun") return true;
    if(st.kind==="stat" && ((st.atk||0)<0 || (st.def||0)<0 || (st.spd||0)<0)) return true;
  }
  return false;
}

function startNewArenaRound(first=false){
  if(!arenaBattle || !arenaBattle.active) return;
  const b = arenaBattle;

  const s1 = getEffStats(b.p1).spd;
  const s2 = getEffStats(b.p2).spd;

  if(s1 > s2) b.order = ["p1","p2"];
  else if(s2 > s1) b.order = ["p2","p1"];
  else b.order = (Math.random()<0.5) ? ["p1","p2"] : ["p2","p1"];

  b.idx = 0;
  if(!first) b.round += 1;

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function renderArenaBattle(){
  const b = arenaBattle;
  if(!b) return;
  // If the arena screen is active, update it there
  if($("arenaScreen") && $("arenaScreen").style.display !== "none"){
    arenaScreenRender();
    return;
  }
  // Fallback: old modal path (battle ended display)
  if(!b.active){
    const winner = b.log[0] || "";
    showMessage("Battle Over", `<div class="resLine">${escapeHtml(winner)}</div><div style="margin-top:10px;"><button onclick="hideArenaScreen();openArena()">Back to Arena</button></div>`);
  }
}

function renderArenaStatusBadges(c){
  if(!arenaBattle) return "";
  const tags = [];
  for(const st of c.statuses){
    if(st.kind==="stat"){
      const parts=[];
      if(st.atk) parts.push(`${st.atk>0?"+":""}${st.atk}ATK`);
      if(st.def) parts.push(`${st.def>0?"+":""}${st.def}DEF`);
      if(st.spd) parts.push(`${st.spd>0?"+":""}${st.spd}SPD`);
      tags.push(`${parts.join(" ")}(${st.turns})`);
    }else if(st.kind==="dodge"){
      tags.push(`Dodge ${Math.round((st.pct||0)*100)}%(${st.turns})`);
    }else if(st.kind==="dmgReduce"){
      tags.push(`DR-${st.amount}(${st.turns})`);
    }else if(st.kind==="guard"){
      tags.push(`Guard-${st.amount}(${st.turns})`);
    }else if(st.kind==="evasion"){
      tags.push(`Evasion(${st.turns})`);
    }else if(st.kind==="stun"){
      tags.push(`Stun(${st.turns})`);
    }else if(st.kind==="nextAtk"){
      tags.push(`NextAtk +${st.power||0} / ignore ${st.ignore||0}(${st.turns})`);
    }else if(st.kind==="cheatDeath"){
      tags.push(`NineLives(${st.turns})`);
    }
  }
  if(c.permDefBonus) tags.push(`+${c.permDefBonus}DEF(perma)`);
  if(!tags.length) return `<div class="badge">${c.side.toUpperCase()}: —</div>`;
  return `<div class="badge">${c.side.toUpperCase()}: ${escapeHtml(tags.join(" • "))}</div>`;
}

function toggleArenaQuizMid(){
  if(!arenaBattle) return;
  arenaBattle.quizOn = !arenaBattle.quizOn;
  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function arenaUseSkill(kind){
  const b = arenaBattle;
  if(!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);

  if(actor.control !== "human") return;

  // If stunned: skip immediately
  if(hasStatus(actor,"stun")){
    addArenaLog(`${actor.name} is stunned and loses the turn!`);
    consumeStatus(actor,"stun",1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  if(kind==="ultimate" && actor.charge < 100) return;

  if(!b.quizOn){
    resolveArenaSkill(kind);
    return;
  }

  b.waiting = true;
  renderArenaBattle();

  const diff = (kind==="attack") ? "beginner" : (kind==="buff" ? "intermediate" : "advanced");
  const q = pickQuestion(diff);

  const wrap = document.getElementById("arenaQWrap");
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="sectionTitle">Answer to use ${escapeHtml(kind)}</div>
    <div id="arenaQInner"></div>
    <div id="arenaQFb" class="quizFeedback"></div>
  `;

  renderQuestionUI(q, "arenaQInner", (ans)=>{
    if(!arenaBattle || !arenaBattle.active) return;

    questProgress("answer", 1);

    const ok = normalizeAnswer(ans) === normalizeAnswer(q.a);
    const fb = document.getElementById("arenaQFb");
    if(!ok){
      fb.className = "quizFeedback bad";
      fb.innerHTML = "Wrong. Your action failed.";
      addArenaLog(`${actor.name} answered wrong — action failed.`);
      setTimeout(()=>{
        b.waiting = false;
        tickStatusesEndTurn(actor);
        endArenaTurn();
      }, 650);
      return;
    }

    fb.className = "quizFeedback good";
    fb.innerHTML = "Correct! Action used.";
    setTimeout(()=>{
      b.waiting = false;
      resolveArenaSkill(kind);
    }, 450);
  });
}

function pickQuestion(diff){
  if(diff==="advanced") return randChoice(quizBank.advanced);
  if(diff==="intermediate") return randChoice(quizBank.intermediate);
  return randChoice(quizBank.beginner);
}
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function hasStatus(c, kind){
  return c.statuses.some(s=>s.kind===kind && s.turns>0);
}

function consumeStatus(c, kind, turnsToRemove=1){
  for(const st of c.statuses){
    if(st.kind===kind && st.turns>0){
      st.turns -= turnsToRemove;
      if(st.turns < 0) st.turns = 0;
      break;
    }
  }
  c.statuses = c.statuses.filter(s=>s.turns>0);
}

function addStatus(c, st){
  c.statuses.push(st);
}

function tickStatusesEndTurn(c){
  for(const st of c.statuses){
    st.turns -= 1;
  }
  c.statuses = c.statuses.filter(s=>s.turns>0);
}

function resolveArenaSkill(kind){
  const b = arenaBattle;
  if(!b || !b.active) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  const foe = getCombatant(otherSide(side));

  if(hasStatus(actor,"stun")){
    addArenaLog(`${actor.name} is stunned and loses the turn!`);
    consumeStatus(actor,"stun",1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  const meta = BATTLE_ANIMALS[actor.animalId];
  const skill = meta.skills[kind];

  if(kind==="attack"){
    actor.charge = Math.min(100, actor.charge + 25);
    if(typeof fireProjectile === "function") fireProjectile(side);
    setTimeout(() => {
      doArenaAttack(actor, foe, skill, (b.order[0]===side));
      if(foe.hp <= 0){ endArenaBattle(false, side); return; }
      if(actor.hp <= 0){ endArenaBattle(false, otherSide(side)); return; }
      tickStatusesEndTurn(actor);
      actor.temp = {};
      foe.temp = {};
      endArenaTurn();
    }, 320);
    return;
  }
  else if(kind==="buff"){
    actor.charge = Math.min(100, actor.charge + 20);
    doArenaBuff(actor, foe);
  }
  else if(kind==="ultimate"){
    actor.charge = 0;
    doArenaUltimate(actor, foe);
  }

  // check winner
  if(foe.hp <= 0){
    endArenaBattle(false, side);
    return;
  }
  if(actor.hp <= 0){
    endArenaBattle(false, otherSide(side));
    return;
  }

  // End turn: tick durations on actor, clear temporary locks on both sides
  tickStatusesEndTurn(actor);
  actor.temp = {};
  foe.temp = {};

  endArenaTurn();
}

function calcBaseDamage(skillPower, atk, def){
  return Math.max(1, skillPower + atk - def);
}

function getDodgeChance(defender, attacker){
  let dodge = 0;

  // Speed bonus rule: every 2 SPEED above opponent = +5% dodge, cap 25%
  const sDef = getEffStats(defender).spd;
  const sAtk = getEffStats(attacker).spd;
  const diff = sDef - sAtk;
  if(diff >= 2){
    dodge += Math.min(0.25, Math.floor(diff/2) * 0.05);
  }

  // Add dodge status
  for(const st of defender.statuses){
    if(st.kind==="dodge") dodge += (st.pct||0);
  }

  return Math.min(0.6, dodge);
}

function applyDamage(attacker, defender, rawDmg){
  let dmg = Math.max(0, rawDmg);

  // Evasion (deer ult)
  const ev = defender.statuses.find(s=>s.kind==="evasion");
  if(ev){
    consumeStatus(defender,"evasion", 99);
    addArenaLog(`${defender.name} evaded the hit!`);
    return 0;
  }

  // Dodge
  const dodgeChance = getDodgeChance(defender, attacker);
  if(dodgeChance > 0 && Math.random() < dodgeChance){
    addArenaLog(`${defender.name} dodged!`);
    return 0;
  }

  // Damage reduction
  let reduce = 0;
  for(const st of defender.statuses){
    if(st.kind==="dmgReduce") reduce += (st.amount||0);
  }

  // Guard (dog buff): next incoming damage -2
  const guard = defender.statuses.find(s=>s.kind==="guard");
  if(guard){
    reduce += (guard.amount||0);
    consumeStatus(defender,"guard", 99);
  }

  dmg = Math.max(0, dmg - reduce);

  if(dmg > 0){
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.charge = Math.min(100, defender.charge + 10);
  }

  // Cat Nine-Lives: survive once at 1 HP for the current action window
  const cd = defender.statuses.find(s=>s.kind==="cheatDeath");
  if(defender.hp <= 0 && cd && !cd.used){
    cd.used = true;
    defender.hp = 1;
    defender.temp.surviveThisAction = true;
    addArenaLog(`${defender.name} refused to go down (Nine-Lives)!`);
  }
  if(defender.temp.surviveThisAction && defender.hp <= 0){
    defender.hp = 1;
  }

  return dmg;
}

function doArenaAttack(actor, foe, skill, actorIsFirstThisRound){
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  // One-time next attack modifiers
  let powerBonus = 0;
  let ignoreDef = 0;
  const nxt = actor.statuses.find(s=>s.kind==="nextAtk");
  if(nxt){
    powerBonus += (nxt.power||0);
    ignoreDef += (nxt.ignore||0);
    consumeStatus(actor,"nextAtk", 99);
  }

  const skillPower = (skill.power || 0) + powerBonus;
  const defAdj = Math.max(0, f.def - ignoreDef);

  let dmg = calcBaseDamage(skillPower, a.atk, defAdj);

  // Rabbit bonus
  if(actor.animalId==="rabbit" && actorIsFirstThisRound) dmg += 2;

  // Cat crit
  if(actor.animalId==="cat" && Math.random() < 0.25){
    dmg += 4;
    addArenaLog(`${actor.name} landed a crit!`);
  }

  // Alligator bonus if enemy DEF high
  if(actor.animalId==="alligator" && f.def >= 6) dmg += 2;

  const dealt = applyDamage(actor, foe, dmg);

  if(dealt > 0) addArenaLog(`${actor.name} used ${skill.name} for ${dealt} damage.`);
  else addArenaLog(`${actor.name} used ${skill.name}, but it dealt no damage.`);

  // On-hit effects
  if(dealt > 0){
    // Deer: 30% speed debuff
    if(actor.animalId==="deer" && Math.random() < 0.30){
      addStatus(foe, { kind:"stat", spd:-2, turns:1 });
      addArenaLog(`${foe.name}'s SPEED fell (-2).`);
    }

    // Fox: Hex (DEF -2 for 2 turns)
    if(actor.animalId==="fox"){
      addStatus(foe, { kind:"stat", def:-2, turns:2 });
      addArenaLog(`${foe.name} is Hexed (DEF -2).`);
    }

    // Panda: permanent DEF bonus (+1, cap +3)
    if(actor.animalId==="panda"){
      actor.permDefBonus = Math.min(3, (actor.permDefBonus||0) + 1);
      addArenaLog(`${actor.name} gained +1 DEF permanently.`);
    }
  }
}

function doArenaBuff(actor, foe){
  const id = actor.animalId;

  if(id==="rabbit"){
    addStatus(actor, { kind:"stat", spd:+3, turns:2 });
    addStatus(actor, { kind:"nextAtk", power:+1, ignore:0, turns:2 });
    addArenaLog(`${actor.name} used Burst Step.`);
  }
  else if(id==="dog"){
    addStatus(actor, { kind:"stat", def:+3, turns:2 });
    addStatus(actor, { kind:"guard", amount:2, turns:2 });
    addArenaLog(`${actor.name} used Guard Stance.`);
  }
  else if(id==="deer"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 4);
    addStatus(actor, { kind:"stat", def:+2, turns:1 });
    addArenaLog(`${actor.name} used Calm Breath (+HP).`);
  }
  else if(id==="cat"){
    addStatus(actor, { kind:"nextAtk", power:+3, ignore:2, turns:2 });
    addArenaLog(`${actor.name} used Pounce Setup.`);
  }
  else if(id==="lion"){
    addStatus(actor, { kind:"stat", atk:+3, turns:2 });
    addStatus(foe,   { kind:"stat", atk:-2, turns:1 });
    addArenaLog(`${actor.name} used Roar.`);
  }
  else if(id==="panda"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 5);
    addStatus(actor, { kind:"stat", def:+2, turns:2 });
    addArenaLog(`${actor.name} used Bamboo Snack (+HP).`);
  }
  else if(id==="fox"){
    addStatus(actor, { kind:"stat", spd:+2, turns:2 });
    addStatus(actor, { kind:"dodge", pct:0.20, turns:1 });
    addArenaLog(`${actor.name} used Illusion Veil.`);
  }
  else if(id==="alligator"){
    addStatus(actor, { kind:"stat", def:+4, turns:2 });
    addStatus(actor, { kind:"stat", spd:-1, turns:2 });
    addArenaLog(`${actor.name} used Iron Hide.`);
  }
}

function doArenaUltimate(actor, foe){
  const id = actor.animalId;
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  if(id==="rabbit"){
    addArenaLog(`${actor.name} used Lightning Combo!`);
    for(let i=0;i<3;i++){
      const dmg = calcBaseDamage(3, a.atk, f.def);
      applyDamage(actor, foe, dmg);
      if(foe.hp<=0) break;
    }
  }
  else if(id==="dog"){
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Loyal Rush! (${dealt} dmg)`);
    if(actor.hp < (actor.hpMax/2)){
      actor.hp = Math.min(actor.hpMax, actor.hp + 3);
      addArenaLog(`${actor.name} healed 3.`);
    }
  }
  else if(id==="deer"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 7);
    addStatus(actor, { kind:"evasion", turns:1 });
    addArenaLog(`${actor.name} used Forest Grace (+HP +Evasion).`);
  }
  else if(id==="cat"){
    const dmg = calcBaseDamage(8, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind:"cheatDeath", turns:2, used:false });
    addArenaLog(`${actor.name} used Nine-Lives Trick! (${dealt} dmg)`);
  }
  else if(id==="lion"){
    let dmg = calcBaseDamage(10, a.atk, f.def);
    if(hasDebuff(foe)) dmg += 4;
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used King's Verdict! (${dealt} dmg)`);
  }
  else if(id==="panda"){
    const dmg = calcBaseDamage(6, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind:"dmgReduce", amount:3, turns:2 });
    addArenaLog(`${actor.name} used Soft But Strong! (${dealt} dmg)`);
  }
  else if(id==="fox"){
    // Steal higher stat for 2 turns, then hit
    const statToSteal = (f.def > f.atk) ? "def" : "atk";
    if(statToSteal==="atk"){
      addStatus(actor, { kind:"stat", atk:+2, turns:2 });
      addStatus(foe,   { kind:"stat", atk:-2, turns:2 });
      addArenaLog(`${actor.name} stole 2 ATK for 2 turns!`);
    }else{
      addStatus(actor, { kind:"stat", def:+2, turns:2 });
      addStatus(foe,   { kind:"stat", def:-2, turns:2 });
      addArenaLog(`${actor.name} stole 2 DEF for 2 turns!`);
    }
    const a2 = getEffStats(actor);
    const f2 = getEffStats(foe);
    const dmg = calcBaseDamage(8, a2.atk, f2.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Mind Game! (${dealt} dmg)`);
  }
  else if(id==="alligator"){
    const alreadyDebuffed = hasDebuff(foe);
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(foe, { kind:"stat", def:-4, turns:2 });
    if(alreadyDebuffed){
      addStatus(foe, { kind:"stun", turns:1 });
      addArenaLog(`${foe.name} is stunned!`);
    }
    addArenaLog(`${actor.name} used Death Roll! (${dealt} dmg)`);
  }
}

function endArenaTurn(){
  const b = arenaBattle;
  if(!b || !b.active) return;

  b.idx += 1;
  if(b.idx >= 2){
    // new round
    b.p1.temp = {};
    b.p2.temp = {};
    startNewArenaRound(false);
    return;
  }

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function handleArenaAutoIfNeeded(){
  const b = arenaBattle;
  if(!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  if(actor.control !== "ai") return;

  setTimeout(()=>{
    if(!arenaBattle || !arenaBattle.active) return;
    const s = currentArenaSide();
    const a = getCombatant(s);
    if(a.control !== "ai") return;

    // Stun skip
    if(hasStatus(a,"stun")){
      addArenaLog(`${a.name} is stunned and loses the turn!`);
      consumeStatus(a,"stun",1);
      tickStatusesEndTurn(a);
      endArenaTurn();
      return;
    }

    const hpPct = a.hp / a.hpMax;

    if(a.charge >= 100){
      resolveArenaSkill("ultimate");
      return;
    }

    // Prefer buff when low,  sometimes buff otherwise
    if(hpPct < 0.55 && Math.random() < 0.70) resolveArenaSkill("buff");
    else if(Math.random() < 0.18) resolveArenaSkill("buff");
    else resolveArenaSkill("attack");
  }, 650);
}

function endArenaBattle(exitOnly=false, winnerSide=null){
  const b = arenaBattle;
  if(!b) return;

  if(exitOnly){
    arenaBattle = null;
    hideArenaScreen();
    openArena();
    return;
  }

  b.active = false;

  if(winnerSide){
    const winner = getCombatant(winnerSide);
    addArenaLog(`${winner.name} wins!`);

    // Rewards only for Practice vs AI when Player 1 wins
    if(b.mode==="ai" && winnerSide==="p1"){
      const reward = 35 + winner.level*10;
      coins += reward;
      gainXP(20 + winner.level*5);
      saveState();
      updateUI();
      addArenaLog(`You earned +${reward} coins.`);
    }
  }

  renderArenaBattle();
}

function openBattleGuide(){
  const scalingHead = LEVEL_SCALING_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const scalingBody = LEVEL_SCALING_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const baseHead = ANIMAL_BASE_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const baseBody = ANIMAL_BASE_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const lvlHead = ANIMAL_LEVEL_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const lvlBody = ANIMAL_LEVEL_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const skillCards = Object.keys(BATTLE_ANIMALS).map(id=>{
    const a = BATTLE_ANIMALS[id];
    const s = a.skills;
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${a.emoji}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(a.name)}</div>
            <div class="itemSub">Attack: <b>${escapeHtml(s.attack.name)}</b> — ${escapeHtml(s.attack.desc || "")}</div>
            <div class="itemSub">Buff: <b>${escapeHtml(s.buff.name)}</b> — ${escapeHtml(s.buff.desc || "")}</div>
            <div class="itemSub">Ultimate: <b>${escapeHtml(s.ultimate.name)}</b> — ${escapeHtml(s.ultimate.desc || "")}</div>
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
      Combine duplicates in the Zoo: same animal + same level → +1 level (max Lv5).
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