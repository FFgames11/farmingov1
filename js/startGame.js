/* =========================================================
   START GAME / INFO
========================================================= */
function startGame(){
  window.gameUIHidden = false; // re-enable toasts and modals
  menu.style.display = "none";
  gameDiv.style.display = "flex";
  showFarm();

  if(shouldShowTutorial()){
    startTutorial();
  }

  /* ── Target helpers ── */

  // Step 2: Profile picture circle
  function getProfileBtnPos(){
    const el = document.getElementById("profileBtn");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 3: Coin box (left pill only, not pet count)
  function getCoinBoxPos(){
    const el = document.getElementById("coinBox");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 4: XP bar container
  function getXPPos(){
    const el = document.getElementById("xpBarContainer");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 5: All currently unlocked empty tiles (bounding box around all of them)
  function getUnlockedEmptyTilesRect(){
    const farm = document.getElementById("farm");
    if(!farm) return null;
    const allTiles = Array.from(farm.querySelectorAll(".tile"));
    const emptyUnlocked = allTiles.filter(t =>
      !t.classList.contains("locked") && t.classList.contains("empty")
    );
    if(!emptyUnlocked.length){
      // Fallback: all unlocked tiles
      const unlocked = allTiles.filter(t => !t.classList.contains("locked"));
      if(!unlocked.length) return null;
      return boundingRectOfEls(unlocked);
    }
    return boundingRectOfEls(emptyUnlocked);
  }

  // Step 6: The crop that was just auto-planted (first grown tile)
  function getFirstGrownTileRect(){
    const farm = document.getElementById("farm");
    if(!farm) return null;
    const grownTile = farm.querySelector(".tile.grown");
    if(!grownTile) return null;
    const r = grownTile.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 7: Crops button in the bottom nav bar
  function getCropsNavBtnPos(){
    // The bottom nav #bottomBar is visible on the farm screen.
    // There are two #btnCrops (duplicate IDs) — querySelector gets the first one,
    // which is the zoo screen one. We need the one inside #bottomBar.
    const el = document.querySelector("#bottomBar #btnCrops")
            || document.querySelector("#bottomBar .bottomBtn");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 8: Wild-pet area (the farm wrap / event layer)
  function getFarmWrapPos(){
    const el = document.getElementById("farmWrap");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 9: The "Town" button asset on the farm screen (toTownBtn in farmcon)
  function getTownAssetBtnPos(){
    // .toTownBtn is the image-button in the farm screen that navigates to Town
    const el = document.querySelector(".toTownBtn");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }

  // Step 10: Library building asset in the town screen
  function getLibraryPos(){
    const el = document.getElementById("buildingLibrary");
    if(!el) return null;
    // Use the ::before pseudo-element visual area: larger than the element itself.
    // The building CSS sets the pseudo wider/taller, so we expand the rect slightly.
    const r = el.getBoundingClientRect();
    // buildingLibrary:before is left:-70px wide:523px — approximate visible area
    return {
      left:  r.left - 70,
      top:   r.top  - 30,
      width: Math.min(523, r.width + 100),
      height: r.height + 20
    };
  }

  // Step 11: Quest board building asset
  function getQuestBoardPos(){
    const el = document.getElementById("buildingQuestBoard");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    // buildingQuestBoard:before is left:-95px wide:453px
    return {
      left:  r.left - 95,
      top:   r.top  - 37,
      width: Math.min(453, r.width + 120),
      height: r.height + 20
    };
  }

  // Step 12: Arena building asset
  function getArenaPos(){
    const el = document.getElementById("buildingArena");
    if(!el) return null;
    const r = el.getBoundingClientRect();
    // buildingArena:before is right:-25px wide:295px
    return {
      left:  r.left - 25,
      top:   r.top  - 10,
      width: Math.min(295, r.width + 50),
      height: r.height + 20
    };
  }

  /* Helper: bounding box of multiple elements */
  function boundingRectOfEls(els){
    let minL=Infinity, minT=Infinity, maxR=-Infinity, maxB=-Infinity;
    for(const el of els){
      const r = el.getBoundingClientRect();
      if(r.left   < minL) minL = r.left;
      if(r.top    < minT) minT = r.top;
      if(r.right  > maxR) maxR = r.right;
      if(r.bottom > maxB) maxB = r.bottom;
    }
    return { left:minL, top:minT, width:maxR-minL, height:maxB-minT };
  }

  /* ── Tutorial steps ── */
  function buildTutorialSteps(){
    tutorialState.steps = [

      // 1. Welcome — no highlight, centered modal
      {
        title: "Mao the Cat",
        text:  "Hi! I'm Mao 🐱\nWelcome to Cat Farm!\n\nClick anywhere to continue.\nDouble-click to skip.",
        noHighlight: true
      },

      // 2. Profile — highlight the profile picture circle
      {
        title: "Your Profile",
        text:  "This is your profile picture.\nTap it to edit your name and title.",
        target: () => getProfileBtnPos(),
        placement: "right"
      },

      // 3. Coins — highlight the coin pill exactly
      {
        title: "Coins",
        text:  "These are your coins 🪙\nUse them to buy seeds and unlock tiles.",
        target: () => getCoinBoxPos(),
        placement: "below"
      },

      // 4. XP bar — highlight the XP bar container exactly
      {
        title: "Level & XP",
        text:  "This is your XP bar.\nHarvesting crops and cleaning poop earns XP.\nLevel up to earn bonus coins!",
        target: () => getXPPos(),
        placement: "below"
      },

      // 5. Farm tiles — highlight all unlocked empty tiles;
      //    onEnter forces a crop to fully grow so step 6 can target it
      {
        title: "Farm Tiles",
        text:  "These are your farm tiles 🌱\nTap an empty tile to plant a seed.\n(You need seeds in your Bag first.)",
        target: () => getUnlockedEmptyTilesRect(),
        placement: "above",
        onEnter: () => {
          // Auto-plant a fully grown crop on the first empty unlocked tile
          // so the next step can highlight it
          const farm = document.getElementById("farm");
          if(!farm) return;
          const allTiles = Array.from(farm.querySelectorAll(".tile"));
          for(let i = 0; i < tileStates.length; i++){
            const st = tileStates[i];
            if(!unlockedTiles[i]) continue;
            if(st.state === "empty"){
              // Plant with a very short grow time that's already finished
              const cropInfo = CROPS && CROPS[0];
              const emoji = cropInfo ? cropInfo.emoji : "🌽";
              st.state    = "grown";
              st.crop     = emoji;
              st.plantedAt = Date.now() - 10000;
              st.finishAt  = Date.now() - 1;
              break;
            }
          }
          if(typeof renderFarm === "function") renderFarm();
        }
      },

      // 6. Grown crop — highlight the exact grown tile
      {
        title: "Growth + READY ✨",
        text:  "When a crop is ready, you'll see a READY spark!\nTap it to harvest — you'll answer 1 English question.",
        target: () => getFirstGrownTileRect(),
        placement: "above"
      },

      // 7. Crops menu — highlight the Crops button in the BOTTOM NAV
      {
        title: "Crops Menu",
        text:  "Tap CROPS here in the bottom bar\nto buy seeds and choose what to plant.",
        target: () => getCropsNavBtnPos(),
        placement: "above"
      },

      // 8. Wild pets — spawn a decorative wild pet, highlight the farm area
      {
        title: "Wild Pets 🐾",
        text:  "Wild pets can wander onto your farm!\nTap them fast and answer a question to capture them.\nThey can also poop 💩 — clean it for coins.",
        target: () => getFarmWrapPos(),
        placement: "above",
        onEnter: () => {
          // Spawn a visual-only wild pet for the tutorial (it won't eat anything)
          if(typeof PET_TYPES !== "undefined" && PET_TYPES.length && !activeWildPet){
            const type = PET_TYPES[0];
            // Find a grown or planted tile to target
            let targetIdx = 0;
            for(let i = 0; i < tileStates.length; i++){
              if(unlockedTiles[i] && (tileStates[i].state === "grown" || tileStates[i].state === "planted")){
                targetIdx = i; break;
              }
            }
            if(typeof spawnWildPetEntity === "function"){
              spawnWildPetEntity(type, targetIdx);
              // Override eat timer so it never actually eats during tutorial
              if(activeWildPet){
                activeWildPet.eatEndAt = Date.now() + 999999999;
              }
            }
          }
        }
      },

      // 9. Town button — highlight the Town asset button on the farm screen
      {
        title: "Town 🏘️",
        text:  "Tap this to go to Town!\nThe Town has a Market, Library, Quest Board, and Arena.",
        target: () => getTownAssetBtnPos(),
        placement: "left",
        onEnter: () => {
          // Make sure we're on the farm so the toTownBtn is visible
          if(typeof showFarm === "function") showFarm();
          // Clean up the tutorial wild pet so it doesn't persist
          if(activeWildPet && typeof despawnWildPet === "function"){
            despawnWildPet();
          }
        }
      },

      // 10. Library — switch to town, highlight the library building asset
      {
        title: "Library 📚",
        text:  "The Library has a daily exam.\nPass it to earn extra coins and XP!",
        target: () => getLibraryPos(),
        placement: "right",
        onEnter: () => {
          if(typeof showTown === "function") showTown();
        }
      },

      // 11. Quest board — highlight the quest board building asset
      {
        title: "Quest Board 📋",
        text:  "Complete daily quests here for coins.\nFinish all quests to keep your streak bonus!",
        target: () => getQuestBoardPos(),
        placement: "right"
      },

      // 12. Arena — highlight the arena building asset
      {
        title: "Arena ⚔️",
        text:  "Challenge other players in the Arena!\nUse your captured pets to battle and earn rewards.",
        target: () => getArenaPos(),
        placement: "left"
      },

      // 13. Boss fight — no highlight, centered modal
      {
        title: "Boss Fights 🐷",
        text:  "Sometimes a Boss appears on your farm!\nIt's turn-based combat:\n• Normal attack = easier question\n• Heavy attack = harder question\nCorrect = deal damage. Wrong = lose your turn.",
        noHighlight: true,
        onEnter: () => {
          if(typeof showFarm === "function") showFarm();
        }
      },

      // 14. All set — no highlight, centered modal
      {
        title: "All Set! 🎉",
        text:  "You're ready to play Cat Farm!\nFarm crops, answer questions, collect pets 🐾\n\nGood luck and have fun!",
        noHighlight: true
      },
    ];
  }

  function startTutorial(){
    tutorialState.active = true;
    tutorialState.step   = 0;
    buildTutorialSteps();

    if(tut.overlay){
      tut.overlay.style.display = "block";
    }
    toast.style.display = "none";
    if(modal.style.display === "flex") closeModal();

    renderTutorialStep();

    // Click anywhere on the overlay to advance
    tut.overlay.onclick = (e)=>{
      e.preventDefault();
      advanceTutorial();
    };
    // Double-click anywhere to skip
    tut.overlay.ondblclick = (e)=>{
      e.preventDefault();
      endTutorial();
    };
    window.addEventListener("keydown", tutorialKeyHandler);
    window.addEventListener("resize", tutorialReflow);
  }

}


function openInfo(){
  showMessage("What's New", `
    <div class="resLine">Tutorial spotlight • Bigger quizbank • Boss fight</div>
    <div class="smallNote" style="text-align:left;">
      • Tutorial now aligns precisely to each UI element.<br>
      • Fixed quiz exploit: each question can only be answered once (instant lock).<br>
      • New turn-based boss fight: Pig 🐷 vs Scarecrow.<br>
      • Practice removed. Library exam added (daily).
    </div>
  `);
}

function openLeaderboard(){
  showMessage("Leaderboard", `<div class="smallNote">Leaderboard coming soon!</div>`);
}

let activeScreen = "farm";
function showFarm(){
  activeScreen = "farm";
  farmScreen.style.display = "flex";
  townScreen.style.display = "none";
  if(zooScreen) zooScreen.style.display = "none";
}
function showTown(which){
  activeScreen = "town";
  farmScreen.style.display  = "none";
  townScreen.style.display  = "flex";
  if(zooScreen) zooScreen.style.display = "none";
}

function showZoo(){
  activeScreen = "zoo";
  farmScreen.style.display  = "none";
  townScreen.style.display  = "none";
  if(zooScreen) zooScreen.style.display = "flex";
  requestAnimationFrame(()=>renderZooRoamingPets());
}

function toggleTown(){
  if(activeScreen === "farm") showTown();
  else if(activeScreen === "town") showFarm();
  else showFarm(); // from Zoo -> Farm
}

function resetTutorial(){
  try{ localStorage.removeItem(TUTORIAL_KEY); }catch(e){}
  closeModal();
  startTutorial();
}