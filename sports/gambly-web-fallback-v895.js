import { installParlayPingExternalHandoff } from './parlayping-external-handoff.js?v=2.0';

// Historical module name retained so automated slate/research commits do not
// need to touch router wiring. ParlayPing is NOT rendered inside The Sports
// Outpost. This button only creates a signed ParlayPing.net slip through the
// secure server API and then navigates the user to that external betslip.
export function installGamblyWebFallbackV895(){
  installParlayPingExternalHandoff();
}

export const __V895_TEST__={parlayPing:true,externalHandoff:true,embeddedUi:false};
