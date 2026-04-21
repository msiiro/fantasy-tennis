export interface Team {
  id: number;
  name: string;
  league_id: number;
}

export interface TeamLeaderboard {
  league_id: number;
  team_id: number;
  team_name: string;
  total_points: number;
  rank: number;
}

export interface Player {
  player_id: number;
  name: string;
  short_name: string | null;
  country: string | null;
  country_code: string | null;
  gender: 'M' | 'F' | null;
}

export interface PlayerWithRank extends Player {
  rank: number | null;
  points: number | null;
  teamId: number | null;
  teamName: string | null;
  matchesCount: number;
}

export interface PlayerWithStats extends Player {
  team_id: number | null;
  team_name: string | null;
  tournament_count: number | null;
  match_count: number | null;
  wins: number | null;
  points: number;
  cost: number | null;
  roi: number | null;
  roi_index: number | null;
}

export interface MatchFact {
  match_id: number;
  match_date: string | null;
  match_type: string | null;
  gender: string | null;
  round_name: string | null;
  round_number: number | null;
  status_description: string | null;
  winner_code: number | null;
  first_to_serve: number | null;
  player1_id: number;
  player1_name: string | null;
  player1_short_name: string | null;
  player1_country: string | null;
  player1_score_current: number | null;
  player1_set1_score: number | null;
  player1_set2_score: number | null;
  player1_set3_score: number | null;
  player1_set4_score: number | null;
  player1_set5_score: number | null;
  player2_id: number;
  player2_name: string | null;
  player2_short_name: string | null;
  player2_country: string | null;
  player2_score_current: number | null;
  player2_set1_score: number | null;
  player2_set2_score: number | null;
  player2_set3_score: number | null;
  player2_set4_score: number | null;
  player2_set5_score: number | null;
  tournament_id: number | null;
  tournament_name: string | null;
  season_year: string | null;
  unique_tournament_name: string | null;
  category_name: string | null;
  category_slug: string | null;
  tournament_type: string | null;
  ground_type: string | null;
  tennis_points: number | null;
  points_at_stake: number | null;
}

export interface PlayerRankingHistory {
  id: number;
  ranking_date: string;
  ranking_type: 'atp' | 'wta';
  rank: number;
  points: number;
  ranking_movement: number | null;
  tournaments_played: number | null;
  player_id: number;
  player_name: string;
  short_name: string | null;
  country: string | null;
  country_code: string | null;
  gender: 'M' | 'F' | null;
  points_change: number | null;
}

export type Section = 'leaderboard' | 'matches' | 'players';
export type MatchFilter = 'all' | 'anyteam' | 'myteam' | 'headtohead';
export type GenderFilter = 'all' | 'M' | 'F';
export type TeamFilter = 'all' | 'league' | 'available' | 'specific';