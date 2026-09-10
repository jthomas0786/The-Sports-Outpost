import { ensureNflPlaystageV886BStyles } from './gamecast-v886b-styles.js';

const TEAM_COLORS = {
  ARI:['#97233F','#000000'], ATL:['#A71930','#000000'], BAL:['#241773','#000000'], BUF:['#00338D','#C60C30'],
  CAR:['#0085CA','#101820'], CHI:['#0B162A','#C83803'], CIN:['#FB4F14','#000000'], CLE:['#311D00','#FF3C00'],
  DAL:['#003594','#041E42'], DEN:['#FB4F14','#002244'], DET:['#0076B6','#B0B7BC'], GB:['#203731','#FFB612'],
  HOU:['#03202F','#A71930'], IND:['#002C5F','#A2AAAD'], JAX:['#006778','#101820'], KC:['#E31837','#FFB81C'],
  LV:['#000000','#A5ACAF'], LAC:['#0080C6','#FFC20E'], LA:['#003594','#FFA300'], MIA:['#008E97','#FC4C02'],
  MIN:['#4F2683','#FFC62F'], NE:['#002244','#C60C30'], NO:['#D3BC8D','#101820'], NYG:['#0B2265','#A71930'],
  NYJ:['#125740','#FFFFFF'], PHI:['#004C54','#A5ACAF'], PIT:['#101820','#FFB612'], SF:['#AA0000','#B3995D'],
  SEA:['#002244','#69BE28'], TB:['#D50A0A','#34302B'], TEN:['#0C2340','#4B92DB'], WAS:['#5A1414','#FFB612']
};

const esc = (v) => String(v ?? '');
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number.isFinite(+v) ? +v : min));
const teamObj = (game, side) => (game && game[side]) || {};
const teamAbbr = (game, side) => esc(teamObj(game, side).abbr || teamObj(game, side).code || (side === 'away' ? 'AWY' : 'HOME')).toUpperCase();
const teamName = (game, side) => esc(teamObj(game, side).name || teamObj(game, side).nickname || teamAbbr(game, side));
const teamLogo = (game, side) => esc(teamObj(game, side).logo || teamObj(game, side).logoUrl || '');
const teamColors = (game, side) => TEAM_COLORS[teamAbbr(game, side)] || ['#0d3b73', '#2b7a2f'];
const firstInitial = (name) => esc(name).trim().slice(0,1).toUpperCase() || 'P';

function possessionSide(game) {
  const away = teamAbbr(game, 'away');
  const home = teamAbbr(game, 'home');
  const direct = String(game?.possession || game?.liveScore?.possession || game?.hasBall || '').toUpperCase();
  if (direct.includes(away) || direct === 'AWAY') return 'away';
  if (direct.includes(home) || direct === 'HOME') return 'home';
  const note = String(game?.liveNote || game?.statusText || '').toUpperCase();
  if (note.includes(`${away} HAS THE BALL`) || note.includes(`${away} BALL`)) return 'away';
  if (note.includes(`${home} HAS THE BALL`) || note.includes(`${home} BALL`)) return 'home';
  return 'away';
}

function ballState(game) {
  const raw = String(game?.liveScore?.ballOn || game?.fieldPosition || game?.ballOn || '').trim();
  const away = teamAbbr(game, 'away');
  const home = teamAbbr(game, 'home');
  let side = possessionSide(game);
  let yard = 50;
  const pair = raw.match(/([A-Z]{2,3})\s*(\d{1,2})/i);
  if (pair) {
    const ab = pair[1].toUpperCase();
    yard = clamp(parseInt(pair[2], 10), 0, 50);
    if (ab === away) side = 'away';
    if (ab === home) side = 'home';
  } else {
    const n = raw.match(/(\d{1,2})/);
    if (n) yard = clamp(parseInt(n[1], 10), 0, 50);
  }
  const pct = clamp(side === 'away' ? 50 - yard : 50 + yard, 5, 95);
  return { side, yard, pct };
}

const downDistance = (g) => esc(g?.liveScore?.downDistance || g?.downDistance || '1st & 10');
const fieldPos = (g) => {
  const b = ballState(g);
  return `${teamAbbr(g, b.side)} ${b.yard}`;
};

function playData(game) {
  const current = game?.currentPlay || game?.liveScore?.currentPlay || {};
  const featured = game?.featuredPlayer || {};
  return {
    title: current.title || game?.liveScore?.playTitle || 'Current Play',
    description: current.description || game?.liveScore?.description || game?.playText || 'Live play animation updates every snap.',
    name: current.playerName || featured.name || 'Featured Player',
    pos: current.playerPos || featured.position || 'QB',
    no: current.playerNo || featured.number || '10',
    head: current.headshot || featured.headshot || '',
    target: current.targetName || current.receiverName || 'Hunter Henry',
    type: String(current.type || current.kind || current.playType || current.description || 'pass right').toLowerCase(),
    drivePlays: current.drivePlays || game?.drive?.plays || 4,
    driveYards: current.driveYards || game?.drive?.yards || 22,
    driveTime: current.driveTime || game?.drive?.time || '2:39',
    playYards: current.resultYards ?? current.yards ?? 0,
    stats: current.featuredStats || featured.stats || { compAtt: '8/10', yards: '96', td: '0', rtg: '118.3' },
    driveSummary: Array.isArray(current.driveSummary) && current.driveSummary.length ? current.driveSummary : [
      { text: '6-yd rush', dd: '1st & 10', fp: 'NE 14' },
      { text: '12-yd pass', dd: '1st & 10', fp: 'NE 26' },
      { text: '4-yd rush', dd: '1st & 10', fp: 'NE 30' },
      { text: 'Current Play', dd: downDistance(game), fp: fieldPos(game), current: true }
    ],
    chart: Array.isArray(current.chart) && current.chart.length ? current.chart : [44,44,45,46,45,44,49,52,46,43,47,48,49,50,49,53,54,56,58,55,59,61,63,65,68]
  };
}

function winProb(game) {
  const away = clamp(game?.winProbAway ?? game?.liveScore?.winProbAway ?? game?.awayWinPct ?? 68, 0, 100);
  return { away: Math.round(away), home: Math.round(100 - away) };
}

function chartPath(values) {
  const last = Math.max(1, values.length - 1);
  return values.map((value, idx) => {
    const x = idx * (100 / last);
    const y = 80 - clamp(value, 0, 100) * 0.62;
    return `${idx ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function yardNumbers() {
  let html = '';
  for (let i = 10; i < 100; i += 10) {
    const n = i === 50 ? 50 : (i < 50 ? i : 100 - i);
    html += `<div class="tso-ps886b__yardNum" style="left:${i}%">${n}</div>`;
    html += `<div class="tso-ps886b__yardNum bot" style="left:${i}%">${n}</div>`;
  }
  return html;
}

function buildFormation(game) {
  const play = playData(game);
  const ball = ballState(game);
  const possession = possessionSide(game);
  const attack = possession === 'away' ? 1 : -1;
  const lineOfScrimmage = ball.pct;
  const firstDown = clamp(ball.pct + attack * 8, 7, 93);

  const offense = [
    { x: lineOfScrimmage - 8 * attack, y: 70, role: 'qb', label: 'Maye' },
    { x: lineOfScrimmage - 4 * attack, y: 63, role: 'line' },
    { x: lineOfScrimmage - 3.1 * attack, y: 59, role: 'line' },
    { x: lineOfScrimmage - 2.2 * attack, y: 55, role: 'line' },
    { x: lineOfScrimmage - 1.3 * attack, y: 51, role: 'line' },
    { x: lineOfScrimmage - 0.4 * attack, y: 47, role: 'line' },
    { x: lineOfScrimmage + 2.4 * attack, y: 76, role: 'wr' },
    { x: lineOfScrimmage + 3.8 * attack, y: 64, role: 'rb' },
    { x: lineOfScrimmage + 10 * attack, y: 43, role: 'wr' },
    { x: lineOfScrimmage + 12 * attack, y: 33, role: 'wr' },
    { x: lineOfScrimmage + 13 * attack, y: 81, role: 'wr' }
  ];

  const defense = [
    { x: lineOfScrimmage - 1.6 * attack, y: 46 },
    { x: lineOfScrimmage - 0.7 * attack, y: 51 },
    { x: lineOfScrimmage + 0.3 * attack, y: 56 },
    { x: lineOfScrimmage + 1.2 * attack, y: 61 },
    { x: lineOfScrimmage + 2.1 * attack, y: 66 },
    { x: lineOfScrimmage + 4.4 * attack, y: 41 },
    { x: lineOfScrimmage + 5.3 * attack, y: 55 },
    { x: lineOfScrimmage + 8.8 * attack, y: 35 },
    { x: lineOfScrimmage + 9.7 * attack, y: 49 },
    { x: lineOfScrimmage + 10.2 * attack, y: 63 },
    { x: lineOfScrimmage + 11.2 * attack, y: 77 }
  ];

  let route = { x1: offense[0].x, y1: offense[0].y, c1x: lineOfScrimmage + 4 * attack, c1y: 52, x2: offense[8].x, y2: offense[8].y - 1 };
  let keyIndex = 8;

  if (play.type.includes('screen')) {
    keyIndex = 10;
    route = { x1: offense[0].x, y1: offense[0].y, c1x: lineOfScrimmage + 5.2 * attack, c1y: 78, x2: offense[10].x, y2: offense[10].y - 1 };
  } else if (play.type.includes('left')) {
    keyIndex = 9;
    route = { x1: offense[0].x, y1: offense[0].y, c1x: lineOfScrimmage + 5.8 * attack, c1y: 38, x2: offense[9].x, y2: offense[9].y };
  } else if (play.type.includes('middle')) {
    keyIndex = 7;
    route = { x1: offense[0].x, y1: offense[0].y, c1x: lineOfScrimmage + 3.6 * attack, c1y: 60, x2: offense[7].x + 6 * attack, y2: offense[7].y - 8 };
  } else if (play.type.includes('run')) {
    keyIndex = 7;
    route = { x1: offense[7].x, y1: offense[7].y, c1x: lineOfScrimmage + 2.8 * attack, c1y: 66, x2: offense[7].x + 8.4 * attack, y2: offense[7].y - 12 };
  }

  offense[keyIndex] = { ...offense[keyIndex], key: true, label: (play.target || play.name).split(' ').slice(-1)[0] || 'WR' };
  offense[0].label = (play.name || 'QB').split(' ').slice(-1)[0] || 'QB';

  const ghostTrail = [
    { x: route.x2 - 2.4 * attack, y: route.y2 + 2 },
    { x: route.x2 - 4.8 * attack, y: route.y2 + 5 }
  ];

  const ballLoc = play.type.includes('run')
    ? { x: route.x2 - 0.8 * attack, y: route.y2 - 1 }
    : { x: route.x2 + 0.3 * attack, y: route.y2 - 7 };

  return { lineOfScrimmage, firstDown, offense, defense, route, ghostTrail, ballLoc };
}

function buildAvatar(headshot, name) {
  return headshot
    ? `<img src="${esc(headshot)}" alt="${esc(name)}">`
    : `<span class="init">${firstInitial(name)}</span>`;
}

function playerSVG(kind, label, faded = false, key = false) {
  return `
  <div class="tso-ps886b__player ${kind}${key ? ' key' : ''}${faded ? ' fade' : ''}" style="left:var(--x);top:var(--y)">
    <svg viewBox="0 0 44 62" aria-hidden="true">
      <defs>
        <linearGradient id="torso-${kind}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" />
          <stop offset="58%" stop-color="var(--secondary)" />
          <stop offset="100%" stop-color="#0a1730" />
        </linearGradient>
      </defs>
      <ellipse cx="22" cy="57" rx="11" ry="3.8" fill="rgba(0,0,0,.22)" />
      <path d="M13 19 C 16 11, 28 11, 31 19 L 32 22 L 12 22 Z" fill="var(--trim)" opacity=".95" />
      <ellipse cx="22" cy="14" rx="8" ry="8.6" fill="#efc9aa" />
      <path d="M13 13 C 13 5, 31 5, 31 13 L 31 17 L 13 17 Z" fill="#fff" opacity=".90" />
      <path d="M11 18 C 11 8, 33 8, 33 18" fill="none" stroke="#dceeff" stroke-width="3" stroke-linecap="round" />
      <path d="M14 23 L 30 23 L 34 42 C 29 46, 15 46, 10 42 Z" fill="url(#torso-${kind})" stroke="#0b1d35" stroke-width="1.2" />
      <path d="M10 26 L 5 38" stroke="var(--primary)" stroke-width="4.2" stroke-linecap="round" />
      <path d="M34 26 L 39 38" stroke="var(--primary)" stroke-width="4.2" stroke-linecap="round" />
      <path d="M18 42 L 15 57" stroke="#0c1f38" stroke-width="5.4" stroke-linecap="round" />
      <path d="M26 42 L 29 57" stroke="#0c1f38" stroke-width="5.4" stroke-linecap="round" />
      <path d="M13 26 C 18 27, 26 27, 31 26" fill="none" stroke="rgba(255,255,255,.26)" stroke-width="1.8" />
      <circle cx="18" cy="12.2" r="1.1" fill="#173764" opacity=".6" />
      <circle cx="26" cy="12.2" r="1.1" fill="#173764" opacity=".6" />
    </svg>
    ${label ? `<span class="tso-ps886b__playerLabel">${esc(label)}</span>` : ''}
  </div>`;
}

function goal(side) {
  return `<div class="tso-ps886b__goal tso-ps886b__goal--${side}"><span class="upright left"></span><span class="upright right"></span><span class="crossbar"></span><span class="post"></span></div>`;
}

function halftimeState(halftime) {
  if (halftime?.ready) return { title: 'Halftime Lab Ready', subtitle: `${halftime.games || halftime.gameCount || 1} games loaded` };
  if (halftime?.warming || halftime?.eligibleGames?.length) return { title: 'Halftime Lab Warming Up', subtitle: '2:00 warning automation active' };
  return { title: 'Halftime Lab Monitoring', subtitle: 'Auto-arms near the 2:00 mark in Q2' };
}

export function renderNflPlaystageV886BHTML(game, options = {}) {
  ensureNflPlaystageV886BStyles();
  const awayColors = teamColors(game, 'away');
  const homeColors = teamColors(game, 'home');
  const play = playData(game);
  const formation = buildFormation(game);
  const win = winProb(game);
  const halftime = halftimeState(options.halftime);

  const offensePlayers = formation.offense.map((p) => {
    const style = `--x:${p.x}%;--y:${p.y}%`;
    return playerSVG('off', p.label || '', false, !!p.key).replace('style="left:var(--x);top:var(--y)"', `style="${style}"`);
  }).join('');

  const defensePlayers = formation.defense.map((p) => {
    const style = `--x:${p.x}%;--y:${p.y}%`;
    return playerSVG('def', '', false, false).replace('style="left:var(--x);top:var(--y)"', `style="${style}"`);
  }).join('');

  const ghosts = formation.ghostTrail.map((p) => {
    const style = `--x:${p.x}%;--y:${p.y}%`;
    return playerSVG('off', '', true, false).replace('style="left:var(--x);top:var(--y)"', `style="${style}"`);
  }).join('');

  return `
  <section class="tso-ps886b" data-tso-v886b-gamecast style="--away-a:${awayColors[0]};--away-b:${awayColors[1]};--home-a:${homeColors[0]};--home-b:${homeColors[1]}">
    <div class="tso-ps886b__hero">
      <div class="tso-ps886b__topRibbon">
        <div class="tso-ps886b__topCard">Football Lives Here</div>
        <div class="tso-ps886b__topCard"><strong>The Sports Outpost</strong></div>
        <div class="tso-ps886b__topCard">Analyze · Predict · Win</div>
      </div>
      <div class="tso-ps886b__stadium">
        <div class="tso-ps886b__upperGlow"></div>
        <div class="tso-ps886b__adDeck">
          <div>Football Lives Here</div>
          <div>The Sports Outpost</div>
          <div>Analyze · Predict · Win</div>
        </div>
        <div class="tso-ps886b__crowd"></div>
        <div class="tso-ps886b__sidelineBand"></div>
        <div class="tso-ps886b__lightTower tso-ps886b__lightTower--left"></div>
        <div class="tso-ps886b__lightTower tso-ps886b__lightTower--right"></div>
        ${goal('left')}
        ${goal('right')}
        <div class="tso-ps886b__fieldStage">
          <div class="tso-ps886b__fieldPlane">
            <div class="tso-ps886b__fieldShadow"></div>
            <div class="tso-ps886b__field">
              <div class="tso-ps886b__endzone tso-ps886b__endzone--away"><div class="tso-ps886b__endText">${esc(teamName(game,'away'))}</div></div>
              <div class="tso-ps886b__endzone tso-ps886b__endzone--home"><div class="tso-ps886b__endText">${esc(teamName(game,'home'))}</div></div>
              <div class="tso-ps886b__playfield">
                ${yardNumbers()}
                <div class="tso-ps886b__line los" style="left:${formation.lineOfScrimmage}%"></div>
                <div class="tso-ps886b__line fd" style="left:${formation.firstDown}%"></div>
                <svg class="tso-ps886b__path" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M ${formation.route.x1} ${formation.route.y1} Q ${formation.route.c1x} ${formation.route.c1y}, ${formation.route.x2} ${formation.route.y2}" fill="none" stroke="#63d8ff" stroke-width="1.1" stroke-dasharray="2.3 1.4" stroke-linecap="round"></path>
                  <path d="M ${formation.route.x2 - 2 * (formation.route.x2 > formation.route.x1 ? 1 : -1)} ${formation.route.y2 - 1} L ${formation.route.x2} ${formation.route.y2} L ${formation.route.x2 - 1.2 * (formation.route.x2 > formation.route.x1 ? 1 : -1)} ${formation.route.y2 + 2}" fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round"></path>
                </svg>
                ${offensePlayers}
                ${defensePlayers}
                ${ghosts}
                <div class="tso-ps886b__ball" style="left:${formation.ballLoc.x}%;top:${formation.ballLoc.y}%"></div>
              </div>
              <div class="tso-ps886b__midLogo">TSO</div>
            </div>
          </div>
        </div>
        <div class="tso-ps886b__legend">
          <span><i></i>Line of Scrimmage</span>
          <span><i class="fd"></i>First Down</span>
          <span><i class="path"></i>Play Path</span>
        </div>
      </div>
    </div>

    <div class="tso-ps886b__panels">
      <article class="tso-ps886b__panel">
        <div class="tso-ps886b__title">Current Play <span class="tso-ps886b__chip">Live</span></div>
        <div class="tso-ps886b__row">
          <div class="tso-ps886b__avatar">${buildAvatar(play.head, play.name)}</div>
          <div>
            <div class="tso-ps886b__pname">${esc(downDistance(game))} &nbsp;|&nbsp; ${esc(fieldPos(game))}</div>
            <div class="tso-ps886b__psub">${esc(play.name)} · ${esc(play.pos)} #${esc(play.no)}</div>
          </div>
        </div>
        <div class="tso-ps886b__copy">${esc(play.description)}</div>
        <div class="tso-ps886b__stats">
          <div><b>${esc(play.drivePlays)}</b><small>Plays</small></div>
          <div><b>${esc(play.driveYards)}</b><small>Yards</small></div>
          <div><b>${esc(play.driveTime)}</b><small>Time</small></div>
          <div><b>${esc(play.playYards)}</b><small>Yds Play</small></div>
        </div>
      </article>

      <article class="tso-ps886b__panel">
        <div class="tso-ps886b__title">Featured Player ${teamLogo(game, possessionSide(game)) ? `<img src="${esc(teamLogo(game, possessionSide(game)))}" alt="" style="height:22px;object-fit:contain">` : ''}</div>
        <div class="tso-ps886b__row">
          <div class="tso-ps886b__avatar">${buildAvatar(play.head, play.name)}</div>
          <div>
            <div class="tso-ps886b__pname">${esc(play.name)}</div>
            <div class="tso-ps886b__psub">${esc(play.pos)} #${esc(play.no)}</div>
          </div>
        </div>
        <div class="tso-ps886b__stats">
          <div><b>${esc(play.stats.compAtt || '8/10')}</b><small>Comp/Att</small></div>
          <div><b>${esc(play.stats.yards || '96')}</b><small>Yds</small></div>
          <div><b>${esc(play.stats.td || '0')}</b><small>TD</small></div>
          <div><b>${esc(play.stats.rtg || play.stats.qbr || '118.3')}</b><small>RTG</small></div>
        </div>
      </article>

      <article class="tso-ps886b__panel">
        <div class="tso-ps886b__title">Win Probability</div>
        <div class="tso-ps886b__wp"><span>${esc(teamName(game,'away'))} ${win.away}%</span><span>${win.home}% ${esc(teamName(game,'home'))}</span></div>
        <div class="tso-ps886b__chart">
          <svg viewBox="0 0 100 80" preserveAspectRatio="none">
            <path d="${chartPath(play.chart)}" fill="none" stroke="#22afff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <circle cx="96" cy="${80 - clamp((play.chart || []).slice(-1)[0] || 50, 0, 100) * .62}" r="3.5" fill="#61c9ff"></circle>
          </svg>
        </div>
        <div class="tso-ps886b__axis"><span>1st</span><span>2nd</span><span>3rd</span><span>4th</span></div>
      </article>

      <article class="tso-ps886b__panel">
        <div class="tso-ps886b__title">Drive Summary <span style="color:#b9ddff;text-transform:none;letter-spacing:0">View All ›</span></div>
        <div class="tso-ps886b__summary">
          ${play.driveSummary.map((row) => `
            <div class="tso-ps886b__srow${row.current ? ' cur' : ''}">
              <i></i>
              <span>${esc(row.text)}</span>
              <small>${esc(row.dd || '')}</small>
              <small>${esc(row.fp || '')}</small>
            </div>`).join('')}
        </div>
      </article>
    </div>

    <div class="tso-ps886b__footer">
      <div class="tso-ps886b__brand"><span>The Sports Outpost</span><strong>Different Looks. A Higher Standard.</strong></div>
      <div class="tso-ps886b__nav"><span><i>◔</i>Analyze</span><span><i>◎</i>Predict</span><span><i>▷</i>Watch</span><span><i>🏆</i>Win</span></div>
      <div class="tso-ps886b__lab"><i>🧪</i><div>${halftime.title}<small>${halftime.subtitle}</small></div></div>
    </div>
  </section>`;
}

function placePossessionFootball(root, game) {
  if (!root || typeof document === 'undefined') return;
  root.querySelectorAll('.tso-possession-football').forEach((node) => node.remove());

  const side = possessionSide(game);
  const names = side === 'away'
    ? [teamName(game, 'away'), teamAbbr(game, 'away')]
    : [teamName(game, 'home'), teamAbbr(game, 'home')];

  const nodes = [...root.querySelectorAll('h1,h2,h3,h4,div,span,strong,p')]
    .filter((el) => {
      const text = (el.textContent || '').trim();
      return text && names.some((n) => text === n || text.endsWith(n) || text.includes(n));
    })
    .sort((a, b) => a.textContent.length - b.textContent.length);

  const target = nodes[0];
  if (!target) return;
  const ball = document.createElement('span');
  ball.className = 'tso-possession-football';
  ball.textContent = '🏈';
  if (side === 'home') target.prepend(ball);
  else target.append(ball);
}

export function mountOrUpdateNflPlaystageV886B(root, game, options = {}) {
  if (typeof document === 'undefined' || !root || !game) return;
  ensureNflPlaystageV886BStyles();
  placePossessionFootball(root, game);

  const host = root.querySelector('[data-tso-v886b-anchor]') || (() => {
    const el = document.createElement('div');
    el.dataset.tsoV886bAnchor = '1';
    const main = root.querySelector('[data-tso-gamecast-main],.tso-gamecast-main,.nfl-gamecast-main,.nfl-gamecast,.gamecast-view,main') || root;
    const header = main.querySelector('[data-score-header],.scoreboard,.tso-scoreboard,.nfl-scoreboard,header');
    if (header && header.nextSibling) header.parentNode.insertBefore(el, header.nextSibling);
    else main.prepend(el);
    return el;
  })();

  host.innerHTML = renderNflPlaystageV886BHTML(game, options);
  setTimeout(() => placePossessionFootball(root, game), 60);
  setTimeout(() => placePossessionFootball(root, game), 320);
}
