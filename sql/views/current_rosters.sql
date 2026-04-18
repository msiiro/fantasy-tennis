 WITH latest_add AS (
         SELECT DISTINCT ON (player_transactions.player_id, player_transactions.league_id) player_transactions.transaction_id,
            player_transactions.league_id,
            player_transactions.team_id,
            player_transactions.player_id,
            player_transactions.ranking_points,
            player_transactions.transaction_date
           FROM player_transactions
          WHERE player_transactions.transaction_type = 'add'::text
          ORDER BY player_transactions.player_id, player_transactions.league_id, player_transactions.transaction_date DESC
        )
 SELECT l.league_id,
    l.league_name,
    t.id AS team_id,
    t.name AS team_name,
    p.player_id,
    p.name AS player_name,
    p.gender,
    p.country,
    a.ranking_points AS points_at_acquisition,
    a.transaction_date AS acquired_date,
    COALESCE(( SELECT sum(pp.points) AS sum
           FROM player_points pp
          WHERE pp.player_id = p.player_id), 0::bigint) AS total_points_earned
   FROM latest_add a
     JOIN teams t ON t.id = a.team_id
     JOIN leagues l ON l.league_id = a.league_id
     JOIN players p ON p.player_id = a.player_id
  WHERE NOT (EXISTS ( SELECT 1
           FROM player_transactions drop_tx
          WHERE drop_tx.player_id = a.player_id AND drop_tx.league_id = a.league_id AND drop_tx.transaction_type = 'drop'::text AND drop_tx.transaction_date > a.transaction_date));