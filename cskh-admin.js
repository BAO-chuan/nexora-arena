/* LS79win CSKH Admin v1 */
(function(){
  const threads=document.getElementById("adminSupportThreads"), chat=document.getElementById("adminSupportChat"), refreshBtn=document.getElementById("refreshAdminSupport");
  if(!threads||!chat) return;
  let activeUser=null, channel=null;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const time=v=>new Date(v).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});

  async function loadThreads(){
    const {data,error}=await sb.rpc("admin_support_threads");
    if(error){threads.innerHTML=`<p class="muted">${esc(error.message)}</p>`;return;}
    const rows=data||[];
    const badge=document.getElementById("adminSupportBadge");
    const total=rows.reduce((n,r)=>n+Number(r.unread_count||0),0);
    if(badge){badge.textContent=String(total);badge.classList.toggle("hidden",!total);}
    threads.innerHTML=rows.length?rows.map(r=>`<button class="admin-support-thread ${activeUser===r.user_id?"active":""}" data-user="${r.user_id}">${Number(r.unread_count||0)?`<i>${r.unread_count}</i>`:""}<strong>${esc(r.username||"Player")}</strong><span>${esc(r.last_message||"")}</span></button>`).join(""):'<p class="muted" style="padding:12px">Chưa có tin nhắn.</p>';
    threads.querySelectorAll("[data-user]").forEach(b=>b.onclick=()=>openChat(b.dataset.user,b.querySelector("strong")?.textContent||"Player"));
  }
  async function openChat(userId,username){
    activeUser=userId; await sb.rpc("admin_support_mark_read",{p_user_id:userId});
    const {data,error}=await sb.from("support_messages").select("id,sender_role,message,created_at").eq("user_id",userId).order("created_at",{ascending:true}).limit(300);
    if(error){chat.innerHTML=`<div class="admin-support-empty">${esc(error.message)}</div>`;return;}
    chat.innerHTML=`<div class="admin-support-chat-head">💬 ${esc(username)}</div><div id="adminSupportMessages" class="admin-support-chat-messages">${(data||[]).map(m=>`<div class="admin-support-message ${m.sender_role==="admin"?"admin":"user"}">${esc(m.message)}<small>${m.sender_role==="admin"?"Admin":"Player"} • ${time(m.created_at)}</small></div>`).join("")}</div><form id="adminSupportReply" class="admin-support-reply"><textarea id="adminSupportReplyText" maxlength="1000" rows="2" required placeholder="Nhập phản hồi..."></textarea><button type="submit">GỬI</button></form>`;
    const msgs=document.getElementById("adminSupportMessages"); msgs.scrollTop=msgs.scrollHeight;
    document.getElementById("adminSupportReply").onsubmit=async e=>{
      e.preventDefault();const input=document.getElementById("adminSupportReplyText"),msg=input.value.trim();if(!msg)return;
      const {error}=await sb.rpc("admin_support_reply",{p_user_id:activeUser,p_message:msg});
      if(error){alert(error.message||"Không thể gửi phản hồi.");return;}
      input.value="";await openChat(activeUser,username);await loadThreads();
    };
    await loadThreads();
  }
  refreshBtn.onclick=loadThreads;
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadThreads();});
  async function subscribe(){
    channel=sb.channel("support-admin").on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages"},async()=>{await loadThreads();if(activeUser){const btn=threads.querySelector(`[data-user="${activeUser}"]`);if(btn) await openChat(activeUser,btn.querySelector("strong")?.textContent||"Player");}}).subscribe();
  }
  setTimeout(()=>{loadThreads();subscribe();},800);
})();
