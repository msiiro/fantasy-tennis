SELECT
    l.league_id,
    l.league_name,
    t.id AS team_id,
    t.name AS team_name,
    s.season_id,
    s.season_name,
    COALESCE(SUM(pp.points), 0) AS total_points
FROM teams t
JOIN leagues l ON l.league_id = t.league_id
CROSS JOIN seasons s
-- Find players who were on this team at any point during the season:
-- added before or during the season, and not dropped before the season started
LEFT JOIN player_transactions add_tx
    ON add_tx.team_id = t.id
    AND add_tx.league_id = l.league_id
    AND add_tx.transaction_type = 'add'
    AND add_tx.transaction_date <= s.end_date
    AND NOT EXISTS (
        SELECT 1
        FROM player_transactions drop_tx
        WHERE drop_tx.player_id = add_tx.player_id
          AND drop_tx.team_id = add_tx.team_id
          AND drop_tx.league_id = add_tx.league_id
          AND drop_tx.transaction_type = 'drop'
          AND drop_tx.transaction_date < s.start_date
    )
LEFT JOIN player_points pp
    ON pp.player_id = add_tx.player_id
    AND pp.season_id = s.season_id
GROUP BY l.league_id, l.league_name, t.id, t.name, s.season_id, s.season_name
ORDER BY s.season_id, l.league_id, total_points DESC;