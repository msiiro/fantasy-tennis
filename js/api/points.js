import { supabaseClient } from '../config.js';

export async function fetchMatchPoints(matchIds) {
    const { data, error } = await supabaseClient
        .from('match_points')
        .select('match_id, player_id, points_earned')
        .in('match_id', matchIds);
    
    if (error) throw error;
    return data;
}

export async function fetchPointsReference() {
    const { data, error } = await supabaseClient
        .from('atp_points_reference')
        .select('category_slug, tournament_type, round_name, round_type, points_for_win');
    
    if (error) throw error;
    return data;
}

export async function fetchAllMatchPoints() {
    const { data, error } = await supabaseClient
        .from('match_points')
        .select('player_id, points_earned, match_id');
    
    if (error) throw error;
    return data;
}