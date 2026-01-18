const API_URL = 'http://localhost:3000/api';

// Store current user (for demo, we'll use first user or create one)
let currentUser = null;
let currentTeam = null;

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await initializeUser();
    await loadPlayers();
    await loadMyTeam();
});

// Initialize or create a demo user
async function initializeUser() {
    try {
        // Try to get existing users
        const response = await fetch(`${API_URL}/users`);
        const users = await response.json();
        
        if (users.length > 0) {
            // Use first user for demo
            currentUser = users[0];
        } else {
            // Create a demo user
            const createResponse = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'demo_user',
                    email: 'demo@fantasytennis.com',
                    team_name: 'Dream Team'
                })
            });
            const result = await createResponse.json();
            currentUser = result.user;
            currentTeam = result.team;
        }
        
        // Get user's team
        if (!currentTeam) {
            const teamResponse = await fetch(`${API_URL}/teams/user/${currentUser.id}`);
            currentTeam = await teamResponse.json();
        }
        
        console.log('Current user:', currentUser);
        console.log('Current team:', currentTeam);
        
        // Update UI with user info
        updateUserInfo();
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

function updateUserInfo() {
    const container = document.querySelector('.container');
    const userInfo = document.createElement('div');
    userInfo.style.cssText = 'background: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;';
    userInfo.innerHTML = `
        <strong>Logged in as:</strong> ${currentUser.username} | 
        <strong>Team:</strong> ${currentUser.team_name || 'Unnamed Team'}
    `;
    container.insertBefore(userInfo, container.firstChild);
}

// Load players from database
async function loadPlayers() {
    const rankingsList = document.getElementById('rankings-list');
    
    try {
        const response = await fetch(`${API_URL}/players`);
        const players = await response.json();
        
        rankingsList.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = createPlayerCard(player);
            rankingsList.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading players:', error);
        rankingsList.innerHTML = '<p>Error loading players. Make sure the server is running.</p>';
    }
}

// Load current user's team
async function loadMyTeam() {
    const myTeamDiv = document.getElementById('my-team');
    
    if (!currentTeam) {
        myTeamDiv.innerHTML = '<p>Loading team...</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/teams/user/${currentUser.id}`);
        const teamData = await response.json();
        
        const teamPlayers = teamData.team_players || [];
        
        if (teamPlayers.length === 0) {
            myTeamDiv.innerHTML = '<p>No players yet. Add players from the rankings above!</p>';
            return;
        }
        
        myTeamDiv.innerHTML = '<div id="team-list"></div>';
        const teamList = document.getElementById('team-list');
        
        teamPlayers.forEach(tp => {
            const player = tp.players;
            const playerCard = createTeamPlayerCard(player, currentTeam.id);
            teamList.appendChild(playerCard);
        });
        
        // Show team stats
        const totalPoints = teamPlayers.reduce((sum, tp) => sum + tp.players.points, 0);
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;';
        statsDiv.innerHTML = `
            <strong>Team Size:</strong> ${teamPlayers.length}/10 players<br>
            <strong>Total Points:</strong> ${totalPoints.toLocaleString()}
        `;
        myTeamDiv.appendChild(statsDiv);
        
    } catch (error) {
        console.error('Error loading team:', error);
        myTeamDiv.innerHTML = '<p>Error loading your team.</p>';
    }
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    const tourBadge = player.tour === 'WTA' 
        ? '<span style="background: #e91e63; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">WTA</span>'
        : '<span style="background: #2196F3; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">ATP</span>';
    
    card.innerHTML = `
        <div class="player-info">
            <span class="rank">#${player.rank}</span>
            <div>
                <strong>${player.name}</strong> ${tourBadge}
                <div style="font-size: 0.9em; color: #666;">
                    ${player.country} • ${player.points.toLocaleString()} pts
                </div>
            </div>
        </div>
        <button onclick="addToTeam('${player.id}', '${player.name}')">
            Add to Team
        </button>
    `;
    
    return card;
}

function createTeamPlayerCard(player, teamId) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.background = '#e8f5e9';
    
    const tourBadge = player.tour === 'WTA' 
        ? '<span style="background: #e91e63; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">WTA</span>'
        : '<span style="background: #2196F3; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">ATP</span>';
    
    card.innerHTML = `
        <div class="player-info">
            <span class="rank">#${player.rank}</span>
            <div>
                <strong>${player.name}</strong> ${tourBadge}
                <div style="font-size: 0.9em; color: #666;">
                    ${player.country} • ${player.points.toLocaleString()} pts
                </div>
            </div>
        </div>
        <button onclick="removeFromTeam('${teamId}', '${player.id}', '${player.name}')" 
                style="background: #f44336;">
            Remove
        </button>
    `;
    
    return card;
}

async function addToTeam(playerId, playerName) {
    if (!currentTeam) {
        alert('Please wait, loading your team...');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/teams/${currentTeam.id}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: playerId })
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Failed to add player');
            return;
        }
        
        alert(`Added ${playerName} to your team!`);
        await loadMyTeam(); // Reload team display
        
    } catch (error) {
        console.error('Error adding player:', error);
        alert('Failed to add player to team');
    }
}

async function removeFromTeam(teamId, playerId, playerName) {
    if (!confirm(`Remove ${playerName} from your team?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/teams/${teamId}/players/${playerId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove player');
        }
        
        alert(`Removed ${playerName} from your team`);
        await loadMyTeam(); // Reload team display
        
    } catch (error) {
        console.error('Error removing player:', error);
        alert('Failed to remove player from team');
    }
}