import { fetchAllTeams } from '../api/teams.js';
import { createLeaderboardRow } from '../ui/cards.js';

export async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        const data = await fetchAllTeams();
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No teams found</p>';
            return;
        }
        
        container.innerHTML = '';
        
        data.forEach((team, index) => {
            const teamData = {
                id: team.id,
                name: team.name || 'Unknown User',
                points: team.current_points || 0,
                change: 0
            };
            
            const row = createLeaderboardRow(teamData, index + 1);
            container.appendChild(row);
        });
        
    } catch (err) {
        console.error('Unexpected error loading leaderboard:', err);
        container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading leaderboard</p>';
    }
}