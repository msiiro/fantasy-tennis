 SELECT t.unique_tournament_id,
    t.unique_tournament_name AS tournament_name,
    t.tournament_type AS level,
        CASE
            WHEN t.category_slug = ANY (ARRAY['atp'::text, 'challenger'::text, 'itf-men'::text]) THEN 'ATP'::text
            WHEN t.category_slug = ANY (ARRAY['wta'::text, 'wta-125'::text, 'itf-women'::text]) THEN 'WTA'::text
            ELSE t.category_slug
        END AS tour,
    min(m.match_date) AS tournament_start,
        CASE
            WHEN f.match_id IS NOT NULL THEN max(m.match_date)
            ELSE NULL::timestamp with time zone
        END AS tournament_end,
        CASE
            WHEN f.match_id IS NOT NULL THEN 'Finished'::text
            ELSE 'Ongoing'::text
        END AS status,
        CASE
            WHEN f.match_id IS NOT NULL AND f.winner_code = 1 THEN p1.name
            WHEN f.match_id IS NOT NULL AND f.winner_code = 2 THEN p2.name
            ELSE NULL::text
        END AS winner
   FROM unique_tournaments t
     LEFT JOIN tennis_matches m ON m.unique_tournament_id = t.unique_tournament_id
     LEFT JOIN LATERAL ( SELECT tennis_matches.match_id,
            tennis_matches.winner_code,
            tennis_matches.player1_id,
            tennis_matches.player2_id
           FROM tennis_matches
          WHERE tennis_matches.unique_tournament_id = t.unique_tournament_id AND tennis_matches.round_name = 'Final'::text AND tennis_matches.status_type = 'finished'::text
         LIMIT 1) f ON true
     LEFT JOIN players p1 ON p1.player_id = f.player1_id
     LEFT JOIN players p2 ON p2.player_id = f.player2_id
  GROUP BY t.unique_tournament_id, t.unique_tournament_name, t.tournament_type, t.category_slug, f.match_id, f.winner_code, f.player1_id, f.player2_id, p1.name, p2.name;