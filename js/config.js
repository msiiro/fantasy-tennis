// Supabase configuration
export const supabaseUrl = 'https://ugxbybhbnoylantodnmc.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';

// Wait for supabase to be available
if (!window.supabase) {
    throw new Error('Supabase library not loaded. Make sure the Supabase script is included before your app modules.');
}

export const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Constants
export const FILTERS = {
    ALL: 'all',
    MY_TEAM: 'myteam',
    HEAD_TO_HEAD: 'headtohead',
    ANY_TEAM: 'anyteam'
};

export const SECTIONS = {
    LEADERBOARD: 'leaderboard',
    MATCHES: 'matches',
    PLAYERS: 'players'
};