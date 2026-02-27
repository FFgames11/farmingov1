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

        // Step 3: Reset in-memory variables AND wipe localStorage synchronously.
        // Both must happen together — clearing storage alone leaves the previous
        // account's values alive in JS memory (playerName, coins, xp, etc.).
        if (typeof resetGameState === "function") resetGameState();
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
        // Existing account — reset memory + wipe storage, then restore from cloud
        if (typeof resetGameState === "function") resetGameState();
        clearAllGameStorage();
        applyGameState(saved);
        await syncPlayerName(user.id);
        setAuthStatus(`Save loaded ✓  (${window.playerName})`);
      } else {
        // Brand new account — reset memory + wipe storage so nothing from the
        // previous account leaks in. Do NOT push local state to cloud.
        if (typeof resetGameState === "function") resetGameState();
        clearAllGameStorage();
        if (typeof initTiles  === "function") initTiles();
        if (typeof updateUI   === "function") updateUI();
        if (typeof renderFarm === "function") renderFarm();
        await syncPlayerName(user.id);
        setAuthStatus("New account — starting fresh!");
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


  /* ═══════════════════════════════════════════════════════
     FRIENDS SYSTEM
  ═══════════════════════════════════════════════════════ */

  // ── State ──────────────────────────────────────────────
  let _visitingPlayerId = null;   // null = own farm, string = visiting someone
  let _visitingSaveData  = null;  // snapshot of visited farm
  let _currentFriendsTab = "friends";

  // ── Panel open/close — uses the game's native modal ───────────────────
  window.openFriendsPanel = async function() {
    if (typeof showMessage !== "function") return;

    // Render the friends panel HTML inside the game modal
    showMessage("Friends", `
      <div class="friendsModalInner">
        <div class="friendsTabs" style="margin-bottom:10px;">
          <button class="friendsTab active" id="ftabFriends"   onclick="switchFriendsTab('friends')">Friends</button>
          <button class="friendsTab"        id="ftabRequests"  onclick="switchFriendsTab('requests')">
            Requests <span id="friendRequestBadge" class="friendBadge" style="display:none;">0</span>
          </button>
          <button class="friendsTab"        id="ftabAdd"       onclick="switchFriendsTab('add')">Add</button>
        </div>

        <!-- Friends list tab -->
        <div id="ftabContentFriends" class="friendsTabContent">
          <div id="friendsList" class="friendsScrollList">
            <div class="friendsEmpty">Loading friends…</div>
          </div>
        </div>

        <!-- Requests tab -->
        <div id="ftabContentRequests" class="friendsTabContent" style="display:none;">
          <div id="requestsList" class="friendsScrollList">
            <div class="friendsEmpty">No pending requests.</div>
          </div>
        </div>

        <!-- Add friend tab -->
        <div id="ftabContentAdd" class="friendsTabContent" style="display:none; overflow-y:auto;">
          <div class="friendsAddSection">
            <p class="friendsAddLabel">Search by player name:</p>
            <div class="friendsAddRow">
              <input id="friendSearchInput" class="friendsAddInput" type="text" placeholder="Player name…"
                onkeydown="if(event.key==='Enter') searchAndAddFriend()" />
              <button class="friendsAddBtn" onclick="searchAndAddFriend()">Search</button>
            </div>
            <div id="friendAddStatus" class="friendAddStatus"></div>
            <div id="friendSearchResults" class="friendSearchResults"></div>
          </div>
          <div class="friendsSuggestedHeader">⭐ Recommended Players</div>
          <div id="suggestedPlayersList" class="friendsScrollList" style="max-height:180px;">
            <div class="friendsEmpty">Loading players…</div>
          </div>
        </div>
      </div>
    `);

    // Load initial tab data after modal renders
    setTimeout(async () => {
      switchFriendsTab("friends");
      await loadFriendsList();
    }, 50);
  };

  window.closeFriendsPanel = function() {
    if (typeof closeModal === "function") closeModal();
  };

  window.switchFriendsTab = function(tab) {
    _currentFriendsTab = tab;
    ["friends","requests","add"].forEach(t => {
      const btn     = document.getElementById("ftab" + t.charAt(0).toUpperCase() + t.slice(1));
      const content = document.getElementById("ftabContent" + t.charAt(0).toUpperCase() + t.slice(1));
      if (btn)     btn.classList.toggle("active", t === tab);
      if (content) content.style.display = t === tab ? "flex" : "none";
    });
    if (tab === "requests") loadFriendRequests();
    if (tab === "friends")  loadFriendsList();
    if (tab === "add")      { loadMyLikeCount(); loadSuggestedPlayers(); }
  };

  // ── Helpers ────────────────────────────────────────────
  function friendInitial(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  function setFriendsListHTML(containerId, html) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
  }

  function setFriendAddStatus(msg, color) {
    const el = document.getElementById("friendAddStatus");
    if (el) { el.textContent = msg; el.style.color = color || "#e85a1a"; }
  }

  function updateFriendRequestBadge(count) {
    const badge = document.getElementById("friendRequestBadge");
    const btnBadge = document.querySelector("#friendsBtn .friendsBtnBadge");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline" : "none";
    }
    if (btnBadge) {
      btnBadge.textContent = count;
      btnBadge.style.display = count > 0 ? "inline" : "none";
    }
  }

  // ── Load friends list ──────────────────────────────────
  async function loadFriendsList() {
    const user = _currentUser;
    if (!user) { setFriendsListHTML("friendsList", '<div class="friendsEmpty">Sign in to see friends.</div>'); return; }

    setFriendsListHTML("friendsList", '<div class="friendsEmpty">Loading…</div>');

    // Get all accepted friendships where this user is either side
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, receiver_id, players_requester:players!friendships_requester_id_fkey(player_name), players_receiver:players!friendships_receiver_id_fkey(player_name)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) { setFriendsListHTML("friendsList", '<div class="friendsEmpty">Error loading friends.</div>'); return; }
    if (!data || data.length === 0) {
      setFriendsListHTML("friendsList", '<div class="friendsEmpty">No friends yet. Add some! 🐾</div>');
      return;
    }

    const rows = data.map(f => {
      const iAmRequester = f.requester_id === user.id;
      const friendId   = iAmRequester ? f.receiver_id : f.requester_id;
      const friendName = iAmRequester
        ? (f.players_receiver?.player_name || "Unknown")
        : (f.players_requester?.player_name || "Unknown");
      return `
        <div class="friendRow">
          <div class="friendAvatar">${friendInitial(friendName)}</div>
          <div class="friendInfo">
            <div class="friendName">${escapeHtml(friendName)}</div>
            <div class="friendSub">Friend</div>
          </div>
          <div class="friendActions">
            <button class="friendActBtn friendActVisit" onclick="visitFriend('${friendId}','${escapeHtml(friendName)}')">🌾 Visit</button>
            <button class="friendActBtn friendActRemove" onclick="removeFriend('${f.id}')">Remove</button>
          </div>
        </div>`;
    }).join("");

    setFriendsListHTML("friendsList", rows);
  }

  // ── Load incoming requests ─────────────────────────────
  async function loadFriendRequests() {
    const user = _currentUser;
    if (!user) { setFriendsListHTML("requestsList", '<div class="friendsEmpty">Sign in to see requests.</div>'); return; }

    setFriendsListHTML("requestsList", '<div class="friendsEmpty">Loading…</div>');

    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, players_requester:players!friendships_requester_id_fkey(player_name)")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (error) { setFriendsListHTML("requestsList", '<div class="friendsEmpty">Error loading requests.</div>'); return; }

    updateFriendRequestBadge(data?.length || 0);

    if (!data || data.length === 0) {
      setFriendsListHTML("requestsList", '<div class="friendsEmpty">No pending requests.</div>');
      return;
    }

    const rows = data.map(f => {
      const name = f.players_requester?.player_name || "Unknown";
      return `
        <div class="friendRow">
          <div class="friendAvatar">${friendInitial(name)}</div>
          <div class="friendInfo">
            <div class="friendName">${escapeHtml(name)}</div>
            <div class="friendSub">Wants to be friends</div>
          </div>
          <div class="friendActions">
            <button class="friendActBtn friendActAccept" onclick="acceptFriend('${f.id}')">✓ Accept</button>
            <button class="friendActBtn friendActDecline" onclick="declineFriend('${f.id}')">✕</button>
          </div>
        </div>`;
    }).join("");

    setFriendsListHTML("requestsList", rows);
  }

  // ── Render a player result row (shared by search + suggested list) ────
  function renderPlayerRow(p, user, existingIds) {
    const alreadyLinked = existingIds.has(p.player_id);
    return `
      <div class="friendRow" id="playerRow_${p.player_id}">
        <div class="friendAvatar">${friendInitial(p.player_name)}</div>
        <div class="friendInfo">
          <div class="friendName">${escapeHtml(p.player_name)}</div>
        </div>
        <div class="friendActions">
          ${alreadyLinked
            ? `<span class="friendActBtn" style="background:#f5ead5;color:#a07840;cursor:default;">Added</span>`
            : `<button class="friendActBtn friendActAccept" onclick="sendFriendRequest('${p.player_id}','${escapeHtml(p.player_name)}')">＋ Send</button>`
          }
          <button class="friendActBtn friendActRemove" title="Block (coming soon)" onclick="showToast('Block feature coming soon 🚧')" style="opacity:0.6;">🚫</button>
        </div>
      </div>`;
  }

  // ── Get IDs of players already connected (friend or pending) ────────
  async function getConnectedPlayerIds(userId) {
    const { data } = await supabase
      .from("friendships")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
    const ids = new Set();
    (data || []).forEach(f => {
      ids.add(f.requester_id);
      ids.add(f.receiver_id);
    });
    ids.delete(userId);
    return ids;
  }

  // ── Load recommended / all players list ──────────────────────────────
  async function loadSuggestedPlayers() {
    const user = _currentUser;
    if (!user) return;

    const suggestedEl = document.getElementById("suggestedPlayersList");
    if (!suggestedEl) return;
    suggestedEl.innerHTML = '<div class="friendsEmpty">Loading players…</div>';

    try {
      const [playersRes, existingIds] = await Promise.all([
        supabase.from("players")
          .select("player_id, player_name")
          .neq("player_id", user.id)
          .order("player_name", { ascending: true })
          .limit(30),
        getConnectedPlayerIds(user.id)
      ]);

      const { data, error } = playersRes;
      if (error) {
        console.error("loadSuggestedPlayers error:", error.message);
        suggestedEl.innerHTML = '<div class="friendsEmpty">Could not load players.</div>';
        return;
      }
      if (!data || data.length === 0) {
        suggestedEl.innerHTML = '<div class="friendsEmpty">No other players found.</div>';
        return;
      }
      suggestedEl.innerHTML = data.map(p => renderPlayerRow(p, user, existingIds)).join("");
    } catch(e) {
      console.error("loadSuggestedPlayers exception:", e);
      suggestedEl.innerHTML = '<div class="friendsEmpty">Error loading players.</div>';
    }
  }

  // ── Search players by name ───────────────────────────────────────────
  window.searchAndAddFriend = async function() {
    const user = _currentUser;
    if (!user) { setFriendAddStatus("Sign in first."); return; }

    const query = (document.getElementById("friendSearchInput")?.value || "").trim();
    if (!query) {
      // Empty query — just reload the suggested list
      setFriendAddStatus("");
      document.getElementById("friendSearchResults").innerHTML = "";
      await loadSuggestedPlayers();
      return;
    }

    setFriendAddStatus("Searching…", "#a07840");

    // Use %query% wildcards for partial name match
    const [{ data, error }, existingIds] = await Promise.all([
      supabase.from("players").select("player_id, player_name")
        .ilike("player_name", `%${query}%`)
        .neq("player_id", user.id)
        .limit(10),
      getConnectedPlayerIds(user.id)
    ]);

    if (error) { setFriendAddStatus("Search error. Try again."); return; }

    if (!data || data.length === 0) {
      setFriendAddStatus(`No player found matching "${query}".`);
      document.getElementById("friendSearchResults").innerHTML = "";
      return;
    }

    setFriendAddStatus(`Found ${data.length} player${data.length > 1 ? "s" : ""}`, "#3da855");
    document.getElementById("friendSearchResults").innerHTML =
      data.map(p => renderPlayerRow(p, user, existingIds)).join("");
  };

  window.sendFriendRequest = async function(receiverId, receiverName) {
    const user = _currentUser;
    if (!user) return;

    // Check not already friends or pending
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .limit(1);

    if (existing && existing.length > 0) {
      const s = existing[0].status;
      setFriendAddStatus(s === "accepted" ? "Already friends!" : "Request already sent.", "#a07840");
      swapSendBtn(receiverId);
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, receiver_id: receiverId, status: "pending" });

    if (error) { setFriendAddStatus("Error sending request."); return; }

    setFriendAddStatus(`Request sent to ${receiverName}! 🐾`, "#3da855");
    swapSendBtn(receiverId);
  };

  // Replace the Send button with an "Added" label in-place
  function swapSendBtn(playerId) {
    const row = document.getElementById(`playerRow_${playerId}`);
    if (!row) return;
    const btn = row.querySelector(".friendActAccept");
    if (btn) {
      btn.textContent = "✓ Sent";
      btn.style.background = "#f5ead5";
      btn.style.color = "#a07840";
      btn.style.boxShadow = "none";
      btn.onclick = null;
      btn.style.cursor = "default";
    }
  }

  // ── Accept / decline / remove ──────────────────────────
  window.acceptFriend = async function(friendshipId) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (!error) { loadFriendRequests(); loadFriendsList(); }
  };

  window.declineFriend = async function(friendshipId) {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (!error) loadFriendRequests();
  };

  window.removeFriend = async function(friendshipId) {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (!error) loadFriendsList();
  };

  // ── Visit a friend's farm ──────────────────────────────
  window.visitFriend = async function(friendId, friendName) {
    const user = _currentUser;
    if (!user) return;
    if (friendId === user.id) return; // can't visit own farm

    // Close the friends modal
    if (typeof closeModal === "function") closeModal();

    // Fetch their latest save
    const { data, error } = await supabase
      .from("game_saves")
      .select("save")
      .eq("player_id", friendId)
      .single();

    if (error || !data?.save) {
      if (typeof showMessage === "function")
        showMessage("Empty Farm", `<div class="smallNote">${escapeHtml(friendName)} hasn't started farming yet 🌱</div>`);
      return;
    }

    // Remember we're visiting and who
    _visitingPlayerId = friendId;
    _visitingSaveData  = data.save;
    window.visitMode   = true;  // blocks clickTile in tools.js

    // Snapshot OUR OWN tile data before overwriting in-memory arrays
    // The game loop calls saveState() every 250ms, which would corrupt
    // localStorage with the friend's data if we didn't save ours first.
    window._ownTileStatesSnapshot    = JSON.parse(JSON.stringify(tileStates));
    window._ownUnlockedTilesSnapshot = JSON.parse(JSON.stringify(unlockedTiles));

    // Go to farm screen first
    if (typeof showFarm === "function") showFarm();

    // Apply their tiles visually (read-only — never touches localStorage)
    applyVisitState(data.save);

    // Hide game header, bottom nav, tool strip, Ranch/Town nav, own-farm like widget
    const header      = document.querySelector(".header");
    const bottomBar   = document.getElementById("bottomBar");
    const toolStrip   = document.getElementById("toolStrip");
    const ownWidget   = document.getElementById("ownFarmLikeWidget");
    const townZooCon  = document.querySelector(".townZooCon");
    if (header)     header.style.display     = "none";
    if (bottomBar)  bottomBar.style.display  = "none";
    if (toolStrip)  toolStrip.style.display  = "none";
    if (ownWidget)  ownWidget.style.display  = "none";
    if (townZooCon) townZooCon.style.display = "none";

    // Show the visit bar
    const visitBar  = document.getElementById("visitBar");
    const visitName = document.getElementById("visitBarName");
    if (visitBar)  visitBar.style.display  = "flex";
    if (visitName) visitName.textContent   = `${friendName}'s Farm`;

    // Set up like button state
    await updateLikeButton(friendId);
  };

  // Apply a friend's save snapshot to the farm visually
  // Never writes to localStorage — only updates in-memory tile arrays
  function applyVisitState(bundle) {
    try {
      let st = null;
      if (bundle["catfarm_state_v5"]) {
        const raw = bundle["catfarm_state_v5"];
        st = typeof raw === "string" ? JSON.parse(raw) : raw;
      } else if (bundle.tileStates || bundle.unlockedTiles) {
        st = bundle; // legacy flat save
      }
      if (!st) return;
      if (Array.isArray(st.tileStates))    tileStates    = st.tileStates;
      if (Array.isArray(st.unlockedTiles)) unlockedTiles = st.unlockedTiles;
      if (typeof renderFarm === "function") renderFarm();
    } catch(e) { console.error("applyVisitState error:", e); }
  }

  // Leave visit — restore own farm and UI
  window.leaveVisit = function() {
    _visitingPlayerId = null;
    _visitingSaveData  = null;
    window.visitMode   = false;

    // Hide visit bar
    const visitBar = document.getElementById("visitBar");
    if (visitBar) visitBar.style.display = "none";

    // Restore header, bottom nav, tool strip, Ranch/Town nav, own-farm like widget
    const header     = document.querySelector(".header");
    const bottomBar  = document.getElementById("bottomBar");
    const toolStrip  = document.getElementById("toolStrip");
    const townZooCon = document.querySelector(".townZooCon");
    if (header)     header.style.display     = "";
    if (bottomBar)  bottomBar.style.display  = "";
    if (toolStrip)  toolStrip.style.display  = "";
    if (townZooCon) townZooCon.style.display = "";
    // Only show own-farm like widget if logged in
    const ownWidget = document.getElementById("ownFarmLikeWidget");
    if (ownWidget) ownWidget.style.display = _currentUser ? "flex" : "none";
    // Refresh like count on own farm
    if (_currentUser) updateLikeButton(null);

    // Restore own tiles from in-memory snapshot (not localStorage —
    // the game loop's saveState() may have written friend data there)
    if (window._ownTileStatesSnapshot && typeof tileStates !== "undefined") {
      tileStates    = window._ownTileStatesSnapshot;
      unlockedTiles = window._ownUnlockedTilesSnapshot;
      window._ownTileStatesSnapshot    = null;
      window._ownUnlockedTilesSnapshot = null;
    } else {
      // Fallback: load from localStorage
      if (typeof loadState === "function") loadState();
    }
    if (typeof renderFarm === "function") renderFarm();
  };

  // ── Farm likes ─────────────────────────────────────────
  // Show own like count on farm screen when logged in
  async function loadMyLikeCount() {
    // myLikeCount element was moved to the farm like modal — no panel element to update
    // Just refresh the like button counter on own farm
    await updateLikeButton(null);
  }

  // Update the like button state for a given farm owner
  // ownerId = null means own farm (can't like own farm)
  async function updateLikeButton(ownerId) {
    const user = _currentUser;

    if (!ownerId || !user || ownerId === user.id) {
      // Own farm — fetch total and update the own-farm widget
      const { count } = await supabase
        .from("farm_likes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user?.id || "");
      const total = count || 0;

      // Only show widget if we're NOT in visit mode
      const ownWidget = document.getElementById("ownFarmLikeWidget");
      const ownCount  = document.getElementById("ownFarmLikeCount");
      if (ownWidget) ownWidget.style.display = window.visitMode ? "none" : "flex";
      if (ownCount)  ownCount.textContent    = total;

      // Keep visit bar in sync too
      const heart   = document.getElementById("farmLikeHeart");
      const countEl = document.getElementById("farmLikeCount");
      if (heart)   heart.textContent   = "❤️";
      if (countEl) countEl.textContent = total;
      return;
    }

    // Visiting a friend — update visit bar like button
    const heart   = document.getElementById("farmLikeHeart");
    const countEl = document.getElementById("farmLikeCount");

    const { data: existing } = await supabase
      .from("farm_likes")
      .select("id")
      .eq("liker_id", user.id)
      .eq("owner_id", ownerId)
      .limit(1);

    const liked = existing && existing.length > 0;
    if (heart)   heart.textContent = liked ? "❤️" : "🤍";

    const { count } = await supabase
      .from("farm_likes")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);
    if (countEl) countEl.textContent = count || 0;
  }

  // Click handler for the farm like button
  // - On own farm: open a modal showing total likes received
  // - On a friend's farm: like/unlike
  window.handleFarmLikeClick = async function() {
    if (!_visitingPlayerId) {
      // Own farm — show likes modal
      await showFarmLikesModal();
    } else {
      // Visiting — like/unlike
      await likeFriend();
    }
  };

  async function showFarmLikesModal() {
    const user = _currentUser;
    if (!user) return;

    // Fetch total like count
    const { count, error } = await supabase
      .from("farm_likes")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    const total = error ? 0 : (count || 0);

    // Update the counter on the button too
    const countEl = document.getElementById("farmLikeCount");
    if (countEl) countEl.textContent = total;

    // Use the game's existing showMessage/openModal function
    if (typeof showMessage === "function") {
      showMessage("Farm Likes", `
        <div style="text-align:center; padding: 8px 0 4px;">
          <div style="font-size: 52px; margin-bottom: 8px;">❤️</div>
          <div style="font: normal 42px/1 'Bungee', cursive; color:#B8783F; margin-bottom: 6px;">${total}</div>
          <div style="font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; color:#8A6A6A;">
            Total likes your farm has received
          </div>
          ${total === 0
            ? `<div style="margin-top:14px; font-family:'Nunito',sans-serif; font-size:12px; color:#b0906a;">
                Add friends and let them visit your farm to collect likes! 🐾
               </div>`
            : `<div style="margin-top:14px; font-family:'Nunito',sans-serif; font-size:12px; color:#3da855; font-weight:700;">
                Your farm is popular! Keep it up 🌾
               </div>`
          }
        </div>
      `);
    }
  }

  // Like or unlike the currently visited farm
  window.likeFriend = async function() {
    const user = _currentUser;
    if (!user || !_visitingPlayerId) return;  // can't like own farm

    const { data: existing } = await supabase
      .from("farm_likes")
      .select("id")
      .eq("liker_id", user.id)
      .eq("owner_id", _visitingPlayerId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already liked — unlike
      await supabase.from("farm_likes").delete().eq("id", existing[0].id);
    } else {
      // Like
      await supabase.from("farm_likes").insert({ liker_id: user.id, owner_id: _visitingPlayerId });
    }
    // Refresh button state
    await updateLikeButton(_visitingPlayerId);
  };

  // Poll for pending requests every 60s while logged in
  async function pollFriendRequests() {
    const user = _currentUser;
    if (!user) return;
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending");
    updateFriendRequestBadge(count || 0);
  }
  setInterval(pollFriendRequests, 60_000);

  // ── Expose updateHeaderButtons to also toggle friends btn ──
  const _origUpdateHeaderButtons = updateHeaderButtons;
  updateHeaderButtons = function(loggedIn) {
    _origUpdateHeaderButtons(loggedIn);
    const friendsBtn = document.getElementById("friendsBtn");
    if (friendsBtn) friendsBtn.style.display = loggedIn ? "flex" : "none";
    if (loggedIn) {
      pollFriendRequests();
      updateLikeButton(null);
    } else {
      updateFriendRequestBadge(0);
    }
  };

  /* ── Auto-save every 30 s ────────────────────────────── */
  // Intentionally NOT hooked into the 250ms game loop in gameLoop.js.
  // The loop already calls saveState() (localStorage) every 250ms.
  // Cloud syncs on a slower cadence to avoid hammering the DB.
  setInterval(saveToCloud, 30_000);

  // Expose globally so initDefaults.js (saveName / saveCountry) can
  // trigger an immediate cloud push on profile changes.
  window.saveToCloud = saveToCloud;

}); // end DOMContentLoaded