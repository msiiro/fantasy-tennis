 WITH player_tournament_matches AS (
         SELECT pm.player_id,
            pm.player_name,
            pm.player_short_name,
            pm.country,
            pm.gender,
            pm.tournament_id,
            pm.tournament_name,
            pm.season_year,
            pm.category_slug,
            pm.tournament_type,
            pm.ground_type,
            ut.unique_tournament_id,
            ut.unique_tournament_name,
            pm.round_name,
            pm.round_number,
            pm.match_date,
            pm.is_winner,
            pm.points_earned,
            pr.points_for_place,
            pr.points_for_play
           FROM player_matches pm
             JOIN tournaments t ON pm.tournament_id = t.tournament_id
             JOIN unique_tournaments ut ON t.unique_tournament_id = ut.unique_tournament_id
             LEFT JOIN points_reference pr ON pr.category_slug = pm.category_slug AND pr.tournament_type = pm.tournament_type AND pr.round_name = pm.round_name
        ), last_match AS (
         SELECT player_tournament_matches.player_id,
            player_tournament_matches.unique_tournament_id,
            max(player_tournament_matches.match_date) AS last_match_date
           FROM player_tournament_matches
          GROUP BY player_tournament_matches.player_id, player_tournament_matches.unique_tournament_id
        ), player_tournament_agg AS (
         SELECT ptm.player_id,
            ptm.player_name,
            ptm.player_short_name,
            ptm.country,
            ptm.gender,
            ptm.unique_tournament_id,
            ptm.unique_tournament_name,
            ptm.season_year,
            ptm.category_slug,
            ptm.tournament_type,
            ptm.ground_type,
            lm.last_match_date,
            sum(ptm.points_earned) AS match_points_earned,
            count(*) FILTER (WHERE ptm.is_winner) AS total_wins,
            max(ptm.round_number) AS deepest_round_number,
            bool_or(ptm.is_winner) FILTER (WHERE ptm.match_date = lm.last_match_date) AS last_match_won,
            max(ptm.round_name) FILTER (WHERE NOT ptm.is_winner) AS elimination_round,
            bool_or(ptm.is_winner AND ptm.round_name = 'Final'::text) AS is_champion
           FROM player_tournament_matches ptm
             JOIN last_match lm ON lm.player_id = ptm.player_id AND lm.unique_tournament_id = ptm.unique_tournament_id
          GROUP BY ptm.player_id, ptm.player_name, ptm.player_short_name, ptm.country, ptm.gender, ptm.unique_tournament_id, ptm.unique_tournament_name, ptm.season_year, ptm.category_slug, ptm.tournament_type, ptm.ground_type, lm.last_match_date
        )
 SELECT pta.player_id,
    pta.player_name,
    pta.player_short_name,
    pta.country,
    pta.gender,
    pta.unique_tournament_id,
    pta.unique_tournament_name,
    pta.season_year,
    pta.category_slug,
    pta.tournament_type,
    pta.ground_type,
    pta.last_match_date,
    pta.deepest_round_number,
    pta.total_wins,
        CASE
            WHEN pta.is_champion THEN false
            WHEN pta.last_match_won THEN true
            ELSE false
        END AS is_active,
        CASE
            WHEN pta.is_champion THEN 'Champion'::text
            WHEN NOT pta.last_match_won THEN pta.elimination_round
            ELSE NULL::text
        END AS elimination_round,
        CASE
            WHEN pta.is_champion THEN pr_champ.points_for_place
            WHEN NOT pta.last_match_won AND pta.total_wins = 0 THEN COALESCE(pr_elim.points_for_play, 0)
            WHEN NOT pta.last_match_won THEN COALESCE(pr_elim.points_for_place, 0)
            ELSE NULL::integer
        END AS placement_points,
    pta.match_points_earned
   FROM player_tournament_agg pta
     LEFT JOIN points_reference pr_champ ON pr_champ.category_slug = pta.category_slug AND pr_champ.tournament_type = pta.tournament_type AND pr_champ.round_name = 'Champion'::text
     LEFT JOIN points_reference pr_elim ON pr_elim.category_slug = pta.category_slug AND pr_elim.tournament_type = pta.tournament_type AND pr_elim.round_name = pta.elimination_round;