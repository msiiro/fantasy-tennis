
const supabaseUrl = 'https://ugxbybhbnoylantodnmc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Demo data - Replace with Supabase API calls
const DEMO_DATA = {
    user: {
        name: "Alex Thompson",
        email: "alex@email.com",
        teamId: 1
    },
    teams: [
        { id: 1, name: "Alex Thompson", points: 1250, change: 3 },
        { id: 2, name: "Sarah Chen", points: 1180, change: -1 },
        { id: 3, name: "Mike Rodriguez", points: 1150, change: 2 },
        { id: 4, name: "Emma Williams", points: 1090, change: 0 },
        { id: 5, name: "James Park", points: 980, change: -2 },
        { id: 6, name: "Lisa Anderson", points: 920, change: 1 },
        { id: 7, name: "Tom Miller", points: 850, change: -1 },
        { id: 8, name: "Rachel Green", points: 780, change: 0 }
    ],
    players: [
        { id: 1, name: "Carlos Alcaraz", tour: "ATP", points: 420, matches: 12, teamId: 1 },
        { id: 2, name: "Novak Djokovic", tour: "ATP", points: 395, matches: 10, teamId: 2 },
        { id: 3, name: "Jannik Sinner", tour: "ATP", points: 380, matches: 11, teamId: 1 },
        { id: 4, name: "Daniil Medvedev", tour: "ATP", points: 365, matches: 13, teamId: 3 },
        { id: 5, name: "Aryna Sabalenka", tour: "WTA", points: 340, matches: 9, teamId: 2 },
        { id: 6, name: "Iga Swiatek", tour: "WTA", points: 335, matches: 10, teamId: 3 },
        { id: 7, name: "Coco Gauff", tour: "WTA", points: 310, matches: 11, teamId: 4 },
        { id: 8, name: "Stefanos Tsitsipas", tour: "ATP", points: 295, matches: 12, teamId: 4 },
        { id: 9, name: "Elena Rybakina", tour: "WTA", points: 280, matches: 8, teamId: 5 },
        { id: 10, name: "Holger Rune", tour: "ATP", points: 265, matches: 10, teamId: 5 },
        { id: 11, name: "Jessica Pegula", tour: "WTA", points: 250, matches: 11, teamId: 6 },
        { id: 12, name: "Alexander Zverev", tour: "ATP", points: 245, matches: 9, teamId: 6 },
        { id: 13, name: "Andrey Rublev", tour: "ATP", points: 230, matches: 12, teamId: 7 },
        { id: 14, name: "Ons Jabeur", tour: "WTA", points: 220, matches: 10, teamId: 7 },
        { id: 15, name: "Taylor Fritz", tour: "ATP", points: 210, matches: 11, teamId: 8 },
        { id: 16, name: "Maria Sakkari", tour: "WTA", points: 195, matches: 9, teamId: 8 }
    ],
    upcomingMatches: [
        {
            id: 1,
            tournament: "Australian Open",
            date: "2026-01-24",
            homePlayer: { id: 1, name: "Carlos Alcaraz", teamId: 1 },
            awayPlayer: { id: 2, name: "Novak Djokovic", teamId: 2 },
            round: "Quarterfinal"
        },
        {
            id: 2,
            tournament: "Australian Open",
            date: "2026-01-24",
            homePlayer: { id: 3, name: "Jannik Sinner", teamId: 1 },
            awayPlayer: { id: 4, name: "Daniil Medvedev", teamId: 3 },
            round: "Quarterfinal"
        },
        {
            id: 3,
            tournament: "Australian Open",
            date: "2026-01-25",
            homePlayer: { id: 5, name: "Aryna Sabalenka", teamId: 2 },
            awayPlayer: { id: 6, name: "Iga Swiatek", teamId: 3 },
            round: "Semifinal"
        },
        {
            id: 4,
            tournament: "Australian Open",
            date: "2026-01-25",
            homePlayer: { id: 7, name: "Coco Gauff", teamId: 4 },
            awayPlayer: { id: 9, name: "Elena Rybakina", teamId: 5 },
            round: "Semifinal"
        },
        {
            id: 5,
            tournament: "Australian Open",
            date: "2026-01-26",
            homePlayer: { id: 8, name: "Stefanos Tsitsipas", teamId: 4 },
            awayPlayer: { id: 10, name: "Holger Rune", teamId: 5 },
            round: "Quarterfinal"
        }
    ],
    recentMatches: [
        {
            id: 101,
            tournament: "Australian Open",
            date: "2026-01-22",
            homePlayer: { id: 1, name: "Carlos Alcaraz", teamId: 1 },
            awayPlayer: { id: 12, name: "Alexander Zverev", teamId: 6 },
            homeScore: "6-4, 7-6, 6-3",
            awayScore: "4-6, 6-7, 3-6",
            winner: "home",
            round: "Round of 16"
        },
        {
            id: 102,
            tournament: "Australian Open",
            date: "2026-01-22",
            homePlayer: { id: 2, name: "Novak Djokovic", teamId: 2 },
            awayPlayer: { id: 15, name: "Taylor Fritz", teamId: 8 },
            homeScore: "7-6, 6-4, 6-2",
            awayScore: "6-7, 4-6, 2-6",
            winner: "home",
            round: "Round of 16"
        },
        {
            id: 103,
            tournament: "Australian Open",
            date: "2026-01-21",
            homePlayer: { id: 5, name: "Aryna Sabalenka", teamId: 2 },
            awayPlayer: { id: 11, name: "Jessica Pegula", teamId: 6 },
            homeScore: "6-3, 6-4",
            awayScore: "3-6, 4-6",
            winner: "home",
            round: "Round of 16"
        },
        {
            id: 104,
            tournament: "Australian Open",
            date: "2026-01-21",
            homePlayer: { id: 6, name: "Iga Swiatek", teamId: 3 },
            awayPlayer: { id: 14, name: "Ons Jabeur", teamId: 7 },
            homeScore: "6-2, 6-3",
            awayScore: "2-6, 3-6",
            winner: "home",
            round: "Round of 16"
        },
        {
            id: 105,
            tournament: "Australian Open",
            date: "2026-01-20",
            homePlayer: { id: 3, name: "Jannik Sinner", teamId: 1 },
            awayPlayer: { id: 13, name: "Andrey Rublev", teamId: 7 },
            homeScore: "6-4, 6-7, 7-5, 6-3",
            awayScore: "4-6, 7-6, 5-7, 3-6",
            winner: "home",
            round: "Round of 16"
        },
        {
            id: 106,
            tournament: "Australian Open",
            date: "2026-01-20",
            homePlayer: { id: 7, name: "Coco Gauff", teamId: 4 },
            awayPlayer: { id: 16, name: "Maria Sakkari", teamId: 8 },
            homeScore: "7-5, 6-4",
            awayScore: "5-7, 4-6",
            winner: "home",
            round: "Round of 16"
        }
    ]
};


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
            .from('matches')
            .select(`
                id,
                match_date,
                match_round,
                match_winner,
                scores,
                tournament_id,
                home_player_id,
                away_player_id,
                tournaments (
                    id,
                    name
                ),
                home_player:players!home_player_id (
                    id,
                    name,
                    team_players (
                        team_id
                    )
                ),
                away_player:players!away_player_id (
                    id,
                    name,
                    team_players (
                        team_id
                    )
                )
            `)
            .is('match_winner', null)
            .order('match_date', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('Error loading upcoming matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingMatches = data.filter(match => {
            const matchDate = new Date(match.match_date);
            return matchDate >= today;
        });


        console.log('Upcoming matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => ({
            id: match.id,
            tournament: match.tournaments?.name || 'Unknown Tournament',
            date: match.match_date,
            homePlayer: {
                id: match.home_player?.id,
                name: match.home_player?.name || 'Unknown Player',
                teamId: match.home_player?.team_players?.[0]?.team_id || null
            },
            awayPlayer: {
                id: match.away_player?.id,
                name: match.away_player?.name || 'Unknown Player',
                teamId: match.away_player?.team_players?.[0]?.team_id || null
            },
            round: match.match_round || 'TBD'
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
            .from('matches')
            .select(`
                id,
                match_date,
                match_round,
                match_winner,
                scores,
                tournament_id,
                home_player_id,
                away_player_id,
                tournaments (
                    id,
                    name
                ),
                home_player:players!home_player_id (
                    id,
                    name,
                    team_players (
                        team_id
                    )
                ),
                away_player:players!away_player_id (
                    id,
                    name,
                    team_players (
                        team_id
                    )
                )
            `)
            .not('match_winner', 'is', null)
            .order('match_date', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('Error loading recent matches:', error);
            container.innerHTML = '<p style="color: var(--color-danger); padding: 1rem;">Error loading matches</p>';
            return;
        }
        
        console.log('Recent matches:', data);
        
        const filtered = filterMatchesByTeam(data.map(match => {
            const scores = match.scores || {};
            const homeScore = formatSetScores(scores, 'home');
            const awayScore = formatSetScores(scores, 'away');
            
            return {
                id: match.id,
                tournament: match.tournaments?.name || 'Unknown Tournament',
                date: match.match_date,
                homePlayer: {
                    id: match.home_player?.id,
                    name: match.home_player?.name || 'Unknown Player',
                    teamId: match.home_player?.team_players?.[0]?.team_id || null
                },
                awayPlayer: {
                    id: match.away_player?.id,
                    name: match.away_player?.name || 'Unknown Player',
                    teamId: match.away_player?.team_players?.[0]?.team_id || null
                },
                round: match.match_round || 'TBD',
                homeScore: homeScore,
                awayScore: awayScore,
                winner: match.match_winner === 1 ? 'home' : 'away'
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
    
    const date = new Date(match.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    const homeOnMyTeam = match.homePlayer.teamId === currentUser.teamId;
    const awayOnMyTeam = match.awayPlayer.teamId === currentUser.teamId;
    
    card.innerHTML = `
        <div class="match-header">
            <div class="tournament-name">${match.tournament} • ${match.round}</div>
            <div class="match-date">${date}</div>
        </div>
        <div class="match-players">
            <div class="player-row">
                <div class="player-info">
                    ${homeOnMyTeam ? '<span class="player-badge">MY TEAM</span>' : ''}
                    <span>${match.homePlayer.name}</span>
                </div>
                ${isComplete ? `<div class="score ${match.winner === 'home' ? 'winner' : ''}">${match.homeScore}</div>` : ''}
            </div>
            <div class="player-row">
                <div class="player-info">
                    ${awayOnMyTeam ? '<span class="player-badge">MY TEAM</span>' : ''}
                    <span>${match.awayPlayer.name}</span>
                </div>
                ${isComplete ? `<div class="score ${match.winner === 'away' ? 'winner' : ''}">${match.awayScore}</div>` : ''}
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