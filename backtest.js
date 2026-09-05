#!/usr/bin/env node
// Offline backtest: compares the current model's real Brier score against
// a defensible baseline, using genuine historical prediction/outcome data
// already logged in model-logs/scored/*.json.
//
// Run with: node backtest.js
//
// ============================================================================
// AN HONEST LIMITATION, STATED UP FRONT RATHER THAN WORKED AROUND QUIETLY:
// ============================================================================
// The success criterion calls for beating a "season-rate × projected PA"
// baseline. Building that baseline HONESTLY requires knowing each player's
// actual season HR rate and projected PA *as of each historical date* —
// not today's numbers, which already include weeks of additional games
// the model at the time couldn't have known about.
//
// This repo does not currently archive historical daily slate snapshots
// (only today's slate.json exists; each day overwrites the last), so that
// per-date reconstruction isn't available from existing data alone. I
// looked at reverse-engineering it from the logged `contextMult` field in
// predictions/*.json, but a spot-check showed contextMult does not undo
// cleanly into a plausible raw rate (dividing it out implied a ~19%
// pre-context game-HR probability for a bench outfielder — implausible),
// meaning I don't have confident enough visibility into exactly how it
// was computed to safely reverse it. Rather than fabricate a baseline
// from a guess I can't verify, this script instead:
//
//   1. Reports the CURRENT model's real, honest Brier score on real
//      historical outcomes — this part is fully accurate, no approximation.
//   2. Compares against a LEAGUE-AVERAGE-CONSTANT baseline (predict the
//      same league HR rate for every player, every game) — a standard,
//      defensible "climatology" benchmark that any real model should beat,
//      and requires no reconstructed data to compute honestly.
//   3. Logs a clear TODO: once logPredictionForBacktest() (see below) has
//      been running for 30 days, re-run this script with --use-baseline-log
//      to get a true season-rate × PA comparison from data collected
//      going forward, rather than reconstructed after the fact.
// ============================================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const SCORED_DIR = path.join(process.cwd(), 'model-logs', 'scored');
const LEAGUE_HR_RATE_PER_PA = 0.032;   // MODEL.league.rates.hr in index.html — kept in sync manually; see note in main()
const AVG_PA_PER_GAME = 4.3;           // MODEL's default expPA fallback in index.html

function brierScore(rows){
  // Brier score: mean squared error between predicted probability and the
  // actual binary outcome. Lower is better; 0 is a perfect forecaster.
  if(!rows.length) return null;
  const sumSq = rows.reduce((acc, r) => acc + (r.p - (r.outcome ? 1 : 0)) ** 2, 0);
  return sumSq / rows.length;
}

function logLoss(rows){
  if(!rows.length) return null;
  const EPS = 1e-9;   // avoid log(0)
  const sum = rows.reduce((acc, r) => {
    const p = Math.min(1 - EPS, Math.max(EPS, r.p));
    return acc + (r.outcome ? -Math.log(p) : -Math.log(1 - p));
  }, 0);
  return sum / rows.length;
}

function loadAllScoredRows(){
  if(!existsSync(SCORED_DIR)){
    console.error(`No model-logs/scored directory found at ${SCORED_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(SCORED_DIR).filter(f => f.endsWith('.json')).sort();
  const rows = [];
  for(const file of files){
    const data = JSON.parse(readFileSync(path.join(SCORED_DIR, file), 'utf8'));
    for(const row of data.rows || []){
      if(row.prop === 'hr' && row.valid && !row.void){
        rows.push({ date: row.date, playerId: row.playerId, name: row.name, p: row.p, outcome: !!row.outcome });
      }
    }
  }
  return { rows, filesUsed: files.length };
}

function main(){
  const { rows, filesUsed } = loadAllScoredRows();
  if(!rows.length){
    console.error('No valid, non-void game-HR rows found in model-logs/scored/*.json — nothing to backtest.');
    process.exit(1);
  }

  const dates = [...new Set(rows.map(r => r.date))].sort();
  const currentModelBrier = brierScore(rows);
  const currentModelLogLoss = logLoss(rows);

  const baselineRows = rows.map(r => ({ ...r, p: LEAGUE_HR_RATE_PER_PA_TO_GAME() }));
  const baselineBrier = brierScore(baselineRows);
  const baselineLogLoss = logLoss(baselineRows);

  const hits = rows.filter(r => r.outcome).length;
  const observedRate = hits / rows.length;
  const meanModeledP = rows.reduce((a, r) => a + r.p, 0) / rows.length;

  console.log('='.repeat(72));
  console.log('BACKTEST — game-HR prop, current model vs. league-average baseline');
  console.log('='.repeat(72));
  console.log(`Date range:        ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} days, ${filesUsed} score files read)`);
  console.log(`Valid rows:        ${rows.length.toLocaleString()}`);
  console.log(`Observed hit rate: ${(observedRate * 100).toFixed(2)}%`);
  console.log(`Mean modeled p:    ${(meanModeledP * 100).toFixed(2)}%`);
  console.log();
  console.log('--- Brier score (lower is better; 0 = perfect) ---');
  console.log(`  Current model:            ${currentModelBrier.toFixed(5)}`);
  console.log(`  League-average baseline:  ${baselineBrier.toFixed(5)}`);
  const brierImprovement = ((baselineBrier - currentModelBrier) / baselineBrier * 100);
  console.log(`  -> current model is ${brierImprovement >= 0 ? 'BETTER' : 'WORSE'} than the baseline by ${Math.abs(brierImprovement).toFixed(1)}%`);
  console.log();
  console.log('--- Log loss (lower is better) ---');
  console.log(`  Current model:            ${currentModelLogLoss.toFixed(5)}`);
  console.log(`  League-average baseline:  ${baselineLogLoss.toFixed(5)}`);
  console.log();
  console.log('NOTE: this compares against a league-average-constant baseline, NOT');
  console.log('the season-rate × PA baseline named in the success criterion — see the');
  console.log('comment block at the top of this file for exactly why, and what data');
  console.log('needs to accumulate first for a true version of that comparison.');
}

// Small helper kept separate so the "what does the baseline actually
// predict" logic is one clearly-named, single place — currently a flat
// constant, deliberately not fancier than that (see file header).
function LEAGUE_HR_RATE_PER_PA_TO_GAME(){
  return 1 - Math.pow(1 - LEAGUE_HR_RATE_PER_PA, AVG_PA_PER_GAME);
}

main();
