const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
async function checkConnection(){
 const {data}=await supabaseClient.auth.getSession();
 console.log("Supabase connected",data);
}
checkConnection();
document.addEventListener("DOMContentLoaded",()=>{
 const s=document.getElementById("connectionStatus");
 if(s)s.innerHTML="Đã cấu hình Supabase ✓";
});
