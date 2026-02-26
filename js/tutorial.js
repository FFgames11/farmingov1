/* =========================================================
   TUTORIAL (SPOTLIGHT POINTING AT UI)
========================================================= */
const TUTORIAL_KEY = "catfarm_tutorial_done_v2";
let tutorialState = { active:false, step:0, steps:[] };

const tut = {
  overlay: $("tutorialOverlay"),
  hi: $("tutorialHighlight"),
  bubble: $("tutorialBubble"),
  title: $("tutorialTitle"),
  text: $("tutorialText"),
  arrow: $("tutorialArrowSvg"),
};

function shouldShowTutorial(){
  try{
    // Check localStorage key first
    if(localStorage.getItem(TUTORIAL_KEY)) return false;
    // Also check save state directly in case cloud save was applied
    // but the localStorage key hasn't been written yet
    const raw = localStorage.getItem("catfarm_state_v5");
    if(raw){ const st = JSON.parse(raw); if(st && st.tutorialDone) return false; }
    return true;
  }
  catch(e){ return true; }
}

function tutorialTargetRect(target){
  if(!target) return null;
  if(typeof target === "object" && target.left!=null && target.top!=null && target.width!=null && target.height!=null){
    return target;
  }
  if(target instanceof Element){
    const r = target.getBoundingClientRect();
    if(r.width < 2 || r.height < 2) return null;
    return { left:r.left, top:r.top, width:r.width, height:r.height };
  }
  return null;
}

function viewportRect(){
  return { w: window.innerWidth, h: window.innerHeight };
}

/*
  positionTutorial
  ─ noHighlight=true  → blocker shows dark bg; highlight is hidden (no box-shadow);
                         bubble is centered; no arrow.
  ─ noHighlight=false → blocker is transparent; highlight's box-shadow creates both
                         the dark overlay AND the transparent cutout over the target.
*/
function positionTutorial(rect, placementHint, noHighlight){
  const pad = 10;
  const v = viewportRect();
  const blocker = tut.overlay ? tut.overlay.querySelector(".tutorialBlocker") : null;

  if(noHighlight){
    // Solid dark background from the blocker
    if(blocker) blocker.style.background = "rgba(0,0,0,0.55)";

    // Hide the highlight completely — no box-shadow, moved off-screen
    tut.hi.style.left      = "-9999px";
    tut.hi.style.top       = "-9999px";
    tut.hi.style.width     = "0px";
    tut.hi.style.height    = "0px";
    tut.hi.style.boxShadow = "none";

    // No arrow
    tut.arrow.innerHTML = "";

    // Center the bubble
    tut.bubble.style.left    = "10px";
    tut.bubble.style.top     = "10px";
    tut.bubble.style.display = "flex";
    const b0 = tut.bubble.getBoundingClientRect();
    tut.bubble.style.left = Math.round((v.w - b0.width)  / 2) + "px";
    tut.bubble.style.top  = Math.round((v.h - b0.height) / 2) + "px";
    return;
  }

  // ── Highlight mode ──
  // Blocker is transparent — the highlight's box-shadow does the darkening
  if(blocker) blocker.style.background = "transparent";

  // Restore box-shadow in case it was removed in a noHighlight step
  tut.hi.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.55)";

  const hPad = 8;
  const hl = Math.max(6, rect.left - hPad);
  const ht = Math.max(6, rect.top  - hPad);
  const hw = Math.min(v.w - 12, rect.width  + hPad * 2);
  const hh = Math.min(v.h - 12, rect.height + hPad * 2);

  tut.hi.style.left   = hl + "px";
  tut.hi.style.top    = ht + "px";
  tut.hi.style.width  = hw + "px";
  tut.hi.style.height = hh + "px";

  // Measure bubble
  tut.bubble.style.left    = "10px";
  tut.bubble.style.top     = "10px";
  tut.bubble.style.display = "flex";
  const bRect0 = tut.bubble.getBoundingClientRect();
  const bw = bRect0.width;
  const bh = bRect0.height;

  const centerX = hl + hw / 2;
  const centerY = ht + hh / 2;

  const candidates = [
    { key:"below", x: clamp(centerX - bw/2, pad, v.w - bw - pad), y: ht + hh + 14 },
    { key:"above", x: clamp(centerX - bw/2, pad, v.w - bw - pad), y: ht - bh - 14 },
    { key:"right", x: hl + hw + 14,                                y: clamp(centerY - bh/2, pad, v.h - bh - pad) },
    { key:"left",  x: hl - bw - 14,                                y: clamp(centerY - bh/2, pad, v.h - bh - pad) },
  ];

  const preferOrder = placementHint
    ? [placementHint, "below", "above", "right", "left"]
    : ["below", "above", "right", "left"];

  let best = null;
  for(const k of preferOrder){
    const c = candidates.find(x => x.key === k);
    if(!c) continue;
    const fits = (c.x >= pad && c.x + bw <= v.w - pad && c.y >= pad && c.y + bh <= v.h - pad);
    if(fits){ best = c; break; }
  }
  if(!best){
    let bestScore = Infinity;
    for(const c of candidates){
      const overflowX = Math.max(0, pad - c.x) + Math.max(0, (c.x + bw) - (v.w - pad));
      const overflowY = Math.max(0, pad - c.y) + Math.max(0, (c.y + bh) - (v.h - pad));
      const score = overflowX + overflowY;
      if(score < bestScore){ bestScore = score; best = c; }
    }
  }

  const bx = clamp(best.x, pad, v.w - bw - pad);
  const by = clamp(best.y, pad, v.h - bh - pad);

  tut.bubble.style.left = bx + "px";
  tut.bubble.style.top  = by + "px";

  // Arrow removed
}

function drawArrow({hl,ht,hw,hh,bx,by,bw,bh}){ return; // Arrow removed

  const v = viewportRect();
  const start = { x: bx + bw/2, y: by + bh/2 };
  const end   = { x: hl + hw/2, y: ht + hh/2 };

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let sx = start.x, sy = start.y;
  if(Math.abs(dx) > Math.abs(dy)){
    sx = dx > 0 ? (bx + bw) : bx;
    sy = clamp(start.y, by + 14, by + bh - 14);
  }else{
    sx = clamp(start.x, bx + 14, bx + bw - 14);
    sy = dy > 0 ? (by + bh) : by;
  }

  const ex = end.x, ey = end.y;
  const vx = ex - sx, vy = ey - sy;
  const len = Math.max(1, Math.hypot(vx, vy));
  const ux = vx / len, uy = vy / len;

  const headLen = 10;
  const hx = ex - ux * headLen;
  const hy = ey - uy * headLen;

  const px = -uy, py = ux;
  const headW = 6;

  const p1 = { x: ex, y: ey };
  const p2 = { x: hx + px*headW, y: hy + py*headW };
  const p3 = { x: hx - px*headW, y: hy - py*headW };

  const toVB = (x,y) => ({ x:(x/v.w)*100, y:(y/v.h)*100 });
  const a  = toVB(sx, sy);
  const b  = toVB(hx, hy);
  const c1 = toVB(p1.x, p1.y);
  const c2 = toVB(p2.x, p2.y);
  const c3 = toVB(p3.x, p3.y);

  tut.arrow.innerHTML = `
    <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
          stroke="rgba(255,255,255,0.92)" stroke-width="1.2" />
    <polygon points="${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y}"
             fill="rgba(255,255,255,0.92)"></polygon>
  `;
}

function tutorialKeyHandler(e){
  if(!tutorialState.active) return;
  if(e.key === "Escape") endTutorial();
  if(e.key === "Enter" || e.key === " ") advanceTutorial();
}

function tutorialReflow(){
  if(!tutorialState.active) return;
  renderTutorialStep(true);
}

function renderTutorialStep(isReflow=false){
  if(!tutorialState.active) return;
  const s = tutorialState.steps[tutorialState.step];
  if(!s) return;

  if(typeof s.onEnter === "function" && !isReflow){
    s.onEnter();
  }

  tut.title.textContent = s.title || "Tutorial";
  tut.text.textContent  = s.text  || "";

  requestAnimationFrame(()=>{
    const noHighlight = !!s.noHighlight;

    if(noHighlight){
      positionTutorial(null, null, true);
      return;
    }

    const target = (typeof s.target === "function") ? s.target() : s.target;
    const rect   = tutorialTargetRect(target);

    if(!rect){
      // Fallback: center with no highlight
      positionTutorial(null, null, true);
      return;
    }

    positionTutorial(rect, s.placement || "below", false);
  });
}

function advanceTutorial(){
  if(!tutorialState.active) return;
  tutorialState.step++;
  if(tutorialState.step >= tutorialState.steps.length){
    endTutorial();
    return;
  }
  renderTutorialStep();
}

function endTutorial(){
  tutorialState.active = false;
  if(tut.overlay) tut.overlay.style.display = "none";
  try{ localStorage.setItem(TUTORIAL_KEY, "1"); }catch(e){}
  window.removeEventListener("keydown", tutorialKeyHandler);
  window.removeEventListener("resize", tutorialReflow);
}

function tutorialIsActive(){
  return !!tutorialState.active;
}