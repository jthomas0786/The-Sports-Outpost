(() => {
  const shell = document.querySelector('.app-shell');
  const toast = document.querySelector('.route-toast');
  const pageContent = document.getElementById('pageContent');
  const homeHTML = pageContent.innerHTML;
  let currentRoute = 'home';
  let currentLeague = 'all';

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
    currentRoute = route;
    syncNav();
    renderRoute();
    history.replaceState(null, '', '#' + route);
  }

  function setLeague(league){
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

  document.querySelector('.profile-mini')?.addEventListener('click', () => setRoute('profile'));

  const initialRoute = location.hash.replace('#','');
  currentRoute = labels[initialRoute] ? initialRoute : 'home';
  syncNav();
  renderRoute();
})();