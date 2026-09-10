TSO v88.6d — Exact Concept + Regulation Geometry

This pass changes the strategy.

Instead of attempting to recreate the approved concept's stadium atmosphere with
more CSS, v88.6d uses a concept-derived transparent stadium shell. It preserves
the exact approved crowd, lights, TSO boards, side environment, cameras and
proper goal-post appearance.

The entire old field/play area is transparent in that shell. A new field is
rendered beneath it from an immutable regulation coordinate model:

  0..10       left end zone
  10..110     100-yard field of play
  110..120    right end zone

Major labels are generated:
  10 20 30 40 50 40 30 20 10

The far-side labels are rotated 180 degrees. Yard lines are generated every
5 yards. Hash marks are generated from the same coordinate model.

Dynamic chibi players are then placed using the same perspective coordinate
mapping rather than arbitrary CSS percentages. Players closer to the camera
scale larger automatically, giving the scene stronger 3D depth.

The existing TSO score header remains the existing header. v88.6d also makes
possessionAbbr accept home/away or a team abbreviation so the football icon in
that existing header can reliably render for demo/live data.

The lower Current Play / Featured Player cards receive the existing player
record (`p`) so they can use the actual stored player headshot.
