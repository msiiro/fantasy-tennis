// Home page
import { getUser } from '../state.js';

export function renderHomePage() {
    const app = document.getElementById('app');
    const user = getUser();
    
    app.innerHTML = `
        <div class="hero-section">
            <h1>🎾 Welcome to Fantasy Tennis</h1>
            <p>Build your dream team and compete with friends!</p>
            ${!user ? '<a href="#/signin" class="btn btn-primary btn-large">Get Started</a>' : ''}
        </div>
        
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">🏆</div>
                <h3>Build Your Team</h3>
                <p>Select up to 10 players from ATP and WTA tours to create your ultimate fantasy team.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Track Rankings</h3>
                <p>Real-time player rankings and points updated automatically from official sources.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🎯</div>
                <h3>Compete & Win</h3>
                <p>Compete with up to 10 players in your league and climb the leaderboard.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📅</div>
                <h3>Follow Events</h3>
                <p>Stay updated with upcoming tournaments and recent match results.</p>
            </div>
        </div>
        
        ${user ? `
            <div class="card">
                <div class="card-header">
                    <h2>Quick Stats</h2>
                </div>
                <div class="stats-grid">
                    <div class="stat-box blue">
                        <div class="stat-value" id="home-team-size">-</div>
                        <div class="stat-label">Players on Team</div>
                    </div>
                    <div class="stat-box green">
                        <div class="stat-value" id="home-total-points">-</div>
                        <div class="stat-label">Total Points</div>
                    </div>
                    <div class="stat-box orange">
                        <div class="stat-value" id="home-league-rank">-</div>
                        <div class="stat-label">League Rank</div>
                    </div>
                </div>
                <div class="text-center mt-3">
                    <a href="#/team" class="btn btn-primary">Manage Your Team</a>
                    <a href="#/league" class="btn btn-secondary">View Standings</a>
                </div>
            </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header">
                <h2>How It Works</h2>
            </div>
            <ol style="line-height: 2; padding-left: 2rem;">
                <li><strong>Create your team</strong> by selecting up to 10 tennis players</li>
                <li><strong>Earn points</strong> based on your players' real-world ATP/WTA rankings</li>
                <li><strong>Compete</strong> against other users in your league</li>
                <li><strong>Update your team</strong> anytime to optimize your points</li>
                <li><strong>Win</strong> by having the highest total points in your league!</li>
            </ol>
        </div>
    `;
    
    // Load quick stats if user is logged in
    if (user) {
        loadHomeStats();
    }
}

async function loadHomeStats() {
    try {
        const user = getUser();
        const response = await fetch(`http://localhost:3000/api/teams/user/${user.id}`);
        const teamData = await response.json();
        
        const teamPlayers = teamData.team_players || [];
        const totalPoints = teamPlayers.reduce((sum, tp) => sum + tp.players.points, 0);
        
        document.getElementById('home-team-size').textContent = teamPlayers.length;
        document.getElementById('home-total-points').textContent = totalPoints.toLocaleString();
        
        // Get league rank (we'll implement this properly later)
        document.getElementById('home-league-rank').textContent = '1st';
    } catch (error) {
        console.error('Error loading home stats:', error);
    }
}