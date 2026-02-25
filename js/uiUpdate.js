/* =========================================================
   UI UPDATE
========================================================= */
function updateXPUI(){
  const needed = xpNeededForLevel(level);
  const percent = clamp(Math.floor((xp / needed) * 100), 0, 100);
  $("xpBar").style.width = percent + "%";
  $("xpLevelText").textContent = `${xp}/${needed}`;
  $("xpLevelText").setAttribute('data-title',`${xp}/${needed}`);
  $("LevelTxt").textContent = `${level}`;
  $("LevelTxt").setAttribute('data-title',`${level}`);
}
function updateUI(){
  $("coins").textContent = String(coins);
  $("coins").setAttribute('data-title',String(coins));
  $("petCount").textContent = String(zooPets.length);
  $("petCount").setAttribute('data-title',String(zooPets.length));
  $("playerNameDisplay").textContent = playerName;
  $("playerNameDisplay").setAttribute('data-title',playerName);
  $("playerTitleDisplay").textContent = playerTitle;
  updateXPUI();
}

