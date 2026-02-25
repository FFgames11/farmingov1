/* =========================================================
   PETS / WILD PETS (ENTRANCE + POOP)
========================================================= */
const PET_TYPES = [
  // Farmingo battle roster (also used as wild pets in the farm)
  { id:"pig",       name:"Pig",       emoji:"🐷", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1,  isImage:true, imagepath:'<img src="images/pig.png" alt="pig">' },
  { id:"rabbit",    name:"Rabbit",    emoji:"🐰", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1, isImage:true, imagepath:'<img src="images/rabbit.png" alt="rabbit">' },
  { id:"dog",       name:"Dog",       emoji:"🐶", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1,  isImage:true, imagepath:'<img src="images/dog.png" alt="dog">'},
, 
  { id:"deer",      name:"Deer",      emoji:"🦌", rarity:"Uncommon", weight:22, eatMs:15000, capture:0.32, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/deer.png" alt="deer">'},
  { id:"cat",       name:"Cat",       emoji:"🐱", rarity:"Uncommon", weight:22, eatMs:15000, capture:0.32, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/cat.png" alt="cat">'},
, 
  { id:"fox",       name:"Fox",       emoji:"🦊", rarity:"Rare",     weight:12, eatMs:15000, capture:0.22, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/fox.png" alt="fox">'},
  { id:"panda",     name:"Panda",     emoji:"🐼", rarity:"Rare",     weight:12, eatMs:15000, capture:0.22, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/panda.png" alt="panda">'},
, 
  { id:"lion",      name:"Lion",      emoji:"🦁", rarity:"Epic",     weight: 6, eatMs:15000, capture:0.14, poopMin:2, poopMax:3,  isImage:true, imagepath:'<img src="images/lion.png" alt="lion">'},
  { id:"alligator", name:"Alligator", emoji:"🐊", rarity:"Epic",     weight: 6, eatMs:15000, capture:0.14, poopMin:2, poopMax:3,  isImage:true, imagepath:'<img src="images/alligator.png" alt="alligator">'},
];

