/* =========================================================
   SUPABASE CLOUD SAVE CONTROLLER
   Schema:
     players   { player_id (PK = auth.users.id), user_id, player_name, created_at }
     game_saves{ save_id (PK), player_id (FK → players.player_id), save (jsonb), updated_at }
========================================================= */

window.addEventListener("DOMContentLoaded", () => {

  /* ── Client ──────────────────────────────────────────── */
  const SUPABASE_URL      = "https://eqwdjutsmellvbqjvhzx.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2RqdXRzbWVsbHZicWp2aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjYzMTcsImV4cCI6MjA4NzE0MjMxN30.0U10MPyhKwchFuTdLEBOvSjx4yD6MhUKU9_lKuMnFb0";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Disable the Navigator LockManager — only needed for multi-tab sync.
      // Without this, concurrent auth calls deadlock and time out after 10s.
      lock: async (_name, _timeout, fn) => fn(),
    }
  });

  /* ── UI refs ─────────────────────────────────────────── */
  const authModal  = document.getElementById("authModal");
  const authStatus = document.getElementById("authStatus");

  function openAuthModal()  { authModal.style.display = "flex"; }
  function closeAuthModal() { authModal.style.display = "none"; }

  document.getElementById("openAuth").addEventListener("click", openAuthModal);
  document.getElementById("authClose").addEventListener("click", closeAuthModal);
  authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuthModal(); });

  function setAuthStatus(msg) { authStatus.textContent = msg || ""; }

  /* ── Cached session ──────────────────────────────────── */
  // Cache the current user locally so we never need to call getUser() repeatedly.
  // getUser() acquires a Navigator LockManager lock each time — calling it from
  // a setInterval causes lock contention and the "timed out waiting 10000ms" error.
  let _currentUser = null;

  // Seed the cache once on load from the existing session (no network lock needed)
  supabase.auth.getSession().then(({ data }) => {
    _currentUser = data?.session?.user ?? null;
  });

  /* ── Game state collector ────────────────────────────── */
  // Mirrors exactly what saveState() in saveLoad.js writes to localStorage.
  // Called only on explicit saves (login, logout, name change, auto-save).
  // NOT hooked into the 250ms game loop.
  function getGameState() {
    return {
      coins:           window.coins,
      xp:              window.xp,
      level:           window.level,
      playerName:      window.playerName,
      playerTitle:     window.playerTitle,
      playerCountry:   window.playerCountry,
      inventory:       window.inventory,
      showcase:        window.showcase,
      selectedSeed:    window.selectedSeed,
      seeds:           window.seeds,
      unlockedTiles:   window.unlockedTiles,
      tileStates:      window.tileStates,
      zooPets:         window.zooPets,
      boosts:          window.boosts,
      nextPetSpawnAt:  window.nextPetSpawnAt,
      nextBossSpawnAt: window.nextBossSpawnAt,
    };
  }

  /* ── Apply cloud save to game globals ───────────────── */
  // Writes cloud data into localStorage under STATE_KEY then calls loadState()
  // so all existing migration + validation logic in saveLoad.js runs automatically.
  function applyGameState(state) {
    if (!state || typeof state !== "object") return;
    try {
      localStorage.setItem("catfarm_state_v5", JSON.stringify(state));
      if (typeof loadState  === "function") loadState();
      if (typeof updateUI   === "function") updateUI();
      if (typeof renderFarm === "function") renderFarm();
    } catch (e) {
      console.error("applyGameState error:", e);
    }
  }

  /* ── Players table name sync ─────────────────────────── */
  // The DB trigger handles INSERT on signup automatically.
  // This only syncs name changes. Guard against overwriting a real
  // saved name with the "Player" default before loadState() has run.
  async function syncPlayerName(userId) {
    const name = window.playerName;
    if (!name || name === "Player") return;

    const { error } = await supabase
      .from("players")
      .update({ player_name: name })
      .eq("player_id", userId);

    if (error) console.error("syncPlayerName error:", error.message);
  }

  /* ── Cloud save ──────────────────────────────────────── */
  async function saveToCloud() {
    const user = _currentUser;
    if (!user) return; // not logged in — silently skip

    await syncPlayerName(user.id);

    const { error } = await supabase
      .from("game_saves")
      .upsert(
        { player_id: user.id, save: getGameState() },
        { onConflict: "player_id" }
      );

    if (error) console.error("saveToCloud error:", error.message);
  }

  /* ── Cloud load ──────────────────────────────────────── */
  async function loadFromCloud() {
    const user = _currentUser;
    if (!user) return null;

    const { data, error } = await supabase
      .from("game_saves")
      .select("save")
      .eq("player_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // no row yet — fine
      console.error("loadFromCloud error:", error.message);
      return null;
    }

    return data?.save ?? null;
  }

  /* ── Auth helpers ────────────────────────────────────── */
  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pass current in-game name as metadata so the DB trigger
        // can use it when auto-creating the players row
        data: { player_name: window.playerName || "Player" }
      }
    });
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

  /* ── Button handlers ─────────────────────────────────── */
  document.getElementById("btnSignup").addEventListener("click", async () => {
    const email    = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    try {
      setAuthStatus("Signing up…");
      await signUp(email, password);
      setAuthStatus("Account created! You can now log in.");
    } catch (err) {
      setAuthStatus(err.message);
    }
  });

  document.getElementById("btnLogin").addEventListener("click", async () => {
    const email    = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    try {
      setAuthStatus("Logging in…");
      await signIn(email, password);
      setAuthStatus("Logged in! Loading save…");

      const saved = await loadFromCloud();
      if (saved) {
        applyGameState(saved);
        setAuthStatus(`Save loaded ✓  (${window.playerName})`);
      } else {
        // First login — push local progress so it isn't lost
        await saveToCloud();
        setAuthStatus("No cloud save yet — local progress uploaded.");
      }

      closeAuthModal();
    } catch (err) {
      setAuthStatus(err.message);
    }
  });

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try {
      await saveToCloud(); // final save before signing out
      await signOut();
      setAuthStatus("Logged out. Progress saved.");
    } catch (err) {
      setAuthStatus(err.message);
    }
  });

  /* ── Auth state listener ─────────────────────────────── */
  // onAuthStateChange is the single source of truth for _currentUser.
  // It fires on login, logout, and token refresh — no lock contention.
  supabase.auth.onAuthStateChange((_event, session) => {
    _currentUser = session?.user ?? null;

    if (_currentUser) {
      setAuthStatus(`Signed in: ${_currentUser.email}`);
      // Wait for loadState() to restore window.playerName before syncing
      setTimeout(() => syncPlayerName(_currentUser.id), 600);
    } else {
      setAuthStatus("Not signed in.");
    }
  });

  /* ── Auto-save every 30 s ────────────────────────────── */
  // Intentionally NOT hooked into the 250ms game loop in gameLoop.js.
  // The loop already calls saveState() (localStorage) every 250ms.
  // Cloud syncs on a slower cadence to avoid hammering the DB.
  setInterval(saveToCloud, 30_000);

  // Expose globally so initDefaults.js (saveName / saveCountry) can
  // trigger an immediate cloud push on profile changes.
  window.saveToCloud = saveToCloud;

}); // end DOMContentLoaded