 WITH active_stints AS (
         SELECT DISTINCT ON (add_tx.player_id, add_tx.league_id, s_1.season_id) add_tx.player_id,
            add_tx.team_id,
            add_tx.league_id,
            add_tx.ranking_points AS points_at_acquisition,
            s_1.season_id,
            add_tx.transaction_date AS added_at
           FROM player_transactions add_tx
             JOIN seasons s_1 ON add_tx.transaction_date <= s_1.end_date
          WHERE add_tx.transaction_type = 'add'::text AND NOT (EXISTS ( SELECT 1
                   FROM player_transactions drop_tx
                  WHERE drop_tx.player_id = add_tx.player_id AND drop_tx.team_id = add_tx.team_id AND drop_tx.league_id = add_tx.league_id AND drop_tx.transaction_type = 'drop'::text AND drop_tx.transaction_date > add_tx.transaction_date AND drop_tx.transaction_date <= s_1.end_date))
          ORDER BY add_tx.player_id, add_tx.league_id, s_1.season_id, add_tx.transaction_date DESC
        )
 SELECT l.league_id,
    l.league_name,
    t.id AS team_id,
    t.name AS team_name,
    s.season_id,
    s.season_name,
    p.player_id,
    p.name AS player_name,
    p.gender,
    a.points_at_acquisition,
    COALESCE(sum(pp.points), 0::bigint) AS total_points
   FROM active_stints a
     JOIN seasons s ON s.season_id = a.season_id
     JOIN teams t ON t.id = a.team_id
     JOIN leagues l ON l.league_id = a.league_id
     JOIN players p ON p.player_id = a.player_id
     LEFT JOIN player_points pp ON pp.player_id = a.player_id AND pp.season_id = a.season_id
  GROUP BY l.league_id, l.league_name, t.id, t.name, s.season_id, s.season_name, p.player_id, p.name, p.gender, a.points_at_acquisition
  ORDER BY s.season_id, l.league_id, t.name, (COALESCE(sum(pp.points), 0::bigint)) DESC;