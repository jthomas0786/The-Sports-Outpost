(() => {
  const shell = document.querySelector('.app-shell');
  const toast = document.querySelector('.route-toast');
  const pageContent = document.getElementById('pageContent');
  const homeHTML = pageContent.innerHTML;
  const profileMenu = document.querySelector('.profile-menu');
  const profileButton = profileMenu?.querySelector('.profile-pill');
  const profileDropdown = profileMenu?.querySelector('.profile-dropdown');
  const OWNER_HANDLE = 'justcallme_jt';
  let currentRoute = 'home';
  let currentLeague = 'all';

  const normalizeHandle = value => String(value || '').trim().replace(/^@/, '').toLowerCase();
  const currentUserHandle = () => normalizeHandle(
    window.TSO_CURRENT_USER?.username ||
    window.TSO_CURRENT_USER?.handle ||
    document.querySelector('.app-shell')?.dataset.userHandle ||
    profileMenu?.dataset.userHandle ||
    ''
  );
  const isOwner = () => currentUserHandle() === OWNER_HANDLE;

  function syncOwnerTools(){
    document.querySelectorAll('[data-owner-only]').forEach(item => {
      item.hidden = !isOwner();
      item.setAttribute('aria-hidden', String(!isOwner()));
    });
  }

  function closeProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    profileMenu.classList.remove('is-open');
    profileDropdown.hidden = true;
    profileButton.setAttribute('aria-expanded','false');
  }

  function toggleProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    const opening = profileDropdown.hidden;
    profileMenu.classList.toggle('is-open', opening);
    profileDropdown.hidden = !opening;
    profileButton.setAttribute('aria-expanded', String(opening));
  }

  const labels = {
    home:'Home', live:'Live Center', research:'Research', models:'Models',
    props:'Player Props', parlays:'Parlay Lab', community:'Community',
    leaderboard:'Leaderboard', profile:'Profile'
  };

  function notify(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__tso2Toast);
    window.__tso2Toast = setTimeout(() => toast.classList.remove('show'), 1700);
  }

  function bindDynamic(){
    document.querySelectorAll('[data-route-jump]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.routeJump)));
    document.querySelectorAll('[data-inline-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.inlineLeague)));
    document.querySelectorAll('.model-card .button,.prop-row,.game-row').forEach(btn => btn.addEventListener('click', () => {
      notify('Shared detail drawer pattern — same interaction across every sport.');
    }));

    document.querySelectorAll('.parlays-mode-tabs button').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.parlays-mode-tabs button').forEach(x => x.classList.toggle('is-active', x === btn));
      notify(btn.querySelector('b')?.textContent + ' builder selected.');
    }));

    document.querySelectorAll('.parlay-leg-count button').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.parlay-leg-count button').forEach(x => x.classList.toggle('is-active', x === btn));
      notify(btn.textContent.trim() + '-leg target selected.');
    }));

    document.querySelectorAll('.parlay-add-leg,.parlay-suggestion-card').forEach(btn => btn.addEventListener('click', () => {
      notify('Leg picker will use exact selections from the live Props feed.');
    }));

    document.querySelectorAll('.parlay-replacement-card').forEach(btn => btn.addEventListener('click', () => {
      notify('Replacement preview selected — exact-line recalculation will run here.');
    }));

    document.querySelectorAll('.parlay-book-row button').forEach(btn => btn.addEventListener('click', () => {
      notify('Sportsbook handoff will use the exact selection links supplied by the odds feed.');
    }));

    document.querySelectorAll('.parlay-leg-remove').forEach(btn => btn.addEventListener('click', () => {
      notify('Preview interaction only — live builder state comes with the data migration.');
    }));
  }

  function renderRoute(){
    if(currentRoute === 'home') pageContent.innerHTML = homeHTML;
    else if(window.TSO2Pages?.[currentRoute]) pageContent.innerHTML = window.TSO2Pages[currentRoute](currentLeague);
    bindDynamic();
    window.scrollTo({top:0,behavior:'instant'});
  }

  function syncNav(){
    document.querySelectorAll('[data-route]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === currentRoute));
    document.querySelectorAll('[data-league]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.league === currentLeague));
  }

  function setRoute(route){
    if(!labels[route]) return;
    closeProfileMenu();
    currentRoute = route;
    syncNav();
    renderRoute();
    history.replaceState(null, '', '#' + route);
  }

  function setLeague(league){
    closeProfileMenu();
    currentLeague = league;
    shell.dataset.league = league;
    syncNav();
    renderRoute();
    const label = league === 'all' ? 'All Sports' : league.toUpperCase();
    notify('Sport context: ' + label + ' — layout stays consistent.');
  }

  document.querySelectorAll('[data-route]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
  document.querySelectorAll('[data-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.league)));

  document.querySelector('.search-trigger')?.addEventListener('click', () => {
    notify('Global command search: players, teams, games, props and models.');
  });

  profileButton?.addEventListener('click', event => {
    event.stopPropagation();
    toggleProfileMenu();
  });

  profileDropdown?.addEventListener('click', event => event.stopPropagation());

  document.querySelector('[data-profile-route="profile"]')?.addEventListener('click', () => {
    closeProfileMenu();
    setRoute('profile');
  });

  document.querySelectorAll('[data-owner-only]').forEach(item => {
    item.addEventListener('click', event => {
      if(isOwner()) return;
      event.preventDefault();
      closeProfileMenu();
      notify('Brand Lab is available to the owner account only.');
    });
  });

  document.addEventListener('click', event => {
    if(profileMenu && !profileMenu.contains(event.target)) closeProfileMenu();
  });

  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') closeProfileMenu();
  });

  syncOwnerTools();

  const initialRoute = location.hash.replace('#','');
  currentRoute = labels[initialRoute] ? initialRoute : 'home';
  syncNav();
  renderRoute();
})();