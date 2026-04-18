


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_points INTEGER;
BEGIN
    SELECT points_for_win
    INTO v_points
    FROM atp_points_reference
    WHERE category_slug = p_category_slug
      AND tournament_type = p_tournament_type
      AND (round_name = p_round_name OR (round_name IS NULL AND p_round_name IS NULL))
      AND (round_type = p_round_type OR (round_type IS NULL AND p_round_type IS NULL))
    LIMIT 1;
    
    RETURN COALESCE(v_points, 0);
END;
$$;


ALTER FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer, "p_is_winner" boolean) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_points INTEGER;
BEGIN
    SELECT 
        CASE WHEN p_is_winner THEN points_winner ELSE points_loser END
    INTO v_points
    FROM atp_points_reference
    WHERE category_slug = p_category_slug
      AND tournament_type = p_tournament_type
      AND (round_name = p_round_name OR (round_name IS NULL AND p_round_name IS NULL))
      AND (round_type = p_round_type OR (round_type IS NULL AND p_round_type IS NULL))
    LIMIT 1;
    
    RETURN COALESCE(v_points, 0);
END;
$$;


ALTER FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer, "p_is_winner" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, username, team_name)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1) || '''s Team'
  );
  
  -- Create a team for the new user
  INSERT INTO public.teams (user_id, total_points)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_unlogged_matches"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    matches_processed INTEGER := 0;
    points_awarded INTEGER := 0;
    v_match RECORD;
    v_winner_id INTEGER;
    v_points INTEGER;
BEGIN
    -- Loop through all finished matches that don't have points logged
    FOR v_match IN
        SELECT 
            tm.match_id,
            tm.match_date,
            tm.player1_id,
            tm.player2_id,
            tm.winner_code,
            tm.category_slug,
            tm.tournament_type,
            tm.round_name,
            tm.round_type
        FROM tennis_matches tm
        WHERE tm.status_type = 'finished'
          AND tm.winner_code IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 
              FROM match_points mp 
              WHERE mp.match_id = tm.match_id
          )
    LOOP
        -- Determine the winner's player_id
        IF v_match.winner_code = 1 THEN
            v_winner_id := v_match.player1_id;
        ELSIF v_match.winner_code = 2 THEN
            v_winner_id := v_match.player2_id;
        ELSE
            -- Invalid winner_code, skip this match
            CONTINUE;
        END IF;
        
        -- Look up points from atp_points_reference
        SELECT points_for_win INTO v_points
        FROM atp_points_reference
        WHERE category_slug = v_match.category_slug
          AND tournament_type = v_match.tournament_type
          AND round_name = v_match.round_name
        LIMIT 1;
        
        -- If no points found, try alternative matching or set default
        IF v_points IS NULL THEN
            -- You might want to add fallback logic here
            -- For now, we'll skip matches without point definitions
            CONTINUE;
        END IF;
        
        -- Insert into match_points
        INSERT INTO match_points (player_id, match_id, match_date, points_earned)
        VALUES (v_winner_id, v_match.match_id, v_match.match_date, v_points)
        ON CONFLICT (match_id, player_id) 
            DO UPDATE SET 
            points_earned = EXCLUDED.points_earned;
        
        matches_processed := matches_processed + 1;
        points_awarded := points_awarded + v_points;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'matches_processed', matches_processed,
        'total_points_awarded', points_awarded
    );
END;$$;


ALTER FUNCTION "public"."process_unlogged_matches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tournaments_from_matches"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Insert into unique_tournaments if not already present
    INSERT INTO unique_tournaments (
        unique_tournament_id,
        unique_tournament_name,
        unique_tournament_slug,
        category_id,
        category_name,
        category_slug,
        tournament_type,
        ground_type,
        tennis_points,
        created_at,
        updated_at
    )
    VALUES (
        NEW.unique_tournament_id,
        NEW.unique_tournament_name,
        NEW.unique_tournament_slug,
        NEW.category_id,
        NEW.category_name,
        NEW.category_slug,
        NEW.tournament_type,
        NEW.ground_type,
        NEW.tennis_points,
        NOW(),
        NOW()
    )
    ON CONFLICT (unique_tournament_id) DO NOTHING;

    -- Insert into tournaments if not already present
    INSERT INTO tournaments (
        tournament_id,
        tournament_name,
        tournament_slug,
        unique_tournament_id,
        season_id,
        season_name,
        season_year,
        created_at,
        updated_at
    )
    VALUES (
        NEW.tournament_id,
        NEW.tournament_name,
        NEW.tournament_slug,
        NEW.unique_tournament_id,
        NEW.season_id,
        NEW.season_name,
        NEW.season_year,
        NOW(),
        NOW()
    )
    ON CONFLICT (tournament_id) DO NOTHING;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_tournaments_from_matches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_all_team_points"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    players_updated INTEGER;
    teams_updated INTEGER;
BEGIN
    -- Update all player season points
    UPDATE teams_players
    SET season_points = (
        SELECT COALESCE(SUM(mp.points_earned), 0)
        FROM match_points mp
        WHERE mp.player_id = teams_players.player_id
    ),
    updated_at = NOW()
    WHERE true;  -- Add this line!
    
    GET DIAGNOSTICS players_updated = ROW_COUNT;
    
    -- Update all team current points
    UPDATE teams
    SET current_points = (
        SELECT COALESCE(SUM(tp.season_points), 0)
        FROM teams_players tp
        WHERE tp.team_id = teams.id
    ),
    updated_at = NOW()
    WHERE true;  -- Add this line!
    
    GET DIAGNOSTICS teams_updated = ROW_COUNT;
    
    -- Return results
    RETURN json_build_object(
        'success', true,
        'players_updated', players_updated,
        'teams_updated', teams_updated
    );
END;
$$;


ALTER FUNCTION "public"."update_all_team_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_match_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_winner_id BIGINT;
    v_points INTEGER;
BEGIN
    -- Only process finished matches
    IF NEW.status_type != 'finished' THEN
        RETURN NEW;
    END IF;
    
    -- Determine the winner's player_id
    v_winner_id := CASE 
        WHEN NEW.winner_code = 1 THEN NEW.player1_id
        WHEN NEW.winner_code = 2 THEN NEW.player2_id
        ELSE NULL
    END;
    
    -- If no valid winner, skip
    IF v_winner_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get points from reference table
    v_points := get_match_points(
        NEW.category_slug,
        NEW.tournament_type,
        NEW.round_name,
        NEW.round_type
    );
    
    -- Insert or update match_points
    INSERT INTO match_points (
        player_id,
        match_id,
        match_date,
        points_earned
    ) VALUES (
        v_winner_id,
        NEW.match_id,
        NEW.match_date,
        v_points
    )
    ON CONFLICT (match_id) 
    DO UPDATE SET
        player_id = EXCLUDED.player_id,
        match_date = EXCLUDED.match_date,
        points_earned = EXCLUDED.points_earned;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_match_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_teams_current_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the current_points for all teams that have this player
    UPDATE teams
    SET current_points = (
        SELECT COALESCE(SUM(tp.season_points), 0)
        FROM teams_players tp
        WHERE tp.team_id = teams.id
    )
    WHERE team_id IN (
        SELECT team_id 
        FROM teams_players 
        WHERE player_id = NEW.player_id
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_teams_current_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_teams_players_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the season_points for the player
    UPDATE teams_players
    SET season_points = (
        SELECT COALESCE(SUM(points_earned), 0)
        FROM match_points
        WHERE player_id = NEW.player_id
    )
    WHERE player_id = NEW.player_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_teams_players_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "flag_emoji" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "league_id" bigint NOT NULL,
    "league_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


COMMENT ON TABLE "public"."leagues" IS 'league dimension table';



CREATE TABLE IF NOT EXISTS "public"."players" (
    "player_id" bigint NOT NULL,
    "name" "text",
    "slug" "text",
    "short_name" "text",
    "country" "text",
    "country_code" "text",
    "gender" "text",
    "disabled" boolean DEFAULT false,
    "national" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_reference" (
    "id" integer NOT NULL,
    "category_slug" "text" NOT NULL,
    "tournament_type" "text" NOT NULL,
    "round_name" "text" NOT NULL,
    "points_for_place" integer DEFAULT 0 NOT NULL,
    "points_for_win" integer DEFAULT 0 NOT NULL,
    "points_for_play" integer DEFAULT 0 NOT NULL,
    "points_at_stake" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."points_reference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tennis_matches" (
    "match_id" bigint NOT NULL,
    "player1_id" bigint,
    "player2_id" bigint,
    "player1_score_current" integer,
    "player1_score_display" integer,
    "player1_set1_score" integer,
    "player1_set2_score" integer,
    "player1_set3_score" integer,
    "player1_set4_score" integer,
    "player1_set5_score" integer,
    "player1_set1_tiebreak" integer,
    "player1_set2_tiebreak" integer,
    "player1_set3_tiebreak" integer,
    "player1_current_point" "text",
    "player2_score_current" integer,
    "player2_score_display" integer,
    "player2_set1_score" integer,
    "player2_set2_score" integer,
    "player2_set3_score" integer,
    "player2_set4_score" integer,
    "player2_set5_score" integer,
    "player2_set1_tiebreak" integer,
    "player2_set2_tiebreak" integer,
    "player2_set3_tiebreak" integer,
    "player2_current_point" "text",
    "status_code" integer,
    "status_description" "text",
    "status_type" "text",
    "winner_code" integer,
    "first_to_serve" integer,
    "tournament_id" bigint,
    "tournament_name" "text",
    "tournament_slug" "text",
    "unique_tournament_id" bigint,
    "unique_tournament_name" "text",
    "unique_tournament_slug" "text",
    "category_id" integer,
    "category_name" "text",
    "category_slug" "text",
    "season_id" bigint,
    "season_name" "text",
    "season_year" "text",
    "round_number" integer,
    "round_name" "text",
    "round_type" integer,
    "ground_type" "text",
    "tennis_points" integer,
    "start_timestamp" bigint,
    "match_date" timestamp with time zone,
    "gender" "text",
    "match_type" "text",
    "level" "text",
    "tournament_type" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tennis_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "tournament_id" integer NOT NULL,
    "tournament_name" "text" NOT NULL,
    "tournament_slug" "text" NOT NULL,
    "unique_tournament_id" integer NOT NULL,
    "season_id" integer NOT NULL,
    "season_name" "text" NOT NULL,
    "season_year" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unique_tournaments" (
    "unique_tournament_id" integer NOT NULL,
    "unique_tournament_name" "text" NOT NULL,
    "unique_tournament_slug" "text" NOT NULL,
    "category_id" integer NOT NULL,
    "category_name" "text" NOT NULL,
    "category_slug" "text" NOT NULL,
    "tournament_type" "text",
    "ground_type" "text",
    "tennis_points" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."unique_tournaments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_matches" WITH ("security_invoker"='on') AS
 SELECT "m"."match_id",
    "m"."match_date",
    "m"."round_name",
    "m"."round_number",
    "m"."status_description",
    "t"."tournament_id",
    "t"."tournament_name",
    "t"."season_year",
    "ut"."category_slug",
    "ut"."tournament_type",
    "ut"."ground_type",
    "p"."player_id",
    "p"."name" AS "player_name",
    "p"."short_name" AS "player_short_name",
    "p"."country",
    "p"."gender",
        CASE
            WHEN ("m"."player1_id" = "p"."player_id") THEN ("m"."winner_code" = 1)
            ELSE ("m"."winner_code" = 2)
        END AS "is_winner",
        CASE
            WHEN ("m"."player1_id" = "p"."player_id") THEN "m"."player1_score_current"
            ELSE "m"."player2_score_current"
        END AS "sets_won",
        CASE
            WHEN ("m"."player1_id" = "p"."player_id") THEN "m"."player2_id"
            ELSE "m"."player1_id"
        END AS "opponent_id",
    "opp"."name" AS "opponent_name",
        CASE
            WHEN ((("m"."player1_id" = "p"."player_id") AND ("m"."winner_code" = 1)) OR (("m"."player2_id" = "p"."player_id") AND ("m"."winner_code" = 2))) THEN (COALESCE("apr"."points_for_win", 0) + COALESCE("apr"."points_for_play", 0))
            ELSE COALESCE("apr"."points_for_play", 0)
        END AS "points_earned"
   FROM ((((("public"."tennis_matches" "m"
     JOIN "public"."players" "p" ON ((("p"."player_id" = "m"."player1_id") OR ("p"."player_id" = "m"."player2_id"))))
     JOIN "public"."players" "opp" ON (("opp"."player_id" =
        CASE
            WHEN ("m"."player1_id" = "p"."player_id") THEN "m"."player2_id"
            ELSE "m"."player1_id"
        END)))
     JOIN "public"."tournaments" "t" ON (("m"."tournament_id" = "t"."tournament_id")))
     JOIN "public"."unique_tournaments" "ut" ON (("t"."unique_tournament_id" = "ut"."unique_tournament_id")))
     LEFT JOIN "public"."points_reference" "apr" ON ((("apr"."category_slug" = "ut"."category_slug") AND ("apr"."tournament_type" = "ut"."tournament_type") AND ("apr"."round_name" = "m"."round_name"))));


ALTER VIEW "public"."player_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_points_adjustments" (
    "id" integer NOT NULL,
    "player_id" bigint NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "unique_tournament_id" integer,
    "description" "text" NOT NULL,
    "event_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_points_adjustments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_tournament_summary" WITH ("security_invoker"='on') AS
 WITH "player_tournament_matches" AS (
         SELECT "pm"."player_id",
            "pm"."player_name",
            "pm"."player_short_name",
            "pm"."country",
            "pm"."gender",
            "pm"."tournament_id",
            "pm"."tournament_name",
            "pm"."season_year",
            "pm"."category_slug",
            "pm"."tournament_type",
            "pm"."ground_type",
            "ut"."unique_tournament_id",
            "ut"."unique_tournament_name",
            "pm"."round_name",
            "pm"."round_number",
            "pm"."match_date",
            "pm"."is_winner",
            "pm"."points_earned",
            "pr"."points_for_place",
            "pr"."points_for_play"
           FROM ((("public"."player_matches" "pm"
             JOIN "public"."tournaments" "t" ON (("pm"."tournament_id" = "t"."tournament_id")))
             JOIN "public"."unique_tournaments" "ut" ON (("t"."unique_tournament_id" = "ut"."unique_tournament_id")))
             LEFT JOIN "public"."points_reference" "pr" ON ((("pr"."category_slug" = "pm"."category_slug") AND ("pr"."tournament_type" = "pm"."tournament_type") AND ("pr"."round_name" = "pm"."round_name"))))
        ), "last_match" AS (
         SELECT "player_tournament_matches"."player_id",
            "player_tournament_matches"."unique_tournament_id",
            "max"("player_tournament_matches"."match_date") AS "last_match_date"
           FROM "player_tournament_matches"
          GROUP BY "player_tournament_matches"."player_id", "player_tournament_matches"."unique_tournament_id"
        ), "player_tournament_agg" AS (
         SELECT "ptm"."player_id",
            "ptm"."player_name",
            "ptm"."player_short_name",
            "ptm"."country",
            "ptm"."gender",
            "ptm"."unique_tournament_id",
            "ptm"."unique_tournament_name",
            "ptm"."season_year",
            "ptm"."category_slug",
            "ptm"."tournament_type",
            "ptm"."ground_type",
            "lm"."last_match_date",
            "sum"("ptm"."points_earned") AS "match_points_earned",
            "count"(*) FILTER (WHERE "ptm"."is_winner") AS "total_wins",
            "max"("ptm"."round_number") AS "deepest_round_number",
            "bool_or"("ptm"."is_winner") FILTER (WHERE ("ptm"."match_date" = "lm"."last_match_date")) AS "last_match_won",
            "max"("ptm"."round_name") FILTER (WHERE (NOT "ptm"."is_winner")) AS "elimination_round",
            "bool_or"(("ptm"."is_winner" AND ("ptm"."round_name" = 'Final'::"text"))) AS "is_champion"
           FROM ("player_tournament_matches" "ptm"
             JOIN "last_match" "lm" ON ((("lm"."player_id" = "ptm"."player_id") AND ("lm"."unique_tournament_id" = "ptm"."unique_tournament_id"))))
          GROUP BY "ptm"."player_id", "ptm"."player_name", "ptm"."player_short_name", "ptm"."country", "ptm"."gender", "ptm"."unique_tournament_id", "ptm"."unique_tournament_name", "ptm"."season_year", "ptm"."category_slug", "ptm"."tournament_type", "ptm"."ground_type", "lm"."last_match_date"
        )
 SELECT "pta"."player_id",
    "pta"."player_name",
    "pta"."player_short_name",
    "pta"."country",
    "pta"."gender",
    "pta"."unique_tournament_id",
    "pta"."unique_tournament_name",
    "pta"."season_year",
    "pta"."category_slug",
    "pta"."tournament_type",
    "pta"."ground_type",
    "pta"."last_match_date",
    "pta"."deepest_round_number",
    "pta"."total_wins",
        CASE
            WHEN "pta"."is_champion" THEN false
            WHEN "pta"."last_match_won" THEN true
            ELSE false
        END AS "is_active",
        CASE
            WHEN "pta"."is_champion" THEN 'Champion'::"text"
            WHEN (NOT "pta"."last_match_won") THEN "pta"."elimination_round"
            ELSE NULL::"text"
        END AS "elimination_round",
        CASE
            WHEN "pta"."is_champion" THEN "pr_champ"."points_for_place"
            WHEN ((NOT "pta"."last_match_won") AND ("pta"."total_wins" = 0)) THEN COALESCE("pr_elim"."points_for_play", 0)
            WHEN (NOT "pta"."last_match_won") THEN COALESCE("pr_elim"."points_for_place", 0)
            ELSE NULL::integer
        END AS "placement_points",
    "pta"."match_points_earned"
   FROM (("player_tournament_agg" "pta"
     LEFT JOIN "public"."points_reference" "pr_champ" ON ((("pr_champ"."category_slug" = "pta"."category_slug") AND ("pr_champ"."tournament_type" = "pta"."tournament_type") AND ("pr_champ"."round_name" = 'Champion'::"text"))))
     LEFT JOIN "public"."points_reference" "pr_elim" ON ((("pr_elim"."category_slug" = "pta"."category_slug") AND ("pr_elim"."tournament_type" = "pta"."tournament_type") AND ("pr_elim"."round_name" = "pta"."elimination_round"))));


ALTER VIEW "public"."player_tournament_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "season_id" integer NOT NULL,
    "season_name" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_points" WITH ("security_invoker"='on') AS
 SELECT "p"."player_id",
    "p"."name" AS "player_name",
    "p"."gender",
    'tournament'::"text" AS "source",
    "pts"."unique_tournament_name" AS "description",
    COALESCE("pts"."placement_points", 0) AS "points",
    "pts"."last_match_date" AS "event_date",
    "s"."season_id",
    "s"."season_name"
   FROM (("public"."players" "p"
     JOIN "public"."player_tournament_summary" "pts" ON (("pts"."player_id" = "p"."player_id")))
     LEFT JOIN "public"."seasons" "s" ON ((("pts"."last_match_date" >= "s"."start_date") AND ("pts"."last_match_date" <= "s"."end_date"))))
UNION ALL
 SELECT "p"."player_id",
    "p"."name" AS "player_name",
    "p"."gender",
    'adjustment'::"text" AS "source",
    "adj"."description",
    "adj"."points",
    "adj"."event_date",
    "s"."season_id",
    "s"."season_name"
   FROM (("public"."players" "p"
     JOIN "public"."player_points_adjustments" "adj" ON (("adj"."player_id" = "p"."player_id")))
     LEFT JOIN "public"."seasons" "s" ON ((("adj"."event_date" >= "s"."start_date") AND ("adj"."event_date" <= "s"."end_date"))))
  ORDER BY 6 DESC;


ALTER VIEW "public"."player_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_transactions" (
    "transaction_id" integer NOT NULL,
    "league_id" integer NOT NULL,
    "team_id" integer NOT NULL,
    "player_id" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "transaction_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ranking_points" integer,
    "ranking_date" "date",
    "season_id" integer,
    "points_freed" integer,
    "points_banked" integer,
    CONSTRAINT "player_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['add'::"text", 'drop'::"text"])))
);


ALTER TABLE "public"."player_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid",
    "current_points" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "league_id" bigint NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams"."updated_at" IS 'when the row was updated';



COMMENT ON COLUMN "public"."teams"."league_id" IS 'fk to league_id';



CREATE OR REPLACE VIEW "public"."current_rosters" WITH ("security_invoker"='on') AS
 WITH "latest_add" AS (
         SELECT DISTINCT ON ("player_transactions"."player_id", "player_transactions"."league_id") "player_transactions"."transaction_id",
            "player_transactions"."league_id",
            "player_transactions"."team_id",
            "player_transactions"."player_id",
            "player_transactions"."ranking_points",
            "player_transactions"."transaction_date"
           FROM "public"."player_transactions"
          WHERE ("player_transactions"."transaction_type" = 'add'::"text")
          ORDER BY "player_transactions"."player_id", "player_transactions"."league_id", "player_transactions"."transaction_date" DESC
        )
 SELECT "l"."league_id",
    "l"."league_name",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "p"."player_id",
    "p"."name" AS "player_name",
    "p"."gender",
    "p"."country",
    "a"."ranking_points" AS "points_at_acquisition",
    "a"."transaction_date" AS "acquired_date",
    COALESCE(( SELECT "sum"("pp"."points") AS "sum"
           FROM "public"."player_points" "pp"
          WHERE ("pp"."player_id" = "p"."player_id")), (0)::bigint) AS "total_points_earned"
   FROM ((("latest_add" "a"
     JOIN "public"."teams" "t" ON (("t"."id" = "a"."team_id")))
     JOIN "public"."leagues" "l" ON (("l"."league_id" = "a"."league_id")))
     JOIN "public"."players" "p" ON (("p"."player_id" = "a"."player_id")))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."player_transactions" "drop_tx"
          WHERE (("drop_tx"."player_id" = "a"."player_id") AND ("drop_tx"."league_id" = "a"."league_id") AND ("drop_tx"."transaction_type" = 'drop'::"text") AND ("drop_tx"."transaction_date" > "a"."transaction_date")))));


ALTER VIEW "public"."current_rosters" OWNER TO "postgres";


ALTER TABLE "public"."leagues" ALTER COLUMN "league_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leagues_league_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."match_fact" WITH ("security_invoker"='on') AS
 SELECT "m"."match_id",
    "m"."match_date",
    "m"."match_type",
    "m"."gender",
    "m"."round_name",
    "m"."round_number",
    "m"."status_description",
    "m"."winner_code",
    "m"."first_to_serve",
    "m"."player1_id",
    "p1"."name" AS "player1_name",
    "p1"."short_name" AS "player1_short_name",
    "p1"."country" AS "player1_country",
    "m"."player1_score_current",
    "m"."player1_set1_score",
    "m"."player1_set2_score",
    "m"."player1_set3_score",
    "m"."player1_set4_score",
    "m"."player1_set5_score",
    "m"."player2_id",
    "p2"."name" AS "player2_name",
    "p2"."short_name" AS "player2_short_name",
    "p2"."country" AS "player2_country",
    "m"."player2_score_current",
    "m"."player2_set1_score",
    "m"."player2_set2_score",
    "m"."player2_set3_score",
    "m"."player2_set4_score",
    "m"."player2_set5_score",
    "t"."tournament_id",
    "t"."tournament_name",
    "t"."season_year",
    "ut"."unique_tournament_name",
    "ut"."category_name",
    "ut"."category_slug",
    "ut"."tournament_type",
    "ut"."ground_type",
    "ut"."tennis_points",
    "pr"."points_at_stake"
   FROM ((((("public"."tennis_matches" "m"
     JOIN "public"."players" "p1" ON (("m"."player1_id" = "p1"."player_id")))
     JOIN "public"."players" "p2" ON (("m"."player2_id" = "p2"."player_id")))
     JOIN "public"."tournaments" "t" ON (("m"."tournament_id" = "t"."tournament_id")))
     JOIN "public"."unique_tournaments" "ut" ON (("t"."unique_tournament_id" = "ut"."unique_tournament_id")))
     LEFT JOIN "public"."points_reference" "pr" ON ((("ut"."category_slug" = "pr"."category_slug") AND ("ut"."tournament_type" = "pr"."tournament_type") AND ("m"."round_name" = "pr"."round_name"))));


ALTER VIEW "public"."match_fact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_points" (
    "id" bigint NOT NULL,
    "player_id" bigint NOT NULL,
    "match_id" bigint NOT NULL,
    "match_date" timestamp with time zone,
    "points_earned" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."match_points" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."match_points_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."match_points_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."match_points_id_seq" OWNED BY "public"."match_points"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."player_points_adjustments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."player_points_adjustments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."player_points_adjustments_id_seq" OWNED BY "public"."player_points_adjustments"."id";



CREATE TABLE IF NOT EXISTS "public"."player_rankings" (
    "id" bigint NOT NULL,
    "player_id" bigint,
    "ranking_date" "date" NOT NULL,
    "ranking_type" "text" NOT NULL,
    "rank" integer,
    "points" numeric,
    "ranking_movement" integer,
    "tournaments_played" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_rankings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_ranking_history" WITH ("security_invoker"='on') AS
 SELECT "pr"."id",
    "pr"."ranking_date",
    "pr"."ranking_type",
    "pr"."rank",
    "pr"."points",
    "pr"."ranking_movement",
    "pr"."tournaments_played",
    "p"."player_id",
    "p"."name" AS "player_name",
    "p"."short_name",
    "p"."country",
    "p"."country_code",
    "p"."gender",
    ("pr"."points" - "lag"("pr"."points") OVER (PARTITION BY "pr"."player_id", "pr"."ranking_type" ORDER BY "pr"."ranking_date")) AS "points_change"
   FROM ("public"."player_rankings" "pr"
     JOIN "public"."players" "p" ON (("p"."player_id" = "pr"."player_id")))
  ORDER BY "pr"."ranking_date" DESC, "pr"."rank";


ALTER VIEW "public"."player_ranking_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."player_rankings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."player_rankings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."player_rankings_id_seq" OWNED BY "public"."player_rankings"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."player_transactions_transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."player_transactions_transaction_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."player_transactions_transaction_id_seq" OWNED BY "public"."player_transactions"."transaction_id";



CREATE SEQUENCE IF NOT EXISTS "public"."points_reference_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."points_reference_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."points_reference_id_seq" OWNED BY "public"."points_reference"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."seasons_season_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."seasons_season_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."seasons_season_id_seq" OWNED BY "public"."seasons"."season_id";



CREATE OR REPLACE VIEW "public"."team_leaderboard" WITH ("security_invoker"='on') AS
 WITH "latest_add" AS (
         SELECT DISTINCT ON ("player_transactions"."player_id", "player_transactions"."league_id") "player_transactions"."league_id",
            "player_transactions"."team_id",
            "player_transactions"."player_id",
            "player_transactions"."transaction_date" AS "added_at",
            "player_transactions"."season_id"
           FROM "public"."player_transactions"
          WHERE ("player_transactions"."transaction_type" = 'add'::"text")
          ORDER BY "player_transactions"."player_id", "player_transactions"."league_id", "player_transactions"."transaction_date" DESC
        ), "active_roster" AS (
         SELECT "a"."league_id",
            "a"."team_id",
            "a"."player_id",
            "a"."added_at",
            "a"."season_id",
            "s"."start_date" AS "season_start"
           FROM ("latest_add" "a"
             JOIN "public"."seasons" "s" ON (("s"."season_id" = "a"."season_id")))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM "public"."player_transactions" "drop_tx"
                  WHERE (("drop_tx"."player_id" = "a"."player_id") AND ("drop_tx"."league_id" = "a"."league_id") AND ("drop_tx"."transaction_type" = 'drop'::"text") AND ("drop_tx"."transaction_date" > "a"."added_at")))))
        ), "active_player_points" AS (
         SELECT "ar"."team_id",
            "ar"."league_id",
            "ar"."player_id",
            COALESCE("sum"("pp"."points"), (0)::bigint) AS "points_earned"
           FROM ("active_roster" "ar"
             LEFT JOIN "public"."player_points" "pp" ON ((("pp"."player_id" = "ar"."player_id") AND ("pp"."event_date" >= "ar"."season_start"))))
          GROUP BY "ar"."team_id", "ar"."league_id", "ar"."player_id"
        ), "banked_points" AS (
         SELECT "player_transactions"."team_id",
            "player_transactions"."league_id",
            COALESCE("sum"("player_transactions"."points_banked"), (0)::bigint) AS "points_from_dropped"
           FROM "public"."player_transactions"
          WHERE ("player_transactions"."transaction_type" = 'drop'::"text")
          GROUP BY "player_transactions"."team_id", "player_transactions"."league_id"
        )
 SELECT "l"."league_id",
    "l"."league_name",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    (COALESCE("sum"("ap"."points_earned"), (0)::numeric) + (COALESCE("max"("bp"."points_from_dropped"), (0)::bigint))::numeric) AS "total_points",
    "rank"() OVER (PARTITION BY "l"."league_id" ORDER BY (COALESCE("sum"("ap"."points_earned"), (0)::numeric) + (COALESCE("max"("bp"."points_from_dropped"), (0)::bigint))::numeric) DESC) AS "rank"
   FROM ((("public"."teams" "t"
     JOIN "public"."leagues" "l" ON (("l"."league_id" = "t"."league_id")))
     LEFT JOIN "active_player_points" "ap" ON ((("ap"."team_id" = "t"."id") AND ("ap"."league_id" = "l"."league_id"))))
     LEFT JOIN "banked_points" "bp" ON ((("bp"."team_id" = "t"."id") AND ("bp"."league_id" = "l"."league_id"))))
  GROUP BY "l"."league_id", "l"."league_name", "t"."id", "t"."name"
  ORDER BY "l"."league_id", ("rank"() OVER (PARTITION BY "l"."league_id" ORDER BY (COALESCE("sum"("ap"."points_earned"), (0)::numeric) + (COALESCE("max"("bp"."points_from_dropped"), (0)::bigint))::numeric) DESC));


ALTER VIEW "public"."team_leaderboard" OWNER TO "postgres";


ALTER TABLE "public"."teams" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."teams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teams_players" (
    "id" integer NOT NULL,
    "team_id" bigint,
    "player_id" bigint,
    "season_selected" integer,
    "points_at_selection" integer,
    "season_points" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "season_id" integer,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "dropped_at" timestamp with time zone,
    "points_at_add" integer DEFAULT 0
);


ALTER TABLE "public"."teams_players" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams_players"."season_points" IS 'Total points for player in this season';



COMMENT ON COLUMN "public"."teams_players"."updated_at" IS 'when the row was updated';



CREATE SEQUENCE IF NOT EXISTS "public"."teams_players_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teams_players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teams_players_id_seq" OWNED BY "public"."teams_players"."id";



CREATE OR REPLACE VIEW "public"."tournament_status" WITH ("security_invoker"='on') AS
 SELECT "t"."unique_tournament_id",
    "t"."unique_tournament_name" AS "tournament_name",
    "t"."tournament_type" AS "level",
        CASE
            WHEN ("t"."category_slug" = ANY (ARRAY['atp'::"text", 'challenger'::"text", 'itf-men'::"text"])) THEN 'ATP'::"text"
            WHEN ("t"."category_slug" = ANY (ARRAY['wta'::"text", 'wta-125'::"text", 'itf-women'::"text"])) THEN 'WTA'::"text"
            ELSE "t"."category_slug"
        END AS "tour",
    "min"("m"."match_date") AS "tournament_start",
        CASE
            WHEN ("f"."match_id" IS NOT NULL) THEN "max"("m"."match_date")
            ELSE NULL::timestamp with time zone
        END AS "tournament_end",
        CASE
            WHEN ("f"."match_id" IS NOT NULL) THEN 'Finished'::"text"
            ELSE 'Ongoing'::"text"
        END AS "status",
        CASE
            WHEN (("f"."match_id" IS NOT NULL) AND ("f"."winner_code" = 1)) THEN "p1"."name"
            WHEN (("f"."match_id" IS NOT NULL) AND ("f"."winner_code" = 2)) THEN "p2"."name"
            ELSE NULL::"text"
        END AS "winner"
   FROM (((("public"."unique_tournaments" "t"
     LEFT JOIN "public"."tennis_matches" "m" ON (("m"."unique_tournament_id" = "t"."unique_tournament_id")))
     LEFT JOIN LATERAL ( SELECT "tennis_matches"."match_id",
            "tennis_matches"."winner_code",
            "tennis_matches"."player1_id",
            "tennis_matches"."player2_id"
           FROM "public"."tennis_matches"
          WHERE (("tennis_matches"."unique_tournament_id" = "t"."unique_tournament_id") AND ("tennis_matches"."round_name" = 'Final'::"text") AND ("tennis_matches"."status_type" = 'finished'::"text"))
         LIMIT 1) "f" ON (true))
     LEFT JOIN "public"."players" "p1" ON (("p1"."player_id" = "f"."player1_id")))
     LEFT JOIN "public"."players" "p2" ON (("p2"."player_id" = "f"."player2_id")))
  GROUP BY "t"."unique_tournament_id", "t"."unique_tournament_name", "t"."tournament_type", "t"."category_slug", "f"."match_id", "f"."winner_code", "f"."player1_id", "f"."player2_id", "p1"."name", "p2"."name";


ALTER VIEW "public"."tournament_status" OWNER TO "postgres";


ALTER TABLE ONLY "public"."match_points" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."match_points_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."player_points_adjustments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."player_points_adjustments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."player_rankings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."player_rankings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."player_transactions" ALTER COLUMN "transaction_id" SET DEFAULT "nextval"('"public"."player_transactions_transaction_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."points_reference" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."points_reference_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."seasons" ALTER COLUMN "season_id" SET DEFAULT "nextval"('"public"."seasons_season_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teams_players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teams_players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("league_id");



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "match_points_match_player_unique" UNIQUE ("match_id", "player_id");



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "match_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_points_adjustments"
    ADD CONSTRAINT "player_points_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_player_id_ranking_date_ranking_type_key" UNIQUE ("player_id", "ranking_date", "ranking_type");



ALTER TABLE ONLY "public"."player_transactions"
    ADD CONSTRAINT "player_transactions_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("player_id");



ALTER TABLE ONLY "public"."points_reference"
    ADD CONSTRAINT "points_reference_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("season_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams_players"
    ADD CONSTRAINT "teams_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tennis_matches"
    ADD CONSTRAINT "tennis_matches_pkey" PRIMARY KEY ("match_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("tournament_id");



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "unique_match" UNIQUE ("match_id");



ALTER TABLE ONLY "public"."unique_tournaments"
    ADD CONSTRAINT "unique_tournaments_pkey" PRIMARY KEY ("unique_tournament_id");



CREATE INDEX "idx_category_name" ON "public"."tennis_matches" USING "btree" ("category_name");



CREATE INDEX "idx_countries_code" ON "public"."countries" USING "btree" ("code");



CREATE INDEX "idx_match_date" ON "public"."tennis_matches" USING "btree" ("match_date");



CREATE INDEX "idx_match_points_match_date" ON "public"."match_points" USING "btree" ("match_date");



CREATE INDEX "idx_match_points_match_id" ON "public"."match_points" USING "btree" ("match_id");



CREATE INDEX "idx_match_points_player_id" ON "public"."match_points" USING "btree" ("player_id");



CREATE INDEX "idx_player1_id" ON "public"."tennis_matches" USING "btree" ("player1_id");



CREATE INDEX "idx_player2_id" ON "public"."tennis_matches" USING "btree" ("player2_id");



CREATE INDEX "idx_player_transactions_league" ON "public"."player_transactions" USING "btree" ("league_id", "transaction_date" DESC);



CREATE INDEX "idx_player_transactions_player" ON "public"."player_transactions" USING "btree" ("player_id", "transaction_date" DESC);



CREATE INDEX "idx_player_transactions_team" ON "public"."player_transactions" USING "btree" ("team_id", "transaction_date" DESC);



CREATE INDEX "idx_players_country" ON "public"."players" USING "btree" ("country_code");



CREATE INDEX "idx_players_gender" ON "public"."players" USING "btree" ("gender");



CREATE INDEX "idx_players_slug" ON "public"."players" USING "btree" ("slug");



CREATE INDEX "idx_rankings_date" ON "public"."player_rankings" USING "btree" ("ranking_date");



CREATE INDEX "idx_rankings_player_date" ON "public"."player_rankings" USING "btree" ("player_id", "ranking_date");



CREATE INDEX "idx_rankings_player_id" ON "public"."player_rankings" USING "btree" ("player_id");



CREATE INDEX "idx_rankings_rank" ON "public"."player_rankings" USING "btree" ("rank");



CREATE INDEX "idx_rankings_type" ON "public"."player_rankings" USING "btree" ("ranking_type");



CREATE INDEX "idx_status_type" ON "public"."tennis_matches" USING "btree" ("status_type");



CREATE INDEX "idx_tournament_id" ON "public"."tennis_matches" USING "btree" ("tournament_id");



CREATE INDEX "idx_unique_tournament_id" ON "public"."tennis_matches" USING "btree" ("unique_tournament_id");



CREATE OR REPLACE TRIGGER "trg_sync_tournaments" AFTER INSERT ON "public"."tennis_matches" FOR EACH ROW EXECUTE FUNCTION "public"."sync_tournaments_from_matches"();



CREATE OR REPLACE TRIGGER "trigger_update_match_points" AFTER INSERT OR UPDATE ON "public"."tennis_matches" FOR EACH ROW WHEN (("new"."status_type" = 'finished'::"text")) EXECUTE FUNCTION "public"."update_match_points"();

ALTER TABLE "public"."tennis_matches" DISABLE TRIGGER "trigger_update_match_points";



CREATE OR REPLACE TRIGGER "trigger_update_teams_current_points" AFTER INSERT OR UPDATE OF "season_points" ON "public"."teams_players" FOR EACH ROW EXECUTE FUNCTION "public"."update_teams_current_points"();

ALTER TABLE "public"."teams_players" DISABLE TRIGGER "trigger_update_teams_current_points";



CREATE OR REPLACE TRIGGER "trigger_update_teams_players_points" AFTER INSERT OR UPDATE ON "public"."match_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_teams_players_points"();

ALTER TABLE "public"."match_points" DISABLE TRIGGER "trigger_update_teams_players_points";



CREATE OR REPLACE TRIGGER "update_player_rankings_updated_at" BEFORE UPDATE ON "public"."player_rankings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tennis_matches_updated_at" BEFORE UPDATE ON "public"."tennis_matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "fk_match" FOREIGN KEY ("match_id") REFERENCES "public"."tennis_matches"("match_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_points_adjustments"
    ADD CONSTRAINT "player_points_adjustments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id");



ALTER TABLE ONLY "public"."player_points_adjustments"
    ADD CONSTRAINT "player_points_adjustments_unique_tournament_id_fkey" FOREIGN KEY ("unique_tournament_id") REFERENCES "public"."unique_tournaments"("unique_tournament_id");



ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id");



ALTER TABLE ONLY "public"."player_transactions"
    ADD CONSTRAINT "player_transactions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("league_id");



ALTER TABLE ONLY "public"."player_transactions"
    ADD CONSTRAINT "player_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id");



ALTER TABLE ONLY "public"."player_transactions"
    ADD CONSTRAINT "player_transactions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("season_id");



ALTER TABLE ONLY "public"."player_transactions"
    ADD CONSTRAINT "player_transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("league_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams_players"
    ADD CONSTRAINT "teams_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams_players"
    ADD CONSTRAINT "teams_players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("season_id");



ALTER TABLE ONLY "public"."teams_players"
    ADD CONSTRAINT "teams_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_unique_tournament_id_fkey" FOREIGN KEY ("unique_tournament_id") REFERENCES "public"."unique_tournaments"("unique_tournament_id");



CREATE POLICY "Anyone can view countries" ON "public"."countries" FOR SELECT USING (true);



CREATE POLICY "Enable Service Access" ON "public"."match_points" TO "service_role" USING (true);



CREATE POLICY "Enable Service Access" ON "public"."players" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."match_points" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."player_points_adjustments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."player_rankings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."player_transactions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."points_reference" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."teams_players" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tennis_matches" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tournaments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."unique_tournaments" FOR SELECT USING (true);



CREATE POLICY "Enable service access" ON "public"."player_rankings" TO "service_role" USING (true);



CREATE POLICY "Enable service access" ON "public"."teams_players" TO "service_role" USING (true);



ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_points_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_rankings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."points_reference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_upsert" ON "public"."tennis_matches" TO "service_role" USING (true);



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tennis_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unique_tournaments" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer, "p_is_winner" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer, "p_is_winner" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_match_points"("p_category_slug" "text", "p_tournament_type" "text", "p_round_name" "text", "p_round_type" integer, "p_is_winner" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_unlogged_matches"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_unlogged_matches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_unlogged_matches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_tournaments_from_matches"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tournaments_from_matches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tournaments_from_matches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_all_team_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_all_team_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_all_team_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_match_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_match_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_match_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_teams_current_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_teams_current_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_teams_current_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_teams_players_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_teams_players_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_teams_players_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."points_reference" TO "anon";
GRANT ALL ON TABLE "public"."points_reference" TO "authenticated";
GRANT ALL ON TABLE "public"."points_reference" TO "service_role";



GRANT ALL ON TABLE "public"."tennis_matches" TO "anon";
GRANT ALL ON TABLE "public"."tennis_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."tennis_matches" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."unique_tournaments" TO "anon";
GRANT ALL ON TABLE "public"."unique_tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."unique_tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."player_matches" TO "anon";
GRANT ALL ON TABLE "public"."player_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."player_matches" TO "service_role";



GRANT ALL ON TABLE "public"."player_points_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."player_points_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."player_points_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."player_tournament_summary" TO "anon";
GRANT ALL ON TABLE "public"."player_tournament_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."player_tournament_summary" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."player_points" TO "anon";
GRANT ALL ON TABLE "public"."player_points" TO "authenticated";
GRANT ALL ON TABLE "public"."player_points" TO "service_role";



GRANT ALL ON TABLE "public"."player_transactions" TO "anon";
GRANT ALL ON TABLE "public"."player_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."player_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."current_rosters" TO "anon";
GRANT ALL ON TABLE "public"."current_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."current_rosters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leagues_league_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leagues_league_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leagues_league_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."match_fact" TO "anon";
GRANT ALL ON TABLE "public"."match_fact" TO "authenticated";
GRANT ALL ON TABLE "public"."match_fact" TO "service_role";



GRANT ALL ON TABLE "public"."match_points" TO "anon";
GRANT ALL ON TABLE "public"."match_points" TO "authenticated";
GRANT ALL ON TABLE "public"."match_points" TO "service_role";



GRANT ALL ON SEQUENCE "public"."match_points_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."match_points_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."match_points_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_points_adjustments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_points_adjustments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_points_adjustments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."player_rankings" TO "anon";
GRANT ALL ON TABLE "public"."player_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."player_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."player_ranking_history" TO "anon";
GRANT ALL ON TABLE "public"."player_ranking_history" TO "authenticated";
GRANT ALL ON TABLE "public"."player_ranking_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_rankings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_rankings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_rankings_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_transactions_transaction_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_transactions_transaction_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_transactions_transaction_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."points_reference_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."points_reference_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."points_reference_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."seasons_season_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seasons_season_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seasons_season_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."team_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."team_leaderboard" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams_players" TO "anon";
GRANT ALL ON TABLE "public"."teams_players" TO "authenticated";
GRANT ALL ON TABLE "public"."teams_players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_status" TO "anon";
GRANT ALL ON TABLE "public"."tournament_status" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_status" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







