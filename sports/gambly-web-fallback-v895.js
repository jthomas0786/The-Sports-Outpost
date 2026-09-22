import { installParlayPingExternalHandoff } from './parlayping-external-handoff.js?v=2.2';

// Historical module name retained so automated slate/research commits do not
// need to touch router wiring. ParlayPing is NOT rendered inside The Sports
// Outpost. The active betslip now exposes only the external ParlayPing handoff;
// legacy Gambly actions are removed from the rendered betslip UI.
export function installGamblyWebFallbackV895(){
  installParlayPingExternalHandoff();
}

export const __V895_TEST__={parlayPing:true,externalHandoff:true,embeddedUi:false,legacyGamblyUi:false};
