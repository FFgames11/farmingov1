window.addEventListener("DOMContentLoaded", () => {
const SUPABASE_URL = "https://eqwdjutsmellvbqjvhzx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2RqdXRzbWVsbHZicWp2aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjYzMTcsImV4cCI6MjA4NzE0MjMxN30.0U10MPyhKwchFuTdLEBOvSjx4yD6MhUKU9_lKuMnFb0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

