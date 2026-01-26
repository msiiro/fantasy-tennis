import { supabaseClient } from '../config.js';
import { state, setCurrentUserTeam } from '../state.js';

export async function loadUserTeam() {
    try {
        const { data, error } = await supabaseClient
            .from('teams')
            .select('id, name')
            .eq('user_id', state.currentUser.id)
            .single();
        
        if (error) {
            console.error('Error loading user team:', error);
            return;
        }
        
        setCurrentUserTeam(data);
        console.log('Current user team:', state.currentUserTeam);
    } catch (err) {
        console.error('Unexpected error loading user team:', err);
    }
}

export async function fetchAllTeams() {
    const { data, error } = await supabaseClient
        .from('teams')
        .select('id, name, current_points')
        .order('current_points', { ascending: false });
    
    if (error) {
        console.error('Error loading teams:', error);
        throw error;
    }
    
    return data;
}