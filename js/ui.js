/* =========================================================
   UI / NAV
========================================================= */
const menu = $("menu");
const gameDiv = $("game");

const farmScreen = $("farmScreen");
const townScreen = $("townScreen");
const zooScreen = $("zooScreen");
const townBtnIcon = $("townBtnIcon");
const toolStrip = $("toolStrip");
const bottomBar = $("bottomBar");
const toolsArrow = $("toolsArrow");

//toggle tool
const toolsToggleBtn = $("toolsToggleBtn");
const toolsPanel = $("toolsPanel");
const currentToolIcon = $("currentToolIcon");

function toggleToolsPanel(){
  if(!toolsPanel) return;

  const isOpen = toolsPanel.classList.toggle("toolsOpen");

  if (toolsArrow) {
    toolsArrow.classList.toggle("toolsOpenArrow", isOpen);
  }
}

if (toolsToggleBtn) {
  toolsToggleBtn.onclick = toggleToolsPanel;
}
//end of toggle tool

// function updateToolStripPosition(){
//   if(!toolStrip || !bottomBar) return;
//   // place tool strip right above the bottom nav buttons
//   const r = bottomBar.getBoundingClientRect();
//   const offset = Math.max(12, window.innerHeight - r.top + 10);
//   toolStrip.style.bottom = offset + "px";
// }
// window.addEventListener("resize", updateToolStripPosition);


// Zoo screen elements
const zooYard = $("zooYard");
const zooRoamLayer = $("zooRoamLayer");
const zooEmpty = $("zooEmpty");
const zooStats = $("zooStats");

