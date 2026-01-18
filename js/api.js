// API communication layer
import { API_URL } from './config.js';

// Supabase configuration
const SUPABASE_URL = 'https://ugxbybhbnoylantodnmc.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'sb_publishable_RqLrQst3zv7zWZfqgjtuVg_dy9G4AP1'; // Replace with your key

// Initialize Supabase
let supabaseClient = null;

async function getSupabase() {
    if (!supabaseClient) {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Export supabase for use in other files
export async function getSupabaseClient() {
    return await getSupabase();
}

// ===== AUTHENTICATION =====

export async function signUp(email, password, username, teamName) {
    const supabase = await getSupabase();
    
    // Sign up with Supabase Auth
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
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) throw error;
    
    return data;
}

export async function signOut() {
    const supabase = await getSupabase();
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser() {
    const supabase = await getSupabase();
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getCurrentSession() {
    const supabase = await getSupabase();
    
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function onAuthStateChange(callback) {
    const supabase = await getSupabase();
    
    return supabase.auth.onAuthStateChange(callback);
}

// ===== USER PROFILE =====

export async function getUserProfile(userId) {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateUserProfile(userId, updates) {
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('rank', { ascending: true });
    
    if (error) throw error;
    return data;
}

export async function fetchPlayer(id) {
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
    const { error } = await supabase
        .from('team_players')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId);
    
    if (error) throw error;
    return { success: true };
}