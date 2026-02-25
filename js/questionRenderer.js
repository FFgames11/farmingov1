/* =========================================================
   ANTI-EXPLOIT QUESTION RENDERER (ONE-ANSWER LOCK)
========================================================= */
function renderQuestionUI(qObj, containerId, onAnswered){
  const root = document.getElementById(containerId);
  if(!root) return;

  // Hard lock per question instance:
  root.dataset.answered = "0";

  const answerOnce = (ans) => {
    if(root.dataset.answered === "1") return;
    root.dataset.answered = "1";

    // Disable all buttons/inputs inside container immediately (anti-spam)
    const btns = root.querySelectorAll("button");
    btns.forEach(b => b.disabled = true);

    const inputs = root.querySelectorAll("input, textarea");
    inputs.forEach(i => i.disabled = true);

    onAnswered(ans);
  };

  if(qObj.type === "fill"){
    const prompt = qObj.prompt || "";
    root.innerHTML = `
      <div class="questionItem">${escapeHtml(prompt)}</div>
      ${qObj.hint ? `<div class="smallNote" style="text-align:left;margin-top:6px;">Hint: ${escapeHtml(qObj.hint)}</div>` : ""}
      <div class="fillWrap">
        <input id="${containerId}_input" placeholder="Type your answer">
        <button id="${containerId}_submit">Submit</button>
      </div>
    `;
    const input = document.getElementById(containerId+"_input");
    const submit = document.getElementById(containerId+"_submit");
    submit.onclick = () => answerOnce(input ? input.value : "");
    return;
  }

  const questionText = qObj.q || "";
  const options = qObj.o || [];
  root.innerHTML = `
    <div style="margin-top:10px;font-weight:900;color:#3b2716;">${escapeHtml(questionText)}</div>
    <div class="choiceList" id="${containerId}_choices"></div>
  `;
  const list = document.getElementById(containerId+"_choices");
  options.forEach(opt=>{
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.innerHTML = `<span class="choiceDot"></span><span class="choiceText">${escapeHtml(opt)}</span>`;
    btn.onclick = ()=> answerOnce(opt);
    list.appendChild(btn);
  });
}

