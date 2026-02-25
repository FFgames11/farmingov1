/* =========================================================
   CROPS / SHOP / INVENTORY / ZOO / QUESTS
========================================================= */
function openCrops(){
  const lines = CROPS.map(c=>{
    const locked = level < c.unlockLevel;
    const owned = seeds[c.emoji] || 0;
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${escapeHtml(c.emoji)}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(c.name)}</div>
            <div class="itemSub">Seed cost: <b>${c.seedCost}</b> coins • Owned: <b>${owned}</b></div>
            <div class="badgeRow">
              <div class="badge">${tileLevelLabel(c.level)}</div>
              <div class="badge">Unlock Lvl ${c.unlockLevel}</div>
              <div class="badge">Harvest +${c.harvestCoins} coins</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${locked || coins<c.seedCost ? "disabled":""} onclick="buySeed('${c.emoji}')">
            <span><small data-title='${locked ? "Locked" : "Buy"}'>${locked ? "Locked" : "Buy"}</small></span>
          </button>
          <button ${locked || coins<c.seedCost ? "disabled":""} onclick="selectSeed('${c.emoji}')"><span><small data-title="Select">Select</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Crops", `
    <div class="cropModalContent">
      <div class="resLine">Coins: <b>${coins}</b> • Selected seed: <b>${escapeHtml(selectedSeed)}</b></div>
      <div class="modalGrid">${lines}</div>
      <div class="smallNote">Tip: Harvest tiles show READY when finished.</div>
    </div>
  `);
}
function selectSeed(emoji){
  selectedSeed = emoji;
  saveState();
  openCrops();
}
function buySeed(emoji){
  const c = cropByEmoji(emoji);
  if(!c) return;
  if(level < (c.unlockLevel||1)){
    showMessage("Locked", `<div class="smallNote">Unlock at Level ${c.unlockLevel}.</div>`);
    return;
  }
  if(coins < c.seedCost){
    showMessage("Not enough coins", `<div class="smallNote">You need ${c.seedCost} coins.</div>`);
    return;
  }
  coins -= c.seedCost;
  seeds[emoji] = (seeds[emoji]||0) + 1;
  selectedSeed = emoji;
  saveState();
  updateUI();
  openCrops();
}

function openSupermarket(){
  const now = Date.now();
  const scareLeft = Math.max(0, boosts.scarecrowUntil - now);

  const boostsHtml = BOOST_ITEMS.map(b=>{
    let ownedText = "";
    if(b.key === "scarecrow"){
      ownedText = scareLeft > 0 ? `Active: <b>${Math.ceil(scareLeft/1000)}s</b>` : "Inactive";
    }else{
      ownedText = `Owned: <b>${boosts[b.key]||0}</b>`;
    }

    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${b.icon}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(b.name)}</div>
            <div class="itemSub">${escapeHtml(b.desc)} • ${ownedText}</div>
            <div class="badgeRow"><div class="badge">Cost: ${b.cost} coins</div></div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${coins<b.cost?"disabled":""} onclick="buyBoost('${b.key}', ${b.cost})"><span><small data-title="Buy">Buy</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Supermarket", `
    <div class="resLine">Coins: <b>${coins}</b> • Pets: <b>${zooPets.length}</b></div>
    <div class="sectionTitle">Boosts</div>
    <div class="modalGrid" style="margin-top:8px;">${boostsHtml}</div>

    <div class="sectionTitle">Limited Seed Gacha</div>
    <div class="itemCard" style="margin-top:8px;">
      <div class="itemLeft">
        <div class="itemIcon">🌱</div>
        <div class="itemMeta">
          <div class="itemName">Limited Seeds (1x)</div>
          <div class="itemSub">Get 1 random limited seed (rare profits).</div>
          <div class="badgeRow"><div class="badge">Cost: 150 coins</div></div>
        </div>
      </div>
      <div class="rowBtns">
        <button ${coins<150?"disabled":""} onclick="rollLimitedSeed()"><span><small data-title="Roll">Roll</small></span></button>
      </div>
    </div>

    <div class="sectionTitle">Boss Tip</div>
    <div class="smallNote" style="text-align:left;margin-top:8px;">
      Scarecrow can spawn on your farm. Stock up on boosts and answer fast.
    </div>
  `);
}
function buyBoost(key, cost){
  if(coins < cost) return;
  coins -= cost;
  if(key === "scarecrow"){
    boosts.scarecrowUntil = Math.max(Date.now(), boosts.scarecrowUntil || 0) + (3*60*1000);
    scheduleNextPetSpawn();
    scheduleNextBossSpawn();
  }else{
    boosts[key] = (boosts[key]||0) + 1;
  }
  saveState();
  updateUI();
  openSupermarket();
}
function rollLimitedSeed(){
  if(coins < 150) return;
  coins -= 150;
  const pick = weightedPick(LIMITED_SEEDS);
  seeds[pick.emoji] = (seeds[pick.emoji]||0) + 1;
  selectedSeed = pick.emoji;
  saveState();
  updateUI();
  showMessage("Limited Seed!", `
    <div class="resLine">You got: <b>${escapeHtml(pick.emoji)} ${escapeHtml(pick.name)}</b></div>
    <div class="smallNote">${tileLevelLabel(pick.level)} • Harvest +${pick.harvestCoins} coins</div>
    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;" onclick="openCrops()">Go to Crops</button>
      <button style="flex:1;" onclick="openSupermarket()">Back</button>
    </div>
  `);
}

function openInventory(){
  const seedBadges = Object.keys(seeds).sort((a,b)=>a.localeCompare(b)).map(k=>{
    const c = cropByEmoji(k);
    const name = c ? c.name : "Seed";
    return `<div class="badge">${escapeHtml(k)} x${seeds[k]||0} (${escapeHtml(name)})</div>`;
  }).join("");

  const harvestedCrops = CROPS
      .sort((a, b) => a.emoji.localeCompare(b.emoji))
      .map(c => {
        const amount = inventory[c.emoji] ?? 0; // default to 0
        return `<div class="badge">
          ${escapeHtml(c.emoji)} x${amount} (${escapeHtml(c.name)})
        </div>`;
  }).join("");
  

  const netOwned = boosts.net || 0;
  const fertOwned = boosts.fertilizer || 0;
  const scareLeft = Math.max(0, (boosts.scarecrowUntil||0) - Date.now());

  openModal("Bag", `
    <div class="resLine">Coins: <b>${coins}</b> • Selected: <b>${escapeHtml(selectedSeed)}</b></div>

    <div class="sectionTitle">Seeds</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${seedBadges || `<div class="smallNote">No seeds. Buy some in Crops.</div>`}
    </div>

    <div class="sectionTitle">Harvested Crops</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${harvestedCrops || `<div class="smallNote">No crops were harvested yet. Plant a seed and harvest the crop.</div>`}
    </div>

    <div class="sectionTitle">Boosts</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      <div class="badge">Fertilizer x${fertOwned}</div>
      <div class="badge">Capture Net x${netOwned}</div>
      <div class="badge">Scarecrow: ${scareLeft>0 ? `${Math.ceil(scareLeft/1000)}s` : "Inactive"}</div>
    </div>

    <div class="sectionTitle">Battle</div>
    <div class="smallNote" style="text-align:left;margin-top:8px;">
      Normal Attack: beginner question (safe).<br>
      Heavy Attack: harder question (more damage).
    </div>
  `);
}

function openZoo(){
  showZoo();
}


function openQuestBoard(){
  const cards = dailyQuests.map(q=>{
    const done = (q.progress >= q.target);
    const pct = Math.floor((q.progress / q.target) * 100);
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${done ? "✅" : (q.type==="all" ? "🏁" : "📌")}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(q.title)}</div>
            <div class="itemSub">Progress: <b>${q.progress}</b> / ${q.target}</div>
            <div class="badgeRow">
              <div class="badge">${pct}%</div>
              <div class="badge">+${q.rewardCoins} coins</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${(!done || q.claimed) ? "disabled" : ""} onclick="claimQuest('${q.id}')">
            <span><small data-title='${q.claimed ? "Claimed" : (done ? "Claim" : "In progress")}'>${q.claimed ? "Claimed" : (done ? "Claim" : "In progress")}</small></span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Quest Board", `
    <div class="resLine">Streak: <b>${dailyStreak}</b> • Coins: <b>${coins}</b></div>
    <div class="modalGrid">${cards}</div>
    <div class="smallNote">Claim all quests to increase your streak.</div>
  `);
}

