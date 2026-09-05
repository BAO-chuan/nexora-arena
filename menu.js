(() => {

  const SUPABASE_URL =
    "https://efpfhpwxmzpmmynczbce.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";


  const menuSb =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  function formatNxc(value){

    return Number(value || 0)
      .toLocaleString("vi-VN");
  }


  function createMenu(){

    if(
      document.getElementById(
        "nxMenuOverlay"
      )
    ){
      return;
    }


    const overlay =
      document.createElement("div");

    overlay.id =
      "nxMenuOverlay";

    overlay.className =
      "nx-menu-overlay";


    overlay.innerHTML = `

      <aside
        class="nx-menu"
        id="nxMenu"
      >

        <div class="nx-menu-head">

          <div class="nx-menu-brand">

            <div class="nx-menu-logo">
              N
            </div>

            <div>
              <strong>NEXORA</strong>

              <small id="nxMenuUsername">
                Player
              </small>
            </div>

          </div>

          <button
            id="nxMenuClose"
            class="nx-menu-close"
            type="button"
          >
            ×
          </button>

        </div>


        <div class="nx-menu-wallet">

          <span>SỐ DƯ NXC</span>

          <strong id="nxMenuBalance">
            0 NXC
          </strong>

        </div>


        <nav class="nx-menu-links">

          <a
            class="nx-menu-link"
            href="index.html#home"
          >
            <span>⌂</span>
            Trang chủ
          </a>


          <a
            class="nx-menu-link"
            href="baccarat.html"
          >
            <span>♠</span>
            Baccarat Royale
          </a>


          <a
            class="nx-menu-link"
            href="index.html#nxcWallet"
          >
            <span>◆</span>
            Ví NXC
          </a>


          <a
            class="nx-menu-link"
            href="index.html#leaderboard"
          >
            <span>★</span>
            Bảng xếp hạng
          </a>


          <a
            class="nx-menu-link"
            href="index.html#account"
          >
            <span>●</span>
            Tài khoản
          </a>


          <a
            id="nxAdminLink"
            class="
              nx-menu-link
              nx-admin-link
            "
            href="index.html#adminArea"
            hidden
          >
            <span>⚙</span>
            Quản trị
          </a>

        </nav>


        <div class="nx-menu-footer">

          <button
            id="nxMenuLogout"
            class="
              nx-menu-link
              nx-menu-logout
            "
            type="button"
          >
            <span>↗</span>
            Đăng xuất
          </button>

        </div>

      </aside>
    `;


    document.body.appendChild(
      overlay
    );


    /*
      Nút ☰
    */

    const button =
      document.createElement("button");

    button.id =
      "nxMenuButton";

    button.className =
      "nx-menu-btn";

    button.type =
      "button";

    button.setAttribute(
      "aria-label",
      "Mở menu"
    );

    button.textContent =
      "☰";


    /*
      Trên lobby:
      đặt vào top-actions.

      Trên Baccarat:
      đặt vào topbar.
    */

    const topActions =
      document.querySelector(
        ".top-actions"
      );

    const gameTopbar =
      document.querySelector(
        ".game-topbar"
      );


    if(topActions){

      topActions.prepend(
        button
      );

    }else if(gameTopbar){

      gameTopbar.prepend(
        button
      );

    }else{

      document.body.prepend(
        button
      );
    }


    button.onclick =
      openMenu;


    document
      .getElementById(
        "nxMenuClose"
      )
      .onclick =
        closeMenu;


    overlay.addEventListener(
      "click",
      event => {

        if(event.target === overlay){
          closeMenu();
        }
      }
    );


    overlay
      .querySelectorAll(
        ".nx-menu-link[href]"
      )
      .forEach(link => {

        link.addEventListener(
          "click",
          closeMenu
        );

      });


    document
      .getElementById(
        "nxMenuLogout"
      )
      .onclick =
        logoutFromMenu;
  }


  function openMenu(){

    document
      .getElementById(
        "nxMenuOverlay"
      )
      ?.classList.add("open");

    document.body.classList.add(
      "nx-menu-open"
    );

    loadMenuProfile();
  }


  function closeMenu(){

    document
      .getElementById(
        "nxMenuOverlay"
      )
      ?.classList.remove("open");

    document.body.classList.remove(
      "nx-menu-open"
    );
  }


  async function loadMenuProfile(){

    try{

      const {
        data: { session }
      } =
        await menuSb.auth.getSession();


      if(!session){
        return;
      }


      const {
        data,
        error
      } =
        await menuSb
          .from("profiles")
          .select(
            "username,role,balance"
          )
          .eq(
            "id",
            session.user.id
          )
          .single();


      if(error){
        throw error;
      }


      const username =
        document.getElementById(
          "nxMenuUsername"
        );

      const balance =
        document.getElementById(
          "nxMenuBalance"
        );

      const admin =
        document.getElementById(
          "nxAdminLink"
        );


      if(username){

        username.textContent =
          data.username
          ||
          session.user.email;
      }


      if(balance){

        balance.textContent =
          formatNxc(
            data.balance
          )
          +
          " NXC";
      }


      if(admin){

        admin.hidden =
          data.role !== "admin";
      }


    }catch(error){

      console.error(
        "NEXORA menu:",
        error
      );
    }
  }


  async function logoutFromMenu(){

    try{

      await menuSb.auth.signOut();

      window.location.href =
        "index.html";

    }catch(error){

      console.error(
        "Logout:",
        error
      );
    }
  }


  /*
    Khởi động menu
  */

  createMenu();
  loadMenuProfile();


  window.addEventListener(
    "pageshow",
    loadMenuProfile
  );


  window.addEventListener(
    "focus",
    loadMenuProfile
  );

})();
