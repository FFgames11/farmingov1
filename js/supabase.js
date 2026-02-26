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
  const authStatus = document.getElementById("authStatus");

  // Auth screen navigation
  function openAuthScreen() {
    const as = document.getElementById("authScreen");
    if (as) as.style.display = "flex";
    const menu = document.getElementById("menu");
    if (menu) menu.style.display = "none";
  }
  function closeAuthScreen() {
    const as = document.getElementById("authScreen");
    if (as) as.style.display = "none";
  }

  // Keep these as no-ops for any legacy code that calls them
  function openAuthModal()  { openAuthScreen(); }
  function closeAuthModal() { closeAuthScreen(); }

  document.getElementById("openAuth").addEventListener("click", openAuthScreen);
  document.getElementById("authClose").addEventListener("click", closeAuthScreen);

  function setAuthStatus(msg) {
    if (authStatus) authStatus.textContent = msg || "";
  }

  // Show/hide the logout + cloud buttons based on session state
  function updateHeaderButtons(loggedIn) {
    const logoutBtn   = document.getElementById("logoutBtn");
    const cloudSaveBtn = document.getElementById("cloudSaveBtn");
    if (logoutBtn)    logoutBtn.style.display    = loggedIn ? "flex"   : "none";
    if (cloudSaveBtn) cloudSaveBtn.style.display = loggedIn ? "none"   : "flex";
  }

  // Tab switcher (login / signup)
  window.switchAuthTab = function(tab) {
    const isLogin = tab === "login";
    document.getElementById("tabLogin").classList.toggle("active", isLogin);
    document.getElementById("tabSignup").classList.toggle("active", !isLogin);
    document.getElementById("btnLogin").style.display  = isLogin ? "block" : "none";
    document.getElementById("btnSignup").style.display = isLogin ? "none"  : "block";
  };

  // ── Clean up the game UI on logout ───────────────────────
  // Hides all game screens/panels so they don't bleed through the login screen.
  // Does NOT stop the game loop (no stored interval ID), but hides #game entirely.
  function cleanGameUI() {
    // Mute all in-game toasts and modals while UI is hidden
    window.gameUIHidden = true;

    // Hide game and menu divs
    const gameDiv = document.getElementById("game");
    const menuDiv = document.getElementById("menu");
    if (gameDiv) gameDiv.style.display = "none";
    if (menuDiv) menuDiv.style.display = "none";

    // Close tools panel if open
    const toolsPanel = document.getElementById("toolsPanel");
    const toolsArrow  = document.getElementById("toolsArrow");
    if (toolsPanel) toolsPanel.classList.remove("open");
    if (toolsArrow)  toolsArrow.classList.remove("open");

    // Close any open modal
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";

    // Hide tutorial overlay
    const tut = document.getElementById("tutorialOverlay");
    if (tut) tut.style.display = "none";

    // Reset all sub-screens back to farm so next login starts clean
    const farmScreen = document.getElementById("farmScreen");
    const townScreen = document.getElementById("townScreen");
    const zooScreen  = document.getElementById("zooScreen");
    const arenaScreen = document.getElementById("arenaScreen");
    if (farmScreen)  farmScreen.style.display  = "flex";
    if (townScreen)  townScreen.style.display  = "none";
    if (zooScreen)   zooScreen.style.display   = "none";
    if (arenaScreen) arenaScreen.style.display = "none";

    // Note: clearAllGameStorage() is called explicitly BEFORE cleanGameUI()
    // in the logout handler so it runs synchronously before signOut().
  }

  // Logout modal — wire buttons directly, we're already inside DOMContentLoaded
  const _logoutModal  = document.getElementById("logoutModal");
  const _logoutYesBtn = document.getElementById("logoutConfirmYes");
  const _logoutNoBtn  = document.getElementById("logoutConfirmNo");

  window.handleLogout = function() {
    if (_logoutModal) _logoutModal.style.display = "flex";
  };

  if (_logoutNoBtn) {
    _logoutNoBtn.addEventListener("click", () => {
      if (_logoutModal) _logoutModal.style.display = "none";
    });
  }

  if (_logoutYesBtn) {
    _logoutYesBtn.addEventListener("click", async () => {
      if (_logoutModal) _logoutModal.style.display = "none";
      try {
        // Step 1: Mute game loop immediately so saveState() stops writing
        window.gameUIHidden = true;

        // Step 2: Save to cloud before wiping anything
        await saveToCloud();

        // Step 3: Wipe ALL game localStorage keys NOW — synchronously.
        // Must happen before signOut() so the 250ms game loop cannot
        // write stale data back between these two async calls.
        clearAllGameStorage();

        // Step 4: Sign out from Supabase (clears auth token from localStorage)
        await signOut();
        _currentUser = null;
        updateHeaderButtons(false);

        // Step 5: Hide all UI panels
        cleanGameUI();

        if (typeof window.showLoadingThenRoute === "function") {
          window.showLoadingThenRoute();
        }
      } catch (err) {
        console.error("Logout error:", err.message);
      }
    });
  }

  // Expose so the cloud btn in-game can open it
  window.openAuthScreen = openAuthScreen;

  /* ── Cached session ──────────────────────────────────── */
  // Cache the current user locally so we never need to call getUser() repeatedly.
  // getUser() acquires a Navigator LockManager lock each time — calling it from
  // a setInterval causes lock contention and the "timed out waiting 10000ms" error.
  let _currentUser = null;

  // Expose a session checker for the loading screen router.
  // Uses getSession() (no network lock) to reliably detect active sessions.
  window._supabaseCheckSession = function(callback) {
    supabase.auth.getSession().then(function(res) {
      callback(!!(res.data && res.data.session && res.data.session.user));
    }).catch(function() { callback(false); });
  };

  // Seed the cache once on load from the existing session (no network lock needed)
  supabase.auth.getSession().then(({ data }) => {
    _currentUser = data?.session?.user ?? null;
  });

  /* ── Game state collector ────────────────────────────── */
  // Reads directly from localStorage instead of window.* variables.
  // The game variables (coins, xp, etc.) are plain `let` declarations in
  // saveLoad.js — they are NOT properties of window, so window.coins === undefined.
  // saveState() already writes the complete correct state to localStorage every
  // 250ms via the game loop, so localStorage is always the freshest source.
  // Wipe every game-owned localStorage key
  function clearAllGameStorage() {
    const keys = [
      "catfarm_state_v5",
      "catfarm_daily_quests_v5",
      "catfarm_daily_date_v5",
      "catfarm_daily_streak_v5",
      "catfarm_last_complete_date_v5",
      "catfarm_library_exam_v1",
      "catfarm_tutorial_done_v2",
    ];
    for (const k of keys) localStorage.removeItem(k);
  }

  // All localStorage keys the game uses. Stored together in the cloud save
  // so a fresh browser gets a complete restore with no stale values from
  // a previously logged-in account.
  const LS_KEYS = [
    "catfarm_state_v5",
    "catfarm_daily_quests_v5",
    "catfarm_daily_date_v5",
    "catfarm_daily_streak_v5",
    "catfarm_last_complete_date_v5",
    "catfarm_library_exam_v1",
    "catfarm_tutorial_done_v2",
  ];

  function getGameState() {
    const bundle = {};
    for (const key of LS_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) bundle[key] = val;
    }
    // Always inject tutorialDone fresh — do not rely on saveState() timing
    bundle["catfarm_tutorial_done_v2"] = localStorage.getItem("catfarm_tutorial_done_v2") || null;
    return bundle;
  }

  /* ── Apply cloud save to game globals ───────────────── */
  // Writes cloud data into localStorage under STATE_KEY then calls loadState()
  // so all existing migration + validation logic in saveLoad.js runs automatically.
  function applyGameState(bundle) {
    if (!bundle || typeof bundle !== "object") return;
    try {
      // First wipe all game keys so no stale values from the previous account remain
      clearAllGameStorage();

      // Restore every key that was saved in the bundle
      for (const key of LS_KEYS) {
        const val = bundle[key];
        if (val !== null && val !== undefined) {
          localStorage.setItem(key, val);
        }
      }

      // Legacy support: if the bundle IS the old flat state object (no LS_KEYS structure),
      // fall back to writing it as the main state key directly
      if (!bundle["catfarm_state_v5"] && (bundle.coins !== undefined || bundle.playerName)) {
        localStorage.setItem("catfarm_state_v5", JSON.stringify(bundle));
      }

      if (typeof loadState        === "function") loadState();
      if (typeof loadDailyQuests  === "function") loadDailyQuests();
      if (typeof updateUI         === "function") updateUI();
      if (typeof renderFarm       === "function") renderFarm();
    } catch (e) {
      console.error("applyGameState error:", e);
    }
  }

  /* ── Players table name sync ─────────────────────────── */
  // The DB trigger handles INSERT on signup automatically.
  // This only syncs name changes. Guard against overwriting a real
  // saved name with the "Player" default before loadState() has run.
  // Helper: read the real player name from localStorage.
  // We cannot use window.playerName because game variables are plain `let`
  // declarations in saveLoad.js — they are not properties of window.
  function getPlayerName() {
    try {
      const raw = localStorage.getItem("catfarm_state_v5");
      if (raw) {
        const st = JSON.parse(raw);
        if (st && st.playerName && st.playerName !== "Player") return st.playerName;
      }
    } catch (e) {}
    return "Player";
  }

  async function syncPlayerName(userId) {
    // Always upsert the players row so the FK constraint for game_saves is
    // satisfied. Read the name from localStorage (the ground truth) rather
    // than window.playerName which is a plain `let` and not on window.
    const name = getPlayerName();

    const { error } = await supabase
      .from("players")
      .upsert(
        { player_id: userId, user_id: userId, player_name: name },
        { onConflict: "player_id" }
      );

    if (error) console.error("syncPlayerName error:", error.message);
  }

  /* ── Cloud save ──────────────────────────────────────── */
  async function saveToCloud() {
    const user = _currentUser;
    if (!user) return; // not logged in — silently skip

    // Step 1: Ensure the players row exists FIRST.
    // game_saves has a FK → players.player_id, so this must exist before
    // we can insert into game_saves. syncPlayerName uses upsert so it
    // creates the row if missing, updates it if it already exists.
    await syncPlayerName(user.id);

    const state = getGameState();

    // Step 2: Try UPDATE (row already exists in game_saves)
    const { data: updated, error: updateError } = await supabase
      .from("game_saves")
      .update({ save: state, updated_at: new Date().toISOString() })
      .eq("player_id", user.id)
      .select("save_id");

    if (updateError) {
      console.error("saveToCloud update error:", updateError.message);
      return;
    }

    // Step 3: No row matched → INSERT (first save for this player)
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("game_saves")
        .insert({ player_id: user.id, save: state });

      if (insertError) console.error("saveToCloud insert error:", insertError.message);
    }
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
    // Return the user directly so the login handler can set _currentUser immediately
    return { user: data.user, session: data.session };
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
      const { user } = await signIn(email, password);

      // Set _currentUser immediately from the signIn response.
      // onAuthStateChange fires asynchronously and may not have updated
      // _currentUser yet by the time loadFromCloud() runs below.
      _currentUser = user;

      setAuthStatus("Logged in! Loading save…");

      const saved = await loadFromCloud();
      if (saved) {
        // Existing account — wipe local storage first, then restore from cloud
        clearAllGameStorage();
        applyGameState(saved);
        await syncPlayerName(user.id);
        setAuthStatus(`Save loaded ✓  (${window.playerName})`);
      } else {
        // Brand new account — wipe any leftover localStorage from a previous
        // account or the default game state, then start completely fresh.
        // Do NOT push local state to cloud — it doesn't belong to this account.
        clearAllGameStorage();
        await syncPlayerName(user.id);
        setAuthStatus("New account — starting fresh!");
        // Cloud save will be created automatically on the first auto-save (30s)
        // or when the player makes their first profile change.
      }

      // Re-enable game loop writes for the new account
      window.gameUIHidden = false;

      // Ensure game div is hidden — player goes to menu first, then Play
      const gameDiv = document.getElementById("game");
      if (gameDiv) gameDiv.style.display = "none";

      closeAuthScreen();
      const menu = document.getElementById("menu");
      if (menu) menu.style.display = "flex";
      updateHeaderButtons(true);
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
      updateHeaderButtons(true);
      // Wait for loadState() to restore window.playerName before syncing
      setTimeout(() => syncPlayerName(_currentUser.id), 600);
    } else {
      setAuthStatus("Not signed in.");
      updateHeaderButtons(false);
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