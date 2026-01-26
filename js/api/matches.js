import { supabaseClient } from '../config.js';

export async function fetchTeamPlayers() {
    const { data, error } = await supabaseClient
        .from('team_players')
        .select('player_id');
    
    if (error) throw error;
    return data;
}

export async function fetchUpcomingMatches(playerIds) {
    const { data, error } = await supabaseClient
        .from('tennis_matches')
        .select('*')
        .eq('status_type', 'notstarted')
        .or(`player1_id.in.(${playerIds.join(',')}),player2_id.in.(${playerIds.join(',')})`)
        .order('start_timestamp', { ascending: true })
        .limit(50);
    
    if (error) throw error;
    return data;
}

export async function fetchRecentMatches(playerIds) {
    const { data, error } = await supabaseClient
        .from('tennis_matches')
        .select('*')
        .eq('status_type', 'finished')
        .or(`player1_id.in.(${playerIds.join(',')}),player2_id.in.(${playerIds.join(',')})`)
        .order('start_timestamp', { ascending: false })
        .limit(50);
    
    if (error) throw error;
    return data;
}