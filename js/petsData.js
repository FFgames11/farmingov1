/* =========================================================
   PETS / WILD PETS (ENTRANCE + POOP)
   Weight = spawn probability within eligible pool.
   minLevel = minimum player level for this animal to appear.
   Rarity tiers: Starter(30) > Common(25) > Uncommon(15) > Rare(8) > Epic(4) > Legendary(2)
   Streak protection: after 10 spawns without Rare+, weights for Rare/Epic/Legendary
   are tripled for one roll only, then the counter resets.
========================================================= */
const PET_TYPES = [
  // --- Starter / Common (appear from level 1) ---
  { id:"pig",       name:"Pig",       emoji:"🐷", rarity:"Starter",   minLevel:1,  weight:30, eatMs:15000, poopMin:1, poopMax:1, isImage:true, imagepath:'<img src="images/pig.png" alt="pig">' },
  { id:"rabbit",    name:"Rabbit",    emoji:"🐰", rarity:"Common",    minLevel:1,  weight:25, eatMs:15000, poopMin:1, poopMax:1, isImage:true, imagepath:'<img src="images/rabbit.png" alt="rabbit">' },
  { id:"dog",       name:"Dog",       emoji:"🐶", rarity:"Common",    minLevel:1,  weight:25, eatMs:15000, poopMin:1, poopMax:1, isImage:true, imagepath:'<img src="images/dog.png" alt="dog">' },

  // --- Uncommon (appear from level 3) ---
  { id:"deer",      name:"Deer",      emoji:"🦌", rarity:"Uncommon",  minLevel:3,  weight:15, eatMs:14000, poopMin:1, poopMax:2, isImage:true, imagepath:'<img src="images/deer.png" alt="deer">' },
  { id:"cat",       name:"Cat",       emoji:"🐱", rarity:"Uncommon",  minLevel:3,  weight:15, eatMs:14000, poopMin:1, poopMax:2, isImage:true, imagepath:'<img src="images/cat.png" alt="cat">' },

  // --- Rare (appear from level 6) ---
  { id:"fox",       name:"Fox",       emoji:"🦊", rarity:"Rare",      minLevel:6,  weight:8,  eatMs:13000, poopMin:1, poopMax:2, isImage:true, imagepath:'<img src="images/fox.png" alt="fox">' },
  { id:"panda",     name:"Panda",     emoji:"🐼", rarity:"Rare",      minLevel:6,  weight:8,  eatMs:13000, poopMin:1, poopMax:2, isImage:true, imagepath:'<img src="images/panda.png" alt="panda">' },

  // --- Epic (appear from level 10) ---
  { id:"lion",      name:"Lion",      emoji:"🦁", rarity:"Epic",      minLevel:10, weight:4,  eatMs:12000, poopMin:2, poopMax:3, isImage:true, imagepath:'<img src="images/lion.png" alt="lion">' },

  // --- Legendary (appear from level 15) ---
  { id:"alligator", name:"Alligator", emoji:"🐊", rarity:"Legendary", minLevel:15, weight:2,  eatMs:12000, poopMin:2, poopMax:3, isImage:true, imagepath:'<img src="images/alligator.png" alt="alligator">' },
];