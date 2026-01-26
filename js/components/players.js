import { supabaseClient } from '../config.js';
import { state, setAllPlayers, setAllTeams } from '../state.js';

export async function loadPlayers() {
    console.log('loadPlayers called');
    const container = document.getElementById('playersList');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        // Fetch players first
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('player_id, name, gender');
        
        if (playersError) {
            console.error('Error loading players:', playersError);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading players</p>';
            return;
        }
        
        // Fetch all teams for dropdown
        const { data: teams, error: teamsError } = await supabaseClient
            .from('teams')
            .select('id, name')
            .order('name', { ascending: true });
        
        if (teamsError) {
            console.error('Error loading teams:', teamsError);
        } else {
            setAllTeams(teams || []);
            populateTeamDropdown();
            
            // Set dropdown to user's team if available
            if (state.currentUserTeam && state.currentUserTeam.id) {
                const dropdown = document.getElementById('teamDropdown');
                if (dropdown) {
                    dropdown.value = state.currentUserTeam.id;
                }
            }
        }
        
        // Fetch team assignments separately
        const { data: teamAssignments, error: teamError } = await supabaseClient
            .from('teams_players')
            .select(`
                player_id,
                team_id,
                teams (
                    id,
                    name
                )
            `);
        
        if (teamError) {
            console.error('Error loading team assignments:', teamError);
        }
        
        // Create a map of player_id -> team info
        const teamMap = {};
        if (teamAssignments) {
            teamAssignments.forEach(ta => {
                teamMap[ta.player_id] = {
                    teamId: ta.team_id,
                    teamName: ta.teams?.name || 'Unknown Team'
                };
            });
        }
        
        // Fetch match points to calculate total points and match count per player
        const { data: matchPoints, error: matchError } = await supabaseClient
            .from('match_points')
            .select('player_id, points_earned, match_id');
        
        if (matchError) {
            console.error('Error loading match points:', matchError);
        }
        
        // Create maps for points and match counts
        const playerPointsMap = {};
        const matchCountMap = {};
        if (matchPoints) {
            matchPoints.forEach(mp => {
                // Sum up points
                playerPointsMap[mp.player_id] = (playerPointsMap[mp.player_id] || 0) + (mp.points_earned || 0);
                // Count unique matches
                if (!matchCountMap[mp.player_id]) {
                    matchCountMap[mp.player_id] = new Set();
                }
                matchCountMap[mp.player_id].add(mp.match_id);
            });
        }
        
        console.log('Players data:', players);
        console.log('Team map:', teamMap);
        console.log('Points map:', playerPointsMap);
        
        // Create player data array with all info
        const allPlayers = players.map(player => {
            const teamInfo = teamMap[player.player_id];
            return {
                id: player.player_id,
                name: player.name,
                gender: player.gender || 'M',
                team: teamInfo?.teamName || 'Free Agent',
                teamId: teamInfo?.teamId || null,
                points: playerPointsMap[player.player_id] || 0,
                matches: matchCountMap[player.player_id]?.size || 0
            };
        });
        
        // Sort by points descending
        allPlayers.sort((a, b) => b.points - a.points);
        
        // Save to state
        setAllPlayers(allPlayers);
        
        // Initial render
        renderFilteredPlayers();
        
    } catch (err) {
        console.error('Unexpected error loading players:', err);
        container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading players</p>';
    }
}

export function populateTeamDropdown() {
    const dropdown = document.getElementById('teamDropdown');
    dropdown.innerHTML = '<option value="">Select a team...</option>';
    
    state.allTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        dropdown.appendChild(option);
    });
}

export function renderFilteredPlayers() {
    const container = document.getElementById('playersList');
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    
    // Apply all filters
    let filtered = state.allPlayers.filter(player => {
        // Gender filter
        if (state.currentGenderFilter !== 'all' && player.gender !== state.currentGenderFilter) {
            return false;
        }
        
        // Team filter
        if (state.currentTeamFilter === 'league') {
            // Only show players on a team
            if (!player.teamId) {
                return false;
            }
        } else if (state.currentTeamFilter === 'specific') {
            // Only show players on the selected team
            if (!state.currentSpecificTeam || player.teamId !== state.currentSpecificTeam) {
                return false;
            }
        }
        
        // Search filter
        if (searchTerm && !player.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        return true;
    });
    
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No players found</p>';
        return;
    }
    
    filtered.forEach((player, index) => {
        const row = createPlayerRow(player, index + 1);
        container.appendChild(row);
    });
}

function createPlayerRow(player, rank) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.dataset.playerName = player.name.toLowerCase();
    
    // Determine row type based on team
    const isMyTeam = state.currentUserTeam && player.teamId === state.currentUserTeam.id;
    const hasTeam = player.teamId !== null;
    
    // Add class based on team status
    if (isMyTeam) {
        row.classList.add('my-team-row');
    } else if (hasTeam) {
        row.classList.add('other-team-row');
    } else {
        row.classList.add('no-team-row');
    }
    
    // Ensure gender has a fallback value
    const gender = player.gender || 'M';
    
    row.innerHTML = `
        <div class="col-rank">
            <div class="rank-badge">${rank}</div>
        </div>
        <div class="col-player">
            <div class="player-name">${player.name}</div>
        </div>
        <div class="col-gender">
            <span class="gender-badge gender-${gender}">${gender}</span>
        </div>
        <div class="col-team">
            <span class="gender-badge gender-${gender}">${gender}</span>
            ${player.team !== 'Free Agent' 
                ? `<span class="team-badge ${isMyTeam ? 'my-team' : 'other-team'}">${player.team}</span>` 
                : ''}
        </div>
        <div class="col-points">
            <div class="points">${player.points}</div>
        </div>
        <div class="col-matches">
            <div style="color: var(--color-text-secondary)">${player.matches}</div>
        </div>
    `;
    
    return row;
}