
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
