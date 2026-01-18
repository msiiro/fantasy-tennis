// API communication layer
import { API_URL } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://ugxbybhbnoylantodnmc.supabase.co';
const supabaseAnonKey = 'sb_publishable_RqLrQst3zv7zWZfqgjtuVg_dy9G4AP1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===== AUTHENTICATION =====

export async function signUp(email, password, username, teamName) {
    // First, sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });
    
    if (authError) throw authError;
    
    // Update the user profile with username and team name
    if (authData.user) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                username: username,
                team_name: teamName 
            })
            .eq('id', authData.user.id);
        
        if (updateError) throw updateError;
    }
    
    return authData;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) throw error;
    
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// ===== USER PROFILE =====

export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateUserProfile(userId, updates) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ===== PLAYERS =====

export async function fetchPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('rank', { ascending: true });
    
    if (error) throw error;
    return data;
}

export async function fetchPlayer(id) {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

// ===== TEAMS =====

export async function fetchAllTeams() {
    const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            users (username, team_name),
            team_players (
                players (name, rank, points, country, tour)
            )
        `);
    
    if (error) throw error;
    return data;
}

export async function fetchTeam(userId) {
    const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            users (username, email, team_name),
            team_players (
                player_id,
                added_at,
                players (*)
            )
        `)
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

export async function addPlayerToTeam(teamId, playerId) {
    // Check team size first
    const { data: teamPlayers, error: checkError } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId);
    
    if (checkError) throw checkError;
    
    if (teamPlayers && teamPlayers.length >= 10) {
        throw new Error('Team is full (max 10 players)');
    }
    
    // Check if player already on team
    const existing = teamPlayers?.find(tp => tp.player_id === playerId);
    if (existing) {
        throw new Error('Player already on team');
    }
    
    // Add player
    const { data, error } = await supabase
        .from('team_players')
        .insert([{ team_id: teamId, player_id: playerId }])
        .select(`
            *,
            players (*)
        `)
        .single();
    
    if (error) throw error;
    return data;
}

export async function removePlayerFromTeam(teamId, playerId) {
    const { error } = await supabase
        .from('team_players')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId);
    
    if (error) throw error;
    return { success: true };
}

// Keep the old backend API calls for backwards compatibility if needed
export async function fetchUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return await response.json();
}

export async function createUser(userData) {
    const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        throw new Error('Failed to create user');
    }
    return await response.json();
}