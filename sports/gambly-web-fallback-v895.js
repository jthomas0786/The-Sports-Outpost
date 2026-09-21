import { installParlayPingExternalHandoff } from './parlayping-external-handoff.js?v=1.0';

// Compatibility shim: router.js still imports this historical module name so
// automated slate/research commits do not need to touch router wiring.
// ParlayPing is NOT rendered inside The Sports Outpost. The Sports Outpost
// button only creates a signed ParlayPing.net slip through the server API and
// navigates the user to that external generated betslip.
export function installGamblyWebFallbackV895(){
  installParlayPingExternalHandoff();
}

export const __V895_TEST__={parlayPing:true,externalHandoff:true,embeddedUi:false};
