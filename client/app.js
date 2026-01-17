const API_URL = 'http://localhost:3000/api';

// Load rankings when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadRankings();
});

async function loadRankings() {
    const rankingsList = document.getElementById('rankings-list');
    
    try {
        const response = await fetch(`${API_URL}/rankings`);
        const data = await response.json();
        
        rankingsList.innerHTML = '';
        
        data.rankings.forEach(player => {
            const playerCard = createPlayerCard(player);
            rankingsList.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading rankings:', error);
        rankingsList.innerHTML = '<p>Error loading rankings. Make sure the server is running.</p>';
    }
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    card.innerHTML = `
        <div class="player-info">
            <span class="rank">#${player.rank}</span>
            <div>
                <strong>${player.name}</strong>
                <div style="font-size: 0.9em; color: #666;">
                    ${player.country} • ${player.points} pts
                </div>
            </div>
        </div>
        <button onclick="addToTeam('${player.name}', ${player.rank})">
            Add to Team
        </button>
    `;
    
    return card;
}

function addToTeam(playerName, rank) {
    const myTeam = document.getElementById('my-team');
    alert(`Added ${playerName} to your team!`);
    // We'll implement actual team management later
}