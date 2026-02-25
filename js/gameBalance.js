/* =========================================================
   GAME BALANCE
========================================================= */
const LEVELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

const CROPS = [
  // MODIFIED: Carrot now uses images for seedling and grown states
  { emoji:"🥕", name:"Carrot", isImage:true, seedling:"images/seedling.png", grown:"images/carrot.png", level:"beginner", seedCost: 2, growMs: 25000, harvestCoins: 4, harvestXP: 8, unlockLevel: 1 },
  { emoji:"🌽", name:"Corn",  isImage: true, seedling:"images/seedling.png",    level:"beginner",     seedCost: 3, grown:"images/corn.png", growMs: 45000, harvestCoins: 5,  harvestXP: 9,  unlockLevel: 1 },
  { emoji:"🍅", name:"Tomato",  isImage: true, seedling:"images/seedling.png",   level:"intermediate", seedCost: 5, grown:"images/tomato.png", growMs: 70000, harvestCoins: 9,  harvestXP: 14, unlockLevel: 2 },
  { emoji:"🧅", name:"Onion",   isImage: true, seedling:"images/seedling.png",   level:"intermediate", seedCost: 6, grown:"images/onion.png", growMs: 90000, harvestCoins: 10, harvestXP: 15, unlockLevel: 3 },
  { emoji:"🎃", name:"Pumpkin",  isImage: true, seedling:"images/seedling.png",  level:"advanced",     seedCost: 8, grown:"images/pumpkin.png", growMs:120000, harvestCoins: 14, harvestXP: 22, unlockLevel: 4 },
];

const LIMITED_SEEDS = [
  { emoji:"🥦", name:"Broccoli",   level:"beginner",     weight:45, seedCost:0, growMs: 35000, harvestCoins: 6,  harvestXP: 10 },
  { emoji:"🍓", name:"Strawberry", level:"intermediate", weight:26, seedCost:0, growMs: 85000, harvestCoins: 12, harvestXP: 18 },
  { emoji:"🍇", name:"Grapes",     level:"advanced",     weight:12, seedCost:0, growMs:130000, harvestCoins: 18, harvestXP: 28 },
  { emoji:"🌶️", name:"Chili",     level:"advanced",     weight: 6, seedCost:0, growMs:160000, harvestCoins: 22, harvestXP: 32 },
  { emoji:"🍄", name:"Truffle",    level:"advanced",     weight: 1, seedCost:0, growMs:220000, harvestCoins: 35, harvestXP: 55 },
];

function cropByEmoji(emoji){
  return CROPS.find(c=>c.emoji===emoji) || LIMITED_SEEDS.find(c=>c.emoji===emoji);
}
function xpNeededForLevel(lvl){
  return Math.floor(90 + (lvl-1)*55 + Math.pow(lvl-1, 1.25)*18);
}
function tileUnlockCost(unlockedCount){
  return Math.floor(40 + unlockedCount*25 + Math.pow(unlockedCount, 1.35)*10);
}
function tileLevelLabel(levelKey){
  return LEVELS[levelKey] || "Beginner";
}

