const SUPABASE_URL =
  "https://efpfhpwxmzpmmynczbce.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function refreshSession() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    showLoggedOut();
    return;
  }

  try {
    const profile = await getProfile(session.user.id);

    if (profile?.is_suspended) {
      await supabaseClient.auth.signOut();
      alert("Tài khoản này đang bị khóa.");
      showLoggedOut();
      return;
    }

    showLoggedIn(session.user, profile);
    await loadTransactions(session.user.id);

    if (profile?.role === "admin") {
      await loadAdminPlayers();
    }
  } catch (err) {
    console.error(err);
    setStatus(
      "Đã kết nối Supabase nhưng chưa đọc được hồ sơ: " +
        err.message,
      true
    );
  }
}

function setStatus(message, isError = false) {
  const el = $("connectionStatus");

  if (el) {
    el.textContent = message;
    el.style.opacity = "1";

    if (isError) {
      el.dataset.error = "true";
    }
  }
}

function showLoggedOut() {
  document.body.classList.remove(
    "logged-in",
    "is-admin"
  );

  const auth = $("authArea");
  const account = $("accountArea");
  const admin = $("adminArea");

  if (auth) auth.hidden = false;
  if (account) account.hidden = true;
  if (admin) admin.hidden = true;

  setStatus("Đã cấu hình Supabase ✓");
}

function showLoggedIn(user, profile) {
  document.body.classList.add("logged-in");

  if (profile?.role === "admin") {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }

  if ($("authArea")) {
    $("authArea").hidden = true;
  }

  if ($("accountArea")) {
    $("accountArea").hidden = false;
  }

  if ($("adminArea")) {
    $("adminArea").hidden =
      profile?.role !== "admin";
  }

  if ($("profileUsername")) {
    $("profileUsername").textContent =
      profile?.username || "Player";
  }

  if ($("profileEmail")) {
    $("profileEmail").textContent =
      user.email || "";
  }

  if ($("profileRole")) {
    $("profileRole").textContent =
      profile?.role || "player";
  }

  if ($("profileBalance")) {
    $("profileBalance").textContent =
      Number(profile?.balance || 0)
        .toLocaleString("vi-VN") + " NXC";
  }

  setStatus("Đã kết nối Supabase ✓");
}

async function signUp(
  username,
  email,
  password
) {
  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

  if (error) throw error;

  return data;
}

async function signIn(
  email,
  password
) {
  const { data, error } =
    await supabaseClient.auth
      .signInWithPassword({
        email,
        password,
      });

  if (error) throw error;

  return data;
}

async function loadTransactions(userId) {
  const el = $("transactionList");

  if (!el) return;

  const { data, error } =
    await supabaseClient
      .from("coin_transactions")
      .select("*")
      .eq("player_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(30);

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    el.innerHTML =
      "<p>Chưa có giao dịch.</p>";
    return;
  }

  el.innerHTML = data
    .map((t) => {
      const amount =
        Number(t.amount);

      return `
        <div class="transaction-row">
          <strong>
            ${amount > 0 ? "+" : ""}
            ${amount.toLocaleString("vi-VN")}
            NXC
          </strong>

          <span>
            ${escapeHtml(
              t.reason ||
              t.type ||
              ""
            )}
          </span>
        </div>
      `;
    })
    .join("");
}

async function loadAdminPlayers(
  search = ""
) {
  const el = $("playerList");

  if (!el) return;

  let query = supabaseClient
    .from("profiles")
    .select(
      "id,username,role,balance,is_suspended,created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (search.trim()) {
    query = query.ilike(
      "username",
      `%${search.trim()}%`
    );
  }

  const { data, error } =
    await query;

  if (error) {
    el.innerHTML =
      `<p>Không tải được danh sách: ${
        escapeHtml(error.message)
      }</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML =
      "<p>Không tìm thấy người chơi.</p>";
    return;
  }

  el.innerHTML = data
    .map((p) => {
      const balance =
        Number(p.balance || 0)
          .toLocaleString("vi-VN");

      return `
        <div class="player-row">

          <div>
            <strong>
              ${escapeHtml(
                p.username || "Player"
              )}
            </strong>

            <small>
              ${balance} NXC ·
              ${
                p.is_suspended
                  ? "Đã khóa"
                  : p.role
              }
            </small>
          </div>

          ${
            p.role !== "admin"
              ? `
              <div class="player-actions">

                <button
                  type="button"
                  onclick="
                    adminAdjust(
                      '${p.id}',
                      1000
                    )
                  "
                >
                  +1K
                </button>

                <button
                  type="button"
                  onclick="
                    adminAdjust(
                      '${p.id}',
                      -1000
                    )
                  "
                >
                  -1K
                </button>

                <button
                  type="button"
                  onclick="
                    adminSuspend(
                      '${p.id}',
                      ${!p.is_suspended}
                    )
                  "
                >
                  ${
                    p.is_suspended
                      ? "Mở khóa"
                      : "Khóa"
                  }
                </button>

              </div>
              `
              : "<span>ADMIN</span>"
          }

        </div>
      `;
    })
    .join("");
}

window.adminAdjust =
  async function (
    playerId,
    amount
  ) {
    const reason = prompt(
      "Lý do điều chỉnh NXC:",
      "Admin adjustment"
    );

    if (reason === null) return;

    const { error } =
      await supabaseClient.rpc(
        "admin_adjust_balance",
        {
          target_player_id:
            playerId,

          delta_amount:
            amount,

          adjustment_reason:
            reason ||
            "Admin adjustment",
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminPlayers(
      $("playerSearch")?.value || ""
    );
  };

window.adminSuspend =
  async function (
    playerId,
    suspended
  ) {
    const ok = confirm(
      suspended
        ? "Khóa tài khoản này?"
        : "Mở khóa tài khoản này?"
    );

    if (!ok) return;

    const { error } =
      await supabaseClient.rpc(
        "admin_set_suspended",
        {
          target_player_id:
            playerId,

          suspended:
            suspended,
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminPlayers(
      $("playerSearch")?.value || ""
    );
  };

function escapeHtml(value) {
  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c]
    );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const signupForm =
      $("signupForm");

    const loginForm =
      $("loginForm");

    signupForm?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();

        const username =
          $("signupUsername")
            ?.value.trim();

        const email =
          $("signupEmail")
            ?.value.trim();

        const password =
          $("signupPassword")
            ?.value;

        try {
          const data =
            await signUp(
              username,
              email,
              password
            );

          if (!data.session) {
            alert(
              "Tạo tài khoản thành công. " +
              "Hãy kiểm tra email để xác nhận tài khoản."
            );
          } else {
            alert(
              "Tạo tài khoản thành công!"
            );
          }

          await refreshSession();
        } catch (err) {
          alert(err.message);
        }
      }
    );

    loginForm?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();

        try {
          await signIn(
            $("loginEmail")
              ?.value.trim(),

            $("loginPassword")
              ?.value
          );

          await refreshSession();
        } catch (err) {
          alert(err.message);
        }
      }
    );

    $("logoutBtn")
      ?.addEventListener(
        "click",
        async () => {
          await supabaseClient
            .auth.signOut();

          showLoggedOut();
        }
      );

    $("playerSearch")
      ?.addEventListener(
        "input",
        (e) => {
          loadAdminPlayers(
            e.target.value
          );
        }
      );

    supabaseClient.auth
      .onAuthStateChange(
        () => {
          setTimeout(
            refreshSession,
            0
          );
        }
      );

    refreshSession();
  }
);
