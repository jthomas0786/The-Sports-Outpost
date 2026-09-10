TSO v88.6c — Regulation Field Geometry Rebuild

This pass stops hand-positioning the football field and builds it from regulation geometry.

FIELD MODEL
- 120 yards total
- left end zone: yards 0-10
- playing field: yards 10-110 (100 yards)
- right end zone: yards 110-120
- each end zone is exactly 8.333333% of total visual field length
- playable field is exactly 83.333333%

MARKINGS
- full field-of-play yard lines every 5 yards
- major labels: 10, 20, 30, 40, 50, 40, 30, 20, 10
- top/far-sideline numbers rotate 180 degrees relative to bottom/near-sideline numbers
- 1-yard hash positions are generated mathematically
- goal lines are the exact boundaries between the 10-yard end zones and 100-yard playing field

BALL MAPPING
- team-side notation now converts correctly into absolute field position
- example: NE attacking left-to-right, ball at SEA 42 = field yard 58
- the previous implementation incorrectly put SEA 42 at 92% of the field

SCENE
- regulation field is completed first, then one perspective transform is applied to the whole field
- end zones are no longer independently oversized
- goal posts remain in a separate stadium layer at the backs of the end zones
