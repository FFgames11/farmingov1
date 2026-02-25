/* =========================================================
   BOOSTS
========================================================= */
const BOOST_ITEMS = [
  { key:"fertilizer", icon:"🧪", name:"Fertilizer", cost: 60, desc:"-20% grow time (next plant only)" },
  { key:"scarecrow",  icon:"🪵", name:"Scarecrow",  cost: 90, desc:"Reduce wild pet spawns for 3 minutes" },
  { key:"net",        icon:"🪢", name:"Capture Net", cost: 75, desc:"+12% capture chance (next capture)" },
];
let boosts = { fertilizer:0, scarecrowUntil:0, net:0 };

function captureBonusByBoost(){
  if(boosts.net > 0){
    boosts.net--;
    return 0.12;
  }
  return 0;
}
function petSpawnsBlocked(){
  return Date.now() < (boosts.scarecrowUntil || 0);
}

