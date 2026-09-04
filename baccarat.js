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

let lastBets=null;
let dealing=false;

let localHistory=
  JSON.parse(
    localStorage.getItem(
      "nexora_baccarat_history"
    )||"[]"
  );

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
    data:{session},
    error:sessionError
  } = await sb.auth.getSession();

  if(sessionError){
    alert(sessionError.message);
    return;
  }

  if(!session){
    location.href="index.html";
    return;
  }

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select("id,username,role,balance,is_suspended")
    .eq("id",session.user.id)
    .single();

  if(error){
    alert("Không tải được số dư: "+error.message);
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

  if(typeof renderHistory==="function"){
    renderHistory();
  }
}

function renderBalance(){

  $("gameBalance").textContent=
    Number(
      profile?.balance||0
    ).toLocaleString("vi-VN");
}

function renderBets(){

  $("betPlayer").textContent=
    bets.player
      .toLocaleString("vi-VN")
    +" NXC";

  $("betTie").textContent=
    bets.tie
      .toLocaleString("vi-VN")
    +" NXC";

  $("betBanker").textContent=
    bets.banker
      .toLocaleString("vi-VN")
    +" NXC";
}

function totalBet(){

  return (
    bets.player
    +
    bets.tie
    +
    bets.banker
  );
}

function setBet(
  side,
  amount
){

  const available=
    Number(
      profile?.balance||0
    )
    -
    totalBet();

  if(amount>available){

    toast(
      "Không đủ NXC"
    );

    return false;
  }

  bets[side]+=amount;

  renderBets();

  document
    .querySelectorAll(
      ".bet-zone"
    )
    .forEach(
      b=>
        b.classList.remove(
          "selected"
        )
    );

  document
    .querySelector(
      `[data-bet="${side}"]`
    )
    ?.classList
    .add("selected");

  return true;
}

document
  .querySelectorAll(".chip")
  .forEach(btn=>{

    btn.onclick=()=>{

      if(dealing)
        return;

      selectedChip=
        Number(
          btn.dataset.chip
        );

      document
        .querySelectorAll(
          ".chip"
        )
        .forEach(
          b=>
            b.classList.remove(
              "active"
            )
        );

      btn
        .classList
        .add("active");
    };
  });

document
  .querySelectorAll(
    ".bet-zone"
  )
  .forEach(btn=>{

    btn.onclick=()=>{

      if(dealing)
        return;

      setBet(
        btn.dataset.bet,
        selectedChip
      );
    };
  });

$("clearBets").onclick=()=>{

  if(dealing)
    return;

  bets={
    player:0,
    tie:0,
    banker:0
  };

  renderBets();

  document
    .querySelectorAll(
      ".bet-zone"
    )
    .forEach(
      b=>
        b.classList.remove(
          "selected"
        )
    );
};

$("replayBtn").onclick=()=>{

  if(
    dealing
    ||
    !lastBets
  ){
    return;
  }

  const needed=
    lastBets.player
    +
    lastBets.tie
    +
    lastBets.banker;

  if(
    needed
    >
    Number(
      profile?.balance||0
    )
  ){

    toast(
      "Không đủ NXC để chơi lại"
    );

    return;
  }

  bets={
    ...lastBets
  };

  renderBets();

  toast(
    "Đã đặt lại cược ván trước"
  );
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

  return {

    rank:
      ranks[
        Math.floor(
          Math.random()
          *
          ranks.length
        )
      ],

    suit:
      suits[
        Math.floor(
          Math.random()
          *
          suits.length
        )
      ]
  };
}

function cardValue(
  card
){

  if(
    card.rank==="A"
  ){
    return 1;
  }

  if(
    [
      "10",
      "J",
      "Q",
      "K"
    ]
    .includes(
      card.rank
    )
  ){
    return 0;
  }

  return Number(
    card.rank
  );
}

function handTotal(
  hand
){

  return (
    hand.reduce(
      (
        sum,
        card
      )=>
        sum
        +
        cardValue(card),
      0
    )
    %
    10
  );
}

function cardHtml(
  card
){

  const red=
    card.suit==="♥"
    ||
    card.suit==="♦";

  return `
    <div
      class="play-card ${red?"red":""}"
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
    handTotal(
      player
    );

  let b=
    handTotal(
      banker
    );

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
        handTotal(
          player
        );
    }

    if(
      !playerThird
    ){

      if(b<=5){

        banker.push(
          drawCard()
        );
      }

    }else{

      const t=
        cardValue(
          playerThird
        );

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
        ]
        .includes(t)
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
        ]
        .includes(t)
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
        ]
        .includes(t)
      ){

        banker.push(
          drawCard()
        );
      }
    }
  }

  p=
    handTotal(
      player
    );

  b=
    handTotal(
      banker
    );

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
  round,
  roundBets
){

  const staked=
    roundBets.player
    +
    roundBets.tie
    +
    roundBets.banker;

  let returned=0;

  if(
    round.winner
    ===
    "player"
  ){

    returned=
      roundBets.player
      *
      2;

  }else if(
    round.winner
    ===
    "banker"
  ){

    returned=
      Math.floor(
        roundBets.banker
        *
        1.95
      );

  }else{

    returned=
      roundBets.tie
      *
      9
      +
      roundBets.player
      +
      roundBets.banker;
  }

  const delta=
    returned
    -
    staked;

  const {
    data,
    error
  }=
    await sb.rpc(
      "game_adjust_balance",
      {

        delta_amount:
          delta,

        game_name:
          "baccarat",

        game_note:
          `Baccarat ${round.winner.toUpperCase()} | Bet ${staked} | Return ${returned}`
      }
    );

  if(error){

    throw error;
  }

  if(
    typeof data
    ===
    "number"
  ){

    profile.balance=
      data;

  }else{

    const {
      data:p,
      error:e
    }=
      await sb
        .from(
          "profiles"
        )
        .select(
          "balance"
        )
        .eq(
          "id",
          profile.id
        )
        .single();

    if(e)
      throw e;

    profile.balance=
      p.balance;
  }

  renderBalance();

  return {
    delta,
    returned,
    staked
  };
}

function saveRound(
  round,
  summary
){

  localHistory.unshift({

    winner:
      round.winner,

    player:
      round.p,

    banker:
      round.b,

    delta:
      summary.delta,

    staked:
      summary.staked,

    at:
      Date.now()
  });

  localHistory=
    localHistory
      .slice(
        0,
        10
      );

  localStorage.setItem(
    "nexora_baccarat_history",
    JSON.stringify(
      localHistory
    )
  );

  renderHistory();
}

function renderHistory(){

  const el=
    $("roundHistory");

  if(
    !localHistory.length
  ){

    el.innerHTML=
      '<p class="empty">Chưa có ván nào.</p>';

    return;
  }

  const labels={
    player:"PLAYER",
    banker:"BANKER",
    tie:"TIE"
  };

  el.innerHTML=
    localHistory
      .map(item=>{

        const plus=
          item.delta>=0;

        return `
          <div class="history-row">

            <div class="history-main">

              <span
                class="history-badge ${item.winner}"
              >
                ${labels[item.winner]}
              </span>

              <div class="history-text">

                <strong>
                  ${item.player}
                  -
                  ${item.banker}
                </strong>

                <span>
                  Cược
                  ${Number(item.staked).toLocaleString("vi-VN")}
                  NXC
                </span>

              </div>

            </div>

            <div
              class="
                history-delta
                ${plus?"plus":"minus"}
              "
            >

              ${plus?"+":""}
              ${Number(item.delta).toLocaleString("vi-VN")}

            </div>

          </div>
        `;
      })
      .join("");
}

$("clearHistory").onclick=()=>{

  localHistory=[];

  localStorage.removeItem(
    "nexora_baccarat_history"
  );

  renderHistory();
};

function flashResult(
  delta
){

  const table=
    $("tableWrap");

  table
    .classList
    .remove(
      "win",
      "loss"
    );

  requestAnimationFrame(
    ()=>{

      table
        .classList
        .add(
          delta>=0
          ?
          "win"
          :
          "loss"
        );

      setTimeout(
        ()=>{

          table
            .classList
            .remove(
              "win",
              "loss"
            );

        },
        850
      );
    }
  );
}

$("dealBtn").onclick=
async()=>{

  if(dealing)
    return;

  if(
    totalBet()<=0
  ){

    toast(
      "Hãy đặt cược trước"
    );

    return;
  }

  if(
    totalBet()
    >
    Number(
      profile.balance||0
    )
  ){

    toast(
      "Số dư không đủ"
    );

    return;
  }

  dealing=true;

  $("dealBtn").disabled=true;

  $("clearBets").disabled=true;

  $("replayBtn").disabled=true;

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

  const roundBets={
    ...bets
  };

  lastBets={
    ...roundBets
  };

  const round=
    baccaratRound();

  round.player
    .forEach(
      (
        card,
        i
      )=>{

        setTimeout(
          ()=>{

            $("playerHand")
              .insertAdjacentHTML(
                "beforeend",
                cardHtml(card)
              );

          },
          180*i
        );
      }
    );

  round.banker
    .forEach(
      (
        card,
        i
      )=>{

        setTimeout(
          ()=>{

            $("bankerHand")
              .insertAdjacentHTML(
                "beforeend",
                cardHtml(card)
              );

          },
          180*i+90
        );
      }
    );

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

    const summary=
      await applyResult(
        round,
        roundBets
      );

    const labels={

      player:
        "PLAYER THẮNG",

      banker:
        "BANKER THẮNG",

      tie:
        "HÒA"
    };

    $("resultBanner")
      .textContent=
      labels[
        round.winner
      ]
      +
      " · "
      +
      (
        summary.delta>=0
        ?
        "+"
        :
        ""
      )
      +
      summary.delta
        .toLocaleString(
          "vi-VN"
        )
      +
      " NXC";

    $("resultBanner")
      .classList
      .remove(
        "hidden"
      );

    $("roundState")
      .textContent=
      "KẾT QUẢ";

    flashResult(
      summary.delta
    );

    saveRound(
      round,
      summary
    );

    if(
      summary.delta>0
    ){

      toast(
        "Thắng "
        +
        summary.delta
          .toLocaleString(
            "vi-VN"
          )
        +
        " NXC"
      );

    }else if(
      summary.delta<0
    ){

      toast(
        "Thua "
        +
        Math.abs(
          summary.delta
        )
        .toLocaleString(
          "vi-VN"
        )
        +
        " NXC"
      );

    }else{

      toast(
        "Hòa vốn"
      );
    }

  }catch(err){

    alert(
      "Không thể cập nhật NXC: "
      +
      err.message
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

  $("replayBtn")
    .classList
    .remove(
      "hidden"
    );

  dealing=false;

  $("dealBtn")
    .disabled=false;

  $("clearBets")
    .disabled=false;

  $("replayBtn")
    .disabled=false;
};

loadProfile();
