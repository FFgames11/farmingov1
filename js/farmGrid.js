/* =========================================================
   FARM GRID BUILD
========================================================= */
const farm = $("farm");
const roamLayer = $("roamLayer");
const eventLayer = $("eventLayer");

const tiles = [];
const badgeEls = [];
const cropEls = [];
const growWrapEls = [];
const growFillEls = [];
const readyTagEls = [];
const readySparkEls = [];

function initTiles(){
  farm.innerHTML = "";
  tiles.length = 0; badgeEls.length=0; cropEls.length=0;
  growWrapEls.length=0; growFillEls.length=0; readyTagEls.length=0; readySparkEls.length=0;

  for(let i=0;i<TILE_COUNT;i++){
    const tile = document.createElement("div");
    tile.className = unlockedTiles[i] ? "tile" : "tile locked";
    tile.onclick = ()=> clickTile(i);

    const badge = document.createElement("div");
    badge.className = "tileBadge";

    const crop = document.createElement("div");
    crop.className = "tileCrop";
    crop.textContent = unlockedTiles[i] ? '<img src="images/emptyplot.png" alt="empty">' : "🔒";

    const growWrap = document.createElement("div");
    growWrap.className = "growWrap";
    const growFill = document.createElement("div");
    growFill.className = "growFill";
    growWrap.appendChild(growFill);

    const readyTag = document.createElement("div");
    readyTag.className = "readyTag";
    readyTag.textContent = "";

    const readySpark = document.createElement("div");
    readySpark.className = "readySparkle";
    readySpark.innerHTML = '<div class="sparkCon">';

    tile.appendChild(badge);
    tile.appendChild(crop);
    tile.appendChild(growWrap);
    tile.appendChild(readyTag);
    tile.appendChild(readySpark);

    farm.appendChild(tile);

    tiles.push(tile);
    badgeEls.push(badge);
    cropEls.push(crop);
    growWrapEls.push(growWrap);
    growFillEls.push(growFill);
    readyTagEls.push(readyTag);
    readySparkEls.push(readySpark);
  }

  renderFarm();
}

function unlockedCount(){
  return unlockedTiles.filter(Boolean).length;
}

function renderFarm(){
  const now = Date.now();

  for(let i=0;i<TILE_COUNT;i++){
    const t = tiles[i];
    const st = tileStates[i];

    t.classList.remove("planted","grown");

    // defaults
    badgeEls[i].style.display = "none";
    growWrapEls[i].style.display = "none";
    readyTagEls[i].style.display = "none";
    readySparkEls[i].style.display = "none";

    if(!unlockedTiles[i]){
      t.classList.add("locked");
      cropEls[i].innerHTML = '<img src="images/tilecoin.png" alt="tilecoin"> <span data-title="200">200</span>';
      continue;
    }

    t.classList.remove("locked");

    if(st.state === "empty"){
      cropEls[i].innerHTML = '<img src="images/emptyplot.png" alt="empty">';
      continue;
    }

    const c = cropByEmoji(st.crop);
    const lvl = c ? c.level : "beginner";
    badgeEls[i].style.display = "block";
    badgeEls[i].textContent = tileLevelLabel(lvl);

    if(st.state === "planted"){
      t.classList.add("planted");
      
      // NEW IMAGE LOGIC
      if(c && c.isImage){
        cropEls[i].innerHTML = `<img src="${c.seedling}">`;
      } else {
        cropEls[i].textContent = st.crop;
      }

      // growth progress indicator
      if(st.plantedAt && st.finishAt && st.finishAt > st.plantedAt){
        const pct = clamp((now - st.plantedAt) / (st.finishAt - st.plantedAt), 0, 1);
        growWrapEls[i].style.display = "block";
        growFillEls[i].style.width = Math.floor(pct*100) + "%";
      }
    }

    if(st.state === "grown"){
      t.classList.add("grown");
      
      // MODIFIED: Support image rendering for specific crops like carrots
      if(c && c.isImage){
        cropEls[i].innerHTML = `<img src="${c.grown}">`;
      } else {
        cropEls[i].textContent = st.crop;
      }
      readyTagEls[i].style.display = "block";
      readySparkEls[i].style.display = "block";
      growWrapEls[i].style.display = "block";
      growFillEls[i].style.width = "100%";
    }

    // auto-grow
    if(st.state === "planted" && st.finishAt > 0 && now >= st.finishAt){
      st.state = "grown";
      st.finishAt = 0;
    }
  }

  applyMoveHighlights();


  // Pets no longer roam on the farm (they roam in the Zoo screen).
}

