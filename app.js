
const supabaseUrl = 'https://ugxbybhbnoylantodnmc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentUser = null;
let currentFilter = 'all';
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
            
            // Load data
            loadLeaderboard();
            loadMatches();
            loadPlayers();
            updateLastUpdated();
        } else {
            // User is logged out
            currentUser = null;
            document.getElementById('mainApp').classList.remove('active');
            document.getElementById('signInScreen').classList.add('active');
        }
    });
    
    initializeEventListeners();
});

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
        
        // Load initial data
        loadLeaderboard();
        loadMatches();
        loadPlayers();
        updateLastUpdated();
        
    } catch (err) {
        console.error('Unexpected error:', err);
        alert('An error occurred during sign in');
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
    await loadUpcomingMatches();
    await loadRecentMatches();
}

async function loadUpcomingMatches() {
    const container = document.getElementById('upcomingMatches');
    container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 1rem;">Loading...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('tennis_matches')
            .select('*')
            .eq('status_type', 'notstarted')
            .order('start_timestamp', { ascending: true })
            .limit(20);
        
        if (error) {
            console.error('Error loading upcoming matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        console.log('Upcoming matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => ({
            id: match.match_id,
            tournament: match.tournament_name || 'Unknown Tournament',
            date: match.match_date,
            homePlayer: {
                id: match.player1_id,
                name: match.player1_name || 'Unknown Player',
                teamId: null // Tennis doesn't use teams, but keeping for compatibility
            },
            awayPlayer: {
                id: match.player2_id,
                name: match.player2_name || 'Unknown Player',
                teamId: null
            },
            round: match.round_name || 'TBD'
        })));
        
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
        const { data, error } = await supabaseClient
            .from('tennis_matches')
            .select('*')
            .eq('status_type', 'finished')
            .order('start_timestamp', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('Error loading recent matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        console.log('Recent matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            // Format scores from the set columns
            const homeScore = formatTennisSetScores(match, 'player1');
            const awayScore = formatTennisSetScores(match, 'player2');
            
            return {
                id: match.match_id,
                tournament: match.tournament_name || 'Unknown Tournament',
                date: match.match_date,
                homePlayer: {
                    id: match.player1_id,
                    name: match.player1_name || 'Unknown Player',
                    teamId: null
                },
                awayPlayer: {
                    id: match.player2_id,
                    name: match.player2_name || 'Unknown Player',
                    teamId: null
                },
                round: match.round_name || 'TBD',
                homeScore: homeScore,
                awayScore: awayScore,
                winner: match.winner_code === 1 ? 'home' : 'away',
                statusDescription: match.status_description // Add this line
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

// Helper function to format set scores
function formatSetScores(scores, player) {
    const sets = [];
    let setNum = 1;
    
    // Loop through sets (set1, set2, set3, etc.)
    while (scores[`${player}_set${setNum}`] !== undefined) {
        sets.push(scores[`${player}_set${setNum}`]);
        setNum++;
    }
    
    // If no individual sets found, return the total score
    if (sets.length === 0) {
        return scores[player] || '0';
    }
    
    // Format as "6-4, 7-6, 6-3" style
    return sets.join(', ');
}

function createMatchCard(match, isComplete) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    // Format date and time in user's local timezone
    const matchDateTime = new Date(match.date);
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
    
    const homeOnMyTeam = match.homePlayer.teamId === currentUser.teamId;
    const awayOnMyTeam = match.awayPlayer.teamId === currentUser.teamId;
    
    // Check if we should show status description instead of score
    const showStatusDescription = isComplete && match.statusDescription && match.statusDescription !== 'Ended';
    
    card.innerHTML = `
        <div class="match-header">
            <div class="tournament-name">${match.tournament} • ${match.round}</div>
            <div class="match-date">${dateTimeDisplay}</div>
        </div>
        <div class="match-players">
            <div class="player-row">
                <div class="player-info">
                    ${homeOnMyTeam ? '<span class="player-badge">MY TEAM</span>' : ''}
                    <span>${match.homePlayer.name}</span>
                </div>
                ${isComplete ? 
                    showStatusDescription && match.winner === 'home' 
                        ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                        : `<div class="score ${match.winner === 'home' ? 'winner' : ''}">${match.homeScore}</div>`
                    : ''}
            </div>
            <div class="player-row">
                <div class="player-info">
                    ${awayOnMyTeam ? '<span class="player-badge">MY TEAM</span>' : ''}
                    <span>${match.awayPlayer.name}</span>
                </div>
                ${isComplete ? 
                    showStatusDescription && match.winner === 'away' 
                        ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                        : `<div class="score ${match.winner === 'away' ? 'winner' : ''}">${match.awayScore}</div>`
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
    if (currentFilter === 'all') {
        return matches;
    }
    
    if (currentFilter === 'myteam') {
        return matches.filter(match => 
            match.homePlayer.teamId === currentUser.teamId || 
            match.awayPlayer.teamId === currentUser.teamId
        );
    }
    
    if (currentFilter === 'headtohead') {
        return matches.filter(match => 
            match.homePlayer.teamId !== null && 
            match.awayPlayer.teamId !== null &&
            match.homePlayer.teamId !== match.awayPlayer.teamId
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