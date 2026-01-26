import { supabaseClient } from './config.js';
import { state, setCurrentUser, setCurrentUserTeam } from './state.js';
import { loadUserTeam } from './api/teams.js';
import { loadLeaderboard } from './components/leaderboard.js';
import { loadMatches } from './components/matches.js';
import { loadPlayers } from './components/players.js';
import { updateLastUpdated } from './utils.js';

export function initAuth() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session) {
            setCurrentUser(session.user);
            
            document.getElementById('signInScreen').classList.remove('active');
            document.getElementById('mainApp').classList.add('active');
            document.getElementById('userName').textContent = state.currentUser.email;
            
            loadUserTeam().then(() => {
                // Always load data when there's a session
                loadLeaderboard();
                loadMatches();
                loadPlayers();
                updateLastUpdated();
            });
        } else {
            setCurrentUser(null);
            setCurrentUserTeam(null);
            state.playerTeamMap = {};
            document.getElementById('mainApp').classList.remove('active');
            document.getElementById('signInScreen').classList.add('active');
        }
    });
}
export async function handleSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            alert('Sign in failed: ' + error.message);
            console.error('Sign in error:', error);
            return;
        }
        
        console.log('Sign in successful:', data);
        
    } catch (err) {
        console.error('Unexpected error:', err);
        alert('An error occurred during sign in');
    }
}

export function handleSignOut() {
    setCurrentUser(null);
    setCurrentUserTeam(null);
    state.playerTeamMap = {};
    state.currentFilter = 'myteam';
    
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('signInScreen').classList.add('active');
    
    document.getElementById('signInForm').reset();
}