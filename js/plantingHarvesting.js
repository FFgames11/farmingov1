/* =========================================================
   PLANTING / HARVESTING
========================================================= */
function getFirstAvailableSeed(){
  if((seeds[selectedSeed]||0) > 0) return selectedSeed;
  const keys = Object.keys(seeds);
  for(const k of keys){
    if((seeds[k]||0) > 0) return k;
  }
  return null;
}

function applyGrowBoost(ms){
  if(boosts.fertilizer > 0){
    boosts.fertilizer--;
    return Math.max(8000, Math.floor(ms * 0.8));
  }
  return ms;
}

