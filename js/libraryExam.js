/* =========================================================
   LIBRARY EXAM (DAILY)
========================================================= */
function getExamState(){
  try{
    const raw = localStorage.getItem(LIB_EXAM_KEY);
    if(!raw) return {};
    const st = JSON.parse(raw);
    return st && typeof st === "object" ? st : {};
  }catch(e){
    return {};
  }
}
function setExamState(st){
  try{ localStorage.setItem(LIB_EXAM_KEY, JSON.stringify(st||{})); }catch(e){}
}

function openLibrary(){
  const st = getExamState();
  const tk = todayKey();
  const bDone = st?.[tk]?.beginner || false;
  const iDone = st?.[tk]?.intermediate || false;
  const aDone = st?.[tk]?.advanced || false;

  openModal("Library", `
    <div class="resLine">Library Exam (1 per difficulty / day)</div>
    <div class="smallNote" style="text-align:left;">
      5 questions. Higher difficulty = higher reward.<br>
      Anti-exploit is enforced (one answer per question).
    </div>

    <div class="modalGrid" style="margin-top:10px;">
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">📗</div>
          <div class="itemMeta">
            <div class="itemName">Beginner Exam</div>
            <div class="itemSub">Reward: +40 coins, +20 XP (pass 4/5)</div>
            <div class="badgeRow"><div class="badge">${bDone ? "Done today" : "Available"}</div></div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${bDone ? "disabled" : ""} onclick="startLibraryExam('beginner')"><span><small data-title='${bDone ? "Done" : "Start"}'>${bDone ? "Done" : "Start"}</small></span></button>          
        </div>
      </div>

      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">📘</div>
          <div class="itemMeta">
            <div class="itemName">Intermediate Exam</div>
            <div class="itemSub">Reward: +70 coins, +35 XP (pass 4/5)</div>
            <div class="badgeRow"><div class="badge">${iDone ? "Done today" : "Available"}</div></div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${iDone ? "disabled" : ""} onclick="startLibraryExam('intermediate')"><span><small data-title='${iDone ? "Done" : "Start"}'>${iDone ? "Done" : "Start"}</small></span></button>
        </div>
      </div>

      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">📕</div>
          <div class="itemMeta">
            <div class="itemName">Advanced Exam</div>
            <div class="itemSub">Reward: +110 coins, +55 XP (pass 4/5)</div>
            <div class="badgeRow"><div class="badge">${aDone ? "Done today" : "Available"}</div></div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${aDone ? "disabled" : ""} onclick="startLibraryExam('advanced')"><span><small data-title='${aDone ? "Done" : "Start"}'>${aDone ? "Done" : "Start"}</small></span></button>
        </div>
      </div>
    </div>
  `);
}

function startLibraryExam(diff){
  const st = getExamState();
  const tk = todayKey();
  st[tk] = st[tk] || {};
  if(st[tk][diff]){ openLibrary(); return; }

  const exam = {
    diff,
    idx: 0,
    total: 5,
    correct: 0,
    active: true
  };

  renderLibraryExam(exam);
}

function renderLibraryExam(exam){
  if(!exam || !exam.active) return;

  const q = pickQuestion(exam.diff);
  let resolved = false;

  openModal(`Library Exam (${tileLevelLabel(exam.diff)})`, `
    <div class="resLine">Question ${exam.idx+1} / ${exam.total} • Score: ${exam.correct}</div>
    <div id="libQ"></div>
    <div id="libFB" class="quizFeedback"></div>
    <div class="smallNote">Pass = 4/5 correct</div>
  `);

  renderQuestionUI(q, "libQ", (ans)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const ok = normalizeAnswer(ans) === normalizeAnswer(q.a);
    const fb = $("libFB");
    if(ok){
      exam.correct++;
      fb.className = "quizFeedback good";
      fb.innerHTML = "Correct!";
    }else{
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Wrong. Correct: <b>${escapeHtml(q.a)}</b>`;
    }

    exam.idx++;

    setTimeout(()=>{
      if(exam.idx >= exam.total){
        finishLibraryExam(exam);
      }else{
        renderLibraryExam(exam);
      }
    }, 700);
  });
}

function finishLibraryExam(exam){
  const pass = exam.correct >= 4;

  let coinReward = 0;
  let xpReward = 0;

  if(exam.diff === "beginner"){ coinReward = 40; xpReward = 20; }
  if(exam.diff === "intermediate"){ coinReward = 70; xpReward = 35; }
  if(exam.diff === "advanced"){ coinReward = 110; xpReward = 55; }

  if(pass){
    coins += coinReward;
    gainXP(xpReward);
  }

  const st = getExamState();
  const tk = todayKey();
  st[tk] = st[tk] || {};
  st[tk][exam.diff] = true;
  setExamState(st);

  saveState();
  updateUI();

  showMessage("Library Exam Result", `
    <div class="resLine">${pass ? "PASS ✅" : "FAIL ❌"} • Score: <b>${exam.correct}/5</b></div>
    <div class="smallNote">
      ${pass ? `Rewards: +${coinReward} coins, +${xpReward} XP` : `No rewards this time. Try again tomorrow!`}
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;" onclick="openLibrary()">Back to Library</button>
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>
  `);
}

