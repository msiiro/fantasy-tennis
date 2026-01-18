// Team management page
import { getUser, getTeam } from '../state.js';
import { fetchPlayers, fetchTeam, addPlayerToTeam, removePlayerFromTeam } from '../api.js';

let currentFilter = 'ALL';

export async function renderTeamPage() {
    const app = document.getElementById('app');
    const user = getUser();
    
    if (!user) {
        app.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔒</div>
                <h3>Please sign in to manage your team</h3>
                <a href="#/" class="btn btn-primary mt-2">Go to Home</a>
            </div>
        `;
        return;
    }
    
    app.innerHTML = `
        <div class="team-header">
            <h1>${user.team_name || 'My Team'}</h1>
            <p>Manager: ${user.username}</p>
            <div class="team-stats">
                <div class="team-stat">
                    <div style="font-size: 2rem; font-weight: bold;" id="team-player-count">0</div>
                    <div>Players</div>
                </div>
                <div class="team-stat">
                    <div style="font-size: 2rem; font-weight: bold;" id="team-total-points">0</div>
                    <div>Total Points</div>
                </div>
                <div class="team-stat">
                    <div style="font-size: 2rem; font-weight: bold;" id="team-avg-rank">-</div>
                    <div>Avg Rank</div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-2">
            <div class="card">
                <div class="card-header">
                    <h2>Your Players</h2>
                </div>
                <div id="my-players">
                    <p class="loading">Loading your team...</p>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Available Players</h2>
                </div>
                <div class="filter-buttons">
                    <button class="filter-btn active" onclick="window.filterPlayers('ALL')">All</button>
                    <button class="filter-btn" onclick="window.filterPlayers('ATP')">ATP</button>
                    <button class="filter-btn" onclick="window.filterPlayers('WTA')">WTA</button>
                </div>
                <div class="available-players" id="available-players">
                    <p class="loading">Loading available players...</p>
                </div>
            </div>
        </div>
    `;
    
    // Make filter function globally available
    window.filterPlayers = filterPlayers;
    
    await loadTeamData();
    await loadAvailablePlayers();
}

async function loadTeamData() {
    try {
        const user = getUser();
        const teamData = await fetchTeam(user.id);
        
        const teamPlayers = teamData.team_players || [];
        const myPlayersDiv = document.getElementById('my-players');
        
        if (teamPlayers.length === 0) {
            myPlayersDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No players yet. Add players from the list!</p>
                </div>
            `;
        } else {
            myPlayersDiv.innerHTML = teamPlayers.map(tp => {
                const player = tp.players;
                return createTeamPlayerCard(player);
            }).join('');
            
            // Update stats
            const totalPoints = teamPlayers.reduce((sum, tp) => sum + tp.players.points, 0);
            const avgRank = Math.round(teamPlayers.reduce((sum, tp) => sum + tp.players.rank, 0) / teamPlayers.length);
            
            document.getElementById('team-player-count').textContent = `${teamPlayers.length}/10`;
            document.getElementById('team-total-points').textContent = totalPoints.toLocaleString();
            document.getElementById('team-avg-rank').textContent = avgRank;
        }
    } catch (error) {
        console.error('Error loading team:', error);
        document.getElementById('my-players').innerHTML = 
            '<p style="color: red;">Error loading your team.</p>';
    }
}

async function loadAvailablePlayers() {
    try {
        const players = await fetchPlayers();
        const user = getUser();
        const teamData = await fetchTeam(user.id);
        
        // Get IDs of players already on the team
        const teamPlayerIds = (teamData.team_players || []).map(tp => tp.players.id);
        
        // Filter out players already on team
        const availablePlayers = players.filter(p => !teamPlayerIds.includes(p.id));
        
        displayAvailablePlayers(availablePlayers);
    } catch (error) {
        console.error('Error loading available players:', error);
        document.getElementById('available-players').innerHTML = 
            '<p style="color: red;">Error loading players.</p>';
    }
}

function displayAvailablePlayers(players) {
    const container = document.getElementById('available-players');
    
    // Apply filter
    let filteredPlayers = players;
    if (currentFilter !== 'ALL') {
        filteredPlayers = players.filter(p => p.tour === currentFilter);
    }
    
    if (filteredPlayers.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No available players</p>';
        return;
    }
    
    container.innerHTML = filteredPlayers.map(player => createAvailablePlayerCard(player)).join('');
}

function createAvailablePlayerCard(player) {
    const tourClass = player.tour === 'WTA' ? 'wta' : 'atp';
    
    return `
        <div class="player-card">
            <div class="player-info">
                <div class="player-rank">#${player.rank}</div>
                <div class="player-details">
                    <div class="player-name">
                        ${player.name}
                        <span class="tour-badge ${tourClass}">${player.tour}</span>
                    </div>
                    <div class="player-stats">
                        ${player.country} • ${player.points.toLocaleString()} pts
                    </div>
                </div>
            </div>
            <button class="btn btn-success" onclick="window.addPlayer('${player.id}', '${player.name}')">
                Add
            </button>
        </div>
    `;
}

function createTeamPlayerCard(player) {
    const tourClass = player.tour === 'WTA' ? 'wta' : 'atp';
    const team = getTeam();
    
    return `
        <div class="player-card" style="background: #e8f5e9;">
            <div class="player-info">
                <div class="player-rank">#${player.rank}</div>
                <div class="player-details">
                    <div class="player-name">
                        ${player.name}
                        <span class="tour-badge ${tourClass}">${player.tour}</span>
                    </div>
                    <div class="player-stats">
                        ${player.country} • ${player.points.toLocaleString()} pts
                    </div>
                </div>
            </div>
            <button class="btn btn-danger" onclick="window.removePlayer('${team.id}', '${player.id}', '${player.name}')">
                Remove
            </button>
        </div>
    `;
}

async function filterPlayers(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload players with filter
    await loadAvailablePlayers();
}

// Global functions for button handlers
window.addPlayer = async function(playerId, playerName) {
    const team = getTeam();
    
    try {
        await addPlayerToTeam(team.id, playerId);
        alert(`Added ${playerName} to your team!`);
        await renderTeamPage(); // Reload the page
    } catch (error) {
        alert(error.message || 'Failed to add player');
    }
};

window.removePlayer = async function(teamId, playerId, playerName) {
    if (!confirm(`Remove ${playerName} from your team?`)) {
        return;
    }
    
    try {
        await removePlayerFromTeam(teamId, playerId);
        alert(`Removed ${playerName} from your team`);
        await renderTeamPage(); // Reload the page
    } catch (error) {
        alert(error.message || 'Failed to remove player');
    }
};

