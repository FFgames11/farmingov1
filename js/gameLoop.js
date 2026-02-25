/* =========================================================
   GAME LOOP TICKS
========================================================= */
function tickGrow(){
  const now = Date.now();
  for(let i=0;i<TILE_COUNT;i++){
    const st = tileStates[i];
    if(!unlockedTiles[i]) continue;
    if(st.state==="planted" && st.finishAt > 0 && now >= st.finishAt){
      st.state = "grown";
      st.finishAt = 0;
    }
  }
}

setInterval(()=>{
  tickGrow();
  trySpawnWildPet();
  tickWildPet();
  trySpawnBoss();
  renderFarm();
  saveState();
}, 250);

