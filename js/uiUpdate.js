/* =========================================================
   UI UPDATE
========================================================= */
function updateXPUI() {
  const needed = xpNeededForLevel(level);
  const percent = clamp(Math.floor((xp / needed) * 100), 0, 100);
  $("xpBar").style.width = percent + "%";
  $("xpLevelText").textContent = `${xp}/${needed}`;
  $("xpLevelText").setAttribute('data-title', `${xp}/${needed}`);
  $("LevelTxt").textContent = `${level}`;
  $("LevelTxt").setAttribute('data-title', `${level}`);
}
function updateFenceUI() {
  const f1s = document.querySelectorAll(".fence1");
  const f2s = document.querySelectorAll(".fence2");

  const setSrc = (els, src) => {
    els.forEach(el => {
      el.src = src;
      el.style.display = ""; // Reset display in case onerror hid it
    });
  };

  let src = "images/fence.png";
  if (selectedFence === "wood") {
    src = "images/fence_wood_placeholder.png";
  } else if (selectedFence === "stone") {
    src = "images/fence_stone_placeholder.png";
  }

  setSrc(f1s, src);
  setSrc(f2s, src);
}
function updateUI() {
  $("coins").textContent = String(coins);
  $("coins").setAttribute('data-title', String(coins));
  $("petCount").textContent = String(zooPets.length);
  $("petCount").setAttribute('data-title', String(zooPets.length));
  $("playerNameDisplay").textContent = playerName;
  $("playerNameDisplay").setAttribute('data-title', playerName);
  $("playerTitleDisplay").textContent = playerTitle;
  updateXPUI();
  updateFenceUI();
}

