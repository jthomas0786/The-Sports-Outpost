(() => {
  const shell = document.querySelector('.app-shell');
  const toast = document.querySelector('.route-toast');
  const routeButtons = [...document.querySelectorAll('[data-route]')];
  const leagueButtons = [...document.querySelectorAll('[data-league]')];
  const jumpButtons = [...document.querySelectorAll('[data-route-jump]')];

  const labels = {
    home:'Home',
    live:'Live Center',
    research:'Research',
    models:'Models',
    props:'Player Props',
    parlays:'Parlay Lab',
    community:'Community',
    leaderboard:'Leaderboard',
    profile:'Profile'
  };

  function notify(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__tso2Toast);
    window.__tso2Toast = setTimeout(() => toast.classList.remove('show'), 1700);
  }

  function setRoute(route){
    routeButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === route));
    if(route !== 'home'){
      notify(labels[route] + ' shell is next in the TSO 2.0 migration.');
    }
    history.replaceState(null, '', '#' + route);
  }

  function setLeague(league){
    shell.dataset.league = league;
    leagueButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.league === league));
    const label = league === 'all' ? 'All Sports' : league.toUpperCase();
    notify('Sport context: ' + label + ' — same design system, different data.');
  }

  routeButtons.forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
  jumpButtons.forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.routeJump)));
  leagueButtons.forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.league)));

  document.querySelector('.search-trigger')?.addEventListener('click', () => {
    notify('Global command search will span players, teams, games, props and models.');
  });

  document.querySelectorAll('.model-card .button').forEach(btn => btn.addEventListener('click', () => {
    notify('Player analysis drawer — shared component across every sport.');
  }));

  const initialRoute = location.hash.replace('#','');
  if(labels[initialRoute]) setRoute(initialRoute);
})();