// League standings page
import { getUser } from '../state.js';

export async function renderLeaguePage() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="page-header">
            <h1>League Standings</h1>
            <p>See how you stack up against the competition</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Current Standings</h2>
            </div>
            <div id="standings-content">
                <p class="loading">Loading standings...</p>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>League Statistics</h2>
            </div>
            <div class="stats-grid" id="league-stats">
                <div class="stat-box blue">
                    <div class="stat-value" id="total-teams">-</div>
                    <div class="stat-label">Total Teams</div>
                </div>
                <div class="stat-box green">
                    <div class="stat-value" id="avg-points">-</div>
                    <div class="stat-label">Average Points</div>
                </div>
                <div class="stat-box orange">
                    <div class="stat-value" id="total-players-picked">-</div>
                    <div class="stat-label">Players Selected</div>
                </div>
            </div>
        </div>
    `;
    
    await loadStandings();
}

async function loadStandings() {
    try {
        const response = await fetch('http://localhost:3000/api/teams');
        const teams = await response.json();
        
        const user = getUser();
        
        // Calculate points for each team and sort
        const standings = teams.map(team => {
            const totalPoints = team.team_players?.reduce((sum, tp) => 
                sum + (tp.players?.points || 0), 0) || 0;
            const playerCount = team.team_players?.length || 0;
            
            return {
                userId: team.user_id,
                username: team.users?.username || 'Unknown',
                teamName: team.users?.team_name || 'Unnamed Team',
                totalPoints,
                playerCount,
                isCurrentUser: user && team.user_id === user.id
            };
        }).sort((a, b) => b.totalPoints - a.totalPoints);
        
        // Render standings table
        const standingsHtml = `
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Manager</th>
                        <th>Players</th>
                        <th>Total Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((team, index) => `
                        <tr style="${team.isCurrentUser ? 'background: #e3f2fd; font-weight: 600;' : ''}">
                            <td>
                                <span class="rank-badge ${getRankClass(index)}">
                                    ${index + 1}
                                </span>
                            </td>
                            <td>
                                ${team.teamName}
                                ${team.isCurrentUser ? '<span style="color: var(--primary-color);"> (You)</span>' : ''}
                            </td>
                            <td>${team.username}</td>
                            <td>${team.playerCount}/10</td>
                            <td><strong>${team.totalPoints.toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('standings-content').innerHTML = standingsHtml;
        
        // Update league stats
        const totalTeams = teams.length;
        const avgPoints = standings.reduce((sum, t) => sum + t.totalPoints, 0) / totalTeams;
        const totalPlayersPicked = standings.reduce((sum, t) => sum + t.playerCount, 0);
        
        document.getElementById('total-teams').textContent = totalTeams;
        document.getElementById('avg-points').textContent = Math.round(avgPoints).toLocaleString();
        document.getElementById('total-players-picked').textContent= totalPlayersPicked;
} catch (error) {
    console.error('Error loading standings:', error);
    document.getElementById('standings-content').innerHTML = 
        '<p style="color: red;">Error loading standings. Please try again.</p>';
}}
function getRankClass(index) {
if (index === 0) return 'gold';
if (index === 1) return 'silver';
if (index === 2) return 'bronze';
return '';
}