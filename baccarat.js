const SUPABASE_URL =
  "https://efpfhpwxmzpmmynczbce.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

/* =========================
   TRẠNG THÁI GAME
========================= */

let profile = null;

let selectedChip = 100;

let bets = {
  player: 0,
  tie: 0,
  banker: 0
};

let lastBets = null;

let roundRunning = false;
let bettingOpen = false;

let localHistory = [];

try {
  localHistory = JSON.parse(
    localStorage.getItem("nexora_baccarat_history") || "[]"
  );
} catch {
  localHistory = [];
}


/* =========================
   CÔNG CỤ
========================= */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toast(message) {

  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}

function formatNXC(value) {

  return Number(value || 0)
    .toLocaleString("vi-VN");
}


/* =========================
   TÀI KHOẢN + SỐ DƯ
========================= */

async function loadProfile() {

  const {
    data: { session },
    error: sessionError
  } = await sb.auth.getSession();

  if (sessionError) {
    console.error(sessionError);
    return false;
  }

  if (!session) {
    location.href = "index.html";
    return false;
  }

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select("id,username,role,balance,is_suspended")
    .eq("id", session.user.id)
    .single();

  if (error) {

    console.error(error);

    alert(
      "Không tải được tài khoản: " +
      error.message
    );

    return false;
  }

  if (data.is_suspended) {

    await sb.auth.signOut();

    alert("Tài khoản đang bị khóa.");

    location.href = "index.html";

    return false;
  }

  profile = data;

  renderBalance();

  return true;
}

function renderBalance() {

  if (!profile) return;

  const el = $("walletBalance");

  if (el) {
    el.textContent =
      formatNXC(profile.balance);
  }
}


/* =========================
   HIỂN THỊ CƯỢC
========================= */

function totalBet() {

  return (
    bets.player +
    bets.tie +
    bets.banker
  );
}

function renderBets() {

  if ($("playerBet")) {
    $("playerBet").textContent =
      formatNXC(bets.player);
  }

  if ($("tieBet")) {
    $("tieBet").textContent =
      formatNXC(bets.tie);
  }

  if ($("bankerBet")) {
    $("bankerBet").textContent =
      formatNXC(bets.banker);
  }
}

function clearSelectedZones() {

  document
    .querySelectorAll(".bet-zone")
    .forEach(el => {
      el.classList.remove("selected");
    });
}

function clearBets() {

  bets = {
    player: 0,
    tie: 0,
    banker: 0
  };

  renderBets();

  clearSelectedZones();
}


/* =========================
   CHIP
========================= */

document
  .querySelectorAll(".chip")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        if (!bettingOpen) {
          toast("Đã khóa cược");
          return;
        }

        selectedChip =
          Number(button.dataset.chip);

        document
          .querySelectorAll(".chip")
          .forEach(chip => {
            chip.classList.remove("active");
          });

        button.classList.add("active");
      }
    );
  });


/* =========================
   ĐẶT CƯỢC
========================= */

document
  .querySelectorAll(".bet-zone")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        if (!bettingOpen) {

          toast("Đã khóa cược");

          return;
        }

        if (!profile) return;

        const side =
          String(button.dataset.bet || "")
            .toLowerCase();

        if (
          !["player", "tie", "banker"]
            .includes(side)
        ) {
          return;
        }

        const available =
          Number(profile.balance || 0)
          -
          totalBet();

        if (selectedChip > available) {

          toast("Không đủ NXC");

          return;
        }

        bets[side] += selectedChip;

        renderBets();

        clearSelectedZones();

        button.classList.add("selected");
      }
    );
  });


if ($("clearBets")) {

  $("clearBets").addEventListener(
    "click",
    () => {

      if (!bettingOpen) {

        toast("Đã khóa cược");

        return;
      }

      clearBets();
    }
  );
}


/* =========================
   CHƠI LẠI CƯỢC TRƯỚC
========================= */

if ($("replayBtn")) {

  $("replayBtn").addEventListener(
    "click",
    () => {

      if (!bettingOpen) {

        toast("Đã khóa cược");

        return;
      }

      if (!lastBets) {

        toast("Chưa có cược trước");

        return;
      }

      const needed =
        lastBets.player +
        lastBets.tie +
        lastBets.banker;

      if (
        needed >
        Number(profile?.balance || 0)
      ) {

        toast(
          "Không đủ NXC để chơi lại"
        );

        return;
      }

      bets = {
        ...lastBets
      };

      renderBets();

      toast(
        "Đã đặt lại cược ván trước"
      );
    }
  );
}


/* =========================
   BỘ BÀI
========================= */

const suits = [
  "♠",
  "♥",
  "♦",
  "♣"
];

const ranks = [
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

function drawCard() {

  return {

    rank:
      ranks[
        Math.floor(
          Math.random() *
          ranks.length
        )
      ],

    suit:
      suits[
        Math.floor(
          Math.random() *
          suits.length
        )
      ]
  };
}

function cardValue(card) {

  if (card.rank === "A") {
    return 1;
  }

  if (
    ["10", "J", "Q", "K"]
      .includes(card.rank)
  ) {
    return 0;
  }

  return Number(card.rank);
}

function handTotal(hand) {

  return (
    hand.reduce(
      (sum, card) =>
        sum + cardValue(card),
      0
    ) % 10
  );
}


/* =========================
   LUẬT BACCARAT
========================= */

function baccaratRound() {

  const player = [
    drawCard(),
    drawCard()
  ];

  const banker = [
    drawCard(),
    drawCard()
  ];

  let p = handTotal(player);
  let b = handTotal(banker);

  /* Natural 8 hoặc 9 */

  if (p < 8 && b < 8) {

    let playerThird = null;

    /* PLAYER */

    if (p <= 5) {

      playerThird = drawCard();

      player.push(playerThird);

      p = handTotal(player);
    }

    /* BANKER */

    if (!playerThird) {

      if (b <= 5) {
        banker.push(drawCard());
      }

    } else {

      const thirdValue =
        cardValue(playerThird);

      if (b <= 2) {

        banker.push(drawCard());

      } else if (
        b === 3 &&
        thirdValue !== 8
      ) {

        banker.push(drawCard());

      } else if (
        b === 4 &&
        [2,3,4,5,6,7]
          .includes(thirdValue)
      ) {

        banker.push(drawCard());

      } else if (
        b === 5 &&
        [4,5,6,7]
          .includes(thirdValue)
      ) {

        banker.push(drawCard());

      } else if (
        b === 6 &&
        [6,7]
          .includes(thirdValue)
      ) {

        banker.push(drawCard());
      }
    }
  }

  p = handTotal(player);
  b = handTotal(banker);

  let winner = "tie";

  if (p > b) {
    winner = "player";
  }

  if (b > p) {
    winner = "banker";
  }

  return {
    player,
    banker,
    p,
    b,
    winner
  };
}


/* =========================
   HTML LÁ BÀI
========================= */

function cardHtml(card) {

  const red =
    card.suit === "♥" ||
    card.suit === "♦";

  return `
    <div class="play-card ${red ? "red" : ""}">
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


/* =========================
   KHÓA / MỞ CƯỢC
========================= */

function setBettingEnabled(enabled) {

  bettingOpen = enabled;

  document
    .querySelectorAll(
      ".chip,.bet-zone"
    )
    .forEach(el => {

      el.disabled = !enabled;
    });

  if ($("clearBets")) {
    $("clearBets").disabled =
      !enabled;
  }

  if ($("replayBtn")) {
    $("replayBtn").disabled =
      !enabled;
  }
}


/* =========================
   15 GIÂY NHẬN CƯỢC
========================= */

async function bettingCountdown() {

  setBettingEnabled(true);

  if ($("dealBtn")) {

    $("dealBtn").disabled = true;

    $("dealBtn").textContent =
      "ĐANG NHẬN CƯỢC";
  }

  for (
    let seconds = 15;
    seconds >= 1;
    seconds--
  ) {

    if ($("roundState")) {

      $("roundState").textContent =
        `NHẬN CƯỢC ${seconds}s`;
    }

    await sleep(1000);
  }

  setBettingEnabled(false);

  if ($("roundState")) {

    $("roundState").textContent =
      "KHÓA CƯỢC";
  }

  if ($("dealBtn")) {

    $("dealBtn").textContent =
      "ĐÃ KHÓA CƯỢC";
  }

  await sleep(800);
}


/* =========================
   CẬP NHẬT NXC SUPABASE
========================= */

async function applyResult(
  round,
  roundBets
) {

  const staked =
    roundBets.player +
    roundBets.tie +
    roundBets.banker;

  let returned = 0;

  if (
    round.winner === "player"
  ) {

    returned =
      roundBets.player * 2;

  } else if (
    round.winner === "banker"
  ) {

    returned =
      Math.floor(
        roundBets.banker * 1.95
      );

  } else {

    returned =
      roundBets.tie * 9
      +
      roundBets.player
      +
      roundBets.banker;
  }

  const delta =
    returned - staked;

  const {
    data,
    error
  } = await sb.rpc(
    "game_adjust_balance",
    {
      delta_amount: delta,

      game_name:
        "baccarat",

      game_note:
        `Baccarat ${round.winner.toUpperCase()} | Bet ${staked} | Return ${returned}`
    }
  );

  if (error) {
    throw error;
  }

  /*
    Không tin vào balance cũ.
    Đọc lại trực tiếp Supabase.
  */

  const {
    data: freshProfile,
    error: refreshError
  } = await sb
    .from("profiles")
    .select("balance")
    .eq("id", profile.id)
    .single();

  if (refreshError) {
    throw refreshError;
  }

  profile.balance =
    freshProfile.balance;

  renderBalance();

  return {
    staked,
    returned,
    delta
  };
}


/* =========================
   LỊCH SỬ
========================= */

function saveRound(
  round,
  summary
) {

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

  localHistory =
    localHistory.slice(0, 10);

  localStorage.setItem(
    "nexora_baccarat_history",
    JSON.stringify(localHistory)
  );

  renderHistory();
}

function renderHistory() {

  const list =
    $("historyList");

  if (!list) return;

  if (!localHistory.length) {

    list.innerHTML =
      `<p class="empty">
        Chưa có ván nào.
      </p>`;

    return;
  }

  const labels = {
    player: "PLAYER",
    banker: "BANKER",
    tie: "TIE"
  };

  list.innerHTML =
    localHistory
      .map(item => {

        const positive =
          Number(item.delta) >= 0;

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
                  ${formatNXC(item.staked)}
                  NXC
                </span>

              </div>

            </div>

            <div
              class="
                history-delta
                ${positive ? "plus" : "minus"}
              "
            >

              ${positive ? "+" : ""}
              ${formatNXC(item.delta)}

            </div>

          </div>
        `;
      })
      .join("");
}

if ($("clearHistory")) {

  $("clearHistory").addEventListener(
    "click",
    () => {

      localHistory = [];

      localStorage.removeItem(
        "nexora_baccarat_history"
      );

      renderHistory();
    }
  );
}


/* =========================
   HIỆU ỨNG KẾT QUẢ
========================= */

function flashResult(delta) {

  const table =
    $("tableWrap");

  if (!table) return;

  table.classList.remove(
    "win",
    "loss"
  );

  requestAnimationFrame(() => {

    table.classList.add(
      delta >= 0
        ? "win"
        : "loss"
    );

    setTimeout(() => {

      table.classList.remove(
        "win",
        "loss"
      );

    }, 900);
  });
}


/* =========================
   CHIA BÀI CHẬM
========================= */

async function dealCardsSlowly(
  round
) {

  const playerContainer =
    $("playerCards");

  const bankerContainer =
    $("bankerCards");

  const maxCards =
    Math.max(
      round.player.length,
      round.banker.length
    );

  for (
    let i = 0;
    i < maxCards;
    i++
  ) {

    if (round.player[i]) {

      playerContainer
        .insertAdjacentHTML(
          "beforeend",
          cardHtml(
            round.player[i]
          )
        );

      /*
        Đợi hiệu ứng lật bài
      */

      await sleep(1200);
    }

    if (round.banker[i]) {

      bankerContainer
        .insertAdjacentHTML(
          "beforeend",
          cardHtml(
            round.banker[i]
          )
        );

      await sleep(1200);
    }
  }
}


/* =========================
   MỘT VÁN TỰ ĐỘNG
========================= */

async function runRound() {

  if (roundRunning) return;

  roundRunning = true;

  /*
    Đọc balance mới nhất trước vòng
  */

  await loadProfile();

  await bettingCountdown();

  /*
    Không ai đặt cược
  */

  if (totalBet() <= 0) {

    if ($("roundState")) {
      $("roundState").textContent =
        "KHÔNG CÓ CƯỢC";
    }

    await sleep(1800);

    roundRunning = false;

    runRound();

    return;
  }

  /*
    Kiểm tra balance lần cuối
  */

  if (
    totalBet() >
    Number(profile.balance || 0)
  ) {

    toast("Số dư không đủ");

    clearBets();

    await sleep(1500);

    roundRunning = false;

    runRound();

    return;
  }

  const roundBets = {
    ...bets
  };

  lastBets = {
    ...roundBets
  };

  /*
    Xóa bài cũ
  */

  if ($("playerCards")) {
    $("playerCards").innerHTML = "";
  }

  if ($("bankerCards")) {
    $("bankerCards").innerHTML = "";
  }

  if ($("playerScore")) {
    $("playerScore").textContent = "0";
  }

  if ($("bankerScore")) {
    $("bankerScore").textContent = "0";
  }

  if ($("resultBanner")) {
    $("resultBanner")
      .classList
      .add("hidden");
  }

  if ($("roundState")) {
    $("roundState").textContent =
      "ĐANG CHIA";
  }

  const round =
    baccaratRound();

  /*
    Chia + lật bài chậm
  */

  await dealCardsSlowly(round);

  await sleep(300);

  if ($("playerScore")) {
    $("playerScore").textContent =
      round.p;
  }

  if ($("bankerScore")) {
    $("bankerScore").textContent =
      round.b;
  }

  /*
    Tính NXC
  */

  try {

    const summary =
      await applyResult(
        round,
        roundBets
      );

    const labels = {
      player: "PLAYER THẮNG",
      banker: "BANKER THẮNG",
      tie: "HÒA"
    };

    if ($("resultBanner")) {

      $("resultBanner").textContent =
        labels[round.winner]
        +
        " · "
        +
        (
          summary.delta >= 0
            ? "+"
            : ""
        )
        +
        formatNXC(summary.delta)
        +
        " NXC";

      $("resultBanner")
        .classList
        .remove("hidden");
    }

    if ($("roundState")) {
      $("roundState").textContent =
        "KẾT QUẢ";
    }

    flashResult(
      summary.delta
    );

    saveRound(
      round,
      summary
    );

    if (summary.delta > 0) {

      toast(
        "Thắng "
        +
        formatNXC(summary.delta)
        +
        " NXC"
      );

    } else if (
      summary.delta < 0
    ) {

      toast(
        "Thua "
        +
        formatNXC(
          Math.abs(summary.delta)
        )
        +
        " NXC"
      );

    } else {

      toast("Hòa vốn");
    }

  } catch (error) {

    console.error(error);

    if ($("roundState")) {
      $("roundState").textContent =
        "LỖI";
    }

    alert(
      "Không thể cập nhật NXC: "
      +
      error.message
    );
  }

  /*
    Xóa cược sau ván
  */

  clearBets();

  if ($("replayBtn")) {
    $("replayBtn")
      .classList
      .remove("hidden");
  }

  /*
    Hiện kết quả 3 giây
  */

  await sleep(3000);

  roundRunning = false;

  /*
    Vòng mới
  */

  runRound();
}


/* =========================
   ĐỒNG BỘ KHI QUAY LẠI TAB
========================= */

window.addEventListener(
  "pageshow",
  () => {

    if (profile) {
      loadProfile();
    }
  }
);

window.addEventListener(
  "focus",
  () => {

    if (profile) {
      loadProfile();
    }
  }
);

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState === "visible"
      &&
      profile
    ) {

      loadProfile();
    }
  }
);


/* =========================
   KHỞI ĐỘNG
========================= */

async function startGame() {

  const ok =
    await loadProfile();

  if (!ok) return;

  renderBets();
  renderHistory();

  runRound();
}

startGame();
