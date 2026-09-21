import { installParlayPingBetslipV2 } from './parlayping-betslip-v2.js?v=2.0';

// Compatibility shim: router.js still imports this historical module name so
// live-data automation commits do not need to touch the router. The active
// experience is fully ParlayPing; no Gambly UI or handoff remains.
export function installGamblyWebFallbackV895(){
  installParlayPingBetslipV2();
}

export const __V895_TEST__={parlayPing:true};
