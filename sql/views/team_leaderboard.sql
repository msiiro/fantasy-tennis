 WITH latest_add AS (
         SELECT DISTINCT ON (player_transactions.player_id, player_transactions.league_id) player_transactions.league_id,
            player_transactions.team_id,
            player_transactions.player_id,
            player_transactions.transaction_date AS added_at,
            player_transactions.season_id
           FROM player_transactions
          WHERE player_transactions.transaction_type = 'add'::text
          ORDER BY player_transactions.player_id, player_transactions.league_id, player_transactions.transaction_date DESC
        ), active_roster AS (
         SELECT a.league_id,
            a.team_id,
            a.player_id,
            a.added_at,
            a.season_id,
            s.start_date AS season_start
           FROM latest_add a
             JOIN seasons s ON s.season_id = a.season_id
          WHERE NOT (EXISTS ( SELECT 1
                   FROM player_transactions drop_tx
                  WHERE drop_tx.player_id = a.player_id AND drop_tx.league_id = a.league_id AND drop_tx.transaction_type = 'drop'::text AND drop_tx.transaction_date > a.added_at))
        ), active_player_points AS (
         SELECT ar.team_id,
            ar.league_id,
            ar.player_id,
            COALESCE(sum(pp.points), 0::bigint) AS points_earned
           FROM active_roster ar
             LEFT JOIN player_points pp ON pp.player_id = ar.player_id AND pp.event_date >= ar.season_start
          GROUP BY ar.team_id, ar.league_id, ar.player_id
        ), banked_points AS (
         SELECT player_transactions.team_id,
            player_transactions.league_id,
            COALESCE(sum(player_transactions.points_banked), 0::bigint) AS points_from_dropped
           FROM player_transactions
          WHERE player_transactions.transaction_type = 'drop'::text
          GROUP BY player_transactions.team_id, player_transactions.league_id
        )
 SELECT l.league_id,
    l.league_name,
    t.id AS team_id,
    t.name AS team_name,
    COALESCE(sum(ap.points_earned), 0::numeric) + COALESCE(max(bp.points_from_dropped), 0::bigint)::numeric AS total_points,
    rank() OVER (PARTITION BY l.league_id ORDER BY (COALESCE(sum(ap.points_earned), 0::numeric) + COALESCE(max(bp.points_from_dropped), 0::bigint)::numeric) DESC) AS rank
   FROM teams t
     JOIN leagues l ON l.league_id = t.league_id
     LEFT JOIN active_player_points ap ON ap.team_id = t.id AND ap.league_id = l.league_id
     LEFT JOIN banked_points bp ON bp.team_id = t.id AND bp.league_id = l.league_id
  GROUP BY l.league_id, l.league_name, t.id, t.name
  ORDER BY l.league_id, (rank() OVER (PARTITION BY l.league_id ORDER BY (COALESCE(sum(ap.points_earned), 0::numeric) + COALESCE(max(bp.points_from_dropped), 0::bigint)::numeric) DESC));