 SELECT pr.id,
    pr.ranking_date,
    pr.ranking_type,
    pr.rank,
    pr.points,
    pr.ranking_movement,
    pr.tournaments_played,
    p.player_id,
    p.name AS player_name,
    p.short_name,
    p.country,
    p.country_code,
    p.gender,
    pr.points - lag(pr.points) OVER (PARTITION BY pr.player_id, pr.ranking_type ORDER BY pr.ranking_date) AS points_change
   FROM player_rankings pr
     JOIN players p ON p.player_id = pr.player_id
  ORDER BY pr.ranking_date DESC, pr.rank;