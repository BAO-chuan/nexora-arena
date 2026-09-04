const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const $=id=>document.getElementById(id);

let profile=null;
let selectedChip=100;
let bets={
  player:0,
  tie:0,
  banker:0
};
let dealing=false;

function toast(msg){
  const el=$("toast");

  el.textContent=msg;
  el.classList.add("show");

  setTimeout(()=>{
    el.classList.remove("show");
  },1800);
}

async function loadProfile(){
  const {
    data:{session}
  }=await sb.auth.getSession();

  if(!session){
    location.href="index.html";
    return;
  }

  const {data,error}=await sb
    .from("profiles")
    .select("*")
    .eq("id",session.user.id)
    .single();

  if(error){
    alert(error.message);
    return;
  }

  if(data.is_suspended){
    await sb.auth.signOut();

    alert("Tài khoản đang bị khóa.");

    location.href="index.html";
    return;
  }

  profile=data;

  renderBalance();
}

function renderBalance(){
  $("gameBalance").textContent=
    Number(profile?.balance||0)
      .toLocaleString("vi-VN");
}

function renderBets(){
  $("betPlayer").textContent=
    bets.player.toLocaleString("vi-VN")
    +" NXC";

  $("betTie").textContent=
    bets.tie.toLocaleString("vi-VN")
    +" NXC";

  $("betBanker").textContent=
    bets.banker.toLocaleString("vi-VN")
    +" NXC";
}

function totalBet(){
  return (
    bets.player+
    bets.tie+
    bets.banker
  );
}

document
.querySelectorAll(".chip")
.forEach(btn=>{

  btn.onclick=()=>{

    if(dealing)return;

    selectedChip=
      Number(btn.dataset.chip);

    document
    .querySelectorAll(".chip")
    .forEach(b=>{
      b.classList.remove("active");
    });

    btn.classList.add("active");
  };
});

document
.querySelectorAll(".bet-zone")
.forEach(btn=>{

  btn.onclick=()=>{

    if(dealing)return;

    const side=
      btn.dataset.bet;

    const available=
      Number(profile?.balance||0)
      -totalBet();

    if(selectedChip>available){
      toast("Không đủ NXC");
      return;
    }

    bets[side]+=selectedChip;

    renderBets();

    document
    .querySelectorAll(".bet-zone")
    .forEach(b=>{
      b.classList.remove("selected");
    });

    btn.classList.add("selected");
  };
});

$("clearBets").onclick=()=>{

  if(dealing)return;

  bets={
    player:0,
    tie:0,
    banker:0
  };

  renderBets();

  document
  .querySelectorAll(".bet-zone")
  .forEach(b=>{
    b.classList.remove("selected");
  });
};

const suits=[
  "♠",
  "♥",
  "♦",
  "♣"
];

const ranks=[
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
];

function drawCard(){

  const rank=
    ranks[
      Math.floor(
        Math.random()*ranks.length
      )
    ];

  const suit=
    suits[
      Math.floor(
        Math.random()*suits.length
      )
    ];

  return {
    rank,
    suit
  };
}

function cardValue(card){

  if(card.rank==="A")
    return 1;

  if(
    [
      "10",
      "J",
      "Q",
      "K"
    ].includes(card.rank)
  ){
    return 0;
  }

  return Number(card.rank);
}

function handTotal(hand){

  return (
    hand.reduce(
      (sum,card)=>
        sum+cardValue(card),
      0
    )
    %10
  );
}

function cardHtml(
  card,
  delay=0
){

  const red=
    card.suit==="♥"
    ||
    card.suit==="♦";

  return `
    <div
      class="play-card ${red?"red":""}"
      style="
        animation-delay:${delay}ms
      "
    >

      <div>

        <span class="rank">
          ${card.rank}
        </span>

        <br>

        <span class="suit">
          ${card.suit}
        </span>

      </div>

    </div>
  `;
}

function baccaratRound(){

  const player=[
    drawCard(),
    drawCard()
  ];

  const banker=[
    drawCard(),
    drawCard()
  ];

  let p=
    handTotal(player);

  let b=
    handTotal(banker);

  if(
    p<8
    &&
    b<8
  ){

    let playerThird=null;

    if(p<=5){

      playerThird=
        drawCard();

      player.push(
        playerThird
      );

      p=
        handTotal(player);
    }

    if(!playerThird){

      if(b<=5){

        banker.push(
          drawCard()
        );
      }

    }else{

      const t=
        cardValue(playerThird);

      if(b<=2){

        banker.push(
          drawCard()
        );

      }else if(
        b===3
        &&
        t!==8
      ){

        banker.push(
          drawCard()
        );

      }else if(
        b===4
        &&
        [
          2,
          3,
          4,
          5,
          6,
          7
        ].includes(t)
      ){

        banker.push(
          drawCard()
        );

      }else if(
        b===5
        &&
        [
          4,
          5,
          6,
          7
        ].includes(t)
      ){

        banker.push(
          drawCard()
        );

      }else if(
        b===6
        &&
        [
          6,
          7
        ].includes(t)
      ){

        banker.push(
          drawCard()
        );
      }
    }
  }

  p=
    handTotal(player);

  b=
    handTotal(banker);

  let winner="tie";

  if(p>b){
    winner="player";
  }

  if(b>p){
    winner="banker";
  }

  return {
    player,
    banker,
    p,
    b,
    winner
  };
}

async function applyResult(
  round
){

  const staked=
    totalBet();

  let returned=0;

  if(
    round.winner==="player"
  ){

    returned=
      bets.player*2;

  }else if(
    round.winner==="banker"
  ){

    returned=
      Math.floor(
        bets.banker*1.95
      );

  }else{

    returned=
      bets.tie*9
      +
      bets.player
      +
      bets.banker;
  }

  const delta=
    returned-staked;

  const {data,error}=
    await sb.rpc(
      "game_adjust_balance",
      {
        delta_amount:delta,
        game_name:"baccarat",
        game_note:
          `Baccarat ${round.winner.toUpperCase()} | Bet ${staked} | Return ${returned}`
      }
    );

  if(error){

    console.error(error);

    throw error;
  }

  if(
    typeof data==="number"
  ){

    profile.balance=data;

  }else{

    const {
      data:p,
      error:e
    }=await sb
      .from("profiles")
      .select("balance")
      .eq("id",profile.id)
      .single();

    if(e)
      throw e;

    profile.balance=
      p.balance;
  }

  renderBalance();

  return {
    delta,
    returned
  };
}

$("dealBtn").onclick=
async()=>{

  if(dealing)
    return;

  if(totalBet()<=0){

    toast(
      "Hãy đặt cược trước"
    );

    return;
  }

  if(
    totalBet()
    >
    Number(profile.balance||0)
  ){

    toast(
      "Số dư không đủ"
    );

    return;
  }

  dealing=true;

  $("dealBtn").disabled=true;

  $("clearBets").disabled=true;

  $("resultBanner")
    .classList
    .add("hidden");

  $("roundState")
    .textContent=
    "ĐANG CHIA";

  $("playerHand")
    .innerHTML="";

  $("bankerHand")
    .innerHTML="";

  $("playerScore")
    .textContent="0";

  $("bankerScore")
    .textContent="0";

  const round=
    baccaratRound();

  round.player
  .forEach((card,i)=>{

    setTimeout(()=>{

      $("playerHand")
      .insertAdjacentHTML(
        "beforeend",
        cardHtml(card,0)
      );

    },180*i);
  });

  round.banker
  .forEach((card,i)=>{

    setTimeout(()=>{

      $("bankerHand")
      .insertAdjacentHTML(
        "beforeend",
        cardHtml(card,0)
      );

    },180*i+90);
  });

  await new Promise(
    resolve=>
      setTimeout(
        resolve,
        900
      )
  );

  $("playerScore")
    .textContent=
    round.p;

  $("bankerScore")
    .textContent=
    round.b;

  try{

    const {
      delta
    }=
      await applyResult(
        round
      );

    const labels={
      player:"PLAYER THẮNG",
      banker:"BANKER THẮNG",
      tie:"HÒA"
    };

    $("resultBanner")
      .textContent=
      labels[round.winner]
      +" · "
      +(delta>=0?"+":"")
      +delta.toLocaleString("vi-VN")
      +" NXC";

    $("resultBanner")
      .classList
      .remove("hidden");

    $("roundState")
      .textContent=
      "KẾT QUẢ";

  }catch(err){

    alert(
      "Không thể cập nhật NXC: "
      +err.message
    );

    $("roundState")
      .textContent=
      "LỖI";
  }

  bets={
    player:0,
    tie:0,
    banker:0
  };

  renderBets();

  dealing=false;

  $("dealBtn").disabled=false;

  $("clearBets").disabled=false;
};

loadProfile();
