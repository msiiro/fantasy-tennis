SELECT
    m.match_id,
    m.match_date,
    m.match_type,
    m.gender,
    m.round_name,
    m.round_number,
    m.status_description,
    m.winner_code,
    m.first_to_serve,
    m.player1_id,
    p1.name AS player1_name,
    p1.short_name AS player1_short_name,
    p1.country AS player1_country,
    m.player1_score_current,
    m.player1_set1_score,
    m.player1_set2_score,
    m.player1_set3_score,
    m.player1_set4_score,
    m.player1_set5_score,
    m.player2_id,
    p2.name AS player2_name,
    p2.short_name AS player2_short_name,
    p2.country AS player2_country,
    m.player2_score_current,
    m.player2_set1_score,
    m.player2_set2_score,
    m.player2_set3_score,
    m.player2_set4_score,
    m.player2_set5_score,
    t.tournament_id,
    t.tournament_name,
    t.season_year,
    ut.unique_tournament_name,
    ut.category_name,
    ut.category_slug,
    ut.tournament_type,
    ut.ground_type,
    ut.tennis_points,
    pr.points_at_stake,
    s.season_id
FROM tennis_matches m
JOIN players p1 ON m.player1_id = p1.player_id
JOIN players p2 ON m.player2_id = p2.player_id
JOIN tournaments t ON m.tournament_id = t.tournament_id
JOIN unique_tournaments ut ON t.unique_tournament_id = ut.unique_tournament_id
LEFT JOIN points_reference pr
    ON ut.category_slug = pr.category_slug
    AND ut.tournament_type = pr.tournament_type
    AND m.round_name = pr.round_name
LEFT JOIN seasons s
    ON m.match_date >= s.start_date
    AND m.match_date <= s.end_date;