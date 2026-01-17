// Main application orchestration
import { setUser, setTeam, getUser } from './state.js';
import { fetchUsers, createUser, fetchTeam } from './api.js';
import { Router } from './router.js';
import { renderHomePage } from './pages/home.js';
import { renderLeaguePage } from './pages/league.js';
import { renderTeamPage } from './pages/team.js';
import { renderEventsPage } from './pages/events.js';

// Initialize router
const router = new Router();

// Register routes
router.addRoute('/', renderHomePage);
router.addRoute('/league', renderLeaguePage);
router.addRoute('/team', renderTeamPage);
router.addRoute('/events', renderEventsPage);

// Initialize user on app load
async function initializeUser() {
    try {
        const users = await fetchUsers();
        
        let user, team;
        
        if (users.length > 0) {
            user = users[0];
            team = await fetchTeam(user.id);
        } else {
            const result = await createUser({
                username: 'demo_user',
                email: 'demo@fantasytennis.com',
                team_name: 'Dream Team'
            });
            user = result.user;
            team = result.team;
        }
        
        setUser(user);
        setTeam(team);
        
        updateNavUserInfo();
        
        console.log('User initialized:', user);
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

function updateNavUserInfo() {
    const user = getUser();
    const navUserInfo = document.getElementById('nav-user-info');
    
    if (user) {
        navUserInfo.innerHTML = `
            <span style="margin-right: 0.5rem;">👤</span>
            <span>${user.username}</span>
        `;
    } else {
        navUserInfo.innerHTML = '<span class="loading">Loading...</span>';
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeUser();
    // Router will handle the initial page load
});