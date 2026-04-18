 SELECT p.player_id,
    p.name AS player_name,
    p.gender,
    'tournament'::text AS source,
    pts.unique_tournament_name AS description,
    COALESCE(pts.placement_points, 0) AS points,
    pts.last_match_date AS event_date
   FROM players p
     JOIN player_tournament_summary pts ON pts.player_id = p.player_id
UNION ALL
 SELECT p.player_id,
    p.name AS player_name,
    p.gender,
    'adjustment'::text AS source,
    adj.description,
    adj.points,
    adj.event_date
   FROM players p
     JOIN player_points_adjustments adj ON adj.player_id = p.player_id;