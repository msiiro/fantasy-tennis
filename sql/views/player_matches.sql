 SELECT m.match_id,
    m.match_date,
    m.round_name,
    m.round_number,
    m.status_description,
    t.tournament_id,
    t.tournament_name,
    t.season_year,
    ut.category_slug,
    ut.tournament_type,
    ut.ground_type,
    p.player_id,
    p.name AS player_name,
    p.short_name AS player_short_name,
    p.country,
    p.gender,
        CASE
            WHEN m.player1_id = p.player_id THEN m.winner_code = 1
            ELSE m.winner_code = 2
        END AS is_winner,
        CASE
            WHEN m.player1_id = p.player_id THEN m.player1_score_current
            ELSE m.player2_score_current
        END AS sets_won,
        CASE
            WHEN m.player1_id = p.player_id THEN m.player2_id
            ELSE m.player1_id
        END AS opponent_id,
    opp.name AS opponent_name,
        CASE
            WHEN m.player1_id = p.player_id AND m.winner_code = 1 OR m.player2_id = p.player_id AND m.winner_code = 2 THEN COALESCE(apr.points_for_win, 0) + COALESCE(apr.points_for_play, 0)
            ELSE COALESCE(apr.points_for_play, 0)
        END AS points_earned
   FROM tennis_matches m
     JOIN players p ON p.player_id = m.player1_id OR p.player_id = m.player2_id
     JOIN players opp ON opp.player_id =
        CASE
            WHEN m.player1_id = p.player_id THEN m.player2_id
            ELSE m.player1_id
        END
     JOIN tournaments t ON m.tournament_id = t.tournament_id
     JOIN unique_tournaments ut ON t.unique_tournament_id = ut.unique_tournament_id
     LEFT JOIN points_reference apr ON apr.category_slug = ut.category_slug AND apr.tournament_type = ut.tournament_type AND apr.round_name = m.round_name;