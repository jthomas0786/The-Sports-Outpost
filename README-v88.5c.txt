TSO v88.5c — DIRECT PlayStage Gamecast Fix

Root cause
----------
v88.5/v88.5a attempted to inject the PlayStage after the existing Gamecast had
already rendered by using a MutationObserver and DOM guessing. The canonical
gamecastHTML function still explicitly selected:
    fieldOverlayLiveRedesignHTML(g,p)
as the Game View, so the old Gamecast remained visible.

Fix
---
v88.5c wires the approved PlayStage into gamecastHTML directly:
    const gameView=renderNflPlaystageV885aHTML(g,{halftime:state.halftime});

The score header/tabs stay in the existing Gamecast. Only the Game View body
renderer changes. The old observer injector is disabled.

This is intentionally a narrow integration correction. It does not undo the
demo-mode fix, odds fix, halftime lab, or v88.5 PlayStage assets.
