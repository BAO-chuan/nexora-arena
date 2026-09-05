
/* LS79win Home Motion v1 */
(function(){
  const home = document.getElementById("home");
  if(!home) return;

  const reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealTargets = [
    ...home.querySelectorAll(
      ".v3-promo, .announcement-bar, .v3-account-strip, .quick-actions, #games, .mini-promo, .game-card"
    )
  ];

  revealTargets.forEach((el, i) => {
    el.classList.add("home-reveal");
    el.dataset.revealDelay = String((i % 4) + 1);
  });

  if(reduced || !("IntersectionObserver" in window)){
    revealTargets.forEach(el => el.classList.add("is-visible"));
  }else{
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.08, rootMargin:"0px 0px -20px 0px"});

    revealTargets.forEach(el => observer.observe(el));
  }

  function watchBalance(id){
    const el = document.getElementById(id);
    if(!el) return;

    let last = el.textContent;
    const obs = new MutationObserver(() => {
      const next = el.textContent;
      if(next !== last){
        last = next;
        if(!reduced){
          el.classList.remove("ls79-balance-pop");
          void el.offsetWidth;
          el.classList.add("ls79-balance-pop");
        }
      }
    });
    obs.observe(el,{childList:true,characterData:true,subtree:true});
  }

  ["heroBalance","walletChip","headerBalance"].forEach(watchBalance);
})();
