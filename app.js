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

$("loginTab")?.addEventListener("click",()=>{
  $("loginForm")?.classList.remove("hidden");
  $("signupForm")?.classList.add("hidden");
});

$("signupTab")?.addEventListener("click",()=>{
  $("signupForm")?.classList.remove("hidden");
  $("loginForm")?.classList.add("hidden");
});

sb.auth.onAuthStateChange(()=>{
  setTimeout(refresh,0);
});

refresh();
