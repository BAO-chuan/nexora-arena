const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function setStatus(text,ok=true){$("connectionStatus").textContent=text;$("statusDot").className="status-dot "+(ok?"ok":"bad")}
function switchTab(type){const login=type==="login";$("loginForm").classList.toggle("hidden",!login);$("signupForm").classList.toggle("hidden",login);$("loginTab").classList.toggle("active",login);$("signupTab").classList.toggle("active",!login);$("loginIntro")?.classList.toggle("hidden",!login);$("signupIntro")?.classList.toggle("hidden",login)}
$("loginTab").onclick=()=>switchTab("login");$("signupTab").onclick=()=>switchTab("signup");
function showLoggedOut(){$("authArea").classList.remove("hidden");$("appArea").classList.add("hidden");$("bottomNav").classList.add("hidden");$("walletChip").classList.add("hidden");$("logoutBtn").classList.add("hidden");$("sessionBadge").textContent="Khách"}
function showLoggedIn(user,p){$("authArea").classList.add("hidden");$("appArea").classList.remove("hidden");$("bottomNav").classList.remove("hidden");$("walletChip").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");const bal=Number(p.balance||0).toLocaleString("vi-VN");$("sessionBadge").textContent=p.username||"Player";if($("v3Username"))$("v3Username").textContent=p.username||"Player";if($("vncRequestUsername"))$("vncRequestUsername").textContent=p.username||"Player";$("headerBalance").textContent=bal;$("heroBalance").textContent=bal+" VNC";$("heroRole").textContent=String(p.role||"player").toUpperCase();$("profileUsername").textContent=p.username||"Player";$("profileEmail").textContent=user.email||"";$("profileBalance").textContent=bal+" VNC";$("profileRole").textContent=String(p.role||"player").toUpperCase();$("profileAvatar").textContent=(p.username||"N").slice(0,1).toUpperCase();$("adminArea").classList.toggle("hidden",p.role!=="admin")}
async function getProfile(id){const {data,error}=await sb.from("profiles").select("*").eq("id",id).single();if(error)throw error;return data}
async function refresh(){try{const {data:{session},error}=await sb.auth.getSession();if(error)throw error;setStatus("Đã kết nối Supabase ✓",true);if(!session){showLoggedOut();return}const p=await getProfile(session.user.id);if(p.is_suspended){await sb.auth.signOut();alert("Tài khoản đang bị khóa.");showLoggedOut();return}showLoggedIn(session.user,p);await loadTransactions(session.user.id);await loadLeaderboard();if(p.role==="admin")await loadPlayers()}catch(err){console.error(err);setStatus("Lỗi kết nối: "+err.message,false)}}
function authErrorVi(err){const m=String(err?.message||err||"").toLowerCase();if(m.includes("invalid login credentials"))return"Email hoặc mật khẩu chưa đúng.";if(m.includes("email not confirmed"))return"Email chưa được xác nhận. Hãy kiểm tra hộp thư.";if(m.includes("already registered"))return"Email này đã được đăng ký.";if(m.includes("rate limit"))return"Bạn thao tác quá nhanh. Vui lòng thử lại sau.";return err?.message||"Có lỗi xảy ra. Vui lòng thử lại."}
function authBusy(btn,on,normal,busy){if(!btn)return;btn.disabled=on;btn.textContent=on?busy:normal}
document.querySelectorAll("[data-toggle-password]").forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.togglePassword);if(!input)return;input.type=input.type==="password"?"text":"password";btn.textContent=input.type==="password"?"◉":"◎"});
try{const saved=localStorage.getItem("ls79win_remember_email")||"";if(saved){$("loginEmail").value=saved;$("rememberEmail").checked=true}}catch(_){}
function updatePasswordUI(){const pw=$("signupPassword").value||"",cf=$("signupPasswordConfirm").value||"";const checks=[["ruleLength",pw.length>=6,"Ít nhất 6 ký tự"],["ruleLetter",/[A-Za-zÀ-ỹ]/.test(pw),"Có chữ cái"],["ruleNumber",/\d/.test(pw),"Có ít nhất 1 số"],["ruleMatch",!!pw&&pw===cf,"Hai mật khẩu phải khớp nhau"]];checks.forEach(([id,ok,label])=>{const e=$(id);e.classList.toggle("ok",ok);e.textContent=(ok?"✓ ":"○ ")+label});let n=(pw.length>=6)+(/[A-Za-zÀ-ỹ]/.test(pw)?1:0)+(/\d/.test(pw)?1:0)+((pw.length>=10||/[^A-Za-zÀ-ỹ0-9]/.test(pw))?1:0);const level=n<=1?"weak":n<=2?"medium":"strong";$("passwordStrengthBar").style.width=pw?Math.max(25,n*25)+"%":"0%";$("passwordStrengthBar").dataset.level=level;$("passwordStrengthText").textContent=!pw?"—":level==="weak"?"Yếu":level==="medium"?"Trung bình":"Mạnh";$("passwordStrengthText").dataset.level=level}
$("signupPassword").addEventListener("input",updatePasswordUI);$("signupPasswordConfirm").addEventListener("input",updatePasswordUI);
$("forgotPasswordBtn").onclick=async()=>{const email=$("loginEmail").value.trim();if(!email){$("loginMessage").textContent="Nhập email trước, rồi bấm Quên mật khẩu.";$("loginEmail").focus();return}$("forgotPasswordBtn").disabled=true;$("loginMessage").textContent="Đang gửi email đặt lại mật khẩu...";const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${location.pathname}`});$("forgotPasswordBtn").disabled=false;$("loginMessage").textContent=error?authErrorVi(error):"Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư."};
$("signupForm").onsubmit=async e=>{e.preventDefault();const btn=$("signupSubmitBtn"),username=$("signupUsername").value.trim(),email=$("signupEmail").value.trim(),password=$("signupPassword").value,confirm=$("signupPasswordConfirm").value;$("signupMessage").textContent="";if(password!==confirm){$("signupMessage").textContent="Hai mật khẩu chưa khớp nhau.";return}if(!/[A-Za-zÀ-ỹ]/.test(password)||!/\d/.test(password)){$("signupMessage").textContent="Mật khẩu cần có ít nhất một chữ cái và một số.";return}authBusy(btn,true,"ĐĂNG KÝ NGAY","ĐANG TẠO TÀI KHOẢN...");try{const{data,error}=await sb.auth.signUp({email,password,options:{data:{username},emailRedirectTo:`${location.origin}${location.pathname}`}});if(error)throw error;const msg=data.session?"Tạo tài khoản thành công.":"Tạo tài khoản thành công. Hãy kiểm tra email để xác nhận.";$("signupMessage").textContent=msg;toast(msg);if(data.session)await refresh()}catch(err){$("signupMessage").textContent=authErrorVi(err)}finally{authBusy(btn,false,"ĐĂNG KÝ NGAY","ĐANG TẠO TÀI KHOẢN...")}};
$("loginForm").onsubmit=async e=>{e.preventDefault();const btn=$("loginSubmitBtn"),email=$("loginEmail").value.trim();$("loginMessage").textContent="";authBusy(btn,true,"ĐĂNG NHẬP →","ĐANG ĐĂNG NHẬP...");try{const{error}=await sb.auth.signInWithPassword({email,password:$("loginPassword").value});if(error)throw error;try{if($("rememberEmail").checked)localStorage.setItem("ls79win_remember_email",email);else localStorage.removeItem("ls79win_remember_email")}catch(_){}await refresh()}catch(err){$("loginMessage").textContent=authErrorVi(err)}finally{authBusy(btn,false,"ĐĂNG NHẬP →","ĐANG ĐĂNG NHẬP...")}};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();showLoggedOut()};
async function loadTransactions(userId){const el=$("transactionList");const {data,error}=await sb.from("coin_transactions").select("*").eq("player_id",userId).order("created_at",{ascending:false}).limit(8);if(error){console.error(error);el.innerHTML='<p class="muted">Chưa tải được lịch sử.</p>';return}el.innerHTML=data?.length?data.map(t=>{const amount=Number(t.amount||0);return `<div class="tx-row"><div><strong>${amount>0?"+":""}${amount.toLocaleString("vi-VN")} VNC</strong><span>${esc(t.reason||t.type||"Giao dịch")}</span></div><span>${new Date(t.created_at).toLocaleDateString("vi-VN")}</span></div>`}).join(""):'<p class="muted">Chưa có giao dịch.</p>'}
async function loadLeaderboard(){const el=$("leaderboardList");let {data,error}=await sb.rpc("admin_list_players",{search_text:null});if(error){const res=await sb.from("profiles").select("username,balance,role").order("balance",{ascending:false}).limit(10);data=res.data;error=res.error}if(error){el.innerHTML='<p class="muted">Chưa tải được bảng xếp hạng.</p>';return}const rows=(data||[]).filter(p=>p.role!=="admin").sort((a,b)=>Number(b.balance||0)-Number(a.balance||0)).slice(0,10);el.innerHTML=rows.length?rows.map((p,i)=>`<div class="rank-row"><div class="rank-left"><div class="rank-num">${i+1}</div><div><strong>${esc(p.username||"Player")}</strong><span>PLAYER</span></div></div><strong>${Number(p.balance||0).toLocaleString("vi-VN")} VNC</strong></div>`).join(""):'<p class="muted">Chưa có người chơi để xếp hạng.</p>'}
$("refreshLeaderboard").onclick=loadLeaderboard;
async function loadPlayers(search=""){const el=$("playerList");const {data,error}=await sb.rpc("admin_list_players",{search_text:search||null});if(error){el.innerHTML='<p class="muted">'+esc(error.message)+'</p>';return}el.innerHTML=data?.length?data.map(p=>`<div class="player-row" data-player-id="${p.id}"><div><strong>${esc(p.username||"Player")}</strong><span>${Number(p.balance||0).toLocaleString("vi-VN")} VNC · ${p.is_suspended?"Đã khóa":p.role}</span></div>${p.role==="admin"?'<span class="admin-pill">ADMIN</span>':`<div class="player-actions"><button class="admin-info-btn" onclick="openPlayerInfoAdmin('${p.id}')">Thông tin</button><button class="add" onclick="adjustNxc('${p.id}',1000)">+1K</button><button class="sub" onclick="adjustNxc('${p.id}',-1000)">-1K</button><button class="lock" onclick="setSuspended('${p.id}',${!p.is_suspended})">${p.is_suspended?"Mở khóa":"Khóa"}</button></div>`}</div>`).join(""):'<p class="muted">Chưa có tài khoản.</p>'}
window.adjustNxc=async(id,amount)=>{const reason=prompt("Lý do điều chỉnh VNC:","Admin adjustment");if(reason===null)return;const {error}=await sb.rpc("admin_adjust_balance",{target_player_id:id,delta_amount:amount,adjustment_reason:reason||"Admin adjustment"});if(error){alert(error.message);return}toast(amount>0?"Đã cộng VNC":"Đã trừ VNC");await loadPlayers($("playerSearch").value);await loadLeaderboard()};
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

/* ===== ĐỒNG BỘ VNC TRANG CHÍNH ===== */

async function syncVNC(){
  try{
    const { data: { session } } = await sb.auth.getSession();

    if(!session) return;

    const { data, error } = await sb
      .from("profiles")
      .select("balance")
      .eq("id", session.user.id)
      .single();

    if(error){
      console.error("Lỗi đồng bộ VNC:", error);
      return;
    }

    const balance = Number(data.balance || 0);

    const heroBalance = $("heroBalance");

    if(heroBalance){
      heroBalance.textContent =
        balance.toLocaleString("vi-VN") + " VNC";
    }

  }catch(error){
    console.error("syncVNC:", error);
  }
}


/* Mở trang */
syncVNC();


/* Từ Baccarat quay về */
window.addEventListener("pageshow", ()=>{
  syncVNC();
});


/* Quay lại tab */
window.addEventListener("focus", ()=>{
  syncVNC();
});


/* iPhone/Safari quay lại trang */
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible"){
    syncVNC();
  }
});

/* =====================================================
   LS79win - VNC REQUESTS
===================================================== */


function renderVncRequestQr(requestId){
  const qrBox = $("vncRequestQr");
  if(!qrBox) return;

  qrBox.innerHTML = "";

  if(!requestId){
    qrBox.textContent = "QR";
    return;
  }

  if(typeof QRCode === "undefined"){
    qrBox.textContent = "QR";
    return;
  }

  // QR chỉ chứa mã đối chiếu yêu cầu VNC ảo, không chứa thông tin thanh toán.
  new QRCode(qrBox,{
    text:`LS79WIN-VNC-REQUEST:${String(requestId)}`,
    width:108,
    height:108,
    colorDark:"#000000",
    colorLight:"#ffffff",
    correctLevel:QRCode.CorrectLevel.M
  });
}

function formatRequestVNC(value){
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
        " VNC";
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
        " VNC";
    }

    if($("profileBalance")){
      $("profileBalance").textContent =
        balance.toLocaleString("vi-VN")
        +
        " VNC";
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
        '<p class="muted">Chưa có yêu cầu VNC.</p>';

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
                ${formatRequestVNC(request.amount)}
                VNC
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
            "Hãy nhập số VNC hợp lệ"
          );

          return;
        }

        /*
          Giới hạn mỗi yêu cầu để tránh
          nhập nhầm số quá lớn.
        */

        if(amount > 1000000){

          toast(
            "Mỗi yêu cầu tối đa 1.000.000 VNC"
          );

          return;
        }

        submitButton.disabled =
          true;

        submitButton.textContent =
          "ĐANG GỬI...";

        const {
          data: createdRequest,
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
          })
          .select("id,amount,status,created_at")
          .single();

        if(error){
          throw error;
        }

        $("nxcRequestAmount").value = "";

        if($("vncReceiptAmount")){
          $("vncReceiptAmount").textContent =
            `${formatRequestVNC(amount)} VNC`;
        }

        if($("vncReceiptId")){
          const shortId =
            createdRequest?.id
              ? String(createdRequest.id).split("-")[0].toUpperCase()
              : "ĐÃ TẠO";
          $("vncReceiptId").textContent = shortId;
        }

        renderVncRequestQr(createdRequest?.id || "");

        $("vncRequestReceipt")?.classList.remove("hidden");
        nxcRequestForm.classList.add("hidden");

        toast("Đã gửi yêu cầu VNC");

        await loadNxcRequests();

      }catch(error){

        console.error(
          "Create VNC request:",
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



/* ===== TẠO YÊU CẦU MỚI SAU KHI GỬI ===== */
if($("vncNewRequestBtn")){
  $("vncNewRequestBtn").onclick = () => {
    $("vncRequestReceipt")?.classList.add("hidden");
    if($("vncRequestQr")) $("vncRequestQr").innerHTML = "";
    nxcRequestForm?.classList.remove("hidden");
    $("nxcRequestAmount")?.focus();
  };
}

/* ===== LÀM MỚI ===== */

if($("refreshNxcRequests")){

  $("refreshNxcRequests").onclick =
    async () => {

      await syncWalletPage();
      await loadNxcRequests();

      toast("Đã làm mới Ví VNC");
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
   LS79win ADMIN - VNC REQUESTS
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
        '<p class="muted">Không có yêu cầu VNC đang chờ.</p>';

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
                ${amount} VNC
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
      "Admin VNC:",
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
      "Duyệt yêu cầu và cộng VNC cho người chơi?"
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
      "Đã duyệt và cộng VNC"
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
      "Approve VNC:",
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
      "Từ chối yêu cầu VNC này?"
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
      "Reject VNC:",
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

function setPlayerInfoLocked(locked){
  const ids = [
    "playerFullName",
    "playerPhone",
    "playerBankName",
    "playerBankAccount"
  ];

  ids.forEach(id => {
    const input = document.getElementById(id);
    if(!input) return;
    input.readOnly = !!locked;
    input.classList.toggle("player-info-locked-input", !!locked);
  });

  const submit = document.getElementById("playerInfoSubmit");
  if(submit){
    submit.classList.toggle("hidden", !!locked);
    submit.disabled = !!locked;
  }

  const form = document.getElementById("playerInfoForm");
  if(form){
    form.dataset.locked = locked ? "true" : "false";
  }

  const message = document.getElementById("playerInfoMessage");
  if(message && locked){
    message.textContent = "🔒 Thông tin đã được lưu và không thể tự chỉnh sửa.";
    message.classList.add("player-info-locked-message");
  }
}


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

    setPlayerInfoLocked(
      info.profile_info_locked === true
    );

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

      if(playerInfoForm.dataset.locked === "true"){
        const lockedMessage = document.getElementById("playerInfoMessage");
        if(lockedMessage){
          lockedMessage.textContent = "🔒 Thông tin đã được khóa sau lần lưu đầu tiên.";
        }
        return;
      }

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

      if(!fullName || !phone || !bankName || !bankAccount){
        if(message){
          message.textContent = "Vui lòng nhập đầy đủ 4 mục trước khi lưu. Sau khi lưu sẽ không thể tự sửa.";
        }
        return;
      }

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
// VNC WITHDRAW
// =========================================

function formatWithdrawVNC(value){

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
                ${formatWithdrawVNC(item.amount)} VNC
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
            "Số VNC không hợp lệ.";
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
          typeof syncVNC
          ===
          "function"
        ){

          await syncVNC();
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
// =========================================
// ADMIN VNC WITHDRAW REQUESTS
// =========================================

async function loadAdminWithdrawRequests(){

  const list =
    document.getElementById(
      "adminWithdrawList"
    );

  if(!list) return;


  try{

    const {
      data: { session }
    } = await sb.auth.getSession();


    if(!session){
      return;
    }


    const {
      data: profile,
      error: profileError
    } = await sb
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();


    if(profileError){
      throw profileError;
    }


    if(profile?.role !== "admin"){
      return;
    }


    const {
      data,
      error
    } = await sb.rpc(
      "admin_list_nxc_withdraws"
    );


    if(error){
      throw error;
    }


    if(!data || !data.length){

      list.innerHTML =
        '<p class="muted">Không có lệnh rút đang chờ.</p>';

      return;
    }


    list.innerHTML =
      data.map(item => {

        const date =
          new Date(
            item.created_at
          ).toLocaleString(
            "vi-VN"
          );


        return `
          <div
            class="admin-withdraw-card"
            data-withdraw-id="${item.request_id}"
          >

            <div class="admin-withdraw-top">

              <div>

                <div class="admin-withdraw-user">
                  ${esc(item.username || "Player")}
                </div>

                <div class="muted">
                  ${date}
                </div>

              </div>

              <div class="admin-withdraw-amount">
                ${Number(item.amount || 0).toLocaleString("vi-VN")} VNC
              </div>

            </div>


            <div class="admin-withdraw-info">

              <p>
                <strong>Họ tên:</strong>
                ${esc(item.full_name || "Chưa có")}
              </p>

              <p>
                <strong>SĐT:</strong>
                ${esc(item.phone || "Chưa có")}
              </p>

              <p>
                <strong>Ngân hàng:</strong>
                ${esc(item.bank_name || "Chưa có")}
              </p>

              <p>
                <strong>Số tài khoản:</strong>
                ${esc(item.bank_account || "Chưa có")}
              </p>

            </div>


            <div class="admin-withdraw-actions">

              <button
                type="button"
                class="admin-withdraw-approve"
                data-approve-withdraw="${item.request_id}"
              >
                ✓ DUYỆT
              </button>

              <button
                type="button"
                class="admin-withdraw-reject"
                data-reject-withdraw="${item.request_id}"
              >
                × TỪ CHỐI
              </button>

            </div>

          </div>
        `;

      }).join("");


    bindAdminWithdrawButtons();


  }catch(error){

    console.error(
      "Admin withdraw list:",
      error
    );

    list.innerHTML =
      '<p class="muted">Không thể tải lệnh rút.</p>';
  }
}



function bindAdminWithdrawButtons(){

  document
    .querySelectorAll(
      "[data-approve-withdraw]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const requestId =
            button.dataset.approveWithdraw;

          await approveAdminWithdraw(
            requestId
          );
        };

    });


  document
    .querySelectorAll(
      "[data-reject-withdraw]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const requestId =
            button.dataset.rejectWithdraw;

          await rejectAdminWithdraw(
            requestId
          );
        };

    });
}



async function approveAdminWithdraw(
  requestId
){

  try{

    const {
      error
    } = await sb.rpc(
      "admin_approve_nxc_withdraw",
      {
        request_id:
          requestId
      }
    );


    if(error){
      throw error;
    }


    await loadAdminWithdrawRequests();


    if(
      typeof loadPlayers
      === "function"
    ){
      await loadPlayers();
    }


    if(
      typeof loadLeaderboard
      === "function"
    ){
      await loadLeaderboard();
    }


  }catch(error){

    console.error(
      "Approve withdraw:",
      error
    );

    alert(
      error?.message
      ||
      "Không thể duyệt lệnh rút."
    );
  }
}



async function rejectAdminWithdraw(
  requestId
){

  try{

    const {
      error
    } = await sb.rpc(
      "admin_reject_nxc_withdraw",
      {
        request_id:
          requestId
      }
    );


    if(error){
      throw error;
    }


    await loadAdminWithdrawRequests();


    if(
      typeof loadPlayers
      === "function"
    ){
      await loadPlayers();
    }


    if(
      typeof loadLeaderboard
      === "function"
    ){
      await loadLeaderboard();
    }


    if(
      typeof syncWalletPage
      === "function"
    ){
      await syncWalletPage();
    }


  }catch(error){

    console.error(
      "Reject withdraw:",
      error
    );

    alert(
      error?.message
      ||
      "Không thể từ chối lệnh rút."
    );
  }
}



const refreshAdminWithdraw =
  document.getElementById(
    "refreshAdminWithdraw"
  );


if(refreshAdminWithdraw){

  refreshAdminWithdraw.addEventListener(
    "click",
    loadAdminWithdrawRequests
  );
}


loadAdminWithdrawRequests();


window.addEventListener(
  "pageshow",
  loadAdminWithdrawRequests
);


window.addEventListener(
  "focus",
  loadAdminWithdrawRequests
);



// ===== Multi-page v1 helpers =====
(function(){
  const adminArea = document.getElementById("adminArea");
  const adminLink = document.getElementById("adminPageLink");
  if(adminArea && adminLink){
    const syncAdminLink = () => {
      adminLink.classList.toggle("hidden", adminArea.classList.contains("hidden"));
    };
    new MutationObserver(syncAdminLink).observe(adminArea,{attributes:true,attributeFilter:["class"]});
    syncAdminLink();
  }
})();
