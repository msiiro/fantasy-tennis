// UI rendering and DOM manipulation
import { getUser, getTeam } from './state.js';
import { addPlayerToTeam, removePlayerFromTeam } from './api.js';

export function displayUserInfo() {
    const user = getUser();
    const container = document.querySelector('.container');
    
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info';
    userInfo.style.cssText = 'background: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;';
    userInfo.innerHTML = `
        <strong>Logged in as:</strong> ${user.username} | 
        <strong>Team:</strong> ${user.team_name || 'Unnamed Team'}
    `;
    
    // Remove existing user info if present
    const existing = document.getElementById('user-info');
    if (existing) {
        existing.remove();
    }
    
    container.insertBefore(userInfo, container.firstChild);
}

export function displayPlayers(players) {
    const rankingsList = document.getElementById('rankings-list');
    rankingsList.innerHTML = '';
    
    players.forEach(player => {
        const card = createPlayerCard(player);
        rankingsList.appendChild(card);
    });
}

export function displayTeam(teamData) {
    const myTeamDiv = document.getElementById('my-team');
    const teamPlayers = teamData.team_players || [];
    
    if (teamPlayers.length === 0) {
        myTeamDiv.innerHTML = '<p>No players yet. Add players from the rankings above!</p>';
        return;
    }
    
    myTeamDiv.innerHTML = '<div id="team-list"></div>';
    const teamList = document.getElementById('team-list');
    
    teamPlayers.forEach(tp => {
        const player = tp.players;
        const card = createTeamPlayerCard(player, getTeam().id);
        teamList.appendChild(card);
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
}

export function showError(message, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<p style="color: red;">${message}</p>`;
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
        <button class="add-player-btn" data-player-id="${player.id}" data-player-name="${player.name}">
            Add to Team
        </button>
    `;
    
    // Add event listener instead of inline onclick
    const button = card.querySelector('.add-player-btn');
    button.addEventListener('click', () => handleAddPlayer(player.id, player.name));
    
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
        <button class="remove-player-btn" style="background: #f44336;">
            Remove
        </button>
    `;
    
    // Add event listener
    const button = card.querySelector('.remove-player-btn');
    button.addEventListener('click', () => handleRemovePlayer(teamId, player.id, player.name));
    
    return card;
}

async function handleAddPlayer(playerId, playerName) {
    const team = getTeam();
    
    if (!team) {
        alert('Please wait, loading your team...');
        return;
    }
    
    try {
        await addPlayerToTeam(team.id, playerId);
        alert(`Added ${playerName} to your team!`);
        
        // Trigger custom event to reload team
        window.dispatchEvent(new CustomEvent('teamUpdated'));
    } catch (error) {
        console.error('Error adding player:', error);
        alert(error.message || 'Failed to add player to team');
    }
}

async function handleRemovePlayer(teamId, playerId, playerName) {
    if (!confirm(`Remove ${playerName} from your team?`)) {
        return;
    }
    
    try {
        await removePlayerFromTeam(teamId, playerId);
        alert(`Removed ${playerName} from your team`);
        
        // Trigger custom event to reload team
        window.dispatchEvent(new CustomEvent('teamUpdated'));
    } catch (error) {
        console.error('Error removing player:', error);
        alert(error.message || 'Failed to remove player from team');
    }
}