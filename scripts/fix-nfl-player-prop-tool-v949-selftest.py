from pathlib import Path

p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
s=p.read_text()
repls={
"assert.ok(preview.includes(\"./nfl/player-prop-tool-v947.js?v=94.8\"),'preview must import v94.7');":"assert.ok(preview.includes(\"./nfl/player-prop-tool-v947.js?v=94.9\"),'preview must import v94.9');",
"assert.ok(router.includes(\"import('./nfl-preview-v893.js?v=94.8')\"),'router must hard cache-bust NFL preview to v94.7');":"assert.ok(router.includes(\"import('./nfl-preview-v893.js?v=94.9')\"),'router must hard cache-bust NFL preview to v94.9');",
"console.log('✓ NFL Player Prop Tool v94.7 single-owner static regression passed');":"console.log('✓ NFL Player Prop Tool v94.9 readability/history static regression passed');",
}
for old,new in repls.items():
    if new in s:
        continue
    if old not in s:
        raise SystemExit(f'missing selftest marker: {old}')
    s=s.replace(old,new,1)
p.write_text(s)
print('Updated NFL Player Prop Tool v94.9 cache-bust regression assertions')
