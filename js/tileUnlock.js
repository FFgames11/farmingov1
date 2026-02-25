/* =========================================================
   TILE UNLOCK
========================================================= */
function unlockTile(i){
  const cost = tileUnlockCost(unlockedCount());
  if(coins < cost) return;

  coins -= cost;
  unlockedTiles[i] = true;
  tileStates[i] = { state:"empty", crop:"", plantedAt:0, finishAt:0 };

  saveState();
  updateUI();
  closeModal();
  initTiles();
}

