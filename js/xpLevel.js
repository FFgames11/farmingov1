/* =========================================================
   XP / LEVEL
========================================================= */
function gainXP(amount){
  xp += amount;
  let needed = xpNeededForLevel(level);
  while(xp >= needed){
    xp -= needed;
    level++;
    needed = xpNeededForLevel(level);
    coins += 10 + Math.floor(level*2);
    showMessage("Level Up! 🎉", `<div class="smallNote">You reached <b>Level ${level}</b>.<br>Bonus coins added!</div>`);
  }
}

