import { supabaseClient } from '../config.js';
import { state, setPlayerTeamMap } from '../state.js';
import { createMatchCard } from '../ui/cards.js';
import { filterMatchesByTeam } from '../ui/navigation.js';
import { formatTennisSetScores } from '../utils.js';

export async function loadMatches() {
    console.log('loadMatches called');
    await loadPlayerTeamMappings();
    await loadUpcomingMatches();
    await loadRecentMatches();
}

// Load player-team mappings
async function loadPlayerTeamMappings() {
    try {
        const { data, error } = await supabaseClient
            .from('teams_players')
            .select(`
                player_id,
                team_id,
                teams (
                    id,
                    name
                )
            `);
        
        if (error) {
            console.error('Error loading player team mappings:', error);
            return;
        }
        
        // Create a map of player_id -> {teamId, teamName}
        const playerTeamMap = {};
        data.forEach(item => {
            playerTeamMap[item.player_id] = {
                teamId: item.team_id,
                teamName: item.teams?.name || 'Unknown Team'
            };
        });
        
        setPlayerTeamMap(playerTeamMap);
        console.log('Player team map:', state.playerTeamMap);
    } catch (err) {
        console.error('Unexpected error loading player team mappings:', err);
    }
}

async function loadUpcomingMatches() {
    console.log('loadUpcomingMatches called');
    const container = document.getElementById('upcomingMatches');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        // First, get all player IDs that are on teams
        const { data: teamPlayers, error: teamPlayersError } = await supabaseClient
            .from('teams_players')
            .select('player_id');
        
        if (teamPlayersError) {
            console.error('Error loading team players:', teamPlayersError);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        const teamPlayerIds = teamPlayers.map(tp => tp.player_id);
        
        if (teamPlayerIds.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No team players found</p>';
            return;
        }
        
        // Fetch upcoming matches
        const { data, error } = await supabaseClient
            .from('tennis_matches')
            .select('*')
            .eq('status_type', 'notstarted')
            .or(`player1_id.in.(${teamPlayerIds.join(',')}),player2_id.in.(${teamPlayerIds.join(',')})`)
            .order('start_timestamp', { ascending: true })
            .limit(50);
        
        if (error) {
            console.error('Error loading upcoming matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        // Fetch points reference
        const { data: pointsRef, error: pointsError } = await supabaseClient
            .from('atp_points_reference')
            .select('category_slug, tournament_type, round_name, round_type, points_for_win');
        
        if (pointsError) {
            console.error('Error loading points reference:', pointsError);
        }
        
        // Create a map for quick lookup
        const pointsMap = {};
        if (pointsRef) {
            pointsRef.forEach(ref => {
                const key = `${ref.category_slug}|${ref.tournament_type}|${ref.round_name}|${ref.round_type}`;
                pointsMap[key] = ref.points_for_win;
            });
        }
        
        console.log('Upcoming matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            const player1Team = state.playerTeamMap[match.player1_id];
            const player2Team = state.playerTeamMap[match.player2_id];
            
            // Get points at stake for this match
            const matchKey = `${match.category_slug}|${match.tournament_type}|${match.round_name}|${match.round_type}`;
            const pointsAtStake = pointsMap[matchKey] || 0;
            
            return {
                id: match.match_id,
                tournament: match.tournament_name || 'Unknown Tournament',
                date: match.match_date,
                startTimestamp: match.start_timestamp,
                homePlayer: {
                    id: match.player1_id,
                    name: match.player1_name || 'Unknown Player',
                    teamId: player1Team?.teamId || null,
                    teamName: player1Team?.teamName || null
                },
                awayPlayer: {
                    id: match.player2_id,
                    name: match.player2_name || 'Unknown Player',
                    teamId: player2Team?.teamId || null,
                    teamName: player2Team?.teamName || null
                },
                round: match.round_name || 'TBD',
                pointsAtStake: pointsAtStake
            };
        }));
        
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No upcoming matches</p>';
            return;
        }
        
        filtered.forEach((match, index) => {
            const card = createMatchCard(match, false);
            card.style.animationDelay = `${index * 0.05}s`;
            container.appendChild(card);
        });
        
    } catch (err) {
        console.error('Unexpected error loading upcoming matches:', err);
        container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
    }
}

async function loadRecentMatches() {
    console.log('loadRecentMatches called');
    const container = document.getElementById('recentMatches');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        // First, get all player IDs that are on teams
        const { data: teamPlayers, error: teamPlayersError } = await supabaseClient
            .from('teams_players')
            .select('player_id');
        
        if (teamPlayersError) {
            console.error('Error loading team players:', teamPlayersError);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        const teamPlayerIds = teamPlayers.map(tp => tp.player_id);
        
        if (teamPlayerIds.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No team players found</p>';
            return;
        }
        
        // Fetch recent matches
        const { data, error } = await supabaseClient
            .from('tennis_matches')
            .select('*')
            .eq('status_type', 'finished')
            .or(`player1_id.in.(${teamPlayerIds.join(',')}),player2_id.in.(${teamPlayerIds.join(',')})`)
            .order('start_timestamp', { ascending: false })
            .limit(50);
        
        if (error) {
            console.error('Error loading recent matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        // Fetch match points
        const matchIds = data.map(m => m.match_id);
        const { data: matchPoints, error: pointsError } = await supabaseClient
            .from('match_points')
            .select('match_id, player_id, points_earned')
            .in('match_id', matchIds);
        
        if (pointsError) {
            console.error('Error loading match points:', pointsError);
        }
        
        // Create a map of match_id + player_id -> points_earned
        const pointsMap = {};
        if (matchPoints) {
            matchPoints.forEach(mp => {
                pointsMap[`${mp.match_id}_${mp.player_id}`] = mp.points_earned;
            });
        }
        
        console.log('Recent matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            const player1Team = state.playerTeamMap[match.player1_id];
            const player2Team = state.playerTeamMap[match.player2_id];
            
            // Format scores
            const homeScore = formatTennisSetScores(match, 'player1');
            const awayScore = formatTennisSetScores(match, 'player2');
            
            // Get points
            const homePoints = pointsMap[`${match.match_id}_${match.player1_id}`] || 0;
            const awayPoints = pointsMap[`${match.match_id}_${match.player2_id}`] || 0;
            
            return {
                id: match.match_id,
                tournament: match.tournament_name || 'Unknown Tournament',
                date: match.match_date,
                startTimestamp: match.start_timestamp,
                homePlayer: {
                    id: match.player1_id,
                    name: match.player1_name || 'Unknown Player',
                    teamId: player1Team?.teamId || null,
                    teamName: player1Team?.teamName || null
                },
                awayPlayer: {
                    id: match.player2_id,
                    name: match.player2_name || 'Unknown Player',
                    teamId: player2Team?.teamId || null,
                    teamName: player2Team?.teamName || null
                },
                round: match.round_name || 'TBD',
                homeScore: homeScore,
                awayScore: awayScore,
                homePoints: homePoints,
                awayPoints: awayPoints,
                winner: match.winner_code === 1 ? 'home' : 'away',
                statusDescription: match.status_description
            };
        }));
        
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">No recent matches</p>';
            return;
        }
        
        filtered.forEach((match, index) => {
            const card = createMatchCard(match, true);
            card.style.animationDelay = `${index * 0.05}s`;
            container.appendChild(card);
        });
        
    } catch (err) {
        console.error('Unexpected error loading recent matches:', err);
        container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
    }
}