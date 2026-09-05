/* =========================================================
   NEXORA BACCARAT ROYALE
   NXC = điểm ảo trong game
========================================================= */
const SUPABASE_URL =
  "https://efpfhpwxmzpmmynczbce.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);


/* =========================================================
   TRẠNG THÁI GAME
========================================================= */

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


/* =========================================================
   CÔNG CỤ
========================================================= */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNXC(value) {
  return Number(value || 0).toLocaleString("vi-VN");
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


/* =========================================================
   PROFILE + ĐỒNG BỘ BALANCE
========================================================= */

async function loadProfile() {
  try {

    const {
      data: { session },
      error: sessionError
    } = await sb.auth.getSession();

    if (sessionError) {
      console.error(
        "Lỗi lấy session:",
        sessionError
      );

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
      .select(
        "id, username, role, balance, is_suspended"
      )
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error(
        "Lỗi đọc profile:",
        error
      );

      if ($("roundState")) {
        $("roundState").textContent =
          "LỖI TÀI KHOẢN";
      }

      return false;
    }

    if (!data) {
      console.error(
        "Không tìm thấy profile"
      );

      return false;
    }

    if (data.is_suspended) {

      await sb.auth.signOut();

      alert(
        "Tài khoản đang bị khóa."
      );

      location.href = "index.html";

      return false;
    }

    profile = data;

    renderBalance();

    console.log(
      "NEXORA PROFILE:",
      profile
    );

    return true;

  } catch (error) {

    console.error(
      "loadProfile error:",
      error
    );

    return false;
  }
}


function renderBalance() {

  const el = $("gameBalance");

  if (!el) return;

  if (!profile) {
    el.textContent = "0";
    return;
  }

  el.textContent =
    formatNXC(profile.balance);
}


async function syncBalance() {

  try {

    const {
      data: { session }
    } = await sb.auth.getSession();

    if (!session) return;

    const {
      data,
      error
    } = await sb
      .from("profiles")
      .select("balance")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error(
        "Lỗi đồng bộ balance:",
        error
      );

      return;
    }

    if (!profile) {
      profile = {
        id: session.user.id,
        balance: Number(data.balance || 0)
      };
    } else {
      profile.balance =
        Number(data.balance || 0);
    }

    renderBalance();

  } catch (error) {

    console.error(
      "syncBalance error:",
      error
    );
  }
}


/* =========================================================
   BET
========================================================= */

function totalBet() {
  return (
    Number(bets.player) +
    Number(bets.tie) +
    Number(bets.banker)
  );
}


function renderBets() {

  if ($("betPlayer")) {
    $("betPlayer").textContent =
      formatNXC(bets.player) + " NXC";
  }

  if ($("betTie")) {
    $("betTie").textContent =
      formatNXC(bets.tie) + " NXC";
  }

  if ($("betBanker")) {
    $("betBanker").textContent =
      formatNXC(bets.banker) + " NXC";
  }
}


function clearSelectedZones() {

  document
    .querySelectorAll(".bet-zone")
    .forEach(zone => {
      zone.classList.remove("selected");
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


/* =========================================================
   CHIP
========================================================= */

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


/* =========================================================
   CLICK PLAYER / TIE / BANKER
========================================================= */

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

        if (!profile) {
          toast("Chưa tải được tài khoản");
          return;
        }

        const side =
          String(
            button.dataset.bet || ""
          ).toLowerCase();

        if (
          ![
            "player",
            "tie",
            "banker"
          ].includes(side)
        ) {
          return;
        }

        const available =
          Number(profile.balance || 0)
          -
          totalBet();

        if (
          selectedChip >
          available
        ) {

          toast("Không đủ NXC");
          return;
        }

        bets[side] +=
          selectedChip;

        renderBets();

        clearSelectedZones();

        button.classList.add(
          "selected"
        );
      }
    );
  });


/* =========================================================
   XÓA CƯỢC
========================================================= */

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


/* =========================================================
   CHƠI LẠI CƯỢC TRƯỚC
========================================================= */

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
        Number(lastBets.player) +
        Number(lastBets.tie) +
        Number(lastBets.banker);

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
        player:
          Number(lastBets.player),

        tie:
          Number(lastBets.tie),

        banker:
          Number(lastBets.banker)
      };

      renderBets();

      toast(
        "Đã đặt lại cược ván trước"
      );
    }
  );
}


/* =========================================================
   BỘ BÀI
========================================================= */

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

  const total =
    hand.reduce(
      (sum, card) =>
        sum + cardValue(card),
      0
    );

  return total % 10;
}


/* =========================================================
   LUẬT BACCARAT
========================================================= */

function createBaccaratRound() {

  const player = [
    drawCard(),
    drawCard()
  ];

  const banker = [
    drawCard(),
    drawCard()
  ];

  let playerTotal =
    handTotal(player);

  let bankerTotal =
    handTotal(banker);

  /*
    NATURAL 8 / 9
  */

  if (
    playerTotal < 8 &&
    bankerTotal < 8
  ) {

    let playerThirdCard = null;

    /*
      PLAYER:
      0 - 5 rút
      6 - 7 đứng
    */

    if (playerTotal <= 5) {

      playerThirdCard =
        drawCard();

      player.push(
        playerThirdCard
      );
    }

    /*
      BANKER
    */

    if (!playerThirdCard) {

      if (bankerTotal <= 5) {
        banker.push(
          drawCard()
        );
      }

    } else {

      const third =
        cardValue(
          playerThirdCard
        );

      if (bankerTotal <= 2) {

        banker.push(
          drawCard()
        );

      } else if (
        bankerTotal === 3 &&
        third !== 8
      ) {

        banker.push(
          drawCard()
        );

      } else if (
        bankerTotal === 4 &&
        [2,3,4,5,6,7]
          .includes(third)
      ) {

        banker.push(
          drawCard()
        );

      } else if (
        bankerTotal === 5 &&
        [4,5,6,7]
          .includes(third)
      ) {

        banker.push(
          drawCard()
        );

      } else if (
        bankerTotal === 6 &&
        [6,7]
          .includes(third)
      ) {

        banker.push(
          drawCard()
        );
      }
    }
  }

  playerTotal =
    handTotal(player);

  bankerTotal =
    handTotal(banker);

  let winner = "tie";

  if (
    playerTotal >
    bankerTotal
  ) {
    winner = "player";
  }

  if (
    bankerTotal >
    playerTotal
  ) {
    winner = "banker";
  }

  return {
    player,
    banker,
    playerTotal,
    bankerTotal,
    winner
  };
}


/* =========================================================
   HTML LÁ BÀI
========================================================= */

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


/* =========================================================
   MỞ / KHÓA BET
========================================================= */

function setBettingEnabled(enabled) {

  bettingOpen = enabled;

  document
    .querySelectorAll(
      ".chip, .bet-zone"
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


/* =========================================================
   COUNTDOWN 15 GIÂY
========================================================= */

async function bettingCountdown() {

  await syncBalance();

  setBettingEnabled(true);

  if ($("dealBtn")) {

    $("dealBtn").disabled =
      true;

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

  await sleep(700);
}


/* =========================================================
   CẬP NHẬT NXC TRÊN SUPABASE
========================================================= */

async function applyResult(
  round,
  roundBets
) {

  const staked =
    Number(roundBets.player) +
    Number(roundBets.tie) +
    Number(roundBets.banker);

  let returned = 0;

  /*
    PLAYER thắng:
    cược 100 => nhận 200
    lợi nhuận +100
  */

  if (
    round.winner === "player"
  ) {

    returned =
      Number(
        roundBets.player
      ) * 2;
  }

  /*
    BANKER thắng:
    lợi nhuận 0.95 : 1
  */

  else if (
    round.winner === "banker"
  ) {

    returned =
      Math.floor(
        Number(
          roundBets.banker
        ) * 1.95
      );
  }

  /*
    TIE:
    Tie 8:1
    Player/Banker được hoàn cược
  */

  else {

    returned =
      Number(roundBets.tie) * 9
      +
      Number(roundBets.player)
      +
      Number(roundBets.banker);
  }

  const delta =
    returned - staked;

  /*
    RPC này chỉ cộng/trừ phần
    lời/lỗ ròng vào profiles.balance
  */

  const {
    error
  } = await sb.rpc(
    "game_adjust_balance",
    {
      delta_amount: delta,

      game_name:
        "baccarat",

      game_note:
        `Baccarat ${round.winner} | Bet ${staked} | Return ${returned}`
    }
  );

  if (error) {
    throw error;
  }

  /*
    Đọc lại balance mới nhất
    từ Supabase
  */

  await syncBalance();

  return {
    staked,
    returned,
    delta
  };
}


/* =========================================================
   LỊCH SỬ
========================================================= */

function saveRound(
  round,
  summary
) {

  localHistory.unshift({

    winner:
      round.winner,

    player:
      round.playerTotal,

    banker:
      round.bankerTotal,

    delta:
      summary.delta,

    staked:
      summary.staked,

    at:
      Date.now()
  });

  localHistory =
    localHistory.slice(
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


function renderHistory() {

  const list =
    $("roundHistory");

  if (!list) return;

  if (
    localHistory.length === 0
  ) {

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
          Number(
            item.delta
          ) >= 0;

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


/* =========================================================
   HIỆU ỨNG THẮNG / THUA
========================================================= */

function flashResult(delta) {

  const table =
    $("tableWrap");

  if (!table) return;

  table.classList.remove(
    "win",
    "loss"
  );

  requestAnimationFrame(
    () => {

      table.classList.add(
        delta >= 0
          ? "win"
          : "loss"
      );

      setTimeout(
        () => {

          table.classList.remove(
            "win",
            "loss"
          );

        },
        900
      );
    }
  );
}


/* =========================================================
   CHIA BÀI CHẬM
========================================================= */

async function dealCardsSlowly(
  round
) {

  const playerContainer =
    $("playerHand");

  const bankerContainer =
    $("bankerHand");

  if (
    !playerContainer ||
    !bankerContainer
  ) {
    return;
  }

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

      await sleep(1100);
    }

    if (round.banker[i]) {

      bankerContainer
        .insertAdjacentHTML(
          "beforeend",
          cardHtml(
            round.banker[i]
          )
        );

      await sleep(1100);
    }
  }
}


/* =========================================================
   RESET BÀN TRƯỚC VÁN
========================================================= */

function resetTable() {

  if ($("playerHand")) {
    $("playerHand").innerHTML = "";
  }

  if ($("bankerHand")) {
    $("bankerHand").innerHTML = "";
  }

  if ($("playerScore")) {
    $("playerScore").textContent =
      "0";
  }

  if ($("bankerScore")) {
    $("bankerScore").textContent =
      "0";
  }

  if ($("resultBanner")) {

    $("resultBanner")
      .classList
      .add("hidden");
  }
}


/* =========================================================
   CHẠY 1 VÁN
========================================================= */

async function runRound() {

  if (roundRunning) return;

  roundRunning = true;

  /*
    Đồng bộ tiền trước ván
  */

  const loaded =
    await loadProfile();

  if (!loaded) {

    roundRunning = false;

    if ($("roundState")) {
      $("roundState").textContent =
        "LỖI TÀI KHOẢN";
    }

    return;
  }

  /*
    15 giây đặt cược
  */

  await bettingCountdown();

  /*
    Không đặt cược
  */

  if (totalBet() <= 0) {

    if ($("roundState")) {
      $("roundState").textContent =
        "KHÔNG CÓ CƯỢC";
    }

    await sleep(1500);

    roundRunning = false;

    runRound();

    return;
  }

  /*
    Đồng bộ balance trước khi
    chấp nhận cược
  */

  await syncBalance();

  if (
    totalBet() >
    Number(
      profile.balance || 0
    )
  ) {

    toast(
      "Số dư không đủ"
    );

    clearBets();

    await sleep(1500);

    roundRunning = false;

    runRound();

    return;
  }

  const roundBets = {
    player:
      Number(bets.player),

    tie:
      Number(bets.tie),

    banker:
      Number(bets.banker)
  };

  lastBets = {
    ...roundBets
  };

  resetTable();

  if ($("roundState")) {
    $("roundState").textContent =
      "ĐANG CHIA";
  }

  const round =
    createBaccaratRound();

  /*
    Chia bài
  */

  await dealCardsSlowly(
    round
  );

  /*
    Hiện điểm
  */

  if ($("playerScore")) {

    $("playerScore").textContent =
      round.playerTotal;
  }

  if ($("bankerScore")) {

    $("bankerScore").textContent =
      round.bankerTotal;
  }

  await sleep(400);

  /*
    Cập nhật balance
  */

  try {

    const summary =
      await applyResult(
        round,
        roundBets
      );

    const labels = {
      player:
        "PLAYER THẮNG",

      banker:
        "BANKER THẮNG",

      tie:
        "HÒA"
    };

    if ($("resultBanner")) {

      $("resultBanner").textContent =
        labels[round.winner]
        +
        " · "
        +
        (
          summary.delta > 0
            ? "+"
            : ""
        )
        +
        formatNXC(
          summary.delta
        )
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

    if (
      summary.delta > 0
    ) {

      toast(
        "Thắng +"
        +
        formatNXC(
          summary.delta
        )
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
          Math.abs(
            summary.delta
          )
        )
        +
        " NXC"
      );

    } else {

      toast(
        "Hòa vốn"
      );
    }

  } catch (error) {

    console.error(
      "Lỗi kết quả:",
      error
    );

    if ($("roundState")) {
      $("roundState").textContent =
        "LỖI";
    }

    alert(
      "Không thể cập nhật NXC: "
      +
      (
        error.message ||
        "Lỗi không xác định"
      )
    );
  }

  /*
    Xóa cược của ván vừa rồi
  */

  clearBets();

  if ($("replayBtn")) {

    $("replayBtn")
      .classList
      .remove("hidden");
  }

  /*
    Giữ kết quả 3 giây
  */

  await sleep(3000);

  roundRunning = false;

  /*
    Ván tiếp theo
  */

  runRound();
}


/* =========================================================
   ĐỒNG BỘ KHI QUAY LẠI TRANG
========================================================= */

window.addEventListener(
  "pageshow",
  () => {
    syncBalance();
  }
);

window.addEventListener(
  "focus",
  () => {
    syncBalance();
  }
);

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState
      ===
      "visible"
    ) {
      syncBalance();
    }
  }
);


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

async function startGame() {

  if ($("gameBalance")) {
    $("gameBalance").textContent =
      "...";
  }

  const ok =
    await loadProfile();

  if (!ok) {

    if ($("gameBalance")) {
      $("gameBalance").textContent =
        "0";
    }

    return;
  }

  renderBalance();
  renderBets();
  renderHistory();

  runRound();
}

startGame();
