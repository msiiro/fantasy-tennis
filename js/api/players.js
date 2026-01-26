import { supabaseClient } from '../config.js';

export async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('player_id, name, gender');
    
    if (error) throw error;
    return data;
}

export async function fetchTeamAssignments() {
    const { data, error } = await supabaseClient
        .from('team_players')
        .select(`
            player_id,
            team_id,
            teams (
                id,
                name
            )
        `);
    
    if (error) throw error;
    return data;
}