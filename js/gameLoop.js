/* =========================================================
   GAME LOOP TICKS
========================================================= */
function tickGrow() {
  const now = Date.now();
  for (let i = 0; i < TILE_COUNT; i++) {
    const st = tileStates[i];
    if (!unlockedTiles[i]) continue;
    if (st.state === "planted" && st.finishAt > 0 && now >= st.finishAt) {
      st.state = "grown";
      st.finishAt = 0;
    }
  }
}

setInterval(() => {
  tickGrow();

  // Only run farm-specific events if on the farm and not in loading/login screen
  if (activeScreen === "farm" && !window.gameUIHidden && !window.visitMode) {
    trySpawnWildPet();
    tickWildPet();
    trySpawnBoss();
    renderFarm();
  } else {
    // Increment spawn timers by 250ms while paused so they don't lapse in the background
    if (typeof nextPetSpawnAt !== 'undefined') nextPetSpawnAt += 250;
    if (typeof nextBossSpawnAt !== 'undefined') nextBossSpawnAt += 250;
  }

  saveState();
}, 250);

