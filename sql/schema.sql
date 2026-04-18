-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Fetched Data from API (raw)

CREATE TABLE public.players (
  player_id bigint NOT NULL,
  name text,
  slug text,
  short_name text,
  country text,
  country_code text,
  gender text,
  disabled boolean DEFAULT false,
  national boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT players_pkey PRIMARY KEY (player_id)
);

CREATE TABLE public.player_rankings (
  id bigint NOT NULL DEFAULT nextval('player_rankings_id_seq'::regclass),
  player_id bigint,
  ranking_date date NOT NULL,
  ranking_type text NOT NULL,
  rank integer,
  points numeric,
  ranking_movement integer,
  tournaments_played integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_rankings_pkey PRIMARY KEY (id),
  CONSTRAINT player_rankings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id)
);

CREATE TABLE public.unique_tournaments (
  unique_tournament_id integer NOT NULL,
  unique_tournament_name text NOT NULL,
  unique_tournament_slug text NOT NULL,
  category_id integer NOT NULL,
  category_name text NOT NULL,
  category_slug text NOT NULL,
  tournament_type text,
  ground_type text,
  tennis_points integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_tournaments_pkey PRIMARY KEY (unique_tournament_id)
);

CREATE TABLE public.tournaments (
  tournament_id integer NOT NULL,
  tournament_name text NOT NULL,
  tournament_slug text NOT NULL,
  unique_tournament_id integer NOT NULL,
  season_id integer NOT NULL,
  season_name text NOT NULL,
  season_year text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tournaments_pkey PRIMARY KEY (tournament_id),
  CONSTRAINT tournaments_unique_tournament_id_fkey FOREIGN KEY (unique_tournament_id) REFERENCES public.unique_tournaments(unique_tournament_id)
);

CREATE TABLE public.tennis_matches (
  match_id bigint NOT NULL,
  player1_id bigint,
  player2_id bigint,
  player1_score_current integer,
  player1_score_display integer,
  player1_set1_score integer,
  player1_set2_score integer,
  player1_set3_score integer,
  player1_set4_score integer,
  player1_set5_score integer,
  player1_set1_tiebreak integer,
  player1_set2_tiebreak integer,
  player1_set3_tiebreak integer,
  player1_current_point text,
  player2_score_current integer,
  player2_score_display integer,
  player2_set1_score integer,
  player2_set2_score integer,
  player2_set3_score integer,
  player2_set4_score integer,
  player2_set5_score integer,
  player2_set1_tiebreak integer,
  player2_set2_tiebreak integer,
  player2_set3_tiebreak integer,
  player2_current_point text,
  status_code integer,
  status_description text,
  status_type text,
  winner_code integer,
  first_to_serve integer,
  tournament_id bigint,
  tournament_name text,
  tournament_slug text,
  unique_tournament_id bigint,
  unique_tournament_name text,
  unique_tournament_slug text,
  category_id integer,
  category_name text,
  category_slug text,
  season_id bigint,
  season_name text,
  season_year text,
  round_number integer,
  round_name text,
  round_type integer,
  ground_type text,
  tennis_points integer,
  start_timestamp bigint,
  match_date timestamp with time zone,
  gender text,
  match_type text,
  level text,
  tournament_type text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tennis_matches_pkey PRIMARY KEY (match_id)
);

-- Fantasy App Tables

CREATE TABLE public.leagues (
  league_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  league_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leagues_pkey PRIMARY KEY (league_id)
);

CREATE TABLE public.teams (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL UNIQUE,
  user_id uuid,
  current_points bigint,
  updated_at timestamp with time zone DEFAULT now(),
  league_id bigint NOT NULL,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(league_id),
  CONSTRAINT teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.player_transactions (
  transaction_id integer NOT NULL DEFAULT nextval('player_transactions_transaction_id_seq'::regclass),
  league_id integer NOT NULL,
  team_id integer NOT NULL,
  player_id integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['add'::text, 'drop'::text])),
  transaction_date timestamp with time zone NOT NULL DEFAULT now(),
  ranking_points integer,
  ranking_date date,
  CONSTRAINT player_transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT player_transactions_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(league_id),
  CONSTRAINT player_transactions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT player_transactions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id)
);

CREATE TABLE  public.player_points_adjustments (
    id integer NOT NULL,
    player_id bigint NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    unique_tournament_id integer,
    description text NOT NULL,
    event_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- Other Dim tables

CREATE TABLE public.countries(
  code text NOT NULL,
  name text NOT NULL,
  flag_emoji text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT countries_pkey PRIMARY KEY (code)
);

CREATE TABLE public.points_reference (
  id integer NOT NULL DEFAULT nextval('points_reference_id_seq'::regclass),
  category_slug text NOT NULL,
  tournament_type text NOT NULL,
  round_name text NOT NULL,
  points_for_champion integer NOT NULL DEFAULT 0,
  points_for_place integer NOT NULL DEFAULT 0,
  points_for_win integer NOT NULL DEFAULT 0,
  points_for_loss integer NOT NULL DEFAULT 0,
  CONSTRAINT points_reference_pkey PRIMARY KEY (id)
);






