/* =========================================================
   DAILY QUESTS (COINS ONLY)
========================================================= */
let dailyQuests = [];
let dailyStreak = 0;
let lastCompleteDate = "";

function loadDaily(){
  try{
    const rawQ = localStorage.getItem(QUEST_KEY);
    if(rawQ){
      const arr = JSON.parse(rawQ);
      if(Array.isArray(arr)) dailyQuests = arr;
    }
  }catch(e){}
  dailyStreak = parseInt(localStorage.getItem(STREAK_KEY)||"0",10) || 0;
  lastCompleteDate = localStorage.getItem(LAST_COMPLETE_KEY) || "";
}
function saveDaily(){
  try{ localStorage.setItem(QUEST_KEY, JSON.stringify(dailyQuests)); }catch(e){}
  try{ localStorage.setItem(STREAK_KEY, String(dailyStreak)); }catch(e){}
  try{ localStorage.setItem(LAST_COMPLETE_KEY, lastCompleteDate); }catch(e){}
}
function generateDailyQuests(){
  dailyQuests = [
    { id:"q_plant",  title:"Plant 5 seeds",      type:"plant",   target:5, progress:0, rewardCoins:25, claimed:false },
    { id:"q_harvest",title:"Harvest 5 crops",    type:"harvest", target:5, progress:0, rewardCoins:40, claimed:false },
    { id:"q_answer", title:"Answer 5 questions", type:"answer",  target:5, progress:0, rewardCoins:30, claimed:false },
    { id:"q_capture",title:"Capture 1 pet",      type:"capture", target:1, progress:0, rewardCoins:60, claimed:false },
    { id:"q_clean",  title:"Clean 3 poops",      type:"clean",   target:3, progress:0, rewardCoins:35, claimed:false },
    { id:"q_all",    title:"Complete all quests",type:"all",     target:1, progress:0, rewardCoins:90, claimed:false }
  ];
  saveDaily();
}
function initDailySystem(){
  const tk = todayKey();
  const savedDate = localStorage.getItem(QUEST_DATE_KEY) || "";
  if(savedDate !== tk || !dailyQuests.length){
    generateDailyQuests();
    try{ localStorage.setItem(QUEST_DATE_KEY, tk); }catch(e){}
  }
  updateAllQuestMeta();
}
function updateAllQuestMeta(){
  const allQuest = dailyQuests.find(q=>q.type==="all");
  if(!allQuest) return;
  const base = dailyQuests.filter(q=>q.type!=="all");
  allQuest.progress = base.every(q=>q.claimed) ? 1 : 0;
  saveDaily();
}
function questProgress(type, amount){
  let changed = false;
  for(const q of dailyQuests){
    if(q.type === type && !q.claimed){
      q.progress = Math.min(q.target, (q.progress||0) + (amount||0));
      changed = true;
    }
  }
  if(changed){
    saveDaily();
    updateAllQuestMeta();
  }
}
function claimQuest(id){
  const q = dailyQuests.find(x=>x.id===id);
  if(!q || q.claimed) return;
  if((q.progress||0) < q.target) return;

  coins += q.rewardCoins || 0;
  q.claimed = true;

  if(q.type === "all"){
    const tk = todayKey();
    if(lastCompleteDate){
      const last = new Date(lastCompleteDate+"T00:00:00");
      const now = new Date(tk+"T00:00:00");
      const diffDays = Math.round((now-last)/(24*60*60*1000));
      dailyStreak = (diffDays===1) ? (dailyStreak+1) : 1;
    }else{
      dailyStreak = 1;
    }
    lastCompleteDate = tk;
  }

  saveDaily();
  updateAllQuestMeta();
  saveState();
  updateUI();
  openQuestBoard();
}

