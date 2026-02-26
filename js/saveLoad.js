/* =========================================================
   SAVE / LOAD
========================================================= */
const STATE_KEY = "catfarm_state_v5";
const QUEST_KEY = "catfarm_daily_quests_v5";
const QUEST_DATE_KEY = "catfarm_daily_date_v5";
const STREAK_KEY = "catfarm_daily_streak_v5";
const LAST_COMPLETE_KEY = "catfarm_last_complete_date_v5";
const LIB_EXAM_KEY = "catfarm_library_exam_v1";

let coins = 30;
let xp = 0;
let level = 1;
let playerCountry = "Philippines"; // Default country
let inventory = {}; // Stores harvested crops
let showcase = [null, null, null, null]; // Profile showcase slots

let playerName = "Player";
let playerTitle = "Rookie Farmer";

let selectedSeed = "🥕";

let currentTool = "harvest"; // plant | remove | move
let moveSourceIndex = null;

let seeds = {}; // emoji -> count

const TILE_COUNT = 18;
let unlockedTiles = new Array(TILE_COUNT).fill(false);
let tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));

let zooPets = [];
let roamingPetUids = []; // legacy: roaming-on-farm was removed (kept for old saves)

let nextPetSpawnAt = 0;
let nextBossSpawnAt = 0;

function saveState(){
  // Do not write while the game UI is hidden (i.e. during/after logout).
  // The game loop calls this every 250ms — without this guard it would
  // overwrite the cleared localStorage with the previous account's data.
  if(window.gameUIHidden) return;
  try{
    localStorage.setItem(STATE_KEY, JSON.stringify({
      coins, xp, level,
      playerName, playerTitle,
      playerCountry, inventory, showcase,
      selectedSeed, seeds,
      unlockedTiles, tileStates,
      zooPets, roamingPetUids: [],
      boosts,
      nextPetSpawnAt,
      nextBossSpawnAt,
      tutorialDone: !!localStorage.getItem("catfarm_tutorial_done_v2")
    }));
  }catch(e){}
}


function loadState(){
  try{
    const raw = localStorage.getItem(STATE_KEY);
    if(!raw) return;
    const st = JSON.parse(raw);
    if(!st || typeof st !== "object") return;

    coins = Number(st.coins ?? coins);
    xp = Number(st.xp ?? xp);
    level = Number(st.level ?? level);

    playerName = st.playerName || playerName;
    playerTitle = st.playerTitle || playerTitle;
    playerCountry = st.playerCountry || "Philippines";
    inventory = st.inventory || {};
    showcase = st.showcase || [null, null, null, null];

    selectedSeed = st.selectedSeed || selectedSeed;
    seeds = st.seeds && typeof st.seeds==="object" ? st.seeds : seeds;

    unlockedTiles = Array.isArray(st.unlockedTiles) ? st.unlockedTiles : unlockedTiles;
    tileStates = Array.isArray(st.tileStates) ? st.tileStates : tileStates;

    zooPets = Array.isArray(st.zooPets) ? st.zooPets : zooPets;

    // ---- migrate older pet saves to the new battle roster shape ----
    const LEGACY_PET_TO_ANIMAL = {
      puppy: "dog",
      kitty: "cat",
      bunny: "rabbit",
      fox: "fox",
      raccoon: "panda",
      dragon: "lion",
    };

    zooPets = (zooPets||[]).map(p=>{
      if(!p || typeof p !== "object") return null;
      const pet = { ...p };
      pet.level = clamp(parseInt(pet.level || 1, 10) || 1, 1, 5);

      if(!pet.animalId){
        if(pet.typeId && LEGACY_PET_TO_ANIMAL[pet.typeId]) pet.animalId = LEGACY_PET_TO_ANIMAL[pet.typeId];
      }

      const meta = (pet.animalId && BATTLE_ANIMALS[pet.animalId]) ? BATTLE_ANIMALS[pet.animalId] : null;
      if(meta){
        pet.typeId = pet.typeId || pet.animalId;
        pet.name = meta.name;
        pet.emoji = meta.emoji;
        pet.imagepath = meta.imagepath;
        pet.rarity = meta.rarity;
      }
      return pet;
    }).filter(Boolean);

    // roaming-on-farm was removed; keep older saves from showing farm roam pets
    roamingPetUids = [];

    if(st.boosts && typeof st.boosts==="object"){
      boosts.fertilizer = Number(st.boosts.fertilizer||0);
      boosts.net = Number(st.boosts.net||0);
      boosts.scarecrowUntil = Number(st.boosts.scarecrowUntil||0);
    }

    nextPetSpawnAt = Number(st.nextPetSpawnAt || 0);
    nextBossSpawnAt = Number(st.nextBossSpawnAt || 0);

    // Restore tutorial completion flag from cloud save.
    // If tutorialDone is true, write the key so shouldShowTutorial() returns false.
    // If tutorialDone is false/absent, remove the key so it shows on first play.
    try{
      if(st.tutorialDone){
        localStorage.setItem("catfarm_tutorial_done_v2", "1");
      } else {
        localStorage.removeItem("catfarm_tutorial_done_v2");
      }
    }catch(e){}
  }catch(e){}
}