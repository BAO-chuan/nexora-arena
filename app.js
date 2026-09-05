const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function setStatus(text,ok=true){$("connectionStatus").textContent=text;$("statusDot").className="status-dot "+(ok?"ok":"bad")}
function switchTab(type){const login=type==="login";$("loginForm").classList.toggle("hidden",!login);$("signupForm").classList.toggle("hidden",login);$("loginTab").classList.toggle("active",login);$("signupTab").classList.toggle("active",!login)}
$("loginTab").onclick=()=>switchTab("login");$("signupTab").onclick=()=>switchTab("signup");
function showLoggedOut(){$("authArea").classList.remove("hidden");$("appArea").classList.add("hidden");$("bottomNav").classList.add("hidden");$("walletChip").classList.add("hidden");$("logoutBtn").classList.add("hidden");$("sessionBadge").textContent="Khách"}
function showLoggedIn(user,p){$("authArea").classList.add("hidden");$("appArea").classList.remove("hidden");$("bottomNav").classList.remove("hidden");$("walletChip").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");const bal=Number(p.balance||0).toLocaleString("vi-VN");$("sessionBadge").textContent=p.username||"Player";$("headerBalance").textContent=bal;$("heroBalance").textContent=bal+" NXC";$("heroRole").textContent=String(p.role||"player").toUpperCase();$("profileUsername").textContent=p.username||"Player";$("profileEmail").textContent=user.email||"";$("profileBalance").textContent=bal+" NXC";$("profileRole").textContent=String(p.role||"player").toUpperCase();$("profileAvatar").textContent=(p.username||"N").slice(0,1).toUpperCase();$("adminArea").classList.toggle("hidden",p.role!=="admin")}
async function getProfile(id){const {data,error}=await sb.from("profiles").select("*").eq("id",id).single();if(error)throw error;return data}
async function refresh(){try{const {data:{session},error}=await sb.auth.getSession();if(error)throw error;setStatus("Đã kết nối Supabase ✓",true);if(!session){showLoggedOut();return}const p=await getProfile(session.user.id);if(p.is_suspended){await sb.auth.signOut();alert("Tài khoản đang bị khóa.");showLoggedOut();return}showLoggedIn(session.user,p);await loadTransactions(session.user.id);await loadLeaderboard();if(p.role==="admin")await loadPlayers()}catch(err){console.error(err);setStatus("Lỗi kết nối: "+err.message,false)}}
$("signupForm").onsubmit=async e=>{e.preventDefault();try{const username=$("signupUsername").value.trim(),email=$("signupEmail").value.trim(),password=$("signupPassword").value;const {data,error}=await sb.auth.signUp({email,password,options:{data:{username}}});if(error)throw error;if(data.session){toast("Tạo tài khoản thành công");await refresh()}else alert("Đã tạo tài khoản. Hãy kiểm tra email để xác nhận.")}catch(err){alert(err.message)}};
$("loginForm").onsubmit=async e=>{e.preventDefault();try{const {error}=await sb.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error)throw error;await refresh()}catch(err){alert(err.message)}};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();showLoggedOut()};
async function loadTransactions(userId){const el=$("transactionList");const {data,error}=await sb.from("coin_transactions").select("*").eq("player_id",userId).order("created_at",{ascending:false}).limit(8);if(error){console.error(error);el.innerHTML='<p class="muted">Chưa tải được lịch sử.</p>';return}el.innerHTML=data?.length?data.map(t=>{const amount=Number(t.amount||0);return `<div class="tx-row"><div><strong>${amount>0?"+":""}${amount.toLocaleString("vi-VN")} NXC</strong><span>${esc(t.reason||t.type||"Giao dịch")}</span></div><span>${new Date(t.created_at).toLocaleDateString("vi-VN")}</span></div>`}).join(""):'<p class="muted">Chưa có giao dịch.</p>'}
async function loadLeaderboard(){const el=$("leaderboardList");let {data,error}=await sb.rpc("admin_list_players",{search_text:null});if(error){const res=await sb.from("profiles").select("username,balance,role").order("balance",{ascending:false}).limit(10);data=res.data;error=res.error}if(error){el.innerHTML='<p class="muted">Chưa tải được bảng xếp hạng.</p>';return}const rows=(data||[]).filter(p=>p.role!=="admin").sort((a,b)=>Number(b.balance||0)-Number(a.balance||0)).slice(0,10);el.innerHTML=rows.length?rows.map((p,i)=>`<div class="rank-row"><div class="rank-left"><div class="rank-num">${i+1}</div><div><strong>${esc(p.username||"Player")}</strong><span>PLAYER</span></div></div><strong>${Number(p.balance||0).toLocaleString("vi-VN")} NXC</strong></div>`).join(""):'<p class="muted">Chưa có người chơi để xếp hạng.</p>'}
$("refreshLeaderboard").onclick=loadLeaderboard;
async function loadPlayers(search=""){const el=$("playerList");const {data,error}=await sb.rpc("admin_list_players",{search_text:search||null});if(error){el.innerHTML='<p class="muted">'+esc(error.message)+'</p>';return}el.innerHTML=data?.length?data.map(p=>`<div class="player-row"><div><strong>${esc(p.username||"Player")}</strong><span>${Number(p.balance||0).toLocaleString("vi-VN")} NXC · ${p.is_suspended?"Đã khóa":p.role}</span></div>${p.role==="admin"?'<span class="admin-pill">ADMIN</span>':`<div class="player-actions"><button class="add" onclick="adjustNxc('${p.id}',1000)">+1K</button><button class="sub" onclick="adjustNxc('${p.id}',-1000)">-1K</button><button class="lock" onclick="setSuspended('${p.id}',${!p.is_suspended})">${p.is_suspended?"Mở khóa":"Khóa"}</button></div>`}</div>`).join(""):'<p class="muted">Chưa có tài khoản.</p>'}
window.adjustNxc=async(id,amount)=>{const reason=prompt("Lý do điều chỉnh NXC:","Admin adjustment");if(reason===null)return;const {error}=await sb.rpc("admin_adjust_balance",{target_player_id:id,delta_amount:amount,adjustment_reason:reason||"Admin adjustment"});if(error){alert(error.message);return}toast(amount>0?"Đã cộng NXC":"Đã trừ NXC");await loadPlayers($("playerSearch").value);await loadLeaderboard()};
window.setSuspended=async(id,suspended)=>{if(!confirm(suspended?"Khóa tài khoản này?":"Mở khóa tài khoản này?"))return;const {error}=await sb.rpc("admin_set_suspended",{target_player_id:id,suspended});if(error){alert(error.message);return}toast(suspended?"Đã khóa tài khoản":"Đã mở khóa tài khoản");await loadPlayers($("playerSearch").value)};
$("playerSearch").oninput=e=>loadPlayers(e.target.value);
document.querySelectorAll(".category").forEach(btn=>{btn.onclick=()=>{document.querySelectorAll(".category").forEach(b=>b.classList.remove("active"));btn.classList.add("active");const f=btn.dataset.filter;document.querySelectorAll(".game-card").forEach(card=>card.classList.toggle("hidden",f!=="all"&&card.dataset.category!==f))}});
document.querySelectorAll(".play-btn").forEach(btn=>{
  btn.onclick=()=>{
    if(btn.dataset.game==="Baccarat"){
      window.location.href="baccarat.html";
    }else{
      toast(btn.dataset.game+" đang được phát triển.");
    }
  };
});
document.querySelectorAll(".nav-item").forEach(item=>{item.onclick=()=>{document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));item.classList.add("active")}});
sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();

/* ===== ĐỒNG BỘ NXC TRANG CHÍNH ===== */

async function syncNXC(){
  try{
    const { data: { session } } = await sb.auth.getSession();

    if(!session) return;

    const { data, error } = await sb
      .from("profiles")
      .select("balance")
      .eq("id", session.user.id)
      .single();

    if(error){
      console.error("Lỗi đồng bộ NXC:", error);
      return;
    }

    const balance = Number(data.balance || 0);

    const heroBalance = $("heroBalance");

    if(heroBalance){
      heroBalance.textContent =
        balance.toLocaleString("vi-VN") + " NXC";
    }

  }catch(error){
    console.error("syncNXC:", error);
  }
}


/* Mở trang */
syncNXC();


/* Từ Baccarat quay về */
window.addEventListener("pageshow", ()=>{
  syncNXC();
});


/* Quay lại tab */
window.addEventListener("focus", ()=>{
  syncNXC();
});


/* iPhone/Safari quay lại trang */
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible"){
    syncNXC();
  }
});

/* =====================================================
   NEXORA - NXC REQUESTS
===================================================== */

function formatRequestNXC(value){
  return Number(value || 0)
    .toLocaleString("vi-VN");
}


/* ===== ĐỒNG BỘ SỐ DƯ TRONG VÍ ===== */

async function syncWalletPage(){

  try{

    const {
      data: { session }
    } = await sb.auth.getSession();

    if(!session) return;

    const {
      data,
      error
    } = await sb
      .from("profiles")
      .select("balance")
      .eq("id", session.user.id)
      .single();

    if(error){
      console.error(
        "Wallet balance:",
        error
      );
      return;
    }

    const balance =
      Number(data.balance || 0);

    const wallet =
      $("walletPageBalance");

    if(wallet){
      wallet.textContent =
        balance.toLocaleString("vi-VN")
        +
        " NXC";
    }

    /*
      Đồng bộ luôn các balance
      khác trên trang chính.
    */

    if($("headerBalance")){
      $("headerBalance").textContent =
        balance.toLocaleString("vi-VN");
    }

    if($("heroBalance")){
      $("heroBalance").textContent =
        balance.toLocaleString("vi-VN")
        +
        " NXC";
    }

    if($("profileBalance")){
      $("profileBalance").textContent =
        balance.toLocaleString("vi-VN")
        +
        " NXC";
    }

  }catch(error){

    console.error(
      "syncWalletPage:",
      error
    );
  }
}


/* ===== LOAD YÊU CẦU CỦA PLAYER ===== */

async function loadNxcRequests(){

  const list =
    $("nxcRequestList");

  if(!list) return;

  try{

    const {
      data: { session }
    } = await sb.auth.getSession();

    if(!session){
      list.innerHTML =
        '<p class="muted">Bạn chưa đăng nhập.</p>';

      return;
    }

    const {
      data,
      error
    } = await sb
      .from("nxc_requests")
      .select(
        "id,amount,status,created_at,processed_at"
      )
      .eq("user_id", session.user.id)
      .order(
        "created_at",
        { ascending:false }
      )
      .limit(10);

    if(error){
      throw error;
    }

    if(!data || data.length === 0){

      list.innerHTML =
        '<p class="muted">Chưa có yêu cầu NXC.</p>';

      return;
    }

    const labels = {
      pending:
        "⏳ Chờ duyệt",

      approved:
        "✓ Đã duyệt",

      rejected:
        "× Từ chối"
    };

    list.innerHTML =
      data.map(request => {

        const status =
          request.status || "pending";

        const date =
          new Date(
            request.created_at
          ).toLocaleString(
            "vi-VN",
            {
              dateStyle:"short",
              timeStyle:"short"
            }
          );

        return `
          <div class="nxc-request-row">

            <div class="nxc-request-info">

              <strong>
                ${formatRequestNXC(request.amount)}
                NXC
              </strong>

              <span>
                ${date}
              </span>

            </div>

            <span
              class="request-status ${status}"
            >
              ${labels[status] || status}
            </span>

          </div>
        `;

      }).join("");

  }catch(error){

    console.error(
      "loadNxcRequests:",
      error
    );

    list.innerHTML =
      `<p class="muted">
        Không tải được yêu cầu:
        ${esc(error.message)}
      </p>`;
  }
}


/* ===== CÁC NÚT 1K / 5K / 10K / 50K ===== */

document
  .querySelectorAll("[data-nxc]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const input =
          $("nxcRequestAmount");

        if(!input) return;

        input.value =
          button.dataset.nxc;
      }
    );
  });


/* ===== GỬI YÊU CẦU ===== */

const nxcRequestForm =
  $("nxcRequestForm");

if(nxcRequestForm){

  nxcRequestForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const submitButton =
        nxcRequestForm.querySelector(
          'button[type="submit"]'
        );

      try{

        const {
          data: { session }
        } = await sb.auth.getSession();

        if(!session){
          toast("Bạn chưa đăng nhập");
          return;
        }

        const amount =
          Math.floor(
            Number(
              $("nxcRequestAmount").value
            )
          );

        if(
          !Number.isFinite(amount)
          ||
          amount <= 0
        ){
          toast(
            "Hãy nhập số NXC hợp lệ"
          );

          return;
        }

        /*
          Giới hạn mỗi yêu cầu để tránh
          nhập nhầm số quá lớn.
        */

        if(amount > 1000000){

          toast(
            "Mỗi yêu cầu tối đa 1.000.000 NXC"
          );

          return;
        }

        submitButton.disabled =
          true;

        submitButton.textContent =
          "ĐANG GỬI...";

        const {
          error
        } = await sb
          .from("nxc_requests")
          .insert({
            user_id:
              session.user.id,

            amount:
              amount,

            status:
              "pending"
          });

        if(error){
          throw error;
        }

        $("nxcRequestAmount").value =
          "";

        toast(
          "Đã gửi yêu cầu NXC"
        );

        await loadNxcRequests();

      }catch(error){

        console.error(
          "Create NXC request:",
          error
        );

        alert(
          "Không gửi được yêu cầu: "
          +
          error.message
        );

      }finally{

        submitButton.disabled =
          false;

        submitButton.textContent =
          "GỬI YÊU CẦU";
      }
    }
  );
}


/* ===== LÀM MỚI ===== */

if($("refreshNxcRequests")){

  $("refreshNxcRequests").onclick =
    async () => {

      await syncWalletPage();
      await loadNxcRequests();

      toast("Đã làm mới Ví NXC");
    };
}


/* ===== KHI QUAY LẠI TRANG ===== */

async function refreshNxcWallet(){

  await syncWalletPage();
  await loadNxcRequests();
}


window.addEventListener(
  "pageshow",
  refreshNxcWallet
);

window.addEventListener(
  "focus",
  refreshNxcWallet
);

document.addEventListener(
  "visibilitychange",
  () => {

    if(
      document.visibilityState
      ===
      "visible"
    ){
      refreshNxcWallet();
    }
  }
);


/* chạy lần đầu */

refreshNxcWallet();

/* =====================================================
   NEXORA ADMIN - NXC REQUESTS
===================================================== */

async function loadAdminNxcRequests(){

  const list =
    $("adminNxcRequestList");

  if(!list) return;

  try{

    const {
      data: { session }
    } = await sb.auth.getSession();

    if(!session) return;


    /*
      Kiểm tra role hiện tại trước.
      Player bình thường không chạy phần admin.
    */

    const {
      data: myProfile,
      error: profileError
    } = await sb
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if(profileError){
      throw profileError;
    }

    if(myProfile.role !== "admin"){
      return;
    }


    list.innerHTML =
      '<p class="muted">Đang tải yêu cầu...</p>';


    /*
      Lấy các request đang chờ.
    */

    const {
      data: requests,
      error
    } = await sb
      .from("nxc_requests")
      .select(
        "id,user_id,amount,status,created_at"
      )
      .eq("status", "pending")
      .order(
        "created_at",
        { ascending:true }
      );


    if(error){
      throw error;
    }


    if(
      !requests
      ||
      requests.length === 0
    ){

      list.innerHTML =
        '<p class="muted">Không có yêu cầu NXC đang chờ.</p>';

      return;
    }


    /*
      Lấy username từ admin_list_players
      mà hệ thống Admin hiện tại đã có.
    */

    let players = [];

    const {
      data: playerData,
      error: playerError
    } = await sb.rpc(
      "admin_list_players"
    );


    if(!playerError && playerData){
      players = playerData;
    }


    const usernameMap = {};

    players.forEach(player => {

      usernameMap[player.id] =
        player.username || "Player";

    });


    list.innerHTML =
      requests.map(request => {

        const username =
          usernameMap[request.user_id]
          ||
          "Player";

        const amount =
          Number(request.amount || 0)
            .toLocaleString("vi-VN");

        const date =
          new Date(
            request.created_at
          ).toLocaleString(
            "vi-VN",
            {
              dateStyle:"short",
              timeStyle:"short"
            }
          );


        return `
          <div
            class="admin-request-card"
            data-request-id="${request.id}"
          >

            <div class="admin-request-top">

              <div class="admin-request-user">

                <strong>
                  ${esc(username)}
                </strong>

                <span>
                  ${date}
                </span>

              </div>

              <div class="admin-request-amount">
                ${amount} NXC
              </div>

            </div>


            <div class="admin-request-actions">

              <button
                class="approve-nxc"
                data-approve-nxc="${request.id}"
                type="button"
              >
                ✓ DUYỆT
              </button>

              <button
                class="reject-nxc"
                data-reject-nxc="${request.id}"
                type="button"
              >
                × TỪ CHỐI
              </button>

            </div>

          </div>
        `;

      }).join("");


    bindAdminNxcButtons();


  }catch(error){

    console.error(
      "Admin NXC:",
      error
    );

    list.innerHTML =
      `<p class="muted">
        Không tải được yêu cầu:
        ${esc(error.message)}
      </p>`;
  }
}


/* ===== GẮN NÚT DUYỆT / TỪ CHỐI ===== */

function bindAdminNxcButtons(){

  document
    .querySelectorAll(
      "[data-approve-nxc]"
    )
    .forEach(button => {

      button.onclick =
        () => approveNxcRequest(
          button.dataset.approveNxc
        );

    });


  document
    .querySelectorAll(
      "[data-reject-nxc]"
    )
    .forEach(button => {

      button.onclick =
        () => rejectNxcRequest(
          button.dataset.rejectNxc
        );

    });
}


/* ===== DUYỆT ===== */

async function approveNxcRequest(
  requestId
){

  const card =
    document.querySelector(
      `[data-request-id="${requestId}"]`
    );

  const buttons =
    card
      ? card.querySelectorAll("button")
      : [];


  if(
    !confirm(
      "Duyệt yêu cầu và cộng NXC cho người chơi?"
    )
  ){
    return;
  }


  buttons.forEach(button => {
    button.disabled = true;
  });


  try{

    const {
      error
    } = await sb.rpc(
      "admin_approve_nxc_request",
      {
        request_id:
          requestId
      }
    );


    if(error){
      throw error;
    }


    toast(
      "Đã duyệt và cộng NXC"
    );


    await loadAdminNxcRequests();

    /*
      Làm mới danh sách player,
      leaderboard và balance admin.
    */

    if(
      typeof loadPlayers ===
      "function"
    ){
      await loadPlayers();
    }

    if(
      typeof loadLeaderboard ===
      "function"
    ){
      await loadLeaderboard();
    }

    await syncWalletPage();


  }catch(error){

    console.error(
      "Approve NXC:",
      error
    );

    alert(
      "Không duyệt được: "
      +
      error.message
    );


    buttons.forEach(button => {
      button.disabled = false;
    });
  }
}


/* ===== TỪ CHỐI ===== */

async function rejectNxcRequest(
  requestId
){

  const card =
    document.querySelector(
      `[data-request-id="${requestId}"]`
    );

  const buttons =
    card
      ? card.querySelectorAll("button")
      : [];


  if(
    !confirm(
      "Từ chối yêu cầu NXC này?"
    )
  ){
    return;
  }


  buttons.forEach(button => {
    button.disabled = true;
  });


  try{

    const {
      error
    } = await sb.rpc(
      "admin_reject_nxc_request",
      {
        request_id:
          requestId
      }
    );


    if(error){
      throw error;
    }


    toast(
      "Đã từ chối yêu cầu"
    );

    await loadAdminNxcRequests();


  }catch(error){

    console.error(
      "Reject NXC:",
      error
    );

    alert(
      "Không từ chối được: "
      +
      error.message
    );


    buttons.forEach(button => {
      button.disabled = false;
    });
  }
}


/* ===== ADMIN REFRESH ===== */

if($("refreshAdminNxc")){

  $("refreshAdminNxc").onclick =
    loadAdminNxcRequests;
}


/*
  Load khi trang xuất hiện.
  Hàm tự kiểm tra role nên player
  bình thường không được xử lý admin.
*/

window.addEventListener(
  "pageshow",
  loadAdminNxcRequests
);

// =========================================
// PLAYER INFORMATION
// =========================================

async function loadPlayerInfo(){

  const form =
    document.getElementById(
      "playerInfoForm"
    );

  if(!form) return;

  try{

    const {
      data,
      error
    } = await sb.rpc(
      "player_get_profile_info"
    );

    if(error){
      throw error;
    }

    const info =
      Array.isArray(data)
        ? data[0]
        : data;

    if(!info) return;

    const fullName =
      document.getElementById(
        "playerFullName"
      );

    const phone =
      document.getElementById(
        "playerPhone"
      );

    const bankName =
      document.getElementById(
        "playerBankName"
      );

    const bankAccount =
      document.getElementById(
        "playerBankAccount"
      );

    if(fullName){
      fullName.value =
        info.full_name || "";
    }

    if(phone){
      phone.value =
        info.phone || "";
    }

    if(bankName){
      bankName.value =
        info.bank_name || "";
    }

    if(bankAccount){
      bankAccount.value =
        info.bank_account || "";
    }

  }catch(error){

    console.error(
      "Load player info:",
      error
    );
  }
}


const playerInfoForm =
  document.getElementById(
    "playerInfoForm"
  );


if(playerInfoForm){

  playerInfoForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const message =
        document.getElementById(
          "playerInfoMessage"
        );

      const fullName =
        document
          .getElementById(
            "playerFullName"
          )
          ?.value
          .trim() || "";

      const phone =
        document
          .getElementById(
            "playerPhone"
          )
          ?.value
          .trim() || "";

      const bankName =
        document
          .getElementById(
            "playerBankName"
          )
          ?.value
          .trim() || "";

      const bankAccount =
        document
          .getElementById(
            "playerBankAccount"
          )
          ?.value
          .trim() || "";

      if(message){
        message.textContent =
          "Đang lưu...";
      }

      try{

        const {
          error
        } = await sb.rpc(
          "player_update_profile_info",
          {
            p_full_name:
              fullName,

            p_phone:
              phone,

            p_bank_name:
              bankName,

            p_bank_account:
              bankAccount
          }
        );

        if(error){
          throw error;
        }

        if(message){
          message.textContent =
            "✓ Đã lưu thông tin";
        }

        await loadPlayerInfo();

      }catch(error){

        console.error(
          "Save player info:",
          error
        );

        if(message){
          message.textContent =
            "Không thể lưu thông tin.";
        }
      }
    }
  );
}


loadPlayerInfo();

window.addEventListener(
  "pageshow",
  loadPlayerInfo
);

// =========================================
// NXC WITHDRAW
// =========================================

function formatWithdrawNXC(value){

  return Number(value || 0)
    .toLocaleString("vi-VN");
}


async function loadNxcWithdrawRequests(){

  const list =
    document.getElementById(
      "nxcWithdrawList"
    );

  if(!list) return;


  try{

    const {
      data: { session }
    } = await sb.auth.getSession();


    if(!session){

      list.innerHTML =
        '<p class="muted">Vui lòng đăng nhập.</p>';

      return;
    }


    const {
      data,
      error
    } = await sb
      .from("nxc_withdraw_requests")
      .select(
        "id,amount,status,created_at"
      )
      .eq(
        "user_id",
        session.user.id
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      );


    if(error){
      throw error;
    }


    if(!data || !data.length){

      list.innerHTML =
        '<p class="muted">Chưa có lệnh rút nào.</p>';

      return;
    }


    list.innerHTML =
      data.map(item => {

        let label =
          "Chờ duyệt";

        if(item.status === "approved"){
          label = "Đã duyệt";
        }

        if(item.status === "rejected"){
          label = "Từ chối";
        }


        const date =
          new Date(
            item.created_at
          ).toLocaleString(
            "vi-VN"
          );


        return `
          <div class="withdraw-request-card">

            <div class="withdraw-request-top">

              <strong class="withdraw-request-amount">
                ${formatWithdrawNXC(item.amount)} NXC
              </strong>

              <span
                class="
                  withdraw-status
                  ${item.status}
                "
              >
                ${label}
              </span>

            </div>

            <p class="muted">
              ${date}
            </p>

          </div>
        `;

      }).join("");


  }catch(error){

    console.error(
      "Load withdraw:",
      error
    );

    list.innerHTML =
      '<p class="muted">Không thể tải lệnh rút.</p>';
  }
}



document
  .querySelectorAll(
    "[data-withdraw-nxc]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const input =
          document.getElementById(
            "nxcWithdrawAmount"
          );

        if(input){

          input.value =
            button.dataset.withdrawNxc;
        }
      }
    );

  });



const nxcWithdrawForm =
  document.getElementById(
    "nxcWithdrawForm"
  );


if(nxcWithdrawForm){

  nxcWithdrawForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const input =
        document.getElementById(
          "nxcWithdrawAmount"
        );

      const message =
        document.getElementById(
          "nxcWithdrawMessage"
        );


      const amount =
        Number(
          input?.value || 0
        );


      if(
        !Number.isInteger(amount)
        ||
        amount <= 0
      ){

        if(message){

          message.textContent =
            "Số NXC không hợp lệ.";
        }

        return;
      }


      if(message){

        message.textContent =
          "Đang gửi lệnh...";
      }


      try{

        const {
          error
        } = await sb.rpc(
          "player_create_nxc_withdraw",
          {
            p_amount:
              amount
          }
        );


        if(error){
          throw error;
        }


        if(input){
          input.value = "";
        }


        if(message){

          message.textContent =
            "✓ Đã gửi lệnh rút";
        }


        await loadNxcWithdrawRequests();


        if(
          typeof syncWalletPage
          ===
          "function"
        ){

          await syncWalletPage();
        }


        if(
          typeof syncNXC
          ===
          "function"
        ){

          await syncNXC();
        }


      }catch(error){

        console.error(
          "Create withdraw:",
          error
        );


        if(message){

          message.textContent =
            error?.message
            ||
            "Không thể gửi lệnh rút.";
        }
      }

    }
  );
}



const refreshWithdrawRequests =
  document.getElementById(
    "refreshWithdrawRequests"
  );


if(refreshWithdrawRequests){

  refreshWithdrawRequests.addEventListener(
    "click",
    loadNxcWithdrawRequests
  );
}


loadNxcWithdrawRequests();


window.addEventListener(
  "pageshow",
  loadNxcWithdrawRequests
);


window.addEventListener(
  "focus",
  loadNxcWithdrawRequests
);
