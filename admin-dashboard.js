
/* =========================================================
   LS79win Admin Dashboard v1
   UI/summary only. Existing app.js keeps all write actions.
========================================================= */
(function(){
  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => [...root.querySelectorAll(s)];

  function fmt(n){
    return Number(n || 0).toLocaleString("vi-VN");
  }

  function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  }

  function setBadge(id, count){
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = String(count || 0);
    el.classList.toggle("hidden", !count);
  }

  function openTab(name){
    qa(".admin-tab").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.adminTab === name)
    );
    qa(".admin-panel").forEach(panel =>
      panel.classList.toggle("active", panel.dataset.adminPanel === name)
    );
  }

  qa(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => openTab(btn.dataset.adminTab));
  });

  async function getAdminSession(){
    const {data:{session}} = await sb.auth.getSession();
    if(!session) return null;

    const {data:profile, error} = await sb
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if(error || profile?.role !== "admin") return null;
    return session;
  }

  async function refreshDashboardStats(){
    try{
      const session = await getAdminSession();
      if(!session) return;

      const [
        playersResult,
        requestsResult,
        withdrawsResult
      ] = await Promise.all([
        sb.rpc("admin_list_players",{search_text:null}),
        sb.from("nxc_requests")
          .select("id",{count:"exact",head:false})
          .eq("status","pending"),
        sb.rpc("admin_list_nxc_withdraws")
      ]);

      const players = (playersResult.data || []).filter(p => p.role !== "admin");
      const playerCount = players.length;
      const totalBalance = players.reduce((sum,p) => sum + Number(p.balance || 0), 0);

      const requestCount = requestsResult.error ? 0 : (requestsResult.data || []).length;
      const withdrawCount = withdrawsResult.error ? 0 : (withdrawsResult.data || []).length;

      setText("adminStatPlayers", fmt(playerCount));
      setText("adminStatBalance", fmt(totalBalance));
      setText("adminStatRequests", fmt(requestCount));
      setText("adminStatWithdraws", fmt(withdrawCount));

      setBadge("adminRequestBadge", requestCount);
      setBadge("adminWithdrawBadge", withdrawCount);
    }catch(err){
      console.error("Admin dashboard stats:", err);
    }
  }

  const refreshAll = document.getElementById("adminRefreshAll");
  if(refreshAll){
    refreshAll.addEventListener("click", async () => {
      refreshAll.disabled = true;
      refreshAll.textContent = "Đang tải...";
      try{
        await Promise.all([
          typeof loadPlayers === "function" ? loadPlayers(document.getElementById("playerSearch")?.value || "") : Promise.resolve(),
          typeof loadAdminNxcRequests === "function" ? loadAdminNxcRequests() : Promise.resolve(),
          typeof loadAdminWithdrawRequests === "function" ? loadAdminWithdrawRequests() : Promise.resolve(),
          refreshDashboardStats()
        ]);
        if(typeof toast === "function") toast("Đã làm mới trang quản trị");
      }finally{
        refreshAll.disabled = false;
        refreshAll.textContent = "↻ Làm mới";
      }
    });
  }

  // Refresh summary after existing per-section refresh buttons are used.
  ["refreshAdminNxc","refreshAdminWithdraw"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => {
      setTimeout(refreshDashboardStats, 500);
    });
  });

  window.addEventListener("pageshow", () => setTimeout(refreshDashboardStats, 350));
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible") setTimeout(refreshDashboardStats, 250);
  });

  setTimeout(refreshDashboardStats, 600);
})();


/* =========================================================
   Admin Player Profile v1
========================================================= */
(function(){
  const dialog = document.getElementById("adminPlayerInfoDialog");
  if(!dialog) return;

  const $id = id => document.getElementById(id);

  function setMessage(text, isError=false){
    const el = $id("adminPlayerInfoMessage");
    if(!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isError);
  }

  function setBusy(busy){
    ["adminSavePlayerInfo","adminUnlockPlayerInfo"].forEach(id=>{
      const el = $id(id);
      if(el) el.disabled = !!busy;
    });
  }

  function showLockStatus(locked){
    const el = $id("adminPlayerInfoLockStatus");
    if(!el) return;
    el.textContent = locked ? "🔒 ĐÃ KHÓA" : "🔓 ĐANG MỞ";
    el.classList.toggle("locked", !!locked);
    el.classList.toggle("unlocked", !locked);
  }

  window.openPlayerInfoAdmin = async function(playerId){
    if(!playerId) return;

    setMessage("Đang tải thông tin...");
    setBusy(true);

    try{
      const {data,error} = await sb.rpc("admin_get_player_profile_info",{
        p_player_id: playerId
      });

      if(error) throw error;

      const info = Array.isArray(data) ? data[0] : data;
      if(!info) throw new Error("Không tìm thấy người chơi.");

      $id("adminPlayerInfoId").value = playerId;
      $id("adminPlayerInfoIdentity").textContent =
        `${info.username || "Player"} • ${info.email || "—"}`;
      $id("adminPlayerFullName").value = info.full_name || "";
      $id("adminPlayerPhone").value = info.phone || "";
      $id("adminPlayerBankName").value = info.bank_name || "";
      $id("adminPlayerBankAccount").value = info.bank_account || "";
      showLockStatus(info.profile_info_locked === true);
      setMessage("");

      if(typeof dialog.showModal === "function"){
        dialog.showModal();
      }else{
        dialog.setAttribute("open","");
      }
    }catch(err){
      console.error("Admin player profile:",err);
      if(typeof toast === "function") toast(err.message || "Không tải được thông tin.");
      else alert(err.message || "Không tải được thông tin.");
    }finally{
      setBusy(false);
    }
  };

  $id("adminPlayerInfoClose")?.addEventListener("click",()=>{
    if(typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  });

  $id("adminSavePlayerInfo")?.addEventListener("click",async()=>{
    const playerId = $id("adminPlayerInfoId").value;
    if(!playerId) return;

    const fullName = $id("adminPlayerFullName").value.trim();
    const phone = $id("adminPlayerPhone").value.trim();
    const bankName = $id("adminPlayerBankName").value.trim();
    const bankAccount = $id("adminPlayerBankAccount").value.trim();

    if(!fullName || !phone || !bankName || !bankAccount){
      setMessage("Vui lòng nhập đầy đủ 4 mục trước khi lưu.",true);
      return;
    }

    if(!confirm("Lưu thông tin này và khóa lại ngay?")) return;

    setBusy(true);
    setMessage("Đang lưu...");

    try{
      const {error} = await sb.rpc("admin_update_player_profile_info",{
        p_player_id:playerId,
        p_full_name:fullName,
        p_phone:phone,
        p_bank_name:bankName,
        p_bank_account:bankAccount
      });

      if(error) throw error;

      showLockStatus(true);
      setMessage("✓ Đã cập nhật và khóa thông tin người chơi.");
      if(typeof toast === "function") toast("Đã cập nhật thông tin");
    }catch(err){
      console.error("Admin update profile:",err);
      setMessage(err.message || "Không thể cập nhật thông tin.",true);
    }finally{
      setBusy(false);
    }
  });

  $id("adminUnlockPlayerInfo")?.addEventListener("click",async()=>{
    const playerId = $id("adminPlayerInfoId").value;
    if(!playerId) return;

    if(!confirm("Mở khóa để người chơi có thể tự sửa và lưu lại một lần?")) return;

    setBusy(true);
    setMessage("Đang mở khóa...");

    try{
      const {error} = await sb.rpc("admin_set_player_profile_lock",{
        p_player_id:playerId,
        p_locked:false
      });

      if(error) throw error;

      showLockStatus(false);
      setMessage("✓ Đã mở khóa. Người chơi có thể tự sửa và lưu thêm 1 lần.");
      if(typeof toast === "function") toast("Đã mở khóa thông tin");
    }catch(err){
      console.error("Admin unlock profile:",err);
      setMessage(err.message || "Không thể mở khóa.",true);
    }finally{
      setBusy(false);
    }
  });
})();
