window.addEventListener("DOMContentLoaded", () => {
const SUPABASE_URL = "https://eqwdjutsmellvbqjvhzx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2RqdXRzbWVsbHZicWp2aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjYzMTcsImV4cCI6MjA4NzE0MjMxN30.0U10MPyhKwchFuTdLEBOvSjx4yD6MhUKU9_lKuMnFb0";


// --- Supabase init ---
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// --- Auth UI helpers ---
const authModal = document.getElementById("authModal");
const authStatus = document.getElementById("authStatus");

function openAuthModal() {
  authModal.style.display = "flex";
}
function closeAuthModal() {
  authModal.style.display = "none";
}
document.getElementById("openAuth").addEventListener("click", openAuthModal);
document.getElementById("authClose").addEventListener("click", closeAuthModal);
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

function setAuthStatus(msg) {
  authStatus.textContent = msg || "";
}

// --- Auth actions ---
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Buttons
document.getElementById("btnSignup").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  try {
    setAuthStatus("Signing up...");
    await signUp(email, password);
    setAuthStatus("Signed up. Now log in.");
  } catch (err) {
    setAuthStatus(err.message);
  }
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  try {
    setAuthStatus("Logging in...");
    await signIn(email, password);
    setAuthStatus("Logged in!");

    // After login: load cloud save and apply it
    const saved = await loadFromCloud();
    if (saved) {
      applyGameState(saved); // YOU implement this to set coins/inventory/etc
      setAuthStatus("Loaded cloud save.");
    } else {
      setAuthStatus("No cloud save yet.");
    }

    closeAuthModal();
  } catch (err) {
    setAuthStatus(err.message);
  }
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  try {
    await signOut();
    setAuthStatus("Logged out.");
  } catch (err) {
    setAuthStatus(err.message);
  }
});

// Keep status updated if session changes
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    setAuthStatus(`Logged in: ${session.user.email}`);
  } else {
    setAuthStatus("Not logged in.");
  }
});


async function saveToCloud(gameStateObj) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return; // silently skip if not logged in

  const { error } = await supabase
    .from("game_saves")
    .upsert({ user_id: user.id, save: gameStateObj }, { onConflict: "user_id" });

  if (error) console.error("saveToCloud error:", error.message);
}

async function loadFromCloud() {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("game_saves")
    .select("save")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // If no row exists yet, return null
    if (error.code === "PGRST116") return null;
    console.error("loadFromCloud error:", error.message);
    return null;
  }

  return data?.save ?? null;
}


function getGameState() {
  return {
    coins: window.coins,
    inventory: window.inventory,
    farmTiles: window.farmTiles,
    streak: window.streak
  };
}



function applyGameState(state) {
  if (state.coins != null) window.coins = state.coins;
  if (state.inventory != null) window.inventory = state.inventory;
  if (state.farmTiles != null) window.farmTiles = state.farmTiles;
  if (state.streak != null) window.streak = state.streak;

  // IMPORTANT: call whatever you use to redraw UI
  if (typeof renderGame === "function") renderGame();
}


setInterval(() => {
  const state = getGameState();
  saveToCloud(state);
}, 30000);

});


/* =========================================================
   CORE UTIL
========================================================= */
const $ = (id) => document.getElementById(id);
const modal = $("modal");
const modalTitle = $("modalTitle");
const modalContent = $("modalContent");
const toast = $("toast");
const toastText = $("toastText");

function escapeHtml(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function openModal(title, html){
  if(tutorialState?.active) return; // prevent random popups during tutorial
  modal.style.display = "flex";
  modalTitle.textContent = title;
  modalTitle.setAttribute('data-title', title);
  modalContent.innerHTML = html;
}
function closeModal(){
  modal.style.display = "none";
  // resume only if a quiz paused the wild pet
  if(activeWildPet && activeWildPet.paused){
    const now = Date.now();
    const pausedFor = now - activeWildPet.pauseStartedAt;
    activeWildPet.eatEndAt += pausedFor;
    activeWildPet.paused = false;
    activeWildPet.pauseStartedAt = 0;
  }
}
function showMessage(title, html){ openModal(title, html); }
function normalizeAnswer(s){ return String(s||"").trim().toLowerCase().replace(/\s+/g," "); }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function weightedPick(list){
  const total = list.reduce((sum,x)=>sum+(x.weight||1),0);
  let r = Math.random() * total;
  for(const x of list){
    r -= (x.weight||1);
    if(r <= 0) return x;
  }
  return list[list.length-1];
}
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function showToast(msg, ms=1100){
  toastText.textContent = msg;
  toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.style.display="none", ms);
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

/* =========================================================
   GAME BALANCE
========================================================= */
const LEVELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

const CROPS = [
  // MODIFIED: Carrot now uses images for seedling and grown states
  { emoji:"🥕", name:"Carrot", isImage:true, seedling:"images/seedling.png", grown:"images/carrot.png", level:"beginner", seedCost: 2, growMs: 25000, harvestCoins: 4, harvestXP: 8, unlockLevel: 1 },
  { emoji:"🌽", name:"Corn",  isImage: true, seedling:"images/seedling.png",    level:"beginner",     seedCost: 3, grown:"images/corn.png", growMs: 45000, harvestCoins: 5,  harvestXP: 9,  unlockLevel: 1 },
  { emoji:"🍅", name:"Tomato",  isImage: true, seedling:"images/seedling.png",   level:"intermediate", seedCost: 5, grown:"images/tomato.png", growMs: 70000, harvestCoins: 9,  harvestXP: 14, unlockLevel: 2 },
  { emoji:"🧅", name:"Onion",   isImage: true, seedling:"images/seedling.png",   level:"intermediate", seedCost: 6, grown:"images/onion.png", growMs: 90000, harvestCoins: 10, harvestXP: 15, unlockLevel: 3 },
  { emoji:"🎃", name:"Pumpkin",  isImage: true, seedling:"images/seedling.png",  level:"advanced",     seedCost: 8, grown:"images/pumpkin.png", growMs:120000, harvestCoins: 14, harvestXP: 22, unlockLevel: 4 },
];

const LIMITED_SEEDS = [
  { emoji:"🥦", name:"Broccoli",   level:"beginner",     weight:45, seedCost:0, growMs: 35000, harvestCoins: 6,  harvestXP: 10 },
  { emoji:"🍓", name:"Strawberry", level:"intermediate", weight:26, seedCost:0, growMs: 85000, harvestCoins: 12, harvestXP: 18 },
  { emoji:"🍇", name:"Grapes",     level:"advanced",     weight:12, seedCost:0, growMs:130000, harvestCoins: 18, harvestXP: 28 },
  { emoji:"🌶️", name:"Chili",     level:"advanced",     weight: 6, seedCost:0, growMs:160000, harvestCoins: 22, harvestXP: 32 },
  { emoji:"🍄", name:"Truffle",    level:"advanced",     weight: 1, seedCost:0, growMs:220000, harvestCoins: 35, harvestXP: 55 },
];

function cropByEmoji(emoji){
  return CROPS.find(c=>c.emoji===emoji) || LIMITED_SEEDS.find(c=>c.emoji===emoji);
}
function xpNeededForLevel(lvl){
  return Math.floor(90 + (lvl-1)*55 + Math.pow(lvl-1, 1.25)*18);
}
function tileUnlockCost(unlockedCount){
  return Math.floor(40 + unlockedCount*25 + Math.pow(unlockedCount, 1.35)*10);
}
function tileLevelLabel(levelKey){
  return LEVELS[levelKey] || "Beginner";
}

/* =========================================================
   QUIZ BANK (EXPANDED)
========================================================= */
const quizBank = {
  beginner: [
    { type:"mc", q:"I ___ a book every night.", a:"read", o:["read","reads","reading"] },
    { type:"mc", q:"She ___ happy today.", a:"is", o:["is","are","am"] },
    { type:"mc", q:"Plural of 'cat'?", a:"cats", o:["cat","cats","cates"] },
    { type:"mc", q:"We ___ friends.", a:"are", o:["is","are","am"] },
    { type:"mc", q:"He ___ a dog.", a:"has", o:["has","have","having"] },
    { type:"mc", q:"I go to school ___ Monday.", a:"on", o:["in","on","at"] },
    { type:"mc", q:"There ___ two apples.", a:"are", o:["is","are","am"] },
    { type:"mc", q:"___ is my brother. (near)", a:"This", o:["This","That","Those"] },
    { type:"mc", q:"I want ___ apple.", a:"an", o:["a","an","the"] },
    { type:"mc", q:"Choose the correct word: 'I ___ milk.'", a:"like", o:["like","likes","liking"] },
    { type:"mc", q:"Which is correct?", a:"I am", o:["I is","I are","I am"] },
    { type: "mc", q: "I ___ to school every day.", a: "go", o: ["go", "goes", "going"] },
    { type: "mc", q: "We ___ visit our grandparents next week.", a: "will", o: ["will", "do", "does"] },
    { type: "mc", q: "They ___ a cat.", a: "have", o: ["has", "have", "having"] },
    { type: "mc", q: 'Plural of "bus"?', a: "buses", o: ["bus", "buss", "buses"] },
    { type: "mc", q: "I ___ a sandwich every day.", a: "make", o: ["make", "made", "making"] },
    { type: "mc", q: "I ___ going to clean my room.", a: "am", o: ["is", "are", "am"] },
    { type: "mc", q: "___ is your favorite color?", a: "What", o: ["What", "Which", "Who"] },
    { type: "mc", q: "I saw ___ interesting movie yesterday.", a: "an", o: ["a", "an", "the"] },
    { type: "mc", q: "I ___ coffee in the morning.", a: "like", o: ["like", "likes", "liked"] },
    { type: "mc", q: "___ of the two options is better?", a: "Which", o: ["Which", "What", "Who"] },
    { type: "mc", q: "How ___ oranges do you want?", a: "many", o: ["many", "much", "little"] },
    { type: "mc", q: "There ___ two books on the table.", a: "are", o: ["is", "are", "am"] },
    { type: "mc", q: 'Past of "go"?', a: "went", o: ["goed", "gone", "went"] },
    { type: "mc", q: "___ she going to the store?", a: "Is", o: ["Are", "Is", "Do"] },
    { type: "mc", q: "She ___ her phone at home yesterday.", a: "left", o: ["left", "leaves", "has left"] },
    { type: "mc", q: "Which is incorrect?", a: "Does I...?", o: ["Does she...?", "Do we...?", "Does I...?"] }
  ],

  intermediate: [
    { type:"mc", q:"If it rains, we ___ inside.", a:"will stay", o:["stay","will stay","stayed"] },
    { type:"mc", q:"She ___ here since 2020.", a:"has lived", o:["lived","has lived","lives"] },
    { type:"fill", prompt:"By the time I arrived, they ___ (start).", a:"had started", hint:"Past perfect" },
    { type:"mc", q:"He spoke quietly so nobody ___ hear.", a:"could", o:["can","could","will"] },
    { type:"mc", q:"This is the ___ idea I've heard.", a:"best", o:["good","better","best"] },
    { type: "fill", q: "She ___ (not watch) TV yesterday.", a: "did not watch" },
    { type:"fill", prompt:"Yesterday, I ___ (go) to the park.", a:"went", hint:"Past tense of go" },
    { type:"fill", prompt:"We ___ (play) soccer now.", a:"are playing", hint:"Present continuous" },
    { type:"fill", prompt:"She ___ (eat) breakfast at 7.", a:"eats", hint:"Simple present (she)" },
    { type:"fill", prompt:"They ___ (be) at home yesterday.", a:"were", hint:"Past of 'are'" },
    { type: "fill", q: "___ wants to play football?", a: "Who" },
    { type: "fill", q: "We ___ (see) that movie last week.", a: "saw" },
    { type: "fill", q: "There is ___ (zero) milk in the fridge.", a: "no" },
    { type:"mc", q:"I ___ to the gym twice a week.", a:"go", o:["go","goes","going"] },
    { type:"mc", q:"They ___ dinner when I called.", a:"were eating", o:["eat","were eating","have eaten"] },
    { type:"mc", q:"You ___ smoke here.", a:"must not", o:["must not","should","can"] },
    { type:"fill", prompt:"I have ___ (finish) my homework already.", a:"finished", hint:"Past participle" },
    { type:"mc", q:"If I ___ time, I would help you.", a:"had", o:["have","had","will have"] },
    { type:"mc", q:"This report is ___ than the last one.", a:"better", o:["good","better","best"] },
    { type:"fill", prompt:"She said she ___ (be) tired.", a:"was", hint:"Reported speech" },
    { type:"mc", q:"We decided ___ early.", a:"to leave", o:["leave","to leave","leaving"] },
    { type:"mc", q:"The car ___ yesterday.", a:"was repaired", o:["repaired","was repaired","is repair"] },
    { type:"fill", prompt:"I will call you when I ___ (arrive).", a:"arrive", hint:"Present simple in time clause" },
    { type: "mc", q: "I ___ wear a uniform at school.", a: "must", o: ["must", "have to", "can"] },
    { type: "fill", q: "When I was a child, I ___ (play) outside every day.", a: "used to play" },
    { type: "mc", q: "We decided ___ early.", a: "to leave", o: ["leave", "to leave", "leaving"] },
    { type: "fill", q: "She said she ___ (be) tired.", a: "was" },
    { type: "mc", q: "They ___ already eaten dinner before I arrived.", a: "had", o: ["have", "had", "has"] },
    { type: "mc", q: "He hurt ___ while playing football.", a: "himself", o: ["himself", "hiself", "himselve"] },
    { type: "mc", q: "I enjoy ___ books in my free time.", a: "reading", o: ["read", "reading", "to read"] },
    { type: "mc", q: "I did it all by ___.", a: "myself", o: ["myself", "me", "my"] },
    { type: "fill", q: "I enjoy ___ (watch) movies at night.", a: "watching" },
    { type: "mc", q: "The window ___ by the wind last night.", a: "was broken", o: ["broke", "was broken", "is break"] },
    { type: "mc", q: "He said that he ___ swim very well.", a: "could", o: ["can", "could", "was"] },
    { type: "fill", q: "I ___ finish my homework before I can go out.", a: "must" },
    { type: "mc", q: "He ___ be at the office, but I’m not sure.", a: "might", o: ["might", "will", "did"] },
    { type: "mc", q: "This is the ___ movie I’ve ever seen.", a: "funniest", o: ["funny", "funnier", "funniest"] },
    { type: "mc", q: "He ___ his homework every evening before dinner.", a: "does", o: ["do", "does", "did"] },
    { type: "mc", q: "Do you know where she ___ (live)?", a: "lives", o: ["live", "lives", "lived"] },
    { type: "mc", q: "This time tomorrow, we ___ on the plane.", a: "will be", o: ["are", "were", "will be"] },
    { type: "fill", q: "I can’t believe he ___ (forget) my birthday!", a: "forgot" },
    { type: "mc", q: "We should ___ our homework before watching TV.", a: "finish", o: ["finish", "to finish", "finished"] },
    { type: "mc", q: "If she studies hard, she ___ pass the exam.", a: "will", o: ["will", "would", "can"] }
  ],

  advanced: [
    { type:"mc", q:"Despite ___ tired, he continued.", a:"being", o:["be","being","to be"] },
    { type:"mc", q:"Not only ___ he apologize, but he fixed it.", a:"did", o:["do","did","does"] },
    { type:"fill", prompt:"Had I known earlier, I ___ (tell) you.", a:"would have told", hint:"Third conditional" },
    { type:"mc", q:"The proposal was rejected, ___ its benefits.", a:"despite", o:["because","despite","unless"] },
    { type:"mc", q:"Rarely ___ we see such a result.", a:"do", o:["do","did","does"] },
    { type:"mc", q:"Hardly ___ the meeting started when the power went out.", a:"had", o:["has","had","have"] },
    { type:"mc", q:"No sooner ___ I sat down than the phone rang.", a:"had", o:["did","had","have"] },
    { type:"mc", q:"It is essential that he ___ on time.", a:"be", o:["is","be","was"] },
    { type:"fill", prompt:"If she ___ (study) harder, she would have passed.", a:"had studied", hint:"Third conditional" },
    { type:"mc", q:"He acted as though he ___ everything.", a:"knew", o:["knows","knew","known"] },
    { type:"mc", q:"The more you practice, the ___ you become.", a:"better", o:["good","better","best"] },
    { type:"mc", q:"The report, ___ I expected, was incomplete.", a:"as", o:["as","because","unless"] },
    { type:"fill", prompt:"Seldom ___ we ___ such honesty. (use: do / witness)", a:"do witness", hint:"Inversion" },
    { type:"mc", q:"He refused to resign, ___ the pressure.", a:"regardless of", o:["because of","regardless of","in case"] },
    { type:"fill", prompt:"She insisted on ___ (receive) a full explanation.", a:"receiving", hint:"Gerund after 'insisted on'" },
    { type: "mc", q: "There isn’t ___ milk in the fridge.", a: "any", o: ["some", "any", "many"] },
    { type: "mc", q: "He slept ___ the meeting.", a: "during", o: ["during", "for", "while"] },
    { type: "mc", q: "She’s the girl ___ brother is a doctor.", a: "whose", o: ["whose", "who’s", "whom"] },
    { type: "fill", q: "The letters ___ (send) already.", a: "have been sent" },
    { type: "mc", q: "I would rather ___ at home than go out tonight.", a: "stay", o: ["stay", "staying", "to stay"] },
    { type: "mc", q: "___ the end, everything worked out well.", a: "in", o: ["in", "on", "at"] },
    { type: "mc", q: "What is the reason ___ his absence?", a: "for", o: ["on", "for", "of"] },
    { type: "fill", q: "The cause ___ the accident is still unknown.", a: "of" },
    { type: "mc", q: "When I arrived, they ___ already left.", a: "had", o: ["have", "had", "were"] },
    { type: "mc", q: "The cake ___ by my mother.", a: "was made", o: ["were made", "was made", "is made"] },
    { type: "fill", q: "They ___ (must / forget) the meeting.", a: "must have forgotten" },
    { type: "mc", q: "The house ___ last year.", a: "was built", o: ["was built", "is built", "had built"] },
    { type: "mc", q: "I would rather ___ a book than watch TV.", a: "read", o: ["read", "reading", "to read"] },
    { type: "fill", q: "“I love traveling.” — “___ do I.”", a: "so" },
    { type: "mc", q: "She looked exhausted because she ___ on the proposal all night.", a: "had been working", o: ["has been working", "had been working", "have been working"] },
    { type: "mc", q: "She answered the question ___.", a: "correctly", o: ["correct", "correctly", "correctedly"] },
    { type: "fill", q: "He ___ (realize) his mistake only after the email was sent.", a: "had realized" },
    { type: "mc", q: "Although he was tired, he finished his work ___ it was important.", a: "because", o: ["because", "but", "so"] },
    { type: "mc", q: "You ___ have locked the door.", a: "must", o: ["must", "were", "don't"] },
    { type: "fill", q: "I look forward to ___ (see) you.", a: "seeing" }
  ]
};

function pickQuestion(diff){
  const pool = quizBank[diff] || quizBank.beginner;
  return pool[Math.floor(Math.random()*pool.length)];
}

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

/* =========================================================
   PETS / WILD PETS (ENTRANCE + POOP)
========================================================= */
const PET_TYPES = [
  // Farmingo battle roster (also used as wild pets in the farm)
  { id:"pig",       name:"Pig",       emoji:"🐷", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1,  isImage:true, imagepath:'<img src="images/pig.png" alt="pig">' },
  { id:"rabbit",    name:"Rabbit",    emoji:"🐰", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1, isImage:true, imagepath:'<img src="images/rabbit.png" alt="rabbit">' },
  { id:"dog",       name:"Dog",       emoji:"🐶", rarity:"Common",   weight:42, eatMs:15000, capture:0.45, poopMin:1, poopMax:1,  isImage:true, imagepath:'<img src="images/dog.png" alt="dog">'},
, 
  { id:"deer",      name:"Deer",      emoji:"🦌", rarity:"Uncommon", weight:22, eatMs:15000, capture:0.32, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/deer.png" alt="deer">'},
  { id:"cat",       name:"Cat",       emoji:"🐱", rarity:"Uncommon", weight:22, eatMs:15000, capture:0.32, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/cat.png" alt="cat">'},
, 
  { id:"fox",       name:"Fox",       emoji:"🦊", rarity:"Rare",     weight:12, eatMs:15000, capture:0.22, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/fox.png" alt="fox">'},
  { id:"panda",     name:"Panda",     emoji:"🐼", rarity:"Rare",     weight:12, eatMs:15000, capture:0.22, poopMin:1, poopMax:2,  isImage:true, imagepath:'<img src="images/panda.png" alt="panda">'},
, 
  { id:"lion",      name:"Lion",      emoji:"🦁", rarity:"Epic",     weight: 6, eatMs:15000, capture:0.14, poopMin:2, poopMax:3,  isImage:true, imagepath:'<img src="images/lion.png" alt="lion">'},
  { id:"alligator", name:"Alligator", emoji:"🐊", rarity:"Epic",     weight: 6, eatMs:15000, capture:0.14, poopMin:2, poopMax:3,  isImage:true, imagepath:'<img src="images/alligator.png" alt="alligator">'},
];

/* =========================================================
   ARENA / PVP DATA (from Farmingo [PVP])
========================================================= */

// Cell table: universal scaling per level
const LEVEL_SCALING_TABLE = [
  ["Level", "ATK", "DEF", "SPEED"],
  ["Each level up", "+1", "+1", "+1"]
];


// Cell table: animal roster base stats
const ANIMAL_BASE_TABLE = [
  ["Animal", "Role", "ATK (Lv1)", "DEF (Lv1)", "SPEED (Lv1)"],
  ["Rabbit", "Speed hitter", "5", "3", "9"],
  ["Dog", "Balanced fighter", "6", "6", "6"],
  ["Deer", "Evasive support", "4", "5", "8"],
  ["Cat", "Crit trickster", "7", "4", "8"],
  ["Lion", "Heavy bruiser", "9", "7", "4"],
  ["Panda", "Tank healer", "5", "9", "3"],
  ["Fox", "Debuff controller", "6", "4", "9"],
  ["Alligator", "Armor shredder", "8", "6", "5"]
];


// Cell table: per-level stats (Lv1-Lv5)
const ANIMAL_LEVEL_TABLE = [
  ["Animal", "Level", "ATK", "DEF", "SPEED"],
  ["Rabbit", "Lv1", "5", "3", "9"],
  ["Rabbit", "Lv2", "6", "4", "10"],
  ["Rabbit", "Lv3", "7", "5", "11"],
  ["Rabbit", "Lv4", "8", "6", "12"],
  ["Rabbit", "Lv5", "9", "7", "13"],
  ["Dog", "Lv1", "6", "6", "6"],
  ["Dog", "Lv2", "7", "7", "7"],
  ["Dog", "Lv3", "8", "8", "8"],
  ["Dog", "Lv4", "9", "9", "9"],
  ["Dog", "Lv5", "10", "10", "10"],
  ["Deer", "Lv1", "4", "5", "8"],
  ["Deer", "Lv2", "5", "6", "9"],
  ["Deer", "Lv3", "6", "7", "10"],
  ["Deer", "Lv4", "7", "8", "11"],
  ["Deer", "Lv5", "8", "9", "12"],
  ["Cat", "Lv1", "7", "4", "8"],
  ["Cat", "Lv2", "8", "5", "9"],
  ["Cat", "Lv3", "9", "6", "10"],
  ["Cat", "Lv4", "10", "7", "11"],
  ["Cat", "Lv5", "11", "8", "12"],
  ["Lion", "Lv1", "9", "7", "4"],
  ["Lion", "Lv2", "10", "8", "5"],
  ["Lion", "Lv3", "11", "9", "6"],
  ["Lion", "Lv4", "12", "10", "7"],
  ["Lion", "Lv5", "13", "11", "8"],
  ["Panda", "Lv1", "5", "9", "3"],
  ["Panda", "Lv2", "6", "10", "4"],
  ["Panda", "Lv3", "7", "11", "5"],
  ["Panda", "Lv4", "8", "12", "6"],
  ["Panda", "Lv5", "9", "13", "7"],
  ["Fox", "Lv1", "6", "4", "9"],
  ["Fox", "Lv2", "7", "5", "10"],
  ["Fox", "Lv3", "8", "6", "11"],
  ["Fox", "Lv4", "9", "7", "12"],
  ["Fox", "Lv5", "10", "8", "13"],
  ["Alligator", "Lv1", "8", "6", "5"],
  ["Alligator", "Lv2", "9", "7", "6"],
  ["Alligator", "Lv3", "10", "8", "7"],
  ["Alligator", "Lv4", "11", "9", "8"],
  ["Alligator", "Lv5", "12", "10", "9"]
];


const BATTLE_ANIMALS = {
  "pig": { 
      "name": "Pig", 
      "emoji": "🐷", 
      "imagepath": '<img src="images/pig.png" alt="pig">',
      "rarity": "Starter", 
      "base": { 
        "atk": 5, 
        "def": 5,
        "spd": 5 
      }, 
      "skills": 
      { 
        "attack": 
        { 
          "name": "Tackle", 
          "power": 5 }, 
          "buff": 
          { 
            "name": "Mud Bath", 
            "desc":"Heal 5" }, 
            "ultimate": { 
              "name": 
              "Oink Blast", 
              "power": 8 } 
      } 
    },
  "rabbit": {
    "name": "Rabbit",
    "emoji": "🐰",
    "imagepath": '<img src="images/rabbit.png" alt="rabbit">',
    "rarity": "Common",
    "base": {
      "atk": 5,
      "def": 3,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Quick Kick",
        "power": 5,
        "desc": "If Rabbit acts first this round, deal +2 extra damage."
      },
      "buff": {
        "name": "Burst Step",
        "desc": "+3 SPEED for 2 turns. Next attack gains +1 SkillPower."
      },
      "ultimate": {
        "name": "Lightning Combo",
        "power": 3,
        "desc": "3 hits. Each hit uses SkillPower 3."
      }
    }
  },
  "dog": {
    "name": "Dog",
    "emoji": "🐶",
    "imagepath": '<img src="images/dog.png" alt="dog">',
    "rarity": "Common",
    "base": {
      "atk": 6,
      "def": 6,
      "spd": 6
    },
    "skills": {
      "attack": {
        "name": "Bite",
        "power": 6,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Guard Stance",
        "desc": "+3 DEF for 2 turns. Reduce next incoming damage by 2."
      },
      "ultimate": {
        "name": "Loyal Rush",
        "power": 9,
        "desc": "If Dog is below 50% HP, heal 3."
      }
    }
  },
  "deer": {
    "name": "Deer",
    "emoji": "🦌",
    "imagepath": '<img src="images/deer.png" alt="deer">',
    "rarity": "Uncommon",
    "base": {
      "atk": 4,
      "def": 5,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Antler Jab",
        "power": 5,
        "desc": "30% chance: enemy SPEED -2 for 1 turn."
      },
      "buff": {
        "name": "Calm Breath",
        "desc": "Heal 4. Gain +2 DEF for 1 turn."
      },
      "ultimate": {
        "name": "Forest Grace",
        "power": 0,
        "desc": "Heal 7. Gain evasion for 1 turn (next hit deals 0)."
      }
    }
  },
  "cat": {
    "name": "Cat",
    "emoji": "🐱",
    "imagepath": '<img src="images/cat.png" alt="cat">',
    "rarity": "Uncommon",
    "base": {
      "atk": 7,
      "def": 4,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Claw Swipe",
        "power": 5,
        "desc": "25% crit chance. Crit adds +4 damage."
      },
      "buff": {
        "name": "Pounce Setup",
        "desc": "Next attack gains +3 SkillPower and ignores 2 DEF."
      },
      "ultimate": {
        "name": "Nine-Lives Trick",
        "power": 8,
        "desc": "If Cat would be KO'd in the next 2 turns, survive once at 1 HP."
      }
    }
  },
  "lion": {
    "name": "Lion",
    "emoji": "🦁",
    "imagepath": '<img src="images/lion.png" alt="lion">',
    "rarity": "Epic",
    "base": {
      "atk": 9,
      "def": 7,
      "spd": 4
    },
    "skills": {
      "attack": {
        "name": "Heavy Slash",
        "power": 7,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Roar",
        "desc": "+3 ATK for 2 turns. Enemy ATK -2 for 1 turn."
      },
      "ultimate": {
        "name": "King's Verdict",
        "power": 10,
        "desc": "If enemy has any debuff, deal +4 extra damage."
      }
    }
  },
  "panda": {
    "name": "Panda",
    "emoji": "🐼",
    "imagepath": '<img src="images/panda.png" alt="panda">',
    "rarity": "Rare",
    "base": {
      "atk": 5,
      "def": 9,
      "spd": 3
    },
    "skills": {
      "attack": {
        "name": "Palm Strike",
        "power": 5,
        "desc": "Gain +1 DEF permanently this fight (max +3)."
      },
      "buff": {
        "name": "Bamboo Snack",
        "desc": "Heal 5. Gain +2 DEF for 2 turns."
      },
      "ultimate": {
        "name": "Soft But Strong",
        "power": 6,
        "desc": "Deal damage. Reduce damage taken by 3 for 2 turns."
      }
    }
  },
  "fox": {
    "name": "Fox",
    "emoji": "🦊",
    "imagepath": '<img src="images/fox.png" alt="fox">',
    "rarity": "Rare",
    "base": {
      "atk": 6,
      "def": 4,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Sneak Fang",
        "power": 5,
        "desc": "Apply Hex: enemy DEF -2 for 2 turns."
      },
      "buff": {
        "name": "Illusion Veil",
        "desc": "+2 SPEED for 2 turns. Gain 20% dodge for 1 turn."
      },
      "ultimate": {
        "name": "Mind Game",
        "power": 8,
        "desc": "Steal 2 ATK or 2 DEF (whichever is higher) for 2 turns."
      }
    }
  },
  "alligator": {
    "name": "Alligator",
    "emoji": "🐊",
    "imagepath": '<img src="images/alligator.png" alt="alligator">',
    "rarity": "Epic",
    "base": {
      "atk": 8,
      "def": 6,
      "spd": 5
    },
    "skills": {
      "attack": {
        "name": "Chomp",
        "power": 6,
        "desc": "If enemy DEF ≥ 6, deal +2 extra damage."
      },
      "buff": {
        "name": "Iron Hide",
        "desc": "+4 DEF for 2 turns. SPEED -1 for 2 turns."
      },
      "ultimate": {
        "name": "Death Roll",
        "power": 9,
        "desc": "Enemy DEF -4 for 2 turns. If enemy already has a debuff, stun for 1 turn."
      }
    }
  }
};

// Stat scaling (Lv2 = Lv1 +1/1/1, etc.)
function battleStats(animalId, level=1){
  const meta = BATTLE_ANIMALS[animalId];
  const lv = clamp(parseInt(level||1,10) || 1, 1, 5);
  if(!meta) return { atk:1, def:1, spd:1 };
  const add = lv - 1;
  return { atk: meta.base.atk + add, def: meta.base.def + add, spd: meta.base.spd + add };
}

// Optional HP extension (makes healing meaningful)
function battleHpMax(level){
  const lv = clamp(parseInt(level||1,10) || 1, 1, 5);
  return 30 + (lv-1)*5;
}

function combinePet(uidToUpgrade){
  const idxA = zooPets.findIndex(p=>p.uid===uidToUpgrade);
  if(idxA < 0) return;
  const a = zooPets[idxA];
  if(!a.animalId){ showToast("This pet can't be combined.", 1200); return; }
  const lv = clamp(parseInt(a.level||1,10) || 1, 1, 5);
  if(lv >= 5){ showToast("Already max level.", 1200); return; }

  const idxB = zooPets.findIndex((p,i)=>i!==idxA && p.animalId===a.animalId && clamp(parseInt(p.level||1,10)||1,1,5)===lv);
  if(idxB < 0){
    showToast("Need a duplicate of the same level.", 1400);
    return;
  }

  // Remove both (remove larger index first)
  const rem = [idxA, idxB].sort((x,y)=>y-x);
  for(const r of rem) zooPets.splice(r,1);

  const meta = BATTLE_ANIMALS[a.animalId];
  const nextLv = Math.min(5, lv + 1);
  const upgraded = {
    uid: uid(),
    typeId: a.animalId,
    animalId: a.animalId,
    level: nextLv,
    emoji: meta.emoji,
    imagepath: meta.imagepath,
    name: meta.name,
    rarity: meta.rarity
  };
  zooPets.unshift(upgraded);

  saveState();
  updateUI();
  if(activeScreen === "zoo") requestAnimationFrame(()=>renderZooRoamingPets());

  showToast(`${meta.name} upgraded to Lv${nextLv}!`, 1400);
  openPetDetails(upgraded.uid);
}



/* =========================================================
   BOOSTS
========================================================= */
const BOOST_ITEMS = [
  { key:"fertilizer", icon:"🧪", name:"Fertilizer", cost: 60, desc:"-20% grow time (next plant only)" },
  { key:"scarecrow",  icon:"🪵", name:"Scarecrow",  cost: 90, desc:"Reduce wild pet spawns for 3 minutes" },
  { key:"net",        icon:"🪢", name:"Capture Net", cost: 75, desc:"+12% capture chance (next capture)" },
];
let boosts = { fertilizer:0, scarecrowUntil:0, net:0 };

function captureBonusByBoost(){
  if(boosts.net > 0){
    boosts.net--;
    return 0.12;
  }
  return 0;
}
function petSpawnsBlocked(){
  return Date.now() < (boosts.scarecrowUntil || 0);
}

/* =========================================================
   SAVE / LOAD
========================================================= */
const STATE_KEY = "catfarm_state_v5";
const QUEST_KEY = "catfarm_daily_quests_v5";
const QUEST_DATE_KEY = "catfarm_daily_date_v5";
const STREAK_KEY = "catfarm_daily_streak_v5";
const LAST_COMPLETE_KEY = "catfarm_last_complete_date_v5";
const LIB_EXAM_KEY = "catfarm_library_exam_v1";

let coins = 30;
let xp = 0;
let level = 1;
let playerCountry = "Philippines"; // Default country
let inventory = {}; // Stores harvested crops
let showcase = [null, null, null, null]; // Profile showcase slots

let playerName = "Player";
let playerTitle = "Rookie Farmer";

let selectedSeed = "🥕";

let currentTool = "harvest"; // plant | remove | move
let moveSourceIndex = null;

let seeds = {}; // emoji -> count

const TILE_COUNT = 18;
let unlockedTiles = new Array(TILE_COUNT).fill(false);
let tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));

let zooPets = [];
let roamingPetUids = []; // legacy: roaming-on-farm was removed (kept for old saves)

let nextPetSpawnAt = 0;
let nextBossSpawnAt = 0;

function saveState(){
  

  try{
    const gameState = {
      coins, xp, level,
      playerName, playerTitle,
      playerCountry, inventory, showcase, // ADD THESE 3
      playerCountry, // ADDED
      selectedSeed, seeds,
      inventory,     // ADDED
      unlockedTiles, tileStates,
      zooPets, roamingPetUids: [],
      boosts,
      nextPetSpawnAt,
      nextBossSpawnAt,
      streak,
      lastLoginISO: new Date().toISOString()
    };

    localStorage.setItem(STATE_KEY, JSON.stringify({
      coins, xp, level,
      playerName, playerTitle,
      playerCountry, inventory, showcase, // ADD THESE 3
      playerCountry, // ADDED
      selectedSeed, seeds,
      inventory,     // ADDED
      unlockedTiles, tileStates,
      zooPets, roamingPetUids: [],
      boosts,
      nextPetSpawnAt,
      nextBossSpawnAt
    }));
  }catch(e){}
}






function loadState(){
  try{
    // ... inside loadState ...
    playerTitle = st.playerTitle || playerTitle;
    const raw = localStorage.getItem(STATE_KEY);
    if(!raw) return;
    const st = JSON.parse(raw);
    if(!st || typeof st !== "object") return;

    playerCountry = st.playerCountry || "Philippines";
    inventory = st.inventory || {};
    showcase = st.showcase || [null, null, null, null];

    // ADD THESE LINES:
    playerCountry = st.playerCountry || "Unknown";
    inventory = st.inventory || {};

    coins = Number(st.coins ?? coins);
    xp = Number(st.xp ?? xp);
    level = Number(st.level ?? level);

    playerName = st.playerName || playerName;
    playerTitle = st.playerTitle || playerTitle;

    selectedSeed = st.selectedSeed || selectedSeed;
    seeds = st.seeds && typeof st.seeds==="object" ? st.seeds : seeds;

    unlockedTiles = Array.isArray(st.unlockedTiles) ? st.unlockedTiles : unlockedTiles;
    tileStates = Array.isArray(st.tileStates) ? st.tileStates : tileStates;

    zooPets = Array.isArray(st.zooPets) ? st.zooPets : zooPets;

    // ---- migrate older pet saves to the new battle roster shape ----
    const LEGACY_PET_TO_ANIMAL = {
      puppy: "dog",
      kitty: "cat",
      bunny: "rabbit",
      fox: "fox",
      raccoon: "panda",
      dragon: "lion",
    };

    zooPets = (zooPets||[]).map(p=>{
      if(!p || typeof p !== "object") return null;
      const pet = { ...p };
      pet.level = clamp(parseInt(pet.level || 1, 10) || 1, 1, 5);

      if(!pet.animalId){
        if(pet.typeId && LEGACY_PET_TO_ANIMAL[pet.typeId]) pet.animalId = LEGACY_PET_TO_ANIMAL[pet.typeId];
      }

      const meta = (pet.animalId && BATTLE_ANIMALS[pet.animalId]) ? BATTLE_ANIMALS[pet.animalId] : null;
      if(meta){
        pet.typeId = pet.typeId || pet.animalId;
        pet.name = meta.name;
        pet.emoji = meta.emoji;
        pet.imagepath = meta.imagepath;
        pet.rarity = meta.rarity;
      }
      return pet;
    }).filter(Boolean);

    // roaming-on-farm was removed; keep older saves from showing farm roam pets
    roamingPetUids = [];

    if(st.boosts && typeof st.boosts==="object"){
      boosts.fertilizer = Number(st.boosts.fertilizer||0);
      boosts.net = Number(st.boosts.net||0);
      boosts.scarecrowUntil = Number(st.boosts.scarecrowUntil||0);
    }

    nextPetSpawnAt = Number(st.nextPetSpawnAt || 0);
    nextBossSpawnAt = Number(st.nextBossSpawnAt || 0);
  }catch(e){}
}

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
  try{ return !localStorage.getItem(TUTORIAL_KEY); }
  catch(e){ return true; }
}

function tutorialTargetRect(target){
  if(!target) return null;

  // Custom rect object
  if(typeof target === "object" && target.left!=null && target.top!=null && target.width!=null && target.height!=null){
    return target;
  }

  // Element
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

function positionTutorial(rect, placementHint){
  const pad = 10;
  const v = viewportRect();

  // highlight
  const hPad = 8;
  const hl = Math.max(6, rect.left - hPad);
  const ht = Math.max(6, rect.top - hPad);
  const hw = Math.min(v.w - 12, rect.width + hPad*2);
  const hh = Math.min(v.h - 12, rect.height + hPad*2);

  tut.hi.style.left = hl + "px";
  tut.hi.style.top = ht + "px";
  tut.hi.style.width = hw + "px";
  tut.hi.style.height = hh + "px";

  // bubble sizing
  tut.bubble.style.left = "10px";
  tut.bubble.style.top = "10px";
  tut.bubble.style.display = "flex";
  const bRect0 = tut.bubble.getBoundingClientRect();
  const bw = bRect0.width;
  const bh = bRect0.height;

  const centerX = hl + hw/2;
  const centerY = ht + hh/2;

  const candidates = [
    { key:"below", x: clamp(centerX - bw/2, pad, v.w - bw - pad), y: ht + hh + 14 },
    { key:"above", x: clamp(centerX - bw/2, pad, v.w - bw - pad), y: ht - bh - 14 },
    { key:"right", x: hl + hw + 14, y: clamp(centerY - bh/2, pad, v.h - bh - pad) },
    { key:"left",  x: hl - bw - 14, y: clamp(centerY - bh/2, pad, v.h - bh - pad) },
  ];

  // pick best fit, prefer hint then below/above
  const preferOrder = placementHint ? [placementHint,"below","above","right","left"] : ["below","above","right","left"];
  let best = null;
  for(const k of preferOrder){
    const c = candidates.find(x=>x.key===k);
    if(!c) continue;
    const fits = (c.x >= pad && c.x + bw <= v.w - pad && c.y >= pad && c.y + bh <= v.h - pad);
    if(fits){ best = c; break; }
  }
  if(!best){
    // choose least overflow
    let bestScore = Infinity;
    for(const c of candidates){
      const overflowX = Math.max(0, pad - c.x) + Math.max(0, (c.x + bw) - (v.w - pad));
      const overflowY = Math.max(0, pad - c.y) + Math.max(0, (c.y + bh) - (v.h - pad));
      const score = overflowX + overflowY;
      if(score < bestScore){ bestScore = score; best = c; }
    }
  }

  // clamp final
  const bx = clamp(best.x, pad, v.w - bw - pad);
  const by = clamp(best.y, pad, v.h - bh - pad);

  tut.bubble.style.left = bx + "px";
  tut.bubble.style.top = by + "px";

  drawArrow({ hl, ht, hw, hh, bx, by, bw, bh });
}

function drawArrow({hl,ht,hw,hh,bx,by,bw,bh}){
  const v = viewportRect();
  const start = { x: bx + bw/2, y: by + bh/2 };

  // choose end point on highlight (center)
  const end = { x: hl + hw/2, y: ht + hh/2 };

  // adjust start to bubble edge closest to highlight
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let sx = start.x, sy = start.y;
  // edge projection
  if(Math.abs(dx) > Math.abs(dy)){
    // left/right edge
    sx = dx > 0 ? (bx + bw) : bx;
    sy = clamp(start.y, by + 14, by + bh - 14);
  }else{
    // top/bottom edge
    sx = clamp(start.x, bx + 14, bx + bw - 14);
    sy = dy > 0 ? (by + bh) : by;
  }

  // arrow head
  const ex = end.x;
  const ey = end.y;

  const vx = ex - sx;
  const vy = ey - sy;
  const len = Math.max(1, Math.hypot(vx, vy));
  const ux = vx / len;
  const uy = vy / len;

  // short pullback so arrowhead doesn't sit inside highlight border
  const headLen = 10;
  const hx = ex - ux * headLen;
  const hy = ey - uy * headLen;

  // perpendicular
  const px = -uy;
  const py = ux;
  const headW = 6;

  const p1 = { x: ex, y: ey };
  const p2 = { x: hx + px*headW, y: hy + py*headW };
  const p3 = { x: hx - px*headW, y: hy - py*headW };

  // normalize to viewBox 0..100 for responsive SVG
  const toVB = (x,y)=>({ x:(x/v.w)*100, y:(y/v.h)*100 });

  const a = toVB(sx,sy);
  const b = toVB(hx,hy);
  const c1 = toVB(p1.x,p1.y);
  const c2 = toVB(p2.x,p2.y);
  const c3 = toVB(p3.x,p3.y);

  tut.arrow.innerHTML = `
    <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,0.92)" stroke-width="1.2" />
    <polygon points="${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y}" fill="rgba(255,255,255,0.92)"></polygon>
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
  tut.text.textContent = s.text || "";

  // Wait a frame in case UI switched (farm/town)
  requestAnimationFrame(()=>{
    const target = (typeof s.target === "function") ? s.target() : s.target;
    const rect = tutorialTargetRect(target) || { left: window.innerWidth/2-80, top: window.innerHeight/2-40, width:160, height:80 };
    positionTutorial(rect, s.placement || "below");
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

/* =========================================================
   START GAME / INFO
========================================================= */
function startGame(){
  menu.style.display = "none";
  gameDiv.style.display = "flex";
  showFarm();
  // requestAnimationFrame(updateToolStripPosition);

  if(shouldShowTutorial()){
    startTutorial();
  }



    function getProfileBtnPos() {
    const el = document.querySelector("#profileBtn");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 30,
      top: rect.top + 30,
      width: rect.width,
      height: rect.height
    };
  }

   function getCoinBtnPos() {
    const el = document.querySelector("#coinBox");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 38,
      top: rect.top + 25,
      width: rect.width,
      height: rect.height
    };
  }

  function getXPPos() {
    const el = document.querySelector("#xpBarContainer");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 100,
      top: rect.top + 30 - 14,
      width: rect.width,
      height: rect.height
    };
  }

  function getFirstTilePos() {
    // select the #farm container
    const farm = document.getElementById("farm");
    if (!farm) {
      console.warn("#farm element not found");
      return null;
    }

    // select the first child with class 'tile'
    const firstTile = farm.querySelector(".tile");
    if (!firstTile) {
      console.warn("No .tile element found inside #farm");
      return null;
    }

    // get the DOM rect
    const rect = firstTile.getBoundingClientRect();

    // return the values you care about
    return {
      left: rect.left + 40,
      top: rect.top + 40,
      width: rect.width,
      height: rect.height
    };
  }


    function getFarmWrapPos() {
      const el = document.querySelector("#farm");
      if (!el) return null;

      const rect = el.getBoundingClientRect();

      return {
        left: rect.left + 235,
        top: rect.top + 110,
        width: rect.width,
        height: rect.height
      };
    }

     function getCropMenuPos() {
        const el = document.querySelector("#btnCrops");
        if (!el) return null;

        const rect = el.getBoundingClientRect();

        return {
          left: rect.left + 50,
          top: rect.top + 40,
          width: rect.width,
          height: rect.height
        };
      }

      function getTownBtnPos() {
        const el = document.querySelector("#townToggleBtn");
        if (!el) return null;

        const rect = el.getBoundingClientRect();

        return {
          left: rect.left + 30,
          top: rect.top + 27,
          width: rect.width,
          height: rect.height
        };
      }


  

  function buildTutorialSteps(){
  tutorialState.steps = [
    {
      title:"Mao the Cat",
      text:"Hi! I'm Mao 🐱\nWelcome to Cat Farm.\n\nClick anywhere to continue.\nDouble-click to skip.",
      target: () => ({ left: window.innerWidth/2 - 150, top: window.innerHeight/2 - 0, width: 180, height: 80 }),
      placement:"below"
    },
    {
      title:"Your Profile",
      text:"This is your profile.\nTap it to edit your name and title.",
      target: () => getProfileBtnPos(),
      placement:"below"
    },
    {
      title:"Coins",
      text:"Coins are your main currency.\nYou buy seeds and unlock tiles with coins.",
      target: () => getCoinBtnPos(),
      placement:"below"
    },
    {
      title:"Level (XP)",
      text:"This is your level bar.\nHarvesting and cleaning poop gives XP.\nLevel-ups give bonus coins.",
      target: () => getXPPos(),
      placement:"below"
    },
    {
      title:"Farm Tiles",
      text:"Tap an empty tile 🌱 to plant a seed.\nYou need seeds in your Bag first.",
      target: () => getFirstTilePos(),
      placement:"above"
    },
    {
      title:"Growth + READY",
      text:"Planted crops show a growth bar.\nWhen it's finished, you will see READY ✨.\nTap to harvest (1 English question).",
      target: () => getFarmWrapPos(),
      placement:"above"
    },
    {
      title:"Crops Menu",
      text:"Tap Crops to buy seeds and choose what to plant.",
      target: () => getCropMenuPos(),
      placement:"above"
    },
    {
      title:"Wild Pets + Poop",
      text:"Wild pets can enter from the side.\nTap them fast, answer 1 question, and you might capture them.\nThey can poop 💩 too. Tap poop to clean for coins.",
      target: () => getFarmWrapPos(),
      placement:"above"
    },
    {
      title:"Town Button",
      text:"Tap this button to switch between Farm 🌾 and Town 🏘️.",
      target: () => getTownBtnPos(),
      placement:"below"
    },
    {
      title:"Library Exam",
      text:"In Town, the Library has daily exams.\nPass to earn extra coins and XP.",
      onEnter: () => { 
        showTown(); 
        const pos1= showTown(1); 
        console.log(pos1);
      },
      target: () => showTown(1),
      placement:"below"
    },
    {
      title:"Quest Board",
      text:"Complete daily quests for coins.\nFinish all for a streak bonus.",
      target: () => showTown(2),
      placement:"below"
    },
    {
      title:"Zoo",
      text:"Captured pets live in your Zoo.\nTap Zoo to see them roam around freely.",
      target: () => showTown(3),
      placement:"below"
    },
    {
      title:"Boss Fights",
      text:"Sometimes a boss appears on your farm.\nIt's turn-based:\nNormal = easier question, Heavy = harder question.\nCorrect = damage. Wrong = lose turn.",
      onEnter: () => { showFarm(); },
      target: () => getFarmWrapPos(),
      placement:"above"
    },
    {
      title:"All set!",
      text:"You're ready.\nFarm, learn, and collect pets 🐾",
      target: () => ({ left: window.innerWidth/2 - 110, top: window.innerHeight/2 - 40, width: 220, height: 80 }),
      placement:"below"
    },
  ];
}

function startTutorial(){
  tutorialState.active = true;
  tutorialState.step = 0;
  buildTutorialSteps();

  if(tut.overlay){
    tut.overlay.style.display = "block";
  }
  toast.style.display = "none";
  if(modal.style.display === "flex") closeModal();

  renderTutorialStep();

  // click anywhere to advance
  tut.overlay.onclick = (e)=>{
    e.preventDefault();
    advanceTutorial();
  };
  // double click anywhere to skip
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
      • Tutorial now points at UI elements with a spotlight and arrow.<br>
      • Fixed quiz exploit: each question can only be answered once (instant lock).<br>
      • New turn-based boss fight: Pig 🐷 vs Scarecrow.<br>
      • Practice removed. Library exam added (daily).
    </div>
  `);
}

let activeScreen = "farm";
function showFarm(){
  activeScreen = "farm";
  farmScreen.style.display = "flex";
  townScreen.style.display = "none";
  if(zooScreen) zooScreen.style.display = "none";
  // townBtnIcon.textContent = "🏘️";
  // updateToolStripPosition();
}
function showTown(which){
  activeScreen = "town";
  farmScreen.style.display = "none";
  townScreen.style.display = "flex";
  if(zooScreen) zooScreen.style.display = "none";
  // townBtnIcon.textContent = "🌾";

  function getLibraryBtnPos() {
    const el = document.querySelector("#buildingLibrary");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 130,
      top: rect.top + 70,
      width: rect.width,
      height: rect.height
    };
  }

  function getQuestBoardBtnPos() {
    const el = document.querySelector("#buildingQuest");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 130,
      top: rect.top + 70,
      width: rect.width,
      height: rect.height
    };
  }

  function getZooBtnPos() {
    const el = document.querySelector("#buildingZoo");
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + 130,
      top: rect.top + 70,
      width: rect.width,
      height: rect.height
    };
  }

  // choose which one to return
  if (which === 1) return getLibraryBtnPos();
  if (which === 2) return getQuestBoardBtnPos();
  if (which === 3) return getZooBtnPos();

  return null;
}

function showZoo(){
  activeScreen = "zoo";
  farmScreen.style.display = "none";
  townScreen.style.display = "none";
  if(zooScreen) zooScreen.style.display = "flex";
  // In the Zoo, this button returns to Farm 🌾
  // townBtnIcon.textContent = "🌾";

  // Wait for layout, then place pets inside the yard
  requestAnimationFrame(()=>renderZooRoamingPets());
}

function toggleTown(){
  if(activeScreen === "farm") showTown();
  else if(activeScreen === "town") showFarm();
  else showFarm(); // from Zoo -> Farm
}

function openProfile(){
  // Determine title based on Library Exams (if you have that system)
  let title = "Rookie Farmer";
  try {
    const st = JSON.parse(localStorage.getItem(LIB_EXAM_KEY) || "{}");
    const tk = todayKey();
    if(st?.[tk]?.advanced) title = "Advanced Learner";
    else if(st?.[tk]?.intermediate) title = "Intermediate Learner";
    else title = "Beginner Learner";
  } catch(e){}
  // Build Showcase (Top 4 items in inventory)
  let showcaseHtml = "";
  let itemsFound = 0;
  for(const c of CROPS){
    if(itemsFound >= 4) break;
    if(inventory[c.emoji] > 0){
      const img = c.isImage ? `<img src="${c.grown}" style="width:40px;">` : c.emoji;
      showcaseHtml += `<div class="showbox" style="width:60px;height:60px;border:2px dashed #D3B58D;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.5);">${img}</div>`;
      itemsFound++;
    }
  }
  // Fill empty slots
  while(itemsFound < 4){
    showcaseHtml += `<div style="width:60px;height:60px;border:2px dashed #D3B58D;border-radius:12px;background:rgba(255,255,255,0.3);"></div>`;
    itemsFound++;
  }
  openModal("Profile", `
    <div style="text-align:center; padding:10px;">
      <div style="position:relative; width:80px; margin:0 auto;">
        <img src="images/profile.png" style="width:80px; height:80px; border-radius:50%; border:4px solid #74DE34; object-fit:cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiPvCfkTY8L3RleHQ+PC9zdmc+'">
      </div>
      <div style="font-size:20px; font-weight:900; margin-top:10px; color:#3b2716;">
        ${escapeHtml(playerName)} <span style="cursor:pointer;" onclick="editProfile()">✏️</span>
      </div>
      <div style="font-size:14px; color:#5D420D; margin-top:4px;">
        📍 ${escapeHtml(playerCountry)} <span style="cursor:pointer;" onclick="editCountry()">✏️</span>
      </div>
      <div class="badge" style="margin-top:8px; background:#FDA914; color:white;">${title}</div>
    </div>
    <div class="sectionTitle" style="text-align:center; margin-top:15px;">Crop Showcase</div>
    <div style="display:flex; justify-content:center; gap:10px; margin:10px 0;">${showcaseHtml}</div>
    <div class="resLine">
      <span>🔥 Login Streak: <b>${dailyStreak} Days</b></span>
    </div>
    <div style="display:flex; gap:10px; margin-top:15px;">
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>
  `);
}
function editCountry(){
  const c = prompt("Enter your country:", playerCountry);
  if(c && c.trim()){
    playerCountry = c.trim();
    saveState(); updateUI(); openProfile();
  }
}

function editProfile(){
  openModal("Edit Profile", `
    <div class="resLine">Update your name/title</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input id="editName" style="padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,0.18);" value="${escapeHtml(playerName)}" placeholder="Name">
      <input id="editTitle" style="padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,0.18);" value="${escapeHtml(playerTitle)}" placeholder="Title">
      <div style="display:flex;gap:10px;">
        <button style="flex:1;" onclick="saveProfileEdits()">Save</button>
        <button style="flex:1;" onclick="openProfile()">Back</button>
      </div>
    </div>
  `);
}
function saveProfileEdits(){
  const n = $("editName");
  const t = $("editTitle");
  playerName = (n?.value||"").trim() || "Player";
  playerTitle = (t?.value||"").trim() || "Rookie Farmer";
  $("playerNameDisplay").textContent = playerName;
  $("playerNameDisplay").setAttribute('data-title',playerName);
  $("playerTitleDisplay").textContent = playerTitle;
  saveState();
  openProfile();
}
function resetTutorial(){
  try{ localStorage.removeItem(TUTORIAL_KEY); }catch(e){}
  closeModal();
  startTutorial();
}

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

/* =========================================================
   PLANTING / HARVESTING
========================================================= */
function getFirstAvailableSeed(){
  if((seeds[selectedSeed]||0) > 0) return selectedSeed;
  const keys = Object.keys(seeds);
  for(const k of keys){
    if((seeds[k]||0) > 0) return k;
  }
  return null;
}

function applyGrowBoost(ms){
  if(boosts.fertilizer > 0){
    boosts.fertilizer--;
    return Math.max(8000, Math.floor(ms * 0.8));
  }
  return ms;
}

/* =========================================================
   TOOLS (PLANT / REMOVE / MOVE)
========================================================= */
function setTool(tool){
  if(tutorialIsActive()) return;
  currentTool = tool;

  // Update the toggle button icon
  if (currentToolIcon) {
    currentToolIcon.src = `images/${tool}tool.png`;
  }

  // Optional: close panel after selecting
  // if (toolsPanel) {
  //   toolsPanel.classList.remove("toolsOpen");
  // }

  if (toolsArrow) {
    toolsArrow.classList.remove("toolsOpenArrow");
  }

  moveSourceIndex = null;
  updateToolUI();
  applyMoveHighlights();

  if(tool === "plant") showToast("Tool: Plant", 900);
  if(tool === "remove") showToast("Tool: Remove plant", 1100);
  if(tool === "move") showToast("Tool: Move plant", 1100);
  if(tool === "harvest") showToast("Tool: Harvest", 900);  
}

function updateToolUI(){
  const p = $("toolPlantBtn");
  const r = $("toolRemoveBtn");
  const h = $("toolHarvestBtn");
  const m = $("toolMoveBtn");
  if(p) p.classList.toggle("active", currentTool==="plant");
  if(r) r.classList.toggle("active", currentTool==="remove");
  if(h) h.classList.toggle("active", currentTool==="harvest");
  if(m) m.classList.toggle("active", currentTool==="move");
}

function hasEmptyTile(exceptIndex){
  for(let i=0;i<TILE_COUNT;i++){
    if(i === exceptIndex) continue;
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st && st.state === "empty") return true;
  }
  return false;
}

function applyMoveHighlights(){
  if(!tiles || !tiles.length) return;
  for(const t of tiles){
    t.classList.remove("moveSource", "moveTarget");
  }
  if(currentTool !== "move" || moveSourceIndex === null) return;

  if(tiles[moveSourceIndex]) tiles[moveSourceIndex].classList.add("moveSource");
  for(let i=0;i<TILE_COUNT;i++){
    if(i === moveSourceIndex) continue;
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st && st.state === "empty") tiles[i].classList.add("moveTarget");
  }
}

function clearMoveSelection(){
  moveSourceIndex = null;
  applyMoveHighlights();
}

function clickTile(i){
  if(tutorialIsActive()) return;
  if(bossBattle && bossBattle.active) return; // avoid weird overlap

  // MOVE tool: if a source is selected, this click is treated as destination pick
  if(currentTool === "move" && moveSourceIndex !== null){
    if(i === moveSourceIndex){
      clearMoveSelection();
      showToast("Move cancelled", 900);
      return;
    }
    if(!unlockedTiles[i]){
      showToast("Tile locked", 1000);
      return;
    }
    const dst = tileStates[i];
    if(dst.state !== "empty"){
      showToast("Tile not empty", 1000);
      return;
    }

    const src = tileStates[moveSourceIndex];
    tileStates[i] = { state: src.state, crop: src.crop, plantedAt: src.plantedAt, finishAt: src.finishAt };

    src.state = "empty";
    src.crop = "";
    src.plantedAt = 0;
    src.finishAt = 0;

    saveState();
    updateUI();
    renderFarm();
    clearMoveSelection();
    showToast("Plant moved!", 1000);
    return;
  }

  // locked tiles
  if(!unlockedTiles[i]){
    if(currentTool === "plant"){
      const cost = tileUnlockCost(unlockedCount());
      openModal("Unlock Tile", `
        <div class="resLine">Unlock this tile for <b>${cost}</b> coins?</div>
        <div style="display:flex;gap:10px;">
          <button style="flex:1;" ${coins<cost?"disabled":""} onclick="unlockTile(${i})">Unlock</button>
          <button style="flex:1;" onclick="closeModal()">Cancel</button>
        </div>
        <div class="smallNote">No quiz needed — coins only.</div>
      `);
    }else{
      showToast("Tile locked", 1000);
    }
    return;
  }

  const st = tileStates[i];

  // REMOVE tool
  if(currentTool === "remove"){
    if(st.state === "planted" || st.state === "grown"){
      st.state = "empty";
      st.crop = "";
      st.plantedAt = 0;
      st.finishAt = 0;

      saveState();
      updateUI();
      renderFarm();
      showToast("Plant removed", 1000);
    }else{
      showToast("Nothing to remove", 900);
    }
    return;
  }

  // MOVE tool: selecting a source plant
  if(currentTool === "move"){
    if(st.state !== "planted" && st.state !== "grown"){
      showToast("Select a planted crop to move", 1100);
      return;
    }
    if(!hasEmptyTile(i)){
      showToast("No available tile", 1200);
      return;
    }
    moveSourceIndex = i;
    applyMoveHighlights();
    showToast("Pick an empty tile to move to", 1200);
    return;
  }

  // HARVEST tool
  if(currentTool === "harvest"){
    if(st.state === "grown"){
      harvestQuiz(i);
    }else if(st.state === "planted"){
      showToast("Still growing...", 900);
    }else{
      showToast("Nothing to harvest", 900);
    }
    return;
  }

  // PLANT tool
  if(currentTool === "plant"){
    if(st.state === "empty"){
    const seed = getFirstAvailableSeed();
    if(!seed){
      showMessage("No Seeds", `<div class="smallNote">Buy seeds in Crops.</div>`);
      return;
    }
    const cropInfo = cropByEmoji(seed);
    if(!cropInfo){
      showMessage("Error", `<div class="smallNote">Unknown seed.</div>`);
      return;
    }

    seeds[seed]--;
    st.state = "planted";
    st.crop = seed;
    st.plantedAt = Date.now();
    st.finishAt = Date.now() + applyGrowBoost(cropInfo.growMs);

    questProgress("plant", 1);
    saveState();
    updateUI();
    renderFarm();
    return;
  }
    if(st.state === "grown"){
      showToast("Use Harvest tool to harvest", 1200);
      return;
    }
    if(st.state === "planted"){
      showToast("Still growing...", 900);
      return;
    }
  }

  // Fallback
  if(st.state === "grown"){
    showToast("Use Harvest tool to harvest", 1200);
    return;
  }
  if(st.state === "planted"){
    showToast("Still growing...", 900);
    return;
  }
}

/* harvest quiz */
function harvestQuiz(tileIndex){
  const st = tileStates[tileIndex];
  const cropInfo = cropByEmoji(st.crop);
  const diff = cropInfo ? cropInfo.level : "beginner";
  const q = pickQuestion(diff);

  let resolved = false;

  openModal(`Harvest Quiz (${tileLevelLabel(diff)})`, `
    <div class="resLine">Answer 1 question to harvest.</div>
    <div id="harvestQ"></div>
    <div id="harvestFB" class="quizFeedback"></div>
  `);

  renderQuestionUI(q, "harvestQ", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const fb = $("harvestFB");
    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);

    if(ok){
      fb.className = "quizFeedback good";
      // Update logic: Add to Inventory instead of Coin
      const invKey = cropInfo.emoji;
      inventory[invKey] = (inventory[invKey] || 0) + 1;

      fb.innerHTML = `Correct! <b>${cropInfo.name}</b> added to Bag! +<b>${cropInfo.harvestXP}</b> XP`;

      // coins += cropInfo.harvestCoins; // Removed direct coin gain
      gainXP(cropInfo.harvestXP);

      questProgress("harvest", 1);

      // Keep the plant in the tile and let it regrow
      st.state = "planted";
      st.plantedAt = Date.now();
      st.finishAt = Date.now() + applyGrowBoost(cropInfo.growMs);

      saveState();
      updateUI();
      renderFarm();

      setTimeout(()=>closeModal(), 1000); // slightly longer delay to read
    }else{
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Wrong. The plant needs time to regrow 😿`;

      // Keep the plant, but reset its grow time
      st.state = "planted";
      st.plantedAt = Date.now();
      st.finishAt = Date.now() + applyGrowBoost((cropInfo && cropInfo.growMs) ? cropInfo.growMs : 8000);

      saveState();
      updateUI();
      renderFarm();

      setTimeout(()=>closeModal(), 850);
    }
  });
}

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

/* =========================================================
   WILD PET SPAWN INTERVAL (SLOWER)
========================================================= */
function scheduleNextPetSpawn(){
  let min = 10_000;
  let max = 15_000;
  if(petSpawnsBlocked()){
    min += 40_000;
    max += 80_000;
  }
  nextPetSpawnAt = Date.now() + (min + Math.random()*(max-min));
}

function getActiveCropTiles(){
  const idx = [];
  for(let i=0;i<TILE_COUNT;i++){
    if(!unlockedTiles[i]) continue;
    const st = tileStates[i];
    if(st.state === "planted" || st.state === "grown") idx.push(i);
  }
  return idx;
}

/* =========================================================
   WILD PET ENTITY (ENTRANCE -> WALK -> EAT)
========================================================= */
let activeWildPet = null;

function farmBounds(){
  const wrap = $("farmWrap");
  const rect = wrap.getBoundingClientRect();
  return { w: rect.width, h: rect.height, rect };
}
function tileCenterInWrap(tileIndex){
  const wrapRect = $("farmWrap").getBoundingClientRect();
  const tileRect = tiles[tileIndex].getBoundingClientRect();
  const cx = (tileRect.left + tileRect.width/2) - wrapRect.left;
  const cy = (tileRect.top + tileRect.height/2) - wrapRect.top;
  return { x: cx, y: cy };
}

function trySpawnWildPet(){
  if(tutorialIsActive()) return;
  if(bossBattle && bossBattle.active) return;
  if(activeWildPet) return;
  const now = Date.now();
  if(now < nextPetSpawnAt) return;

  const cropTiles = getActiveCropTiles();
  scheduleNextPetSpawn();

  if(cropTiles.length === 0) return;

  let chance = 0.55 + cropTiles.length*0.03 + level*0.01;
  chance = Math.min(0.90, chance);
  if(petSpawnsBlocked()) chance *= 0.35;
  if(Math.random() > chance) return;

  const grown = cropTiles.filter(i => tileStates[i].state==="grown");
  const pool = (grown.length && Math.random()<0.6) ? grown : cropTiles;
  const targetTileIndex = pool[Math.floor(Math.random()*pool.length)];

  const type = weightedPick(PET_TYPES);
  spawnWildPetEntity(type, targetTileIndex);
}

function spawnWildPetEntity(type, targetTileIndex){
  showToast("A wild pet has appeared!");

  const b = farmBounds();
  const startSideLeft = Math.random() < 0.5;

  const startX = startSideLeft ? -16 : (b.w + 16);
  const startY = 20 + Math.random() * Math.max(1,(b.h - 40));

  const target = tileCenterInWrap(targetTileIndex);
  const targetX = target.x - 12;
  const targetY = target.y - 22;

  const entityEl = document.createElement("div");
  entityEl.className = "wildEntity";
  entityEl.innerHTML = type.imagepath;
  entityEl.title = `${type.name} (${type.rarity})`;
  entityEl.style.left = `${startX}px`;
  entityEl.style.top = `${startY}px`;
  entityEl.onclick = (e)=>{
    e.stopPropagation();
    onWildPetClicked();
  
  };

  const barEl = document.createElement("div");
  barEl.className = "entityBar";
  const barFillEl = document.createElement("div");
  barFillEl.className = "entityBarFill";
  barEl.appendChild(barFillEl);

  entityEl.appendChild(barEl);
  eventLayer.appendChild(entityEl);

  const approachMs = 1400;

  activeWildPet = {
    type,
    targetTileIndex,
    phase: "approach",
    entityEl,
    barEl,
    barFillEl,
    approachStartAt: Date.now(),
    approachArriveAt: Date.now() + approachMs,
    eatStartAt: 0,
    eatEndAt: 0,
    paused: false,
    pauseStartedAt: 0,
    poopTimers: []
  };

  schedulePoops(type, approachMs);

  requestAnimationFrame(()=>{
    entityEl.style.left = `${targetX}px`;
    entityEl.style.top = `${targetY}px`;
    barEl.style.left = `${targetX - 6}px`;
    barEl.style.top = `${targetY + 30}px`;
  });

  setTimeout(()=>{
    if(!activeWildPet) return;
    if(activeWildPet.phase !== "approach") return;

    const st = tileStates[targetTileIndex];
    if(!st || st.state==="empty"){
      despawnWildPet("It left because there was no crop.");
      return;
    }
    activeWildPet.phase = "eating";
    activeWildPet.eatStartAt = Date.now();
    activeWildPet.eatEndAt = Date.now() + type.eatMs;
  }, approachMs + 30);
}

function schedulePoops(type, approachMs){
  if(!activeWildPet) return;
  const count = Math.floor(type.poopMin + Math.random()*(type.poopMax - type.poopMin + 1));
  for(let i=0;i<count;i++){
    const t = 250 + Math.random()*(approachMs - 450);
    const tid = setTimeout(()=>{
      if(!activeWildPet) return;
      if(activeWildPet.phase !== "approach") return;
      dropPoopAtEntity();
    }, Math.max(150, t));
    activeWildPet.poopTimers.push(tid);
  }
}

function getEntityPosition(){
  if(!activeWildPet) return {x:0,y:0};
  const el = activeWildPet.entityEl;
  const x = parseFloat(el.style.left || "0");
  const y = parseFloat(el.style.top || "0");
  return { x, y };
}

function dropPoopAtEntity(){
  const pos = getEntityPosition();
  const poopEl = document.createElement("div");
  poopEl.className = "poop";
  poopEl.textContent = "💩";
  const px = pos.x + 10 + (Math.random()*10 - 5);
  const py = pos.y + 28 + (Math.random()*10 - 5);
  poopEl.style.left = `${px}px`;
  poopEl.style.top = `${py}px`;
  poopEl.title = "Click to clean";
  poopEl.onclick = (e)=>{
    e.stopPropagation();
    cleanPoop(poopEl);
  };
  eventLayer.appendChild(poopEl);
}

function cleanPoop(poopEl){
  try{ poopEl.remove(); }catch(e){}
  coins += 2;
  gainXP(2);
  questProgress("clean", 1);
  saveState();
  updateUI();
  showToast("Poop cleaned! +2 coins");
}

function tickWildPet(){
  // FIX: Stop eating if player is in Town/Zoo or a menu is open
  if(activeScreen !== "farm" || modal.style.display === "flex") return; 

  if(tutorialIsActive()) return;
  if(!activeWildPet) return;
  const st = tileStates[activeWildPet.targetTileIndex];
  if(!st || st.state==="empty"){
    despawnWildPet("The pet got bored and left.");
    return;
  }

  if(activeWildPet.phase !== "eating") {
    activeWildPet.barFillEl.style.width = "0%";
    return;
  }
  if(activeWildPet.paused) return;

  const now = Date.now();
  const duration = activeWildPet.eatEndAt - activeWildPet.eatStartAt;
  const elapsed = now - activeWildPet.eatStartAt;
  const pct = clamp(elapsed / Math.max(1, duration), 0, 1);
  activeWildPet.barFillEl.style.width = `${Math.floor(pct*100)}%`;

  if(now >= activeWildPet.eatEndAt){
    st.state = "empty";
    st.crop = "";
    st.plantedAt = 0;
    st.finishAt = 0;

    showMessage("Oh no!", `<div class="smallNote">A wild pet ate your crop 😿</div>`);
    despawnWildPet();
    saveState();
    updateUI();
    renderFarm();
  }
}

function despawnWildPet(optionalToast){
  if(!activeWildPet) return;
  for(const t of activeWildPet.poopTimers){
    try{ clearTimeout(t); }catch(e){}
  }
  try{ activeWildPet.entityEl.remove(); }catch(e){}
  try{ activeWildPet.barEl.remove(); }catch(e){}
  activeWildPet = null;
  if(optionalToast) showToast(optionalToast, 1200);
}

function getPetQuizDifficulty(tileIndex){
  const st = tileStates[tileIndex];
  if(st && (st.state==="planted" || st.state==="grown")){
    const c = cropByEmoji(st.crop);
    return c ? c.level : "beginner";
  }
  if(level >= 5) return "advanced";
  if(level >= 3) return "intermediate";
  return "beginner";
}

function onWildPetClicked(){
  if(tutorialIsActive()) return;
  if(!activeWildPet) return;

  activeWildPet.paused = true;
  activeWildPet.pauseStartedAt = Date.now();

  const diff = getPetQuizDifficulty(activeWildPet.targetTileIndex);
  const q = pickQuestion(diff);

  let resolved = false;

  openModal(`Wild Pet! (${tileLevelLabel(diff)})`, `
    <div class="resLine">${escapeHtml(activeWildPet.type.name)} is causing trouble!</div>
    <div class="smallNote" style="margin-top:-2px;">Correct = chance to capture • Wrong = disappears</div>
    <div id="petQ"></div>
    <div id="petFB" class="quizFeedback"></div>
  `);

  renderQuestionUI(q, "petQ", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const fb = $("petFB");
    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);

    if(!ok){
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Wrong! The pet vanished.`;
      setTimeout(()=>{
        despawnWildPet();
        closeModal();
        saveState();
        updateUI();
        renderFarm();
      }, 750);
      return;
    }

    const base = activeWildPet.type.capture;
    const bonus = captureBonusByBoost();
    const finalChance = Math.min(0.95, base + bonus);
    const roll = Math.random();

    if(roll <= finalChance){
      fb.className = "quizFeedback good";
      fb.innerHTML = `Correct! Capture success! 🐾`;
      capturePet(activeWildPet.type);
      questProgress("capture", 1);
    }else{
      fb.className = "quizFeedback bad";
      fb.innerHTML = `Correct, but it escaped!`;
    }

    setTimeout(()=>{
      despawnWildPet();
      closeModal();
      saveState();
      updateUI();
      renderFarm();
    }, 850);
  });
}

/* =========================================================
   ZOO SCREEN (PETS ROAM HERE)
========================================================= */
let zooRoamEls = new Map();

function zooBounds(){
  if(!zooYard) return { w:0, h:0 };
  const rect = zooYard.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

function openPetDetails(uid){
  const pet = zooPets.find(p=>p.uid===uid);
  if(!pet) return;

  const meta = (pet.animalId && BATTLE_ANIMALS[pet.animalId]) ? BATTLE_ANIMALS[pet.animalId] : null;
  const lvl = meta ? (pet.level || 1) : null;
  const stats = meta ? battleStats(pet.animalId, lvl) : null;

  let combineBtn = "";
  let combineNote = "";
  if(meta && lvl < 5){
    const dupCount = zooPets.filter(p=>p.uid!==uid && p.animalId===pet.animalId && (p.level||1)===lvl).length;
    combineBtn = `<button ${dupCount ? "" : "disabled"} onclick="combinePet('${pet.uid}')">Combine</button>`;
    combineNote = `<div class="smallNote" style="text-align:left;">Combine needs 2 copies of the same animal and the same level. (${dupCount ? "Ready" : "Need 1 more"})</div>`;
  }

  openModal("Pet", `
    <div class="itemCard">
      <div class="itemLeft">
        <div class="itemIcon">${pet.imagepath}</div>
        <div class="itemMeta">
          <div class="itemName">${escapeHtml(pet.name)}${meta ? ` <span style="opacity:.65;">Lv${lvl}</span>` : ""}</div>
          <div class="itemSub">${escapeHtml(pet.rarity || (meta ? meta.rarity : "Captured"))}</div>
          <div class="badgeRow">
            <div class="badge">${escapeHtml(pet.rarity || (meta ? meta.rarity : "Captured"))}</div>
            ${meta ? `<div class="badge">ATK ${stats.atk} • DEF ${stats.def} • SPD ${stats.spd}</div>` : `<div class="badge">Captured</div>`}
          </div>
        </div>
      </div>
      ${combineNote}
      <div class="rowBtns">
        ${combineBtn}
        <button onclick="closeModal()"><span><small data-title="Close">Close</small></span></button>
      </div>
    </div>
  `);
}

function spawnZooPetElement(pet){
  if(!zooRoamLayer) return;
  const el = document.createElement("div");
  el.className = "zooPet";
  el.innerHTML = pet.imagepath;
  el.style.left = "18px";
  el.style.top = "18px";
  el.dataset.uid = pet.uid;
  el.title = `${pet.name} • ${pet.rarity}`;
  el.onclick = (e)=>{ e.stopPropagation(); openPetDetails(pet.uid); };
  zooRoamLayer.appendChild(el);
  zooRoamEls.set(pet.uid, el);
  randomMoveZooPet(pet.uid, true);
}

function randomMoveZooPet(uid, instant=false){
  const el = zooRoamEls.get(uid);
  if(!el || !zooYard) return;
  const b = zooBounds();
  const pad = 18;
  const size = 34;
  const x = pad + Math.random() * Math.max(1, (b.w - pad*2 - size));
  const y = pad + Math.random() * Math.max(1, (b.h - pad*2 - size));

  const flip = (Math.random() < 0.5) ? -1 : 1;

  if(instant){
    el.style.transition = "none";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scaleX(${flip})`;
    requestAnimationFrame(()=>{ el.style.transition = ""; });
  }else{
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scaleX(${flip})`;
  }
}

function renderZooRoamingPets(){
  if(!zooRoamLayer) return;

  // Remove extras
  for(const [uid, el] of zooRoamEls.entries()){
    if(!zooPets.some(p=>p.uid===uid)){
      try{ el.remove(); }catch(e){}
      zooRoamEls.delete(uid);
    }
  }

  // Add missing
  for(const pet of zooPets){
    if(zooRoamEls.has(pet.uid)) continue;
    spawnZooPetElement(pet);
  }

  if(zooEmpty){
    zooEmpty.style.display = zooPets.length ? "none" : "flex";
  }
  if(zooStats){
    zooStats.innerHTML = `Pets: <b>${zooPets.length}</b>`;
  }
}

setInterval(()=>{
  if(activeScreen !== "zoo") return;
  if(tutorialIsActive()) return;
  for(const uid of zooRoamEls.keys()){
    randomMoveZooPet(uid);
  }
}, 2200);

function capturePet(type){
  const p = {
    uid: uid(),
    typeId: type.id,
    animalId: type.id,
    level: 1,
    emoji: type.emoji,
    imagepath: type.imagepath,
    name: type.name,
    rarity: type.rarity
  };
  zooPets.unshift(p);

  // If the Zoo screen is open, show the new pet immediately.
  if(activeScreen === "zoo"){
    requestAnimationFrame(()=>renderZooRoamingPets());
  }
}




/* =========================================================
   ARENA (PVP) — 1v1 Card Battle
========================================================= */

let arenaDraft = null;
let arenaBattle = null;

function listBattlePets(){
  return (zooPets||[]).filter(p=>p && p.animalId && BATTLE_ANIMALS[p.animalId]);
}

function openArena(){
  const pets = listBattlePets();
  const hasPets = pets.length > 0;

  openModal("Arena", `
    <div class="resLine">1v1 turn-based battles using your Zoo animals.</div>
    <div class="smallNote" style="text-align:left;">
      Pick one animal,  then use Attack/Buff/Ultimate cards. Ultimate charges from actions and taking damage.
    </div>

    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;font-weight:900;" ${hasPets ? "" : "disabled"} onclick="startArenaFlow('ai')">Practice (vs AI)</button>
      <button style="flex:1;font-weight:900;" ${hasPets ? "" : "disabled"} onclick="startArenaFlow('local')">Local PvP (2P)</button>
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;">
      <button style="flex:1;" onclick="openBattleGuide()">Battle Guide</button>
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>

    ${!hasPets ? `<div class="smallNote" style="text-align:left;margin-top:10px;">Capture animals on the farm first (answer pet questions) to use Arena.</div>` : ""}
  `);
}

function startArenaFlow(mode){
  arenaDraft = { mode, p1:null, p2:null, quizOn:true };
  openArenaPetSelect("p1");
}

function openArenaPetSelect(side){
  const pets = listBattlePets();
  if(!pets.length){
    openArena();
    return;
  }

  const cards = pets.map(p=>{
    const lvl = clamp(parseInt(p.level||1,10)||1,1,5);
    const meta = BATTLE_ANIMALS[p.animalId];
    const st = battleStats(p.animalId, lvl);
    const hp = battleHpMax(lvl);
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${meta.imagepath}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(meta.name)} <span style="opacity:.65;">Lv${lvl}</span></div>
            <div class="itemSub">ATK ${st.atk} • DEF ${st.def} • SPD ${st.spd} • HP ${hp}</div>
            <div class="badgeRow">
              <div class="badge">${escapeHtml(meta.rarity)}</div>
              <div class="badge">UID ${escapeHtml(p.uid.slice(-6))}</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button onclick="selectArenaPet('${side}','${p.uid}')"><span><small data-title="Select">Select</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  const title = (side==="p1") ? "Select your animal" : "Select opponent animal";

  openModal(title, `
    <div class="petSelectionContent">
      <div class="smallNote" style="text-align:left;">
      Quiz Mode decides whether each action requires answering a question.
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button style="flex:1;" onclick="toggleArenaQuiz()">${arenaDraft?.quizOn ? "Quiz: ON" : "Quiz: OFF"}</button>
        <button style="flex:1;" onclick="openArena()">Back</button>
      </div>
      <div class="modalGrid" style="margin-top:10px;">
        ${cards}
      </div>
    </div>
  `);
}

function toggleArenaQuiz(){
  if(!arenaDraft) return;
  arenaDraft.quizOn = !arenaDraft.quizOn;
  // rerender current selection
  if(!arenaDraft.p1) openArenaPetSelect("p1");
  else if(arenaDraft.mode==="local" && !arenaDraft.p2) openArenaPetSelect("p2");
  else openArena();
}

function selectArenaPet(side, uid){
  const pet = zooPets.find(p=>p.uid===uid);
  if(!pet || !pet.animalId || !BATTLE_ANIMALS[pet.animalId]) return;

  if(side==="p1"){
    arenaDraft.p1 = uid;
    if(arenaDraft.mode==="local"){
      openArenaPetSelect("p2");
    }else{
      arenaDraft.p2 = pickAiOpponent(pet.level||1);
      startArenaBattle();
    }
    return;
  }

  arenaDraft.p2 = uid;
  startArenaBattle();
}

function pickAiOpponent(level){
  const ids = Object.keys(BATTLE_ANIMALS);
  const animalId = ids[Math.floor(Math.random()*ids.length)];
  // small level variance
  const delta = (Math.random()<0.5) ? 0 : (Math.random()<0.5 ? 1 : -1);
  const lv = clamp((parseInt(level||1,10)||1) + delta, 1, 5);
  return { ai:true, uid:"ai_"+uid(), animalId, level:lv };
}

function buildCombatantFrom(source, sideLabel){
  // AI source is object, player source is pet uid
  if(source && typeof source==="object" && source.ai){
    const meta = BATTLE_ANIMALS[source.animalId];
    const lv = clamp(parseInt(source.level||1,10)||1,1,5);
    return {
      side: sideLabel,
      control: "ai",
      animalId: source.animalId,
      name: meta.name,
      emoji: meta.emoji,
      rarity: meta.rarity,
      level: lv,
      hpMax: battleHpMax(lv),
      hp: battleHpMax(lv),
      charge: 0,
      permDefBonus: 0,
      statuses: [],
      temp: {}
    };
  }

  const pet = zooPets.find(p=>p.uid===source);
  const meta = BATTLE_ANIMALS[pet.animalId];
  const lv = clamp(parseInt(pet.level||1,10)||1,1,5);

  return {
    side: sideLabel,
    control: "human",
    petUid: pet.uid,
    animalId: pet.animalId,
    name: meta.name,
    emoji: meta.emoji,
    rarity: meta.rarity,
    level: lv,
    hpMax: battleHpMax(lv),
    hp: battleHpMax(lv),
    charge: 0,
    permDefBonus: 0,
    statuses: [],
    temp: {}
  };
}

function startArenaBattle(){
  const mode = arenaDraft.mode;
  const quizOn = arenaDraft.quizOn;

  const p1 = buildCombatantFrom(arenaDraft.p1, "p1");
  const p2 = (mode==="local") ? buildCombatantFrom(arenaDraft.p2, "p2") : buildCombatantFrom(arenaDraft.p2, "p2");
  p2.control = (mode==="local") ? "human" : "ai";

  arenaBattle = {
    mode,
    quizOn,
    round: 1,
    order: [],
    idx: 0,
    p1,
    p2,
    log: [],
    active: true,
    waiting: false
  };

  addArenaLog("Battle start!");
  startNewArenaRound(true);
}

function getCombatant(side){
  return (side==="p1") ? arenaBattle.p1 : arenaBattle.p2;
}
function otherSide(side){ return (side==="p1") ? "p2" : "p1"; }
function currentArenaSide(){ return arenaBattle.order[arenaBattle.idx]; }

function addArenaLog(line){
  if(!arenaBattle) return;
  arenaBattle.log.unshift(line);
  arenaBattle.log = arenaBattle.log.slice(0, 18);
}

function getEffStats(c){
  const base = battleStats(c.animalId, c.level);
  let atk = base.atk;
  let def = base.def + (c.permDefBonus||0);
  let spd = base.spd;

  for(const st of c.statuses){
    if(st.kind==="stat"){
      atk += (st.atk||0);
      def += (st.def||0);
      spd += (st.spd||0);
    }
  }
  return { atk, def, spd };
}

function hasDebuff(c){
  for(const st of c.statuses){
    if(st.kind==="stun") return true;
    if(st.kind==="stat" && ((st.atk||0)<0 || (st.def||0)<0 || (st.spd||0)<0)) return true;
  }
  return false;
}

function startNewArenaRound(first=false){
  if(!arenaBattle || !arenaBattle.active) return;
  const b = arenaBattle;

  const s1 = getEffStats(b.p1).spd;
  const s2 = getEffStats(b.p2).spd;

  if(s1 > s2) b.order = ["p1","p2"];
  else if(s2 > s1) b.order = ["p2","p1"];
  else b.order = (Math.random()<0.5) ? ["p1","p2"] : ["p2","p1"];

  b.idx = 0;
  if(!first) b.round += 1;

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function renderArenaBattle(){
  const b = arenaBattle;
  if(!b || !b.active) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  const foe = getCombatant(otherSide(side));

  const a = getEffStats(actor);
  const f = getEffStats(foe);

  const skillMeta = BATTLE_ANIMALS[actor.animalId].skills;
  const ultReady = actor.charge >= 100;

  const canAct = actor.control==="human" && !b.waiting;

  openModal("Arena Battle", `
    <div class="bossWrap">
      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${actor.emoji}</div>
          <div>
            <div style="font-weight:900;">${escapeHtml(actor.name)} <span style="opacity:.65;">Lv${actor.level}</span></div>
            <div class="smallNote" style="margin-top:2px;text-align:left;">ATK ${a.atk} • DEF ${a.def} • SPD ${a.spd}</div>
          </div>
        </div>
        <div style="min-width:180px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.max(0, Math.floor((actor.hp/actor.hpMax)*100))}%"></div></div>
          <div class="hpText">${actor.hp}/${actor.hpMax} HP • ${actor.charge}/100 ULT</div>
        </div>
      </div>

      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${foe.emoji}</div>
          <div>
            <div style="font-weight:900;">${escapeHtml(foe.name)} <span style="opacity:.65;">Lv${foe.level}</span></div>
            <div class="smallNote" style="margin-top:2px;text-align:left;">ATK ${f.atk} • DEF ${f.def} • SPD ${f.spd}</div>
          </div>
        </div>
        <div style="min-width:180px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.max(0, Math.floor((foe.hp/foe.hpMax)*100))}%"></div></div>
          <div class="hpText">${foe.hp}/${foe.hpMax} HP • ${foe.charge}/100 ULT</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
        ${renderArenaStatusBadges(arenaBattle.p1)}
        ${renderArenaStatusBadges(arenaBattle.p2)}
      </div>

      <div class="bossLog">
        <div style="font-weight:900;margin-bottom:6px;">Round ${b.round} • Turn: ${side==="p1" ? "Player 1" : (b.mode==="local" ? "Player 2" : "AI")}</div>
        ${b.log.map(l=>`<div>• ${escapeHtml(l)}</div>`).join("")}
      </div>

      <div class="smallNote" style="text-align:left;margin-top:-2px;">
        Quiz Mode: <b>${b.quizOn ? "ON" : "OFF"}</b>
      </div>

      <div id="arenaQWrap"></div>

      <div class="skillRow">
        <button ${(!canAct) ? "disabled" : ""} onclick="arenaUseSkill('attack')">
          Attack <small>${escapeHtml(skillMeta.attack.name)}</small>
        </button>
        <button ${(!canAct) ? "disabled" : ""} onclick="arenaUseSkill('buff')">
          Buff <small>${escapeHtml(skillMeta.buff.name)}</small>
        </button>
        <button ${(!canAct || !ultReady) ? "disabled" : ""} onclick="arenaUseSkill('ultimate')">
          Ultimate <small>${escapeHtml(skillMeta.ultimate.name)}</small>
        </button>
      </div>

      <div style="display:flex;gap:10px;">
        <button style="flex:1;" onclick="toggleArenaQuizMid()">Toggle Quiz</button>
        <button style="flex:1;" onclick="endArenaBattle(true)">Exit</button>
      </div>
    </div>
  `);
}

function renderArenaStatusBadges(c){
  if(!arenaBattle) return "";
  const tags = [];
  for(const st of c.statuses){
    if(st.kind==="stat"){
      const parts=[];
      if(st.atk) parts.push(`${st.atk>0?"+":""}${st.atk}ATK`);
      if(st.def) parts.push(`${st.def>0?"+":""}${st.def}DEF`);
      if(st.spd) parts.push(`${st.spd>0?"+":""}${st.spd}SPD`);
      tags.push(`${parts.join(" ")}(${st.turns})`);
    }else if(st.kind==="dodge"){
      tags.push(`Dodge ${Math.round((st.pct||0)*100)}%(${st.turns})`);
    }else if(st.kind==="dmgReduce"){
      tags.push(`DR-${st.amount}(${st.turns})`);
    }else if(st.kind==="guard"){
      tags.push(`Guard-${st.amount}(${st.turns})`);
    }else if(st.kind==="evasion"){
      tags.push(`Evasion(${st.turns})`);
    }else if(st.kind==="stun"){
      tags.push(`Stun(${st.turns})`);
    }else if(st.kind==="nextAtk"){
      tags.push(`NextAtk +${st.power||0} / ignore ${st.ignore||0}(${st.turns})`);
    }else if(st.kind==="cheatDeath"){
      tags.push(`NineLives(${st.turns})`);
    }
  }
  if(c.permDefBonus) tags.push(`+${c.permDefBonus}DEF(perma)`);
  if(!tags.length) return `<div class="badge">${c.side.toUpperCase()}: —</div>`;
  return `<div class="badge">${c.side.toUpperCase()}: ${escapeHtml(tags.join(" • "))}</div>`;
}

function toggleArenaQuizMid(){
  if(!arenaBattle) return;
  arenaBattle.quizOn = !arenaBattle.quizOn;
  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function arenaUseSkill(kind){
  const b = arenaBattle;
  if(!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);

  if(actor.control !== "human") return;

  // If stunned: skip immediately
  if(hasStatus(actor,"stun")){
    addArenaLog(`${actor.name} is stunned and loses the turn!`);
    consumeStatus(actor,"stun",1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  if(kind==="ultimate" && actor.charge < 100) return;

  if(!b.quizOn){
    resolveArenaSkill(kind);
    return;
  }

  b.waiting = true;
  renderArenaBattle();

  const diff = (kind==="attack") ? "beginner" : (kind==="buff" ? "intermediate" : "advanced");
  const q = pickQuestion(diff);

  const wrap = document.getElementById("arenaQWrap");
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="sectionTitle">Answer to use ${escapeHtml(kind)}</div>
    <div id="arenaQInner"></div>
    <div id="arenaQFb" class="quizFeedback"></div>
  `;

  renderQuestionUI(q, "arenaQInner", (ans)=>{
    if(!arenaBattle || !arenaBattle.active) return;

    questProgress("answer", 1);

    const ok = normalizeAnswer(ans) === normalizeAnswer(q.a);
    const fb = document.getElementById("arenaQFb");
    if(!ok){
      fb.className = "quizFeedback bad";
      fb.innerHTML = "Wrong. Your action failed.";
      addArenaLog(`${actor.name} answered wrong — action failed.`);
      setTimeout(()=>{
        b.waiting = false;
        tickStatusesEndTurn(actor);
        endArenaTurn();
      }, 650);
      return;
    }

    fb.className = "quizFeedback good";
    fb.innerHTML = "Correct! Action used.";
    setTimeout(()=>{
      b.waiting = false;
      resolveArenaSkill(kind);
    }, 450);
  });
}

function pickQuestion(diff){
  if(diff==="advanced") return randChoice(quizBank.advanced);
  if(diff==="intermediate") return randChoice(quizBank.intermediate);
  return randChoice(quizBank.beginner);
}
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function hasStatus(c, kind){
  return c.statuses.some(s=>s.kind===kind && s.turns>0);
}

function consumeStatus(c, kind, turnsToRemove=1){
  for(const st of c.statuses){
    if(st.kind===kind && st.turns>0){
      st.turns -= turnsToRemove;
      if(st.turns < 0) st.turns = 0;
      break;
    }
  }
  c.statuses = c.statuses.filter(s=>s.turns>0);
}

function addStatus(c, st){
  c.statuses.push(st);
}

function tickStatusesEndTurn(c){
  for(const st of c.statuses){
    st.turns -= 1;
  }
  c.statuses = c.statuses.filter(s=>s.turns>0);
}

function resolveArenaSkill(kind){
  const b = arenaBattle;
  if(!b || !b.active) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  const foe = getCombatant(otherSide(side));

  if(hasStatus(actor,"stun")){
    addArenaLog(`${actor.name} is stunned and loses the turn!`);
    consumeStatus(actor,"stun",1);
    tickStatusesEndTurn(actor);
    endArenaTurn();
    return;
  }

  const meta = BATTLE_ANIMALS[actor.animalId];
  const skill = meta.skills[kind];

  if(kind==="attack"){
    actor.charge = Math.min(100, actor.charge + 25);
    doArenaAttack(actor, foe, skill, (b.order[0]===side));
  }
  else if(kind==="buff"){
    actor.charge = Math.min(100, actor.charge + 20);
    doArenaBuff(actor, foe);
  }
  else if(kind==="ultimate"){
    actor.charge = 0;
    doArenaUltimate(actor, foe);
  }

  // check winner
  if(foe.hp <= 0){
    endArenaBattle(false, side);
    return;
  }
  if(actor.hp <= 0){
    endArenaBattle(false, otherSide(side));
    return;
  }

  // End turn: tick durations on actor, clear temporary locks on both sides
  tickStatusesEndTurn(actor);
  actor.temp = {};
  foe.temp = {};

  endArenaTurn();
}

function calcBaseDamage(skillPower, atk, def){
  return Math.max(1, skillPower + atk - def);
}

function getDodgeChance(defender, attacker){
  let dodge = 0;

  // Speed bonus rule: every 2 SPEED above opponent = +5% dodge, cap 25%
  const sDef = getEffStats(defender).spd;
  const sAtk = getEffStats(attacker).spd;
  const diff = sDef - sAtk;
  if(diff >= 2){
    dodge += Math.min(0.25, Math.floor(diff/2) * 0.05);
  }

  // Add dodge status
  for(const st of defender.statuses){
    if(st.kind==="dodge") dodge += (st.pct||0);
  }

  return Math.min(0.6, dodge);
}

function applyDamage(attacker, defender, rawDmg){
  let dmg = Math.max(0, rawDmg);

  // Evasion (deer ult)
  const ev = defender.statuses.find(s=>s.kind==="evasion");
  if(ev){
    consumeStatus(defender,"evasion", 99);
    addArenaLog(`${defender.name} evaded the hit!`);
    return 0;
  }

  // Dodge
  const dodgeChance = getDodgeChance(defender, attacker);
  if(dodgeChance > 0 && Math.random() < dodgeChance){
    addArenaLog(`${defender.name} dodged!`);
    return 0;
  }

  // Damage reduction
  let reduce = 0;
  for(const st of defender.statuses){
    if(st.kind==="dmgReduce") reduce += (st.amount||0);
  }

  // Guard (dog buff): next incoming damage -2
  const guard = defender.statuses.find(s=>s.kind==="guard");
  if(guard){
    reduce += (guard.amount||0);
    consumeStatus(defender,"guard", 99);
  }

  dmg = Math.max(0, dmg - reduce);

  if(dmg > 0){
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.charge = Math.min(100, defender.charge + 10);
  }

  // Cat Nine-Lives: survive once at 1 HP for the current action window
  const cd = defender.statuses.find(s=>s.kind==="cheatDeath");
  if(defender.hp <= 0 && cd && !cd.used){
    cd.used = true;
    defender.hp = 1;
    defender.temp.surviveThisAction = true;
    addArenaLog(`${defender.name} refused to go down (Nine-Lives)!`);
  }
  if(defender.temp.surviveThisAction && defender.hp <= 0){
    defender.hp = 1;
  }

  return dmg;
}

function doArenaAttack(actor, foe, skill, actorIsFirstThisRound){
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  // One-time next attack modifiers
  let powerBonus = 0;
  let ignoreDef = 0;
  const nxt = actor.statuses.find(s=>s.kind==="nextAtk");
  if(nxt){
    powerBonus += (nxt.power||0);
    ignoreDef += (nxt.ignore||0);
    consumeStatus(actor,"nextAtk", 99);
  }

  const skillPower = (skill.power || 0) + powerBonus;
  const defAdj = Math.max(0, f.def - ignoreDef);

  let dmg = calcBaseDamage(skillPower, a.atk, defAdj);

  // Rabbit bonus
  if(actor.animalId==="rabbit" && actorIsFirstThisRound) dmg += 2;

  // Cat crit
  if(actor.animalId==="cat" && Math.random() < 0.25){
    dmg += 4;
    addArenaLog(`${actor.name} landed a crit!`);
  }

  // Alligator bonus if enemy DEF high
  if(actor.animalId==="alligator" && f.def >= 6) dmg += 2;

  const dealt = applyDamage(actor, foe, dmg);

  if(dealt > 0) addArenaLog(`${actor.name} used ${skill.name} for ${dealt} damage.`);
  else addArenaLog(`${actor.name} used ${skill.name}, but it dealt no damage.`);

  // On-hit effects
  if(dealt > 0){
    // Deer: 30% speed debuff
    if(actor.animalId==="deer" && Math.random() < 0.30){
      addStatus(foe, { kind:"stat", spd:-2, turns:1 });
      addArenaLog(`${foe.name}'s SPEED fell (-2).`);
    }

    // Fox: Hex (DEF -2 for 2 turns)
    if(actor.animalId==="fox"){
      addStatus(foe, { kind:"stat", def:-2, turns:2 });
      addArenaLog(`${foe.name} is Hexed (DEF -2).`);
    }

    // Panda: permanent DEF bonus (+1, cap +3)
    if(actor.animalId==="panda"){
      actor.permDefBonus = Math.min(3, (actor.permDefBonus||0) + 1);
      addArenaLog(`${actor.name} gained +1 DEF permanently.`);
    }
  }
}

function doArenaBuff(actor, foe){
  const id = actor.animalId;

  if(id==="rabbit"){
    addStatus(actor, { kind:"stat", spd:+3, turns:2 });
    addStatus(actor, { kind:"nextAtk", power:+1, ignore:0, turns:2 });
    addArenaLog(`${actor.name} used Burst Step.`);
  }
  else if(id==="dog"){
    addStatus(actor, { kind:"stat", def:+3, turns:2 });
    addStatus(actor, { kind:"guard", amount:2, turns:2 });
    addArenaLog(`${actor.name} used Guard Stance.`);
  }
  else if(id==="deer"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 4);
    addStatus(actor, { kind:"stat", def:+2, turns:1 });
    addArenaLog(`${actor.name} used Calm Breath (+HP).`);
  }
  else if(id==="cat"){
    addStatus(actor, { kind:"nextAtk", power:+3, ignore:2, turns:2 });
    addArenaLog(`${actor.name} used Pounce Setup.`);
  }
  else if(id==="lion"){
    addStatus(actor, { kind:"stat", atk:+3, turns:2 });
    addStatus(foe,   { kind:"stat", atk:-2, turns:1 });
    addArenaLog(`${actor.name} used Roar.`);
  }
  else if(id==="panda"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 5);
    addStatus(actor, { kind:"stat", def:+2, turns:2 });
    addArenaLog(`${actor.name} used Bamboo Snack (+HP).`);
  }
  else if(id==="fox"){
    addStatus(actor, { kind:"stat", spd:+2, turns:2 });
    addStatus(actor, { kind:"dodge", pct:0.20, turns:1 });
    addArenaLog(`${actor.name} used Illusion Veil.`);
  }
  else if(id==="alligator"){
    addStatus(actor, { kind:"stat", def:+4, turns:2 });
    addStatus(actor, { kind:"stat", spd:-1, turns:2 });
    addArenaLog(`${actor.name} used Iron Hide.`);
  }
}

function doArenaUltimate(actor, foe){
  const id = actor.animalId;
  const a = getEffStats(actor);
  const f = getEffStats(foe);

  if(id==="rabbit"){
    addArenaLog(`${actor.name} used Lightning Combo!`);
    for(let i=0;i<3;i++){
      const dmg = calcBaseDamage(3, a.atk, f.def);
      applyDamage(actor, foe, dmg);
      if(foe.hp<=0) break;
    }
  }
  else if(id==="dog"){
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Loyal Rush! (${dealt} dmg)`);
    if(actor.hp < (actor.hpMax/2)){
      actor.hp = Math.min(actor.hpMax, actor.hp + 3);
      addArenaLog(`${actor.name} healed 3.`);
    }
  }
  else if(id==="deer"){
    actor.hp = Math.min(actor.hpMax, actor.hp + 7);
    addStatus(actor, { kind:"evasion", turns:1 });
    addArenaLog(`${actor.name} used Forest Grace (+HP +Evasion).`);
  }
  else if(id==="cat"){
    const dmg = calcBaseDamage(8, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind:"cheatDeath", turns:2, used:false });
    addArenaLog(`${actor.name} used Nine-Lives Trick! (${dealt} dmg)`);
  }
  else if(id==="lion"){
    let dmg = calcBaseDamage(10, a.atk, f.def);
    if(hasDebuff(foe)) dmg += 4;
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used King's Verdict! (${dealt} dmg)`);
  }
  else if(id==="panda"){
    const dmg = calcBaseDamage(6, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(actor, { kind:"dmgReduce", amount:3, turns:2 });
    addArenaLog(`${actor.name} used Soft But Strong! (${dealt} dmg)`);
  }
  else if(id==="fox"){
    // Steal higher stat for 2 turns, then hit
    const statToSteal = (f.def > f.atk) ? "def" : "atk";
    if(statToSteal==="atk"){
      addStatus(actor, { kind:"stat", atk:+2, turns:2 });
      addStatus(foe,   { kind:"stat", atk:-2, turns:2 });
      addArenaLog(`${actor.name} stole 2 ATK for 2 turns!`);
    }else{
      addStatus(actor, { kind:"stat", def:+2, turns:2 });
      addStatus(foe,   { kind:"stat", def:-2, turns:2 });
      addArenaLog(`${actor.name} stole 2 DEF for 2 turns!`);
    }
    const a2 = getEffStats(actor);
    const f2 = getEffStats(foe);
    const dmg = calcBaseDamage(8, a2.atk, f2.def);
    const dealt = applyDamage(actor, foe, dmg);
    addArenaLog(`${actor.name} used Mind Game! (${dealt} dmg)`);
  }
  else if(id==="alligator"){
    const alreadyDebuffed = hasDebuff(foe);
    const dmg = calcBaseDamage(9, a.atk, f.def);
    const dealt = applyDamage(actor, foe, dmg);
    addStatus(foe, { kind:"stat", def:-4, turns:2 });
    if(alreadyDebuffed){
      addStatus(foe, { kind:"stun", turns:1 });
      addArenaLog(`${foe.name} is stunned!`);
    }
    addArenaLog(`${actor.name} used Death Roll! (${dealt} dmg)`);
  }
}

function endArenaTurn(){
  const b = arenaBattle;
  if(!b || !b.active) return;

  b.idx += 1;
  if(b.idx >= 2){
    // new round
    b.p1.temp = {};
    b.p2.temp = {};
    startNewArenaRound(false);
    return;
  }

  renderArenaBattle();
  handleArenaAutoIfNeeded();
}

function handleArenaAutoIfNeeded(){
  const b = arenaBattle;
  if(!b || !b.active || b.waiting) return;

  const side = currentArenaSide();
  const actor = getCombatant(side);
  if(actor.control !== "ai") return;

  setTimeout(()=>{
    if(!arenaBattle || !arenaBattle.active) return;
    const s = currentArenaSide();
    const a = getCombatant(s);
    if(a.control !== "ai") return;

    // Stun skip
    if(hasStatus(a,"stun")){
      addArenaLog(`${a.name} is stunned and loses the turn!`);
      consumeStatus(a,"stun",1);
      tickStatusesEndTurn(a);
      endArenaTurn();
      return;
    }

    const hpPct = a.hp / a.hpMax;

    if(a.charge >= 100){
      resolveArenaSkill("ultimate");
      return;
    }

    // Prefer buff when low,  sometimes buff otherwise
    if(hpPct < 0.55 && Math.random() < 0.70) resolveArenaSkill("buff");
    else if(Math.random() < 0.18) resolveArenaSkill("buff");
    else resolveArenaSkill("attack");
  }, 650);
}

function endArenaBattle(exitOnly=false, winnerSide=null){
  const b = arenaBattle;
  if(!b) return;

  if(exitOnly){
    arenaBattle = null;
    openArena();
    return;
  }

  b.active = false;

  if(winnerSide){
    const winner = getCombatant(winnerSide);
    addArenaLog(`${winner.name} wins!`);

    // Rewards only for Practice vs AI when Player 1 wins
    if(b.mode==="ai" && winnerSide==="p1"){
      const reward = 35 + winner.level*10;
      coins += reward;
      gainXP(20 + winner.level*5);
      saveState();
      updateUI();
      addArenaLog(`You earned +${reward} coins.`);
    }
  }

  renderArenaBattle();
}

function openBattleGuide(){
  const scalingHead = LEVEL_SCALING_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const scalingBody = LEVEL_SCALING_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const baseHead = ANIMAL_BASE_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const baseBody = ANIMAL_BASE_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const lvlHead = ANIMAL_LEVEL_TABLE[0].map(h=>`<th>${escapeHtml(h)}</th>`).join("");
  const lvlBody = ANIMAL_LEVEL_TABLE.slice(1).map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const skillCards = Object.keys(BATTLE_ANIMALS).map(id=>{
    const a = BATTLE_ANIMALS[id];
    const s = a.skills;
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${a.emoji}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(a.name)}</div>
            <div class="itemSub">Attack: <b>${escapeHtml(s.attack.name)}</b> — ${escapeHtml(s.attack.desc || "")}</div>
            <div class="itemSub">Buff: <b>${escapeHtml(s.buff.name)}</b> — ${escapeHtml(s.buff.desc || "")}</div>
            <div class="itemSub">Ultimate: <b>${escapeHtml(s.ultimate.name)}</b> — ${escapeHtml(s.ultimate.desc || "")}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  openModal("Battle Guide", `
    <div class="resLine">Damage: <b>max(1, SkillPower + ATK - DEF)</b></div>
    <div class="smallNote" style="text-align:left;">
      Ultimate charge: Attack +25, Buff +20, Taking damage +10. Use Ultimate at 100, then reset to 0.<br>
      Speed bonus: every 2 SPEED above opponent gives +5% dodge, cap 25%.<br>
      Combine duplicates in the Zoo: same animal + same level → +1 level (max Lv5).
    </div>

    <div class="sectionTitle">Cell tables</div>

    <div class="sectionTitle">Level scaling</div>
    <div style="overflow:auto;">
      <table class="guideTable">
        <thead><tr>${scalingHead}</tr></thead>
        <tbody>${scalingBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Roster base stats</div>
    <div style="overflow:auto;">
      <table class="guideTable">
        <thead><tr>${baseHead}</tr></thead>
        <tbody>${baseBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Per-level stats</div>
    <div style="overflow:auto;">
      <table class="guideTable guideTableSmall">
        <thead><tr>${lvlHead}</tr></thead>
        <tbody>${lvlBody}</tbody>
      </table>
    </div>

    <div class="sectionTitle">Skills</div>
    <div class="modalGrid" style="margin-top:8px;">
      ${skillCards}
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;">
      <button style="flex:1;" onclick="openArena()">Back</button>
      <button style="flex:1;" onclick="closeModal()">Close</button>
    </div>
  `);
}


// ensure global hook for HTML onclick
window.openArena = openArena;


/* =========================================================
   BOSS FIGHT: Pig 🐷 vs Scarecrow
========================================================= */
let bossBattle = null;

function scheduleNextBossSpawn(){
  // slower than pets: ~5–9 minutes
  let min = 300_000;
  let max = 540_000;
  if(petSpawnsBlocked()){
    min += 120_000;
    max += 180_000;
  }
  nextBossSpawnAt = Date.now() + (min + Math.random()*(max-min));
}

function trySpawnBoss(){
  if(tutorialIsActive()) return;
  if(bossBattle && bossBattle.active) return;
  if(activeWildPet) return;
  if(modal.style.display === "flex") return;
  if(activeScreen !== "farm") return;

  const now = Date.now();
  if(now < nextBossSpawnAt) return;

  // schedule next attempt regardless
  scheduleNextBossSpawn();

  // needs at least one crop on farm to matter
  const cropTiles = getActiveCropTiles();
  if(cropTiles.length === 0) return;

  // chance per attempt
  let chance = 0.35 + (level * 0.02);
  chance = Math.min(0.65, chance);
  if(Math.random() > chance) return;

  showToast("A wild boss appeared!", 1400);

  openModal("A wild boss appeared!", `
    <div class="resLine">You: <b>Dog 🐶</b> vs Wild Boss: <b>Scarecrow</b></div>
    <div class="smallNote" style="text-align:left;">
      Turn-based fight.<br>
      • Normal Attack = Beginner question<br>
      • Heavy Attack = Intermediate/Advanced question<br>
      Correct = deal damage • Wrong = lose turn
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;font-weight:900;" onclick="startBossBattle()">Fight</button>
      <button style="flex:1;" onclick="runFromBoss()">Run</button>
    </div>
  `);
}

// function ensureStarterDog(){
//   const hasDog = zooPets.some(p => p.typeId === "dog_starter");
//   if(hasDog) return;
//   const dog = { uid: uid(), typeId:"dog_starter", emoji:"🐶", name:"Dog", rarity:"Starter" };
//   zooPets.push(dog);
// }

function runFromBoss(){
  // penalty: boss eats one random crop (if any)
  const cropTiles = getActiveCropTiles();
  if(cropTiles.length){
    const t = cropTiles[Math.floor(Math.random()*cropTiles.length)];
    tileStates[t] = { state:"empty", crop:"", plantedAt:0, finishAt:0 };
    saveState();
    updateUI();
    renderFarm();
    closeModal();
    showMessage("You ran!", `<div class="smallNote">The boss scared your farm and ruined 1 crop 😿</div>`);
  }else{
    closeModal();
  }
}

function startBossBattle(){
  // ensureStarterDog();

  // Create a list of available pets for the player to choose from.
  const petOptions = zooPets.map(pet => {
    return `<button class="petChoiceBtn" onclick="selectPetForBossFight('${pet.uid}')">${pet.imagepath} ${pet.name}</button>`;
  }).join("");

  // Show the modal to select a pet
  openModal("A wild boss appeared!", `
    <div class="bossBattleModalContent">
      <div class="bossbattleBanner"><img src="images/bossbattlebanner.png" alt="boss battle banner" style="margin-bottom:10px;"></div>
      <div class="resLine">You: <b>Pig 🐷</b> vs Wild Boss: <b>Scarecrow</b></div>
      <div class="smallNote" style="text-align:left;">
        Choose a pet to fight the boss.
      </div>
      <div class="modalGrid" style="margin-top: 10px;">
        ${petOptions}
      </div>
      <div class="smallNote" style="text-align:left;margin-top:12px;">
        Normal Attack: Beginner question (safe).<br>
        Heavy Attack: Intermediate/Advanced question (more damage).
      </div>
    </div>
  `);
}

function selectPetForBossFight(petUid){
  const selectedPet = zooPets.find(pet => pet.uid === petUid);
  if (!selectedPet) return;

  // Start the boss battle with the selected pet
  bossBattle = {
    active: true,
    turn: "player",
    playerName: selectedPet.name,
    playerEmoji: selectedPet.emoji,
    playerHp: 100,
    playerHpMax: 100,
    bossName: "Scarecrow",
    bossEmoji: "🪵",
    bossHp: 140,
    bossHpMax: 140,
    log: [`You selected ${selectedPet.name} 🐾 for the battle!`],
    awaitingAnswer: false,
    lastSkill: null
  };

  // Close the modal and start the battle
  closeModal();
  renderBossBattle();
}

function renderBossBattle(){
  if(!bossBattle || !bossBattle.active) return;

  const pPct = clamp(bossBattle.playerHp / bossBattle.playerHpMax, 0, 1);
  const bPct = clamp(bossBattle.bossHp / bossBattle.bossHpMax, 0, 1);

  openModal("Boss Fight", `
    <div class="bossWrap">
      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.playerEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">You: ${escapeHtml(bossBattle.playerName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Your turn: ${bossBattle.turn === "player" ? "YES" : "NO"}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(pPct*100)}%;"></div></div>
          <div class="hpText">${bossBattle.playerHp}/${bossBattle.playerHpMax}</div>
        </div>
      </div>

      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.bossEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">Wild Boss: ${escapeHtml(bossBattle.bossName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Lose a turn if wrong.</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(bPct*100)}%;background:linear-gradient(90deg,#ffb36b,#ff6b6b);"></div></div>
          <div class="hpText">${bossBattle.bossHp}/${bossBattle.bossHpMax}</div>
        </div>
      </div>

      <div class="bossLog">${bossBattle.log.map(x=>`• ${escapeHtml(x)}`).join("<br>")}</div>

      <div class="skillRow">
        <button id="skillNormal" onclick="bossUseSkill('normal')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Normal Attack
          <small>(Beginner question)</small>
        </button>
        <button id="skillHeavy" onclick="bossUseSkill('heavy')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Heavy Attack
          <small>(Intermediate/Advanced)</small>
        </button>
      </div>

      <hr class="sep">

      <div id="bossQ"></div>
      <div id="bossFB" class="quizFeedback"></div>

      <div style="display:flex;gap:10px;margin-top:4px;">
        <button style="flex:1;" onclick="endBossBattle('forfeit')">Forfeit</button>
        <button style="flex:1;" onclick="closeModal()">Close</button>
      </div>
      <div class="smallNote">Anti-exploit: each question locks after 1 answer.</div>
    </div>
  `);
}

function bossLogPush(msg){
  if(!bossBattle) return;
  bossBattle.log.unshift(msg);
  bossBattle.log = bossBattle.log.slice(0, 18);
}

function bossDamageRange(skill){
  // tuned for 100 vs 140 hp fight ~6-9 turns
  if(skill === "normal") return [18, 26];
  return [30, 42];
}
function bossEnemyDamage(){
  return [14, 22];
}

function heavyDifficulty(){
  // heavy uses intermediate early, advanced later
  if(level >= 5) return (Math.random()<0.55 ? "advanced" : "intermediate");
  return "intermediate";
}

function renderBossBattle(){
  if(!bossBattle || !bossBattle.active) return;

  const pPct = clamp(bossBattle.playerHp / bossBattle.playerHpMax, 0, 1);
  const bPct = clamp(bossBattle.bossHp / bossBattle.bossHpMax, 0, 1);

  openModal("Boss Fight", `
    <div class="bossWrap">
      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.playerEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">You: ${escapeHtml(bossBattle.playerName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Your turn: ${bossBattle.turn === "player" ? "YES" : "NO"}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(pPct*100)}%;"></div></div>
          <div class="hpText">${bossBattle.playerHp}/${bossBattle.playerHpMax}</div>
        </div>
      </div>

      <div class="bossRow">
        <div class="bossSide">
          <div class="bossFace">${bossBattle.bossEmoji}</div>
          <div>
            <div style="font-weight:900;color:#2b1c10;">Wild Boss: ${escapeHtml(bossBattle.bossName)}</div>
            <div class="smallNote" style="text-align:left;margin-top:2px;">Lose a turn if wrong.</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="hpWrap"><div class="hpFill" style="width:${Math.floor(bPct*100)}%;background:linear-gradient(90deg,#ffb36b,#ff6b6b);"></div></div>
          <div class="hpText">${bossBattle.bossHp}/${bossBattle.bossHpMax}</div>
        </div>
      </div>

      <div class="bossLog">${bossBattle.log.map(x=>`• ${escapeHtml(x)}`).join("<br>")}</div>

      <div class="skillRow">
        <button id="skillNormal" onclick="bossUseSkill('normal')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Normal Attack
          <small>(Beginner question)</small>
        </button>
        <button id="skillHeavy" onclick="bossUseSkill('heavy')" ${bossBattle.turn!=="player"||bossBattle.awaitingAnswer ? "disabled":""}>
          Heavy Attack
          <small>(Intermediate/Advanced)</small>
        </button>
      </div>

      <hr class="sep">

      <div id="bossQ"></div>
      <div id="bossFB" class="quizFeedback"></div>

      <div style="display:flex;gap:10px;margin-top:4px;">
        <button style="flex:1;" onclick="endBossBattle('forfeit')">Forfeit</button>
        <button style="flex:1;" onclick="closeModal()">Close</button>
      </div>
      <div class="smallNote">Anti-exploit: each question locks after 1 answer.</div>
    </div>
  `);
}

function bossUseSkill(skill){
  if(!bossBattle || !bossBattle.active) return;
  if(bossBattle.turn !== "player") return;
  if(bossBattle.awaitingAnswer) return;

  bossBattle.awaitingAnswer = true;
  bossBattle.lastSkill = skill;

  const diff = (skill === "normal") ? "beginner" : heavyDifficulty();
  const q = pickQuestion(diff);
  let resolved = false;

  const qRoot = document.getElementById("bossQ");
  if(qRoot){
    qRoot.innerHTML = `
      <div class="resLine"><b>${skill === "normal" ? "Normal" : "Heavy"}</b> • ${tileLevelLabel(diff)} question</div>
      <div id="bossQInner"></div>
    `;
  }
  const fb = document.getElementById("bossFB");
  if(fb){
    fb.className = "quizFeedback";
    fb.style.display = "none";
    fb.textContent = "";
  }

  renderQuestionUI(q, "bossQInner", (yourAnswer)=>{
    if(resolved) return;
    resolved = true;

    questProgress("answer", 1);

    const ok = normalizeAnswer(yourAnswer) === normalizeAnswer(q.a);
    const fb2 = document.getElementById("bossFB");

    if(ok){
      const [mn,mx] = bossDamageRange(skill);
      const dmg = Math.floor(mn + Math.random()*(mx-mn+1));
      bossBattle.bossHp = Math.max(0, bossBattle.bossHp - dmg);
      if(fb2){
        fb2.className = "quizFeedback good";
        fb2.innerHTML = `Correct! You dealt <b>${dmg}</b> damage.`;
      }
      bossLogPush(`Correct! ${bossBattle.playerName} used ${skill==="normal"?"Normal":"Heavy"} and hit for ${dmg}.`);
    }else{
      if(fb2){
        fb2.className = "quizFeedback bad";
        fb2.innerHTML = `Wrong! You lost your turn.`;
      }
      bossLogPush(`Wrong answer... ${bossBattle.playerName} missed and lost the turn.`);
    }

    if(bossBattle.bossHp <= 0){
      setTimeout(()=> endBossBattle("win"), 500);
      return;
    }

    bossBattle.turn = "boss";
    bossBattle.awaitingAnswer = false;

    setTimeout(()=> bossEnemyTurn(), 650);
  });
}

function bossEnemyTurn(){
  if(!bossBattle || !bossBattle.active) return;

  const [mn,mx] = bossEnemyDamage();
  const dmg = Math.floor(mn + Math.random()*(mx-mn+1));

  bossBattle.playerHp = Math.max(0, bossBattle.playerHp - dmg);
  bossLogPush(`Scarecrow attacked and hit you for ${dmg}.`);

  if(bossBattle.playerHp <= 0){
    endBossBattle("lose");
    return;
  }

  bossBattle.turn = "player";
  bossBattle.awaitingAnswer = false;
  renderBossBattle();
}

function endBossBattle(result){
  if(!bossBattle) return;

  bossBattle.active = false;

  scheduleNextBossSpawn();

  if(result === "win"){
    const coinReward = 180 + Math.floor(level*8);
    const xpReward = 55 + Math.floor(level*4);
    coins += coinReward;
    gainXP(xpReward);
    boosts.fertilizer = (boosts.fertilizer||0) + 1;

    saveState();
    updateUI();
    renderFarm();

    showMessage("Victory! 🐷🏁", `
      <div class="resLine">You defeated the Scarecrow!</div>
      <div class="smallNote">
        Rewards:<br>
        • +${coinReward} coins<br>
        • +${xpReward} XP<br>
        • +1 Fertilizer 🧪
      </div>
    `);
    return;
  }

  if(result === "lose"){
    const loss = Math.min(coins, 40);
    coins -= loss;
    saveState();
    updateUI();
    showMessage("Defeat... 😿", `
      <div class="resLine">Scarecrow won.</div>
      <div class="smallNote">You dropped ${loss} coins while escaping.</div>
    `);
    return;
  }

  if(result === "forfeit"){
    const loss = Math.min(coins, 25);
    coins -= loss;
    saveState();
    updateUI();
    showMessage("Forfeit", `<div class="smallNote">You forfeited and lost ${loss} coins.</div>`);
    return;
  }
}

/* =========================================================
   CROPS / SHOP / INVENTORY / ZOO / QUESTS
========================================================= */
function openCrops(){
  const lines = CROPS.map(c=>{
    const locked = level < c.unlockLevel;
    const owned = seeds[c.emoji] || 0;
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${escapeHtml(c.emoji)}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(c.name)}</div>
            <div class="itemSub">Seed cost: <b>${c.seedCost}</b> coins • Owned: <b>${owned}</b></div>
            <div class="badgeRow">
              <div class="badge">${tileLevelLabel(c.level)}</div>
              <div class="badge">Unlock Lvl ${c.unlockLevel}</div>
              <div class="badge">Harvest +${c.harvestCoins} coins</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${locked || coins<c.seedCost ? "disabled":""} onclick="buySeed('${c.emoji}')">
            <span><small data-title='${locked ? "Locked" : "Buy"}'>${locked ? "Locked" : "Buy"}</small></span>
          </button>
          <button ${locked || coins<c.seedCost ? "disabled":""} onclick="selectSeed('${c.emoji}')"><span><small data-title="Select">Select</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Crops", `
    <div class="cropModalContent">
      <div class="resLine">Coins: <b>${coins}</b> • Selected seed: <b>${escapeHtml(selectedSeed)}</b></div>
      <div class="modalGrid">${lines}</div>
      <div class="smallNote">Tip: Harvest tiles show READY when finished.</div>
    </div>
  `);
}
function selectSeed(emoji){
  selectedSeed = emoji;
  saveState();
  openCrops();
}
function buySeed(emoji){
  const c = cropByEmoji(emoji);
  if(!c) return;
  if(level < (c.unlockLevel||1)){
    showMessage("Locked", `<div class="smallNote">Unlock at Level ${c.unlockLevel}.</div>`);
    return;
  }
  if(coins < c.seedCost){
    showMessage("Not enough coins", `<div class="smallNote">You need ${c.seedCost} coins.</div>`);
    return;
  }
  coins -= c.seedCost;
  seeds[emoji] = (seeds[emoji]||0) + 1;
  selectedSeed = emoji;
  saveState();
  updateUI();
  openCrops();
}

function openSupermarket(){
  const now = Date.now();
  const scareLeft = Math.max(0, boosts.scarecrowUntil - now);

  const boostsHtml = BOOST_ITEMS.map(b=>{
    let ownedText = "";
    if(b.key === "scarecrow"){
      ownedText = scareLeft > 0 ? `Active: <b>${Math.ceil(scareLeft/1000)}s</b>` : "Inactive";
    }else{
      ownedText = `Owned: <b>${boosts[b.key]||0}</b>`;
    }

    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${b.icon}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(b.name)}</div>
            <div class="itemSub">${escapeHtml(b.desc)} • ${ownedText}</div>
            <div class="badgeRow"><div class="badge">Cost: ${b.cost} coins</div></div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${coins<b.cost?"disabled":""} onclick="buyBoost('${b.key}', ${b.cost})"><span><small data-title="Buy">Buy</small></span></button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Supermarket", `
    <div class="resLine">Coins: <b>${coins}</b> • Pets: <b>${zooPets.length}</b></div>
    <div class="sectionTitle">Boosts</div>
    <div class="modalGrid" style="margin-top:8px;">${boostsHtml}</div>

    <div class="sectionTitle">Limited Seed Gacha</div>
    <div class="itemCard" style="margin-top:8px;">
      <div class="itemLeft">
        <div class="itemIcon">🌱</div>
        <div class="itemMeta">
          <div class="itemName">Limited Seeds (1x)</div>
          <div class="itemSub">Get 1 random limited seed (rare profits).</div>
          <div class="badgeRow"><div class="badge">Cost: 150 coins</div></div>
        </div>
      </div>
      <div class="rowBtns">
        <button ${coins<150?"disabled":""} onclick="rollLimitedSeed()"><span><small data-title="Roll">Roll</small></span></button>
      </div>
    </div>

    <div class="sectionTitle">Boss Tip</div>
    <div class="smallNote" style="text-align:left;margin-top:8px;">
      Scarecrow can spawn on your farm. Stock up on boosts and answer fast.
    </div>
  `);
}
function buyBoost(key, cost){
  if(coins < cost) return;
  coins -= cost;
  if(key === "scarecrow"){
    boosts.scarecrowUntil = Math.max(Date.now(), boosts.scarecrowUntil || 0) + (3*60*1000);
    scheduleNextPetSpawn();
    scheduleNextBossSpawn();
  }else{
    boosts[key] = (boosts[key]||0) + 1;
  }
  saveState();
  updateUI();
  openSupermarket();
}
function rollLimitedSeed(){
  if(coins < 150) return;
  coins -= 150;
  const pick = weightedPick(LIMITED_SEEDS);
  seeds[pick.emoji] = (seeds[pick.emoji]||0) + 1;
  selectedSeed = pick.emoji;
  saveState();
  updateUI();
  showMessage("Limited Seed!", `
    <div class="resLine">You got: <b>${escapeHtml(pick.emoji)} ${escapeHtml(pick.name)}</b></div>
    <div class="smallNote">${tileLevelLabel(pick.level)} • Harvest +${pick.harvestCoins} coins</div>
    <div style="display:flex;gap:10px;margin-top:12px;">
      <button style="flex:1;" onclick="openCrops()">Go to Crops</button>
      <button style="flex:1;" onclick="openSupermarket()">Back</button>
    </div>
  `);
}

function openInventory(){
  const seedBadges = Object.keys(seeds).sort((a,b)=>a.localeCompare(b)).map(k=>{
    const c = cropByEmoji(k);
    const name = c ? c.name : "Seed";
    return `<div class="badge">${escapeHtml(k)} x${seeds[k]||0} (${escapeHtml(name)})</div>`;
  }).join("");

  const harvestedCrops = CROPS
      .sort((a, b) => a.emoji.localeCompare(b.emoji))
      .map(c => {
        const amount = inventory[c.emoji] ?? 0; // default to 0
        return `<div class="badge">
          ${escapeHtml(c.emoji)} x${amount} (${escapeHtml(c.name)})
        </div>`;
  }).join("");
  

  const netOwned = boosts.net || 0;
  const fertOwned = boosts.fertilizer || 0;
  const scareLeft = Math.max(0, (boosts.scarecrowUntil||0) - Date.now());

  openModal("Bag", `
    <div class="resLine">Coins: <b>${coins}</b> • Selected: <b>${escapeHtml(selectedSeed)}</b></div>

    <div class="sectionTitle">Seeds</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${seedBadges || `<div class="smallNote">No seeds. Buy some in Crops.</div>`}
    </div>

    <div class="sectionTitle">Harvested Crops</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${harvestedCrops || `<div class="smallNote">No crops were harvested yet. Plant a seed and harvest the crop.</div>`}
    </div>

    <div class="sectionTitle">Boosts</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      <div class="badge">Fertilizer x${fertOwned}</div>
      <div class="badge">Capture Net x${netOwned}</div>
      <div class="badge">Scarecrow: ${scareLeft>0 ? `${Math.ceil(scareLeft/1000)}s` : "Inactive"}</div>
    </div>

    <div class="sectionTitle">Battle</div>
    <div class="smallNote" style="text-align:left;margin-top:8px;">
      Normal Attack: beginner question (safe).<br>
      Heavy Attack: harder question (more damage).
    </div>
  `);
}

function openZoo(){
  showZoo();
}


function openQuestBoard(){
  const cards = dailyQuests.map(q=>{
    const done = (q.progress >= q.target);
    const pct = Math.floor((q.progress / q.target) * 100);
    return `
      <div class="itemCard">
        <div class="itemLeft">
          <div class="itemIcon">${done ? "✅" : (q.type==="all" ? "🏁" : "📌")}</div>
          <div class="itemMeta">
            <div class="itemName">${escapeHtml(q.title)}</div>
            <div class="itemSub">Progress: <b>${q.progress}</b> / ${q.target}</div>
            <div class="badgeRow">
              <div class="badge">${pct}%</div>
              <div class="badge">+${q.rewardCoins} coins</div>
            </div>
          </div>
        </div>
        <div class="rowBtns">
          <button ${(!done || q.claimed) ? "disabled" : ""} onclick="claimQuest('${q.id}')">
            <span><small data-title='${q.claimed ? "Claimed" : (done ? "Claim" : "In progress")}'>${q.claimed ? "Claimed" : (done ? "Claim" : "In progress")}</small></span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  openModal("Quest Board", `
    <div class="resLine">Streak: <b>${dailyStreak}</b> • Coins: <b>${coins}</b></div>
    <div class="modalGrid">${cards}</div>
    <div class="smallNote">Claim all quests to increase your streak.</div>
  `);
}

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

/* =========================================================
   TILE UNLOCK
========================================================= */
function unlockTile(i){
  const cost = tileUnlockCost(unlockedCount());
  if(coins < cost) return;

  coins -= cost;
  unlockedTiles[i] = true;
  tileStates[i] = { state:"empty", crop:"", plantedAt:0, finishAt:0 };

  saveState();
  updateUI();
  closeModal();
  initTiles();
}

/* =========================================================
   GAME LOOP TICKS
========================================================= */
function tickGrow(){
  const now = Date.now();
  for(let i=0;i<TILE_COUNT;i++){
    const st = tileStates[i];
    if(!unlockedTiles[i]) continue;
    if(st.state==="planted" && st.finishAt > 0 && now >= st.finishAt){
      st.state = "grown";
      st.finishAt = 0;
    }
  }
}

setInterval(()=>{
  tickGrow();
  trySpawnWildPet();
  tickWildPet();
  trySpawnBoss();
  renderFarm();
  saveState();
}, 250);

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

/* =========================================================
   INIT DEFAULTS
========================================================= */
(function init(){
  CROPS.forEach(c => { if(!(c.emoji in seeds)) seeds[c.emoji] = 0; });
  seeds["🥕"] = 3;
  seeds["🌽"] = 2;
  selectedSeed = "🥕";

  unlockedTiles.fill(false);
  unlockedTiles[0] = true;
  unlockedTiles[1] = true;

  tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));

  loadState();
  loadDaily();
  initDailySystem();

  if(!Array.isArray(unlockedTiles) || unlockedTiles.length !== TILE_COUNT){
    const old = unlockedTiles;
    unlockedTiles = new Array(TILE_COUNT).fill(false);
    unlockedTiles[0]=true; unlockedTiles[1]=true;
    if(Array.isArray(old)){
      for(let i=0;i<Math.min(old.length, TILE_COUNT);i++) unlockedTiles[i] = !!old[i];
    }
  }
  if(!Array.isArray(tileStates) || tileStates.length !== TILE_COUNT){
    const old = tileStates;
    tileStates = new Array(TILE_COUNT).fill(null).map(_=>({ state:"empty", crop:"", plantedAt:0, finishAt:0 }));
    if(Array.isArray(old)){
      for(let i=0;i<Math.min(old.length, TILE_COUNT);i++){
        if(old[i] && typeof old[i]==="object") tileStates[i] = {
          state: old[i].state || "empty",
          crop: old[i].crop || "",
          plantedAt: Number(old[i].plantedAt||0),
          finishAt: Number(old[i].finishAt||0)
        };
      }
    }
  }

  // ensureStarterDog();

  if(!nextPetSpawnAt || nextPetSpawnAt < Date.now()){
    scheduleNextPetSpawn();
  }
  if(!nextBossSpawnAt || nextBossSpawnAt < Date.now()){
    scheduleNextBossSpawn();
  }

  $("playerNameDisplay").textContent = playerName;
  $("playerNameDisplay").setAttribute('data-title',playerName);
  $("playerTitleDisplay").textContent = playerTitle;

  initTiles();
  updateUI();
  updateToolUI();
})();


// 1. MARKET SYSTEM
function openHarvestShop() {
  let html = `<div class="resLine">Market • Sell Crops</div>`;
  let has = false;
  CROPS.forEach(c => {
    const qty = inventory[c.emoji] || 0;
    if(qty > 0){
      has = true;
      html += `<div class="itemCard">
        <div class="itemLeft"><div class="itemIcon">${c.isImage?`<img src="${c.grown}" style="width:30px">`:c.emoji}</div>
        <div><b>${c.name}</b> (x${qty})</div></div>
        <div class="rowBtns">
          <button onclick="sellCrop('${c.emoji}', 1)"><span><small data-title="Sell 1">Sell 1</small></span></button>
          <button onclick="sellCrop('${c.emoji}', ${qty})"><span><small data-title="All">All</small></span></button>
        </div>
      </div>`;
    }
  });
  if(!has) html += `<div class="smallNote">Inventory empty. Harvest crops first!</div>`;
  else html += `<div style="margin-top:10px"><button onclick="sellAllCrops()" style="width:100%; background:#74DE34; color:white; padding:10px; border-radius:10px;">Sell Everything</button></div>`;
  html += `<div style="margin-top:10px"><button onclick="closeModal()" style="width:100%; padding:10px; border-radius:10px;">Close</button></div>`;
  openModal("Market", html);
}
function sellCrop(e, amt){
  if((inventory[e]||0) >= amt){
    inventory[e] -= amt;
    coins += cropByEmoji(e).harvestCoins * amt;
    saveState(); updateUI(); openHarvestShop();
    showToast(`Sold for ${cropByEmoji(e).harvestCoins * amt} coins`);
  }
}
function sellAllCrops(){
  let gained = 0;
  Object.keys(inventory).forEach(k=>{
    if(inventory[k]>0){
      gained += inventory[k] * cropByEmoji(k).harvestCoins;
      inventory[k] = 0;
    }
  });
  coins += gained;
  saveState(); updateUI(); openHarvestShop();
  showToast(`Sold all for ${gained}!`);
}
// 2. UPGRADED PROFILE
function getExamTitle(){
  // Tries to read library exam data (if available)
  try {
    const ex = JSON.parse(localStorage.getItem(LIB_EXAM_KEY)||"{}");
    const tk = todayKey();
    if(ex[tk]?.advanced) return "Advanced Learner";
    if(ex[tk]?.intermediate) return "Intermediate Learner";
  } catch(e) {}
  return "Beginner Learner";
}
// Replace your existing openProfile function with this one
function openProfile(){
  const title = getExamTitle();
  let scHtml = "";
  for(let i=0; i<4; i++){
    const item = showcase[i];
    const display = item ? (cropByEmoji(item).isImage ? `<img src="${cropByEmoji(item).grown}" style="width:40px;">` : item) : "";
    // Click to change showcase
    scHtml += `<div class="showbox" onclick="pickShowcase(${i})" style="cursor:pointer;">${display}</div>`;
  }
  openModal("Profile", `
    <div class="playerProfileContent">
      <div class="playerheadercon">
          <div class="playerdp">
            <img src="images/profile.png" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2NjYyIvPjwvc3ZnPg=='">
          </div>
          <h3 class="modalPlayerName">
            ${escapeHtml(playerName)} 
            <span class="editable-field" onclick="editName()">✏️</span>
          </h3>
          <div class="playerlocation">
            📍 ${escapeHtml(playerCountry)} 
            <span class="editable-field" onclick="editCountry()">✏️</span>
          </div>
          <div class="badge">${title}</div>
      </div>
      <div class="sectionTitle" >Crop Showcase (Tap Box)</div>
      <div class="showcase-container">${scHtml}</div>
      <div class="streak-zone" >
        🔥 Login Streak: ${dailyStreak} Days
      </div>
      <div class="modalCloseCon"><button onclick="closeModal()">Close</button></div>
    </div>
  `);
}
function pickShowcase(idx){
  let html = `<div class="resLine">Pick item for Slot ${idx+1}</div><div class="modalGrid" style="display:grid; gap:10px;">`;
  let has = false;
  Object.keys(inventory).forEach(k=>{
    if(inventory[k]>0){
      has=true;
      const c = cropByEmoji(k);
      html += `<div class="itemCard" onclick="setShowcase(${idx},'${k}')" style="cursor:pointer; background:white; padding:10px; border-radius:10px; border:1px solid #ccc;">
        <div class="itemLeft">${c.isImage?`<img src="${c.grown}" style="width:30px">`:c.emoji} <b>${c.name}</b></div>
      </div>`;
    }
  });
  if(!has) html += `<div class="smallNote">No crops in bag.</div>`;
  html += `<button onclick="setShowcase(${idx}, null)" style="width:100%; margin-top:10px;">Clear Slot</button>`;
  html += `</div>`;
  openModal("Select Showcase", html);
}
function setShowcase(idx, val){
  showcase[idx] = val;
  saveState(); openProfile();
}
// 3. CUSTOM EDIT MODALS (No Browser Alerts)
function editName(){
  openModal("Edit Name", `
    <div class="resLine">Enter your new name:</div>
    <div class="fillWrap" style="display:flex; gap:5px; margin-top:10px;">
      <input id="newNameInput" value="${escapeHtml(playerName)}" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc;">
      <button onclick="saveName()">Save</button>
    </div>
  `);
}
function saveName(){
  const val = $("newNameInput").value.trim();
  if(val) playerName = val;
  saveState(); updateUI(); openProfile();
}
function editCountry(){
  openModal("Edit Country", `
    <div class="resLine">Enter your country:</div>
    <div class="fillWrap" style="display:flex; gap:5px; margin-top:10px;">
      <input id="newCountryInput" value="${escapeHtml(playerCountry)}" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc;">
      <button onclick="saveCountry()">Save</button>
    </div>
  `);
}
function saveCountry(){
  const val = $("newCountryInput").value.trim();
  if(val) playerCountry = val;
  saveState(); updateUI(); openProfile();
}