import {
  allocateCapped, binomial, clamp, hash32, logNormalFactor, makeRng, multinomial,
  normal, normName, poisson, probability, round, summarizeTyped, weightedIndex
} from './utils.js';
import { buildGameProfile, playerMarketLines, profileSummary } from './profile.js';

const TRACKED = ['passYds','completions','attempts','passTds','interceptions','rushYds','carries','rushTds','recYds','receptions','targets','recTds','tds'];

function addStats(dst, src) {
  for (const k of TRACKED) dst[k] = (dst[k] || 0) + (Number(src?.[k]) || 0);
  dst.tds = (dst.rushTds || 0) + (dst.recTds || 0);
  return dst;
}

function blankStats(current = null) {
  const out = Object.fromEntries(TRACKED.map(k=>[k,0]));
  if (current) addStats(out, current);
  return out;
}

function currentElapsedFraction(profile) { return 1 - profile.remainingFraction; }

function expectedRemainingPoints(profile, side, config) {
  const team = side === 'home' ? profile.homeTeam : profile.awayTeam;
  const current = profile.currentScore[side];
  const rem = profile.remainingFraction;
  if (rem <= 0) return 0;
  if (!profile.live || profile.live.status === 'pre') return Math.max(0, team.expectedPoints);

  // Market anchor remains the primary prior. Observed scoring only nudges the rest-of-game
  // expectation; halftime 28-0 should move the distribution without assuming a 56-0 final.
  const anchorRemaining = Math.max(0, team.expectedPoints - current);
  const elapsed = Math.max(.05, currentElapsedFraction(profile));
  const observedFinalPace = current / elapsed;
  const observedRemaining = Math.max(0, observedFinalPace * rem);
  const wObs = config.blend.observedScoringWeightLive ?? .30;
  return Math.max(0, anchorRemaining * (1 - wObs) + observedRemaining * wObs);
}

function scoreFuture(rng, expectedPoints, config, environment = 1, offenseShock = 1) {
  const mean = Math.max(0, expectedPoints * environment * offenseShock);
  const tdShare = config.league.touchdownPointShare ?? .68;
  const fgShare = config.league.fieldGoalPointShare ?? .25;
  const tdLambda = mean * tdShare / 7;
  const fgLambda = mean * fgShare / 3;
  const tds = poisson(rng, tdLambda);
  const fgs = poisson(rng, fgLambda);
  // Rare residual points approximate safeties / two-point conversions / missed PAT effects
  // without forcing player touchdown allocation to explain every scoreboard point.
  const residualMean = Math.max(0, mean - tdLambda*7 - fgLambda*3);
  const residual = rng() < Math.min(.18, residualMean / 15) ? (rng() < .72 ? 2 : 1) : 0;
  return {tds, fgs, residual, points:tds*7 + fgs*3 + residual};
}

function scriptPassRate(team, currentDiff, finalDiff, config) {
  // positive diff means this team is leading. Trailing teams pass more.
  const blendedDiff = currentDiff * .45 + finalDiff * .55;
  const perPoint = config.league.scriptPassRatePerPoint ?? .0045;
  const maxAdj = config.league.maxScriptPassRateAdjustment ?? .12;
  const adj = clamp(-blendedDiff * perPoint, -maxAdj, maxAdj);
  return clamp(team.basePassRate + adj, config.clamps.passRateMin, config.clamps.passRateMax);
}

function chooseStartingQb(team) {
  return team.qb || team.qbs?.[0] || null;
}

function receiverWeights(team, targetMode = false) {
  return team.receivers.map(p => {
    const usage = Math.max(.15, p.base.targets);
    const role = p.availabilityFactor;
    const rz = 1 + Math.min(.5, (p.rzTargets || 0) * .025);
    return usage * role * (targetMode ? 1 : rz);
  });
}

function rusherWeights(team, leading = false) {
  return team.rushers.map(p => {
    let w = Math.max(.05, p.base.carries) * p.availabilityFactor;
    if (p.position === 'RB' && (p.depthRank ?? 9) === 1) w *= leading ? 1.18 : 1.05;
    if (p.position === 'QB') w *= leading ? .82 : 1.03;
    return w;
  });
}

function tdReceiverWeights(team, targetCounts = null) {
  return team.receivers.map((p,i)=>{
    const base = .15 + p.base.recTds * 2.2 + (p.rzTargets||0)*.08 + (p.atdProbability||0)*1.2;
    const liveUsage = targetCounts ? (targetCounts[i] || 0) * .12 : 0;
    return Math.max(.02, base + liveUsage) * p.availabilityFactor;
  });
}
function tdRusherWeights(team, carryCounts = null) {
  return team.rushers.map((p,i)=>{
    const base = .12 + p.base.rushTds * 2.4 + (p.rzCarries||0)*.09 + (p.atdProbability||0)*1.0;
    const liveUsage = carryCounts ? (carryCounts[i] || 0) * .07 : 0;
    return Math.max(.02, base + liveUsage) * p.availabilityFactor;
  });
}

function simulateTeamOffense({rng, team, profile, side, futureScore, opponentFutureScore, environment, offenseShock, config, playerStats}) {
  const rem = profile.remainingFraction;
  if (rem <= 0 || !team.players.length) return;
  const ownCurrent = profile.currentScore[side];
  const oppSide = side === 'home' ? 'away' : 'home';
  const oppCurrent = profile.currentScore[oppSide];
  const currentDiff = ownCurrent - oppCurrent;
  const finalDiff = (ownCurrent + futureScore.points) - (oppCurrent + opponentFutureScore.points);
  const passRate = scriptPassRate(team, currentDiff, finalDiff, config);

  let plays = Math.round(team.playsPerGame * rem * environment * logNormalFactor(rng, .055));
  // Extreme deficits produce a few extra clock-stopping/pass possessions, large leads shorten games.
  plays += finalDiff < -10 ? Math.round(2*rem) : finalDiff > 10 ? -Math.round(1*rem) : 0;
  plays = Math.max(0, plays);
  const passAttempts = binomial(rng, plays, passRate);
  const rushAttempts = Math.max(0, plays - passAttempts);

  const qb = chooseStartingQb(team);
  let completions = 0, passYds = 0, passTds = 0, interceptions = 0;
  let targetCounts = new Array(team.receivers.length).fill(0);
  let receptionCounts = new Array(team.receivers.length).fill(0);

  if (qb && passAttempts > 0) {
    const compRate = clamp(qb.base.completionRate * logNormalFactor(rng,.035), config.clamps.completionRateMin, config.clamps.completionRateMax);
    completions = binomial(rng, passAttempts, compRate);
    const ypa = clamp(qb.base.yardsPerAttempt * logNormalFactor(rng, config.league.yardageVolatility*.45), config.clamps.yardsPerAttemptMin, config.clamps.yardsPerAttemptMax);
    const meanPass = passAttempts * ypa;
    passYds = Math.max(0, Math.round(normal(rng, meanPass, Math.max(18, Math.sqrt(passAttempts)*5.0 + meanPass*.10))));
    interceptions = binomial(rng, passAttempts, config.league.interceptionRatePerAttempt ?? .025);

    targetCounts = multinomial(rng, passAttempts, receiverWeights(team, true));
    const catchWeights = team.receivers.map((p,i)=>Math.max(.01, targetCounts[i]*p.base.catchRate));
    receptionCounts = allocateCapped(rng, completions, targetCounts, catchWeights);

    // Keep sum of receiving yards tied to team/QB passing yards. A player's share is driven by
    // actual simulated receptions, historical YPR, and world-level efficiency noise.
    const yardWeights = team.receivers.map((p,i)=>Math.max(.01, receptionCounts[i] * p.base.yardsPerReception * logNormalFactor(rng,.10)));
    const totalWeight = yardWeights.reduce((a,b)=>a+b,0) || 1;
    let assigned = 0;
    const recYards = yardWeights.map((w,i)=>{
      if (i === yardWeights.length-1) return Math.max(0, passYds-assigned);
      const y = Math.max(0, Math.round(passYds*w/totalWeight)); assigned += y; return y;
    });
    for (let i=0;i<team.receivers.length;i++) {
      const p = team.receivers[i];
      const s = playerStats.get(p.key);
      s.targets += targetCounts[i];
      s.receptions += receptionCounts[i];
      s.recYds += recYards[i] || 0;
    }
  }

  const leading = finalDiff > 3;
  const carryCounts = multinomial(rng, rushAttempts, rusherWeights(team, leading));
  for (let i=0;i<team.rushers.length;i++) {
    const p = team.rushers[i], c = carryCounts[i];
    const s = playerStats.get(p.key);
    s.carries += c;
    if (c > 0) {
      const ypc = clamp(p.base.yardsPerCarry * logNormalFactor(rng,.10), config.clamps.yardsPerCarryMin, config.clamps.yardsPerCarryMax);
      s.rushYds += Math.max(0, Math.round(normal(rng, c*ypc, Math.max(4,Math.sqrt(c)*3.2))));
    }
  }

  const offensiveTds = binomial(rng, futureScore.tds, 1-(config.league.defensiveSpecialTeamsTdShare ?? .08));
  passTds = binomial(rng, offensiveTds, team.passTdShare);
  const rushTds = offensiveTds - passTds;
  if (qb) {
    const s = playerStats.get(qb.key);
    s.attempts += passAttempts;
    s.completions += completions;
    s.passYds += passYds;
    s.passTds += passTds;
    s.interceptions += interceptions;
  }

  const recvTdWeights = tdReceiverWeights(team, targetCounts);
  for (let i=0;i<passTds;i++) {
    if (!team.receivers.length) break;
    const p = team.receivers[weightedIndex(rng, recvTdWeights)];
    playerStats.get(p.key).recTds++;
  }
  const rushTdWeights = tdRusherWeights(team, carryCounts);
  for (let i=0;i<rushTds;i++) {
    if (!team.rushers.length) break;
    const p = team.rushers[weightedIndex(rng, rushTdWeights)];
    playerStats.get(p.key).rushTds++;
  }
  for (const p of team.players) {
    const s = playerStats.get(p.key);
    s.tds = s.rushTds + s.recTds;
  }
}

function statArrays(players, iterations) {
  const map = new Map();
  for (const p of players) {
    const stats = {};
    for (const k of TRACKED) stats[k] = new Float32Array(iterations);
    map.set(p.key, {player:p, stats});
  }
  return map;
}

function initWorldStats(players) {
  return new Map(players.map(p=>[p.key, blankStats(p.current)]));
}

function copyIntoArrays(arrays, worldStats, i) {
  for (const [key, rec] of arrays) {
    const s = worldStats.get(key);
    for (const k of TRACKED) rec.stats[k][i] = Number(s?.[k]) || 0;
  }
}

function marketLineFor(odds, prop) {
  const m = odds?.[prop];
  if (!m) return null;
  if (prop === 'atd' || prop === 'firstTd') return null;
  return Number.isFinite(Number(m.line)) ? Number(m.line) : null;
}

function playerSummary(rec, lines, iterations) {
  const p = rec.player;
  const distributions = {};
  for (const k of TRACKED) distributions[k] = summarizeTyped(rec.stats[k], iterations);
  const over = {}, under = {};
  const lineOdds = lines?.[`${p.team}|${normName(p.name)}`] || {};
  const propToStat = {passYds:'passYds',passTds:'passTds',completions:'completions',rushYds:'rushYds',recYds:'recYds',receptions:'receptions'};
  for (const [prop,stat] of Object.entries(propToStat)) {
    const line = marketLineFor(lineOdds, prop);
    if (!Number.isFinite(line)) continue;
    over[prop] = {line,probability:round(probability(rec.stats[stat],v=>v>line,iterations),4)};
    under[prop] = {line,probability:round(probability(rec.stats[stat],v=>v<line,iterations),4)};
  }
  const atdProb = probability(rec.stats.tds,v=>v>=1,iterations);
  const twoTdProb = probability(rec.stats.tds,v=>v>=2,iterations);
  return {
    playerId:p.key,espnId:p.espnId,gsisId:p.gsisId,name:p.name,team:p.team,position:p.position,depthRank:p.depthRank,
    current:p.current,
    distributions,
    probabilities:{atd:round(atdProb,4),twoPlusTd:round(twoTdProb,4)},
    sportsbook:{over,under,markets:Object.keys(lineOdds||{})},
  };
}

function teamOutcomeSummary(profile, awayScores, homeScores, iterations) {
  const awayWin = probability(awayScores,(v,i)=>v>homeScores[i],iterations);
  const homeWin = probability(homeScores,(v,i)=>v>awayScores[i],iterations);
  const tie = Math.max(0,1-awayWin-homeWin);
  const totalLine = Number(profile.anchor.total);
  const spread = Number(profile.anchor.homeSpread);
  let homeCover=null, awayCover=null, totalOver=null,totalUnder=null,pushSpread=null,pushTotal=null;
  if (Number.isFinite(spread)) {
    homeCover=0;awayCover=0;pushSpread=0;
    for(let i=0;i<iterations;i++){
      const x=homeScores[i]+spread-awayScores[i];
      if(x>0)homeCover++;else if(x<0)awayCover++;else pushSpread++;
    }
    homeCover/=iterations;awayCover/=iterations;pushSpread/=iterations;
  }
  if (Number.isFinite(totalLine)) {
    totalOver=0;totalUnder=0;pushTotal=0;
    for(let i=0;i<iterations;i++){
      const x=homeScores[i]+awayScores[i]-totalLine;
      if(x>0)totalOver++;else if(x<0)totalUnder++;else pushTotal++;
    }
    totalOver/=iterations;totalUnder/=iterations;pushTotal/=iterations;
  }
  return {
    away:{abbr:profile.away.abbr,winProbability:round(awayWin,4),score:summarizeTyped(awayScores,iterations)},
    home:{abbr:profile.home.abbr,winProbability:round(homeWin,4),score:summarizeTyped(homeScores,iterations)},
    tieProbability:round(tie,4),
    spread:Number.isFinite(spread)?{homeLine:spread,homeCover:round(homeCover,4),awayCover:round(awayCover,4),push:round(pushSpread,4)}:null,
    total:Number.isFinite(totalLine)?{line:totalLine,over:round(totalOver,4),under:round(totalUnder,4),push:round(pushTotal,4)}:null,
  };
}

export function evaluateLegFromArrays(playerRec, leg, iterations) {
  const market = String(leg.market || leg.prop || '');
  const side = String(leg.side || 'over').toLowerCase();
  const line = Number(leg.line);
  if (market === 'atd') return probability(playerRec.stats.tds,v=>v>=1,iterations);
  if (market === '2td' || market === 'twoPlusTd') return probability(playerRec.stats.tds,v=>v>=2,iterations);
  const statKey = {passYds:'passYds',passTds:'passTds',completions:'completions',rushYds:'rushYds',recYds:'recYds',receptions:'receptions',interceptions:'interceptions'}[market];
  if (!statKey || !Number.isFinite(line)) return null;
  return probability(playerRec.stats[statKey],v=>side==='under'?v<line:v>line,iterations);
}

export function jointProbabilityFromResult(result, legs) {
  // v85 core keeps compact per-stat arrays only when includeSamples=true. This method is
  // already shaped for the halftime parlay generator: every leg is tested against the
  // same simulation index, preserving correlation instead of multiplying marginals.
  const samples = result?._samples;
  if (!samples || !legs?.length) return null;
  const indices = [];
  for (const leg of legs) {
    const key = String(leg.playerId || '');
    const rec = samples.players.get(key);
    if (!rec) return null;
    indices.push({rec,leg});
  }
  let hits=0;
  outer: for(let i=0;i<samples.iterations;i++){
    for(const {rec,leg} of indices){
      const market=String(leg.market||leg.prop||''), side=String(leg.side||'over').toLowerCase(), line=Number(leg.line);
      let v;
      if(market==='atd'){if(rec.stats.tds[i]<1)continue outer;continue;}
      if(market==='2td'||market==='twoPlusTd'){if(rec.stats.tds[i]<2)continue outer;continue;}
      const statKey={passYds:'passYds',passTds:'passTds',completions:'completions',rushYds:'rushYds',recYds:'recYds',receptions:'receptions',interceptions:'interceptions'}[market];
      if(!statKey||!Number.isFinite(line))return null;
      v=rec.stats[statKey][i];
      if(side==='under'?!(v<line):!(v>line))continue outer;
    }
    hits++;
  }
  return hits/samples.iterations;
}

export function simulateGame({game,research,odds,liveGame=null,config,iterations,seed,includeSamples=false}) {
  const profile = buildGameProfile({game,research,odds,liveGame,config});
  iterations = Math.max(100,Math.min(config.maxIterations||100000,Math.round(iterations || (liveGame?.status==='in'?config.liveIterations:config.defaultIterations))));
  const stateSig = `${profile.gameId}|${profile.live?.status||'pre'}|${profile.live?.period||0}|${profile.live?.clockMin??''}|${profile.currentScore.away}-${profile.currentScore.home}`;
  seed = Number.isFinite(Number(seed)) ? Number(seed) : hash32(stateSig);
  const rng = makeRng(seed);
  const awayScores = new Float32Array(iterations), homeScores = new Float32Array(iterations);
  const arrays = statArrays(profile.players,iterations);
  const awayExpected = expectedRemainingPoints(profile,'away',config);
  const homeExpected = expectedRemainingPoints(profile,'home',config);

  for(let i=0;i<iterations;i++){
    const environment = logNormalFactor(rng,config.league.paceVolatility||.09);
    // Shared environment creates total-game correlation; offense shocks keep teams distinct.
    const awayShock = logNormalFactor(rng,config.league.offenseVolatility||.18);
    const homeShock = logNormalFactor(rng,config.league.offenseVolatility||.18);
    const awayFuture = scoreFuture(rng,awayExpected,config,environment,awayShock);
    const homeFuture = scoreFuture(rng,homeExpected,config,environment,homeShock);
    awayScores[i] = profile.currentScore.away + awayFuture.points;
    homeScores[i] = profile.currentScore.home + homeFuture.points;
    const worldStats = initWorldStats(profile.players);
    simulateTeamOffense({rng,team:profile.awayTeam,profile,side:'away',futureScore:awayFuture,opponentFutureScore:homeFuture,environment,offenseShock:awayShock,config,playerStats:worldStats});
    simulateTeamOffense({rng,team:profile.homeTeam,profile,side:'home',futureScore:homeFuture,opponentFutureScore:awayFuture,environment,offenseShock:homeShock,config,playerStats:worldStats});
    copyIntoArrays(arrays,worldStats,i);
  }

  const lineMap = playerMarketLines(profile);
  const lineObj = Object.fromEntries(lineMap.entries());
  const players = [...arrays.values()].map(rec=>playerSummary(rec,lineObj,iterations));
  players.sort((a,b)=>(b.probabilities.atd||0)-(a.probabilities.atd||0)||a.team.localeCompare(b.team)||a.name.localeCompare(b.name));
  const result = {
    schemaVersion:1,engineVersion:config.engineVersion||'v85.0.0',generatedAt:new Date().toISOString(),
    game:profileSummary(profile),iterations,seed,
    outcomes:teamOutcomeSummary(profile,awayScores,homeScores,iterations),
    players,
    notes:[
      'Correlated Monte Carlo: team pace, scoring, game script and player usage are simulated in the same world.',
      'Live runs add current box-score stats to every world and simulate only the remaining game fraction.',
      'Sportsbook lines are comparison anchors when available; simulation probabilities are model outputs, not implied sportsbook probabilities.',
      'v85 is the simulation core. Calibration/backtesting and halftime parlay ranking are follow-on layers.'
    ]
  };
  if(includeSamples) result._samples={iterations,players:arrays,awayScores,homeScores};
  return result;
}

export function stripPrivateSamples(result) {
  if (!result) return result;
  const {_samples,...publicResult}=result;
  return publicResult;
}
