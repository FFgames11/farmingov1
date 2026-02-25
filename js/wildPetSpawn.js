/* =========================================================
   WILD PET SPAWN INTERVAL (SLOWER)
========================================================= */
function scheduleNextPetSpawn(){
  let min = 10_000;
  let max = 15_000;
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

