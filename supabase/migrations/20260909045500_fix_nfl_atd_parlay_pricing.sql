-- v83 — fix NFL ATD point-parlay pricing while preserving MLB HR behavior.
--
-- The v81 function applied the configured house edge to EVERY leg before
-- multiplying. That makes the same house edge compound repeatedly as more ATD
-- legs are added. For an all-NFL-ATD wager we now multiply the raw TSO model
-- probabilities first, then apply the house edge ONCE to the joint probability.
-- A single ATD leg is unchanged. MLB HR keeps its existing per-leg shading and
-- optional correlation adjustment.

-- Replace the old 2-argument function so the browser/validator can again pass
-- correlation_adjustment while 2-argument callers still work via the default.
drop function if exists place_wager(integer, jsonb);

create or replace function place_wager(
  stake_amount integer,
  legs_json jsonb,
  correlation_adjustment numeric default 1
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id           uuid := auth.uid();
  v_house_edge        numeric;
  v_max_multiplier    numeric;
  v_combined_odds     numeric := 1;
  v_joint_prob        numeric := 1;
  v_leg               jsonb;
  v_leg_odds          numeric;
  v_prob              numeric;
  v_shaded_prob       numeric;
  v_wager_id          bigint;
  v_potential_payout  integer;
  v_rows_updated      integer;
  v_leg_sport         text;
  v_leg_market        text;
  v_first_sport       text := null;
  v_wager_sport       text := null;
  v_all_nfl_atd       boolean := true;
  v_corr              numeric := greatest(0.5, least(2.0, coalesce(correlation_adjustment,1)));
begin
  if v_user_id is null then raise exception 'not signed in'; end if;
  if stake_amount is null or stake_amount <= 0 then raise exception 'stake must be positive'; end if;
  if legs_json is null or jsonb_typeof(legs_json) <> 'array' or jsonb_array_length(legs_json) = 0 then
    raise exception 'at least one leg is required';
  end if;

  select value into v_house_edge from wager_config where key='house_edge';
  select value into v_max_multiplier from wager_config where key='max_payout_multiplier';
  v_house_edge := coalesce(v_house_edge,0.07);
  v_max_multiplier := coalesce(v_max_multiplier,20);

  -- Validate first, before moving points.
  for v_leg in select * from jsonb_array_elements(legs_json)
  loop
    v_leg_market := upper(trim(coalesce(v_leg->>'market', case when lower(coalesce(v_leg->>'sport','mlb'))='nfl' then '' else 'HR' end)));
    v_leg_sport := lower(trim(coalesce(v_leg->>'sport', case when v_leg_market='ATD' then 'nfl' else 'mlb' end)));

    if v_leg_sport='mlb' and v_leg_market in ('HR','HOME RUN','HR_0.5+') then
      v_leg_market := 'HR';
    elsif v_leg_sport='nfl' and v_leg_market in ('ATD','ANYTIME TD','ANYTIME TOUCHDOWN','ATD_0.5+') then
      v_leg_market := 'ATD';
    else
      raise exception 'unsupported wager market: % %',v_leg_sport,v_leg_market;
    end if;

    if nullif(v_leg->>'player_id','') is null or nullif(v_leg->>'game_pk','') is null or nullif(v_leg->>'slate_date','') is null then
      raise exception 'each leg needs a real player, game, and slate date';
    end if;

    v_prob := (v_leg->>'probability')::numeric;
    if v_prob is null or v_prob <= 0 or v_prob >= 1 then raise exception 'invalid probability on a leg'; end if;

    if not (v_leg_sport='nfl' and v_leg_market='ATD') then v_all_nfl_atd := false; end if;
    v_joint_prob := v_joint_prob * v_prob;

    if v_first_sport is null then
      v_first_sport := v_leg_sport; v_wager_sport := v_leg_sport;
    elsif v_first_sport <> v_leg_sport then
      v_wager_sport := 'mixed';
    end if;
  end loop;

  update point_balances
     set balance=balance-stake_amount, updated_at=now()
   where user_id=v_user_id and balance>=stake_amount;
  get diagnostics v_rows_updated=row_count;
  if v_rows_updated=0 then raise exception 'insufficient balance'; end if;

  if v_all_nfl_atd then
    -- Joint probability first, then one house-edge application.
    v_shaded_prob := least(0.90, v_joint_prob * (1 + v_house_edge));
    if v_shaded_prob <= 0 then raise exception 'invalid combined probability'; end if;
    v_combined_odds := 1 / v_shaded_prob;
  else
    -- Existing MLB/mixed behavior: per-leg shading plus the bounded same-game
    -- correlation adjustment supplied by the MLB simulation UI.
    v_combined_odds := 1;
    for v_leg in select * from jsonb_array_elements(legs_json)
    loop
      v_prob := (v_leg->>'probability')::numeric;
      v_shaded_prob := least(0.90, v_prob * (1 + v_house_edge));
      if v_shaded_prob <= 0 then raise exception 'invalid probability on a leg'; end if;
      v_combined_odds := v_combined_odds * (1 / v_shaded_prob);
    end loop;
    v_combined_odds := v_combined_odds / v_corr;
  end if;

  v_combined_odds := least(v_combined_odds,v_max_multiplier);
  v_potential_payout := round(stake_amount*v_combined_odds);

  insert into wagers(user_id,sport,stake,combined_decimal_odds,potential_payout)
  values(v_user_id,coalesce(v_wager_sport,'mlb'),stake_amount,v_combined_odds,v_potential_payout)
  returning id into v_wager_id;

  for v_leg in select * from jsonb_array_elements(legs_json)
  loop
    v_leg_market := upper(trim(coalesce(v_leg->>'market',case when lower(coalesce(v_leg->>'sport','mlb'))='nfl' then '' else 'HR' end)));
    v_leg_sport := lower(trim(coalesce(v_leg->>'sport',case when v_leg_market='ATD' then 'nfl' else 'mlb' end)));
    if v_leg_sport='mlb' then v_leg_market:='HR'; else v_leg_market:='ATD'; end if;
    v_prob := (v_leg->>'probability')::numeric;
    v_shaded_prob := least(0.90,v_prob*(1+v_house_edge));
    v_leg_odds := 1/v_shaded_prob;

    insert into wager_legs(
      wager_id,sport,player_id,player_name,game_pk,slate_date,
      market,probability_at_wager,leg_decimal_odds
    ) values(
      v_wager_id,v_leg_sport,(v_leg->>'player_id')::integer,v_leg->>'player_name',
      (v_leg->>'game_pk')::integer,(v_leg->>'slate_date')::date,
      v_leg_market,v_prob,v_leg_odds
    );
  end loop;

  insert into point_transactions(user_id,type,amount,wager_id,note)
  values(v_user_id,'wager_placed',-stake_amount,v_wager_id,null);

  return v_wager_id;
end;
$$;
