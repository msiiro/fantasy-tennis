const supabaseUrl = 'https://ugxbybhbnoylantodnmc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentUser = null;
let currentUserTeam = null; // Store the user's team info
let playerTeamMap = {}; // Map of player_id -> {teamId, teamName}
let currentFilter = 'myteam';
let currentSection = 'leaderboard';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session) {
            // User is logged in
            currentUser = session.user;
            
            document.getElementById('signInScreen').classList.remove('active');
            document.getElementById('mainApp').classList.add('active');
            document.getElementById('userName').textContent = currentUser.email;
            
            // Load user's team and then load data
            loadUserTeam().then(() => {
                loadLeaderboard();
                loadMatches();
                loadPlayers();
                updateLastUpdated();
            });
        } else {
            // User is logged out
            currentUser = null;
            currentUserTeam = null;
            playerTeamMap = {};
            document.getElementById('mainApp').classList.remove('active');
            document.getElementById('signInScreen').classList.add('active');
        }
    });
    
    initializeEventListeners();
});

// Load current user's team
async function loadUserTeam() {
    try {
        const { data, error } = await supabaseClient
            .from('teams')
            .select('id, name')
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) {
            console.error('Error loading user team:', error);
            return;
        }
        
        currentUserTeam = data;
        console.log('Current user team:', currentUserTeam);
    } catch (err) {
        console.error('Unexpected error loading user team:', err);
    }
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
        playerTeamMap = {};
        data.forEach(item => {
            playerTeamMap[item.player_id] = {
                teamId: item.team_id,
                teamName: item.teams?.name || 'Unknown Team'
            };
        });
        
        console.log('Player team map:', playerTeamMap);
    } catch (err) {
        console.error('Unexpected error loading player team mappings:', err);
    }
}

// Event Listeners
function initializeEventListeners() {
    // Sign in form
    document.getElementById('signInForm').addEventListener('submit', handleSignIn);
    
    // Sign out button
    document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterMatches(btn.dataset.filter));
    });
    
    // Player search
    document.getElementById('playerSearch').addEventListener('input', (e) => {
        filterPlayers(e.target.value);
    });
}

function handleSignOut() {
    currentUser = null;
    currentUserTeam = null;
    playerTeamMap = {};
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('signInScreen').classList.add('active');
    
    // Reset form
    document.getElementById('signInForm').reset();
}

async function handleSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            alert('Sign in failed: ' + error.message);
            console.error('Sign in error:', error);
            return;
        }
        
        console.log('Sign in successful:', data);
        currentUser = data.user;
        
        // Show main app
        document.getElementById('signInScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        document.getElementById('userName').textContent = currentUser.email;
        
        // Load user team first, then load initial data
        await loadUserTeam();
        loadLeaderboard();
        loadMatches();
        loadPlayers();
        updateLastUpdated();
        
    } catch (err) {
        /* console.error('Unexpected error:', err);
        alert('An error occurred during sign in'); */
    }
}

// Section Navigation
function switchSection(section) {
    currentSection = section;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}Section`);
    });
}

// Leaderboard
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        // Query teams with user information
        const { data, error } = await supabaseClient
            .from('teams')
            .select(`
                id,
                name,
                current_points
            `)
            .order('current_points', { ascending: false });
        
        if (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading leaderboard</p>';
            return;
        }
        
        console.log('Leaderboard data:', data);
        
        // Clear container
        container.innerHTML = '';
        
        // Render each team
        data.forEach((team, index) => {
            const teamData = {
                id: team.id,
                name: team.name || 'Unknown User',
                points: team.current_points || 0,
                change: team.change || 0
            };
            
            const row = createLeaderboardRow(teamData, index + 1);
            row.style.animationDelay = `${index * 0.05}s`;
            container.appendChild(row);
        });
        
    } catch (err) {
        console.error('Unexpected error loading leaderboard:', err);
        container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading leaderboard</p>';
    }
}

function createLeaderboardRow(team, rank) {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    const changeIcon = team.change > 0 ? '▲' : team.change < 0 ? '▼' : '—';
    const changeClass = team.change > 0 ? 'positive' : team.change < 0 ? 'negative' : 'neutral';
    
    row.innerHTML = `
        <div class="col-rank">
            <div class="rank-badge ${rank <= 3 ? 'top-3' : ''}">${rank}</div>
        </div>
        <div class="col-team">
            <div class="team-name">${team.name}</div>
        </div>
        <div class="col-points">
            <div class="points">${team.points}</div>
        </div>
        <div class="col-change">
            <div class="change ${changeClass}">
                ${changeIcon} ${Math.abs(team.change)}
            </div>
        </div>
    `;
    
    return row;
}

// Matches
async function loadMatches() {
    // Load player-team mappings first
    await loadPlayerTeamMappings();
    
    await loadUpcomingMatches();
    await loadRecentMatches();
}

async function loadUpcomingMatches() {
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
        
        // Get unique combinations of category_slug, tournament_type, round_name, round_type
        const matchKeys = [...new Set(data.map(m => 
            `${m.category_slug}|${m.tournament_type}|${m.round_name}|${m.round_type}`
        ))];
        
        // Fetch points reference for these combinations
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
        console.log('Points reference map:', pointsMap);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            const player1Team = playerTeamMap[match.player1_id];
            const player2Team = playerTeamMap[match.player2_id];
            
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
        
        // Now fetch matches where player1_id OR player2_id is in the team players list
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
        
        // Fetch match points for all these matches
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
        console.log('Match points:', pointsMap);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            const player1Team = playerTeamMap[match.player1_id];
            const player2Team = playerTeamMap[match.player2_id];
            
            // Format scores from the set columns
            const homeScore = formatTennisSetScores(match, 'player1');
            const awayScore = formatTennisSetScores(match, 'player2');
            
            // Get points for each player
            const homePoints = pointsMap[`${match.match_id}_${match.player1_id}`] || 0;
            const awayPoints = pointsMap[`${match.match_id}_${match.player2_id}`] || 0;
            
            return {
                id: match.match_id,
                tournament: match.tournament_name || 'Unknown Tournament',
                date: match.match_date,
                startTimestamp: match.start_timestamp,
                homePlayer: {
                    id: match.player1_id,
                    name: match.player1_short_name || 'Unknown Player',
                    teamId: player1Team?.teamId || null,
                    teamName: player1Team?.teamName || null
                },
                awayPlayer: {
                    id: match.player2_id,
                    name: match.player2_short_name || 'Unknown Player',
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
// Helper function to format tennis set scores
function formatTennisSetScores(match, playerPrefix) {
    const sets = [];
    
    for (let i = 1; i <= 5; i++) {
        const setScore = match[`${playerPrefix}_set${i}_score`];
        if (setScore !== null && setScore !== undefined) {
            const tiebreak = match[`${playerPrefix}_set${i}_tiebreak`];
            if (tiebreak !== null && tiebreak !== undefined) {
                sets.push(`${setScore}<sup>${tiebreak}</sup>`);
            } else {
                sets.push(setScore.toString());
            }
        }
    }
    
    return sets.join(' ');
}

function createMatchCard(match, isComplete) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    // Parse the timestamp correctly - use start_timestamp if available
    const matchDateTime = match.startTimestamp 
        ? new Date(match.startTimestamp * 1000) 
        : new Date(match.date);
    
    const dateOptions = { 
        month: 'short', 
        day: 'numeric'
    };
    
    let dateTimeDisplay;
    if (isComplete) {
        // Only show date for completed matches
        dateTimeDisplay = matchDateTime.toLocaleDateString('en-US', dateOptions);
    } else {
        // Show date and time for upcoming matches
        const timeOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        
        const date = matchDateTime.toLocaleDateString('en-US', dateOptions);
        const time = matchDateTime.toLocaleTimeString('en-US', timeOptions);
        
        // Get timezone abbreviation
        const timezone = new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short'
        }).formatToParts(matchDateTime).find(part => part.type === 'timeZoneName')?.value || '';
        
        dateTimeDisplay = `${date} • ${time} ${timezone}`;
    }
    
    // Check if players are on user's team or other teams
    const homeOnMyTeam = currentUserTeam && match.homePlayer.teamId === currentUserTeam.id;
    const awayOnMyTeam = currentUserTeam && match.awayPlayer.teamId === currentUserTeam.id;
    
    // Get team badges
    const homeBadge = homeOnMyTeam 
        ? '<span class="player-badge my-team">MY TEAM</span>' 
        : (match.homePlayer.teamName 
            ? `<span class="player-badge other-team">${match.homePlayer.teamName}</span>` 
            : '');
    
    const awayBadge = awayOnMyTeam 
        ? '<span class="player-badge my-team">MY TEAM</span>' 
        : (match.awayPlayer.teamName 
            ? `<span class="player-badge other-team">${match.awayPlayer.teamName}</span>` 
            : '');
    
    // Check if we should show status description instead of score
    const showStatusDescription = isComplete && match.statusDescription && match.statusDescription !== 'Ended';
    
    card.innerHTML = `
        <div class="match-header">
            <div class="tournament-name">${match.tournament} • ${match.round}</div>
            <div class="match-date">${dateTimeDisplay}</div>
        </div>
        ${!isComplete && match.pointsAtStake > 0 ? `
            <div class="points-at-stake">
                <span class="stake-label">Points at stake:</span>
                <span class="stake-value">${match.pointsAtStake} pts</span>
            </div>
        ` : ''}
        <div class="match-players">
            <div class="player-row">
                <div class="player-info">
                    <span>${match.homePlayer.name}</span>
                    ${homeBadge}
                </div>
                ${isComplete ? 
                    `<div class="score-section">
                        ${match.winner === 'home' && match.homePoints > 0 ? `<span class="points-earned winner">+${match.homePoints} pts</span>` : ''}
                        ${showStatusDescription && match.winner === 'home' 
                            ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                            : `<div class="score ${match.winner === 'home' ? 'winner' : ''}">${match.homeScore}</div>`}
                    </div>`
                    : ''}
            </div>
            <div class="player-row">
                <div class="player-info">
                    <span>${match.awayPlayer.name}</span>
                    ${awayBadge}
                </div>
                ${isComplete ? 
                    `<div class="score-section">
                        ${match.winner === 'away' && match.awayPoints > 0 ? `<span class="points-earned winner">+${match.awayPoints} pts</span>` : ''}
                        ${showStatusDescription && match.winner === 'away' 
                            ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                            : `<div class="score ${match.winner === 'away' ? 'winner' : ''}">${match.awayScore}</div>`}
                    </div>`
                    : ''}
            </div>
        </div>
    `;
    
    return card;
}

function filterMatches(filter) {
    currentFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Reload matches with filter
    loadMatches();
}

function filterMatchesByTeam(matches) {
    if (!currentUserTeam) {
        return matches; // If no team, show all
    }
    
    if (currentFilter === 'all') {
        return matches;
    }
    
    if (currentFilter === 'myteam') {
        return matches.filter(match => 
            match.homePlayer.teamId === currentUserTeam.id || 
            match.awayPlayer.teamId === currentUserTeam.id
        );
    }
    
    if (currentFilter === 'headtohead') {
        return matches.filter(match => 
            match.homePlayer.teamId !== null && 
            match.awayPlayer.teamId !== null &&
            match.homePlayer.teamId !== match.awayPlayer.teamId
        );
    }
    
    if (currentFilter === 'anyteam') {
        return matches.filter(match => 
            match.homePlayer.teamId !== null || 
            match.awayPlayer.teamId !== null
        );
    }
    
    return matches;
}

// Players
function loadPlayers() {
    const container = document.getElementById('playersList');
    container.innerHTML = '';
    
    const sortedPlayers = [...DEMO_DATA.players].sort((a, b) => b.points - a.points);
    
    sortedPlayers.forEach((player, index) => {
        const row = createPlayerRow(player, index + 1);
        row.style.animationDelay = `${index * 0.05}s`;
        container.appendChild(row);
    });
}

function createPlayerRow(player, rank) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.dataset.playerName = player.name.toLowerCase();
    
    row.innerHTML = `
        <div class="col-rank">
            <div class="rank-badge ${rank <= 3 ? 'top-3' : ''}">${rank}</div>
        </div>
        <div class="col-player">
            <div class="player-name">${player.name}</div>
        </div>
        <div class="col-tour">
            <span class="tour-badge">${player.tour}</span>
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

function filterPlayers(searchTerm) {
    const rows = document.querySelectorAll('#playersList .table-row');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const playerName = row.dataset.playerName;
        if (playerName.includes(term)) {
            row.style.display = 'grid';
        } else {
            row.style.display = 'none';
        }
    });
}

// Utility
function updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
    });
    element.textContent = `Updated: ${timeString}`;
}

// Auto-refresh (simulate real-time updates)
setInterval(() => {
    if (currentUser) {
        updateLastUpdated();
        // In production, this would fetch fresh data from Supabase
    }
}, 60000); // Update every minute