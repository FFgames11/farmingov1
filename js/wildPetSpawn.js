/* =========================================================
   WILD PET SPAWN INTERVAL (SLOWER)
========================================================= */

// Streak protection counter — tracks spawns since last Rare+ appeared
let _spawnsSinceRarePlus = 0;
const STREAK_THRESHOLD = 10; // trigger boost after this many non-Rare+ spawns

function scheduleNextPetSpawn(){
  let min = 20_000;
  let max = 25_000;
  if(petSpawnsBlocked()){
    min += 40_000;
    max += 80_000;
  }
  nextPetSpawnAt = Date.now() + (min + Math.random()*(max-min));
}

function getActiveCropTiles(){
  const idx = [];
  for(let i=0;i<TILE_COUNT;i++){
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st.state === "planted" || st.state === "grown") idx.push(i);
  }
  return idx;
}

const RARE_PLUS = new Set(["Rare", "Epic", "Legendary"]);

function pickWildPetType(){
  // 1. Filter pool to animals unlocked at current player level
  const eligible = PET_TYPES.filter(p => level >= (p.minLevel || 1));
  if(eligible.length === 0) return PET_TYPES[0]; // fallback: pig

  // 2. Apply streak protection — if counter hit threshold, triple Rare+ weights
  const streakActive = _spawnsSinceRarePlus >= STREAK_THRESHOLD;

  const pool = eligible.map(p => ({
    ...p,
    _w: (streakActive && RARE_PLUS.has(p.rarity)) ? p.weight * 3 : p.weight
  }));

  // 3. Weighted pick from pool
  const total = pool.reduce((s, p) => s + p._w, 0);
  let r = Math.random() * total;
  let picked = pool[pool.length - 1];
  for(const p of pool){
    r -= p._w;
    if(r <= 0){ picked = p; break; }
  }

  // 4. Update streak counter
  if(RARE_PLUS.has(picked.rarity)){
    _spawnsSinceRarePlus = 0; // reset — player got a Rare+
  } else {
    _spawnsSinceRarePlus++;
  }

  return picked;
}