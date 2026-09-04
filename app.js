const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);

function setStatus(text,ok=true){
  const s=$("connectionStatus");
  const d=$("statusDot");
  if(s)s.textContent=text;
  if(d)d.className="dot "+(ok?"ok":"bad");
}

function showLoggedOut(){
  $("authArea")?.classList.remove("hidden");
  $("accountArea")?.classList.add("hidden");
  $("adminArea")?.classList.add("hidden");
  $("logoutBtn")?.classList.add("hidden");
  if($("sessionBadge"))$("sessionBadge").textContent="Khách";
}

async function getProfile(id){
  const {data,error}=await sb
    .from("profiles")
    .select("*")
    .eq("id",id)
    .single();

  if(error)throw error;
  return data;
}

async function refresh(){
  try{
    const {data:{session},error}=await sb.auth.getSession();

    if(error)throw error;

    setStatus("Đã kết nối Supabase ✓",true);

    if(!session){
      showLoggedOut();
      return;
    }

    const p=await getProfile(session.user.id);

    if(p.is_suspended){
      await sb.auth.signOut();
      alert("Tài khoản đang bị khóa.");
      showLoggedOut();
      return;
    }

    $("authArea")?.classList.add("hidden");
    $("accountArea")?.classList.remove("hidden");
    $("logoutBtn")?.classList.remove("hidden");

    if($("sessionBadge"))
      $("sessionBadge").textContent=p.username||"Player";

    if($("profileUsername"))
      $("profileUsername").textContent=p.username||"Player";

    if($("profileEmail"))
      $("profileEmail").textContent=session.user.email||"";

    if($("profileBalance"))
      $("profileBalance").textContent=
        Number(p.balance||0).toLocaleString("vi-VN")+" NXC";

    if($("profileRole"))
      $("profileRole").textContent=(p.role||"player").toUpperCase();

    if(p.role==="admin"){
      $("adminArea")?.classList.remove("hidden");
      await loadPlayers();
    }else{
      $("adminArea")?.classList.add("hidden");
    }

  }catch(err){
    console.error(err);
    setStatus("Lỗi kết nối: "+err.message,false);
  }
}

$("signupForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  try{
    const username=$("signupUsername").value.trim();
    const email=$("signupEmail").value.trim();
    const password=$("signupPassword").value;

    const {data,error}=await sb.auth.signUp({
      email,
      password,
      options:{data:{username}}
    });

    if(error)throw error;

    if(data.session){
      alert("Tạo tài khoản thành công!");
      await refresh();
    }else{
      alert("Đã tạo tài khoản. Hãy kiểm tra email xác nhận.");
    }

  }catch(err){
    alert(err.message);
  }
});

$("loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  try{
    const {error}=await sb.auth.signInWithPassword({
      email:$("loginEmail").value.trim(),
      password:$("loginPassword").value
    });

    if(error)throw error;

    await refresh();

  }catch(err){
    alert(err.message);
  }
});

$("logoutBtn")?.addEventListener("click",async()=>{
  await sb.auth.signOut();
  showLoggedOut();
});

$("loginTab").onclick=()=>{
 $("loginForm").classList.remove("hidden");
 $("signupForm").classList.add("hidden");
 $("loginTab").classList.add("active");
 $("signupTab").classList.remove("active");
};

$("signupTab").onclick=()=>{
 $("signupForm").classList.remove("hidden");
 $("loginForm").classList.add("hidden");
 $("signupTab").classList.add("active");
 $("loginTab").classList.remove("active");
};

sb.auth.onAuthStateChange(()=>{
  setTimeout(refresh,0);
});

refresh();
async function loadPlayers(search=""){
  let q=sb
    .from("profiles")
    .select("id,username,role,balance,is_suspended")
    .order("username");

  if(search.trim()){
    q=q.ilike("username",`%${search.trim()}%`);
  }

  const {data,error}=await q;

  if(error){
    alert(error.message);
    return;
  }

  $("playerList").innerHTML=data.map(p=>`
    <div class="row">
      <div>
        <strong>${p.username}</strong>
        <div class="note">
          ${Number(p.balance||0).toLocaleString("vi-VN")} NXC · ${p.is_suspended?"Đã khóa":p.role}
        </div>
      </div>

      ${p.role==="admin" ? "<strong>ADMIN</strong>" : `
      <div class="actions">
        <button onclick="adjustNxc('${p.id}',1000)">+1K</button>
        <button onclick="adjustNxc('${p.id}',-1000)">-1K</button>
        <button onclick="setSuspended('${p.id}',${!p.is_suspended})">
          ${p.is_suspended?"Mở khóa":"Khóa"}
        </button>
      </div>
      `}
    </div>
  `).join("");
}

window.adjustNxc=async(id,amount)=>{
  const reason=prompt("Lý do điều chỉnh NXC:","Admin adjustment");

  if(reason===null)return;

  const {error}=await sb.rpc("admin_adjust_balance",{
    target_player_id:id,
    delta_amount:amount,
    adjustment_reason:reason||"Admin adjustment"
  });

  if(error){
    alert(error.message);
    return;
  }

  await loadPlayers($("playerSearch")?.value||"");
};

window.setSuspended=async(id,suspended)=>{
  const ok=confirm(
    suspended
      ?"Khóa tài khoản này?"
      :"Mở khóa tài khoản này?"
  );

  if(!ok)return;

  const {error}=await sb.rpc("admin_set_suspended",{
    target_player_id:id,
    suspended:suspended
  });

  if(error){
    alert(error.message);
    return;
  }

  await loadPlayers($("playerSearch")?.value||"");
};

$("playerSearch")?.addEventListener("input",e=>{
  loadPlayers(e.target.value);
});
