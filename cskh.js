/* LS79win CSKH v1 */
(function(){
  const $ = id => document.getElementById(id);
  const fab=$("supportFab"), box=$("supportBox"), close=$("supportClose"), form=$("supportForm"), input=$("supportInput"), list=$("supportMessages"), badge=$("supportUnreadBadge");
  if(!fab||!box||!form) return;
  let uid=null, channel=null;

  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const time=v=>new Date(v).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});

  async function session(){
    const {data:{session}}=await sb.auth.getSession();
    uid=session?.user?.id||null;
    fab.classList.toggle("hidden",!uid);
    if(uid) await refresh();
  }
  async function refresh(){
    if(!uid) return;
    const {data,error}=await sb.from("support_messages").select("id,sender_role,message,created_at,read_by_user").eq("user_id",uid).order("created_at",{ascending:true}).limit(200);
    if(error){ console.error("CSKH:",error); return; }
    if(!data?.length){ list.innerHTML='<div class="support-empty">Gửi nội dung cần hỗ trợ cho CSKH.</div>'; }
    else list.innerHTML=data.map(m=>`<div class="support-msg ${m.sender_role==="admin"?"admin":"user"}">${esc(m.message)}<small>${m.sender_role==="admin"?"CSKH":"Bạn"} • ${time(m.created_at)}</small></div>`).join("");
    list.scrollTop=list.scrollHeight;
    const unread=data.filter(m=>m.sender_role==="admin"&&!m.read_by_user).length;
    badge.textContent=String(unread); badge.classList.toggle("hidden",!unread);
    if(!box.classList.contains("hidden") && unread){
      await sb.rpc("support_mark_user_read");
      badge.classList.add("hidden");
    }
  }
  fab.onclick=async()=>{box.classList.toggle("hidden"); if(!box.classList.contains("hidden")) await refresh();};
  close.onclick=()=>box.classList.add("hidden");
  form.addEventListener("submit",async e=>{
    e.preventDefault(); const msg=input.value.trim(); if(!msg||!uid) return;
    const btn=$("supportSend"); btn.disabled=true;
    const {error}=await sb.rpc("support_send_message",{p_message:msg});
    btn.disabled=false;
    if(error){ alert(error.message||"Không thể gửi tin nhắn."); return; }
    input.value=""; await refresh();
  });
  async function subscribe(){
    if(channel) await sb.removeChannel(channel);
    if(!uid) return;
    channel=sb.channel("support-user-"+uid).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages",filter:`user_id=eq.${uid}`},refresh).subscribe();
  }
  sb.auth.onAuthStateChange((_event,s)=>{uid=s?.user?.id||null;fab.classList.toggle("hidden",!uid);if(uid){refresh();subscribe();}else box.classList.add("hidden");});
  session().then(subscribe);
})();
