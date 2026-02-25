/* =========================================================
   SUPABASE CLOUD SAVE CONTROLLER
   Schema:
     players   { player_id (PK, = auth.users.id), user_id, player_name, created_at }
     game_saves{ save_id (PK), player_id (FK → players.player_id), save (jsonb), updated_at }
========================================================= */

window.addEventListener("DOMContentLoaded", () => {

  /* ── Client ─────────────────────────────────────────── */
  const SUPABASE_URL     = "https://eqwdjutsmellvbqjvhzx.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2RqdXRzbWVsbHZicWp2aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjYzMTcsImV4cCI6MjA4NzE0MjMxN30.0U10MPyhKwchFuTdLEBOvSjx4yD6MhUKU9_lKuMnFb0";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ── UI refs ─────────────────────────────────────────── */
  const authModal   = document.getElementById("authModal");
  const authStatus  = document.getElementById("authStatus");

  function openAuthModal()  { authModal.style.display = "flex"; }
  function closeAuthModal() { authModal.style.display = "none"; }

  document.getElementById("openAuth").addEventListener("click", openAuthModal);
  document.getElementById("authClose").addEventListener("click", closeAuthModal);
  authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuthModal(); });

  function setAuthStatus(msg) { authStatus.textContent = msg || ""; }

  /* ── Helpers ─────────────────────────────────────────── */

  /**
   * Collect the full game state from saveLoad.js globals.
   * Mirrors exactly what saveState() writes to localStorage.
   */
  function getGameState() {
    return {
      coins:          window.coins,
      xp:             window.xp,
      level:          window.level,
      playerName:     window.playerName,
      playerTitle:    window.playerTitle,
      playerCountry:  window.playerCountry,
      inventory:      window.inventory,
      showcase:       window.showcase,
      selectedSeed:   window.selectedSeed,
      seeds:          window.seeds,
      unlockedTiles:  window.unlockedTiles,
      tileStates:     window.tileStates,
      zooPets:        window.zooPets,
      boosts:         window.boosts,
      nextPetSpawnAt: window.nextPetSpawnAt,
      nextBossSpawnAt:window.nextBossSpawnAt,
    };
  }

  /**
   * Merge a cloud save back into saveLoad.js globals and redraw.
   * We write the object into localStorage under STATE_KEY so that
   * the existing loadState() function handles all the migration logic.
   */
  function applyGameState(state) {
    if (!state || typeof state !== "object") return;
    try {
      localStorage.setItem("catfarm_state_v5", JSON.stringify(state));
      if (typeof loadState  === "function") loadState();   // parse into globals
      if (typeof renderGame === "function") renderGame();  // redraw UI
    } catch (e) {
      console.error("applyGameState error:", e);
    }
  }

  /* ── Players table ───────────────────────────────────── */

  /**
   * Ensure a row exists in `players` for this auth user and keep
   * player_name in sync with the in-game name.
   */
  async function upsertPlayer(userId) {
    const name = window.playerName || "Player";

    const { error } = await supabase
      .from("players")
      .upsert(
        { player_id: userId, user_id: userId, player_name: name },
        { onConflict: "player_id" }
      );

    if (error) console.error("upsertPlayer error:", error.message);
  }

  /* ── Cloud save / load ───────────────────────────────── */

  async function saveToCloud() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return; // not logged in — silently skip

    // Keep player_name in the players table current
    await upsertPlayer(user.id);

    const { error } = await supabase
      .from("game_saves")
      .upsert(
        { player_id: user.id, save: getGameState() },
        { onConflict: "player_id" }
      );

    if (error) console.error("saveToCloud error:", error.message);
  }

  async function loadFromCloud() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from("game_saves")
      .select("save")
      .eq("player_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // no row yet — that's fine
      console.error("loadFromCloud error:", error.message);
      return null;
    }

    return data?.save ?? null;
  }

  /* ── Auth actions ────────────────────────────────────── */

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

  /* ── Button handlers ─────────────────────────────────── */

  document.getElementById("btnSignup").addEventListener("click", async () => {
    const email    = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    try {
      setAuthStatus("Signing up…");
      await signUp(email, password);
      // Create the players row immediately using the current in-game name
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) await upsertPlayer(authData.user.id);
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
        setAuthStatus(`Save loaded  ✓  (${window.playerName})`);
      } else {
        // First login — push local state up so it isn't lost
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
      // Push one final save before signing out
      await saveToCloud();
      await signOut();
      setAuthStatus("Logged out. Progress saved.");
    } catch (err) {
      setAuthStatus(err.message);
    }
  });

  /* ── Session state listener ──────────────────────────── */

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      setAuthStatus(`Signed in: ${session.user.email}`);
      // Ensure the players row exists whenever auth state fires
      await upsertPlayer(session.user.id);
    } else {
      setAuthStatus("Not signed in.");
    }
  });

  /* ── Auto-save every 30 s ────────────────────────────── */
  setInterval(saveToCloud, 30_000);

  // Expose saveToCloud globally so other scripts (e.g. saveState) can call it
  window.saveToCloud = saveToCloud;

}); // end DOMContentLoaded