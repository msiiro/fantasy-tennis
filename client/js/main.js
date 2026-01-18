// Main application orchestration
import { setUser, setTeam, setAuthUser, setSession, getUser, getAuthUser, clearAuth } from './state.js';
import { getCurrentUser, getCurrentSession, getUserProfile, fetchTeam, signOut, supabase } from './api.js';
import { Router } from './router.js';
import { renderHomePage } from './pages/home.js';
import { renderLeaguePage } from './pages/league.js';
import { renderTeamPage } from './pages/team.js';
import { renderEventsPage } from './pages/events.js';
import { renderSignInPage } from './pages/signin.js';
import { renderSignUpPage } from './pages/signup.js';

// Make router globally accessible
export const router = new Router();

// Register routes
router.addRoute('/', renderHomePage);
router.addRoute('/league', renderLeaguePage);
router.addRoute('/team', renderTeamPage);
router.addRoute('/events', renderEventsPage);
router.addRoute('/signin', renderSignInPage);
router.addRoute('/signup', renderSignUpPage);

// Initialize authentication
async function initializeAuth() {
    try {
        // Get current session
        const session = await getCurrentSession();
        
        if (session) {
            setSession(session);
            
            // Get auth user
            const authUser = await getCurrentUser();
            setAuthUser(authUser);
            
            // Get user profile
            const userProfile = await getUserProfile(authUser.id);
            setUser(userProfile);
            
            // Get user's team
            const team = await fetchTeam(authUser.id);
            setTeam(team);
            
            console.log('User authenticated:', userProfile);
        } else {
            console.log('No active session');
            clearAuth();
        }
        
        updateNavUI();
    } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuth();
        updateNavUI();
    }
}

function updateNavUI() {
    const user = getUser();
    const navUserInfo = document.getElementById('nav-user-info');
    
    if (user) {
        navUserInfo.innerHTML = `
            <span style="margin-right: 0.5rem;">👤 ${user.username}</span>
            <button id="signout-btn" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">
                Sign Out
            </button>
        `;
        
        // Add sign out handler
        document.getElementById('signout-btn').addEventListener('click', handleSignOut);
    } else {
        navUserInfo.innerHTML = `
            <a href="#/signin" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">
                Sign In
            </a>
        `;
    }
}

async function handleSignOut() {
    try {
        await signOut();
        clearAuth();
        updateNavUI();
        window.location.hash = '/';
        router.handleRoute();
    } catch (error) {
        console.error('Sign out error:', error);
        alert('Failed to sign out');
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN') {
        // Reload the app when user signs in
        initializeAuth().then(() => {
            router.handleRoute();
        });
    } else if (event === 'SIGNED_OUT') {
        clearAuth();
        updateNavUI();
        window.location.hash = '/';
        router.handleRoute();
    }
});

// Start the app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeAuth();
});