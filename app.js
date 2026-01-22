// Supabase configuration
const SUPABASE_URL = 'https://ugxbybhbnoylantodnmc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';

let supabase;
let currentUser = null;
let allPlayers = [];
let playerTours = {}; // Map player_id -> tour (ATP/WTA)
let currentFilter = 'all';
let searchQuery = '';

// Initialize Supabase
async function initSupabase() {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
}

// Page navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load page data
    if (pageName === 'team') {
        loadTeamPage();
    } else if (pageName === 'matches') {
        loadMatchesPage();
    }
}

// Check authentication status
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        
        // Load user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profile) {
            currentUser = { ...currentUser, ...profile };
        }
        
        // Update UI
        document.getElementById('user-name').textContent = `👤 ${currentUser.username || currentUser.email}`;
        document.getElementById('user-name').classList.remove('hidden');
        document.getElementById('sign-out-btn').classList.remove('hidden');
        document.getElementById('sign-in-btn').classList.add('hidden');
        
        console.log('✅ User logged in:', currentUser.username);
    } else {
        console.log('ℹ️ No user logged in');
    }
}

// Sign in
async function showSignIn() {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');
    
    if (!email || !password) return;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        alert('✅ Signed in successfully!');
        window.location.reload();
    } catch (error) {
        alert('❌ Sign in failed: ' + error.message);
    }
}

// Sign out
async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
}

// Load players and determine their tours from matches
async function loadPlayers() {
    try {
        // Load all players
        const { data: players, error: playerError } = await supabase
            .from('players')
            .select('*')
            .order('name', { ascending: true });
        
        if (playerError) throw playerError;
        
        allPlayers = players;
        
        // Load matches to determine player tours
        const { data: matches, error: matchError } = await supabase
            .from('matches')
            .select(`
                home_player_id,
                away_player_id,
                tournaments (tour)
            `);
        
        if (!matchError && matches) {
            // Map players to their tours based on matches
            playerTours = {};
            matches.forEach(match => {
                const tour = match.tournaments?.tour;
                if (tour) {
                    if (match.home_player_id) {
                        playerTours[match.home_player_id] = tour;
                    }
                    if (match.away_player_id) {
                        playerTours[match.away_player_id] = tour;
                    }
                }
            });
        }
        
        document.getElementById('total-players').textContent = players.length;
        displayPlayers();
        
    } catch (error) {
        console.error('Error loading players:', error);
        allPlayers = [];
        document.getElementById('total-players').textContent = '0';
    }
}

// Search players
function searchPlayers(query) {
    searchQuery = query.toLowerCase().trim();
    displayPlayers();
}

// Filter players by tour
function filterPlayers(tour) {
    currentFilter = tour;
    
    // Update button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn');
    });
    
    if (tour === 'all') {
        document.getElementById('filter-all').classList.remove('btn');
        document.getElementById('filter-all').classList.add('btn-secondary');
    } else if (tour === 'ATP') {
        document.getElementById('filter-atp').classList.remove('btn');
        document.getElementById('filter-atp').classList.add('btn-secondary');
    } else if (tour === 'WTA') {
        document.getElementById('filter-wta').classList.remove('btn');
        document.getElementById('filter-wta').classList.add('btn-secondary');
    }
    
    displayPlayers();
}

// Display players
function displayPlayers() {
    const container = document.getElementById('available-players');
    
    let filtered = allPlayers;
    
    // Apply tour filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(player => playerTours[player.id] === currentFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(player => 
            player.name.toLowerCase().includes(searchQuery) ||
            (player.abbreviation && player.abbreviation.toLowerCase().includes(searchQuery))
        );
    }
    
    if (filtered.length === 0) {
        if (searchQuery) {
            container.innerHTML = `<div class="loading">No players found matching "${searchQuery}"</div>`;
        } else if (currentFilter !== 'all') {
            container.innerHTML = `<div class="loading">No ${currentFilter} players found. Make sure matches are synced!</div>`;
        } else {
            container.innerHTML = '<div class="loading">No players found. Run the data pipeline to sync players!</div>';
        }
        return;
    }
    
    // Show count
    let countText = `Showing ${Math.min(filtered.length, 50)} of ${allPlayers.length} players`;
    if (searchQuery || currentFilter !== 'all') {
        countText = `Showing ${Math.min(filtered.length, 50)} of ${filtered.length} filtered (${allPlayers.length} total)`;
    }
    
    container.innerHTML = `
        <div style="padding: 0.75rem; background: #f5f5f5; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; color: #666;">
            ${countText}
        </div>
    ` + filtered.slice(0, 50).map(player => {
        const tour = playerTours[player.id] || 'Unknown';
        return `
            <div class="player-card">
                <div class="player-info">
                    <div>
                        <strong>${player.name}</strong>
                        ${player.abbreviation ? `<span style="color: #666;">(${player.abbreviation})</span>` : ''}
                        ${tour !== 'Unknown' ? `<span class="badge badge-${tour.toLowerCase()}">${tour}</span>` : ''}
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">
                            Player ID: ${player.id}
                        </div>
                    </div>
                </div>
                <button class="btn" onclick="addPlayerToTeam(${player.id}, '${player.name.replace(/'/g, "\\'")}')">
                    Add to Team
                </button>
            </div>
        `;
    }).join('');
}

// Add player to team
async function addPlayerToTeam(playerId, playerName) {
    if (!currentUser) {
        alert('Please sign in first!');
        showSignIn();
        return;
    }
    
    try {
        // Check team size
        const { data: teamPlayers, error: checkError } = await supabase
            .from('team_players')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (checkError) throw checkError;
        
        if (teamPlayers.length >= 10) {
            alert('❌ Team is full (max 10 players)');
            return;
        }
        
        // Check if player already in team
        const alreadyAdded = teamPlayers.some(tp => tp.player_id === playerId);
        if (alreadyAdded) {
            alert('❌ Player already in your team');
            return;
        }
        
        // Add player
        const { error } = await supabase
            .from('team_players')
            .insert([{
                user_id: currentUser.id,
                player_id: playerId
            }]);
        
        if (error) throw error;
        
        alert(`✅ Added ${playerName} to your team!`);
        loadMyTeam();
    } catch (error) {
        alert('❌ Failed to add player: ' + error.message);
    }
}

// Load my team
async function loadMyTeam() {
    const container = document.getElementById('my-team-list');
    
    if (!currentUser) {
        container.innerHTML = '<div class="loading">Sign in to view your team</div>';
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('team_players')
            .select(`
                *,
                players (*)
            `)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        document.getElementById('user-team-info').classList.remove('hidden');
        document.getElementById('team-name').textContent = currentUser.username || 'My Team';
        document.getElementById('team-size').textContent = data.length;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="loading">No players yet. Add some from below!</div>';
            return;
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 10px;">
                <strong>Team Size:</strong> ${data.length} / 10 players
            </div>
            ${data.map(tp => {
                const player = tp.players;
                const tour = playerTours[player.id] || 'Unknown';
                return `
                    <div class="player-card">
                        <div class="player-info">
                            <div>
                                <strong>${player.name}</strong>
                                ${player.abbreviation ? `<span style="color: #666;">(${player.abbreviation})</span>` : ''}
                                ${tour !== 'Unknown' ? `<span class="badge badge-${tour.toLowerCase()}">${tour}</span>` : ''}
                                <div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">
                                    Player ID: ${player.id}
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="removePlayerFromTeam('${tp.id}', '${player.name.replace(/'/g, "\\'")}')">
                            Remove
                        </button>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        console.error('Error loading team:', error);
        container.innerHTML = '<div class="loading">Error loading team</div>';
    }
}

// Remove player from team
async function removePlayerFromTeam(teamPlayerId, playerName) {
    if (!confirm(`Remove ${playerName} from your team?`)) return;
    
    try {
        const { error } = await supabase
            .from('team_players')
            .delete()
            .eq('id', teamPlayerId);
        
        if (error) throw error;
        
        alert(`✅ Removed ${playerName} from team`);
        loadMyTeam();
    } catch (error) {
        alert('❌ Failed to remove player: ' + error.message);
    }
}

// Load team page
async function loadTeamPage() {
    await loadMyTeam();
    if (allPlayers.length === 0) {
        await loadPlayers();
    } else {
        displayPlayers();
    }
}

// Load matches
async function loadMatchesPage() {
    const container = document.getElementById('matches-list');
    
    try {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                tournaments (name, tour),
                home:home_player_id (name),
                away:away_player_id (name)
            `)
            .order('match_date', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="loading">No matches yet. Run the data pipeline to sync matches!</div>';
            return;
        }
        
        container.innerHTML = data.map(match => {
            const homeName = match.home?.name || 'Unknown';
            const awayName = match.away?.name || 'Unknown';
            const tournamentName = match.tournaments?.name || 'Unknown Tournament';
            const tour = match.tournaments?.tour || 'ATP';
            const matchDate = new Date(match.match_date);
            
            // Format scores
            const scores = match.scores || {};
            let scoreDisplay = 'Scheduled';
            if (match.is_in_progress) {
                scoreDisplay = 'Live';
            } else if (scores.home !== null && scores.away !== null) {
                scoreDisplay = `${scores.home}-${scores.away}`;
                if (scores.home_set1) {
                    scoreDisplay += ` (${scores.home_set1}-${scores.away_set1}`;
                    if (scores.home_set2) {
                        scoreDisplay += `, ${scores.home_set2}-${scores.away_set2}`;
                    }
                    if (scores.home_set3) {
                        scoreDisplay += `, ${scores.home_set3}-${scores.away_set3}`;
                    }
                    scoreDisplay += ')';
                }
            }
            
            return `
                <div class="player-card">
                    <div>
                        <strong>${tournamentName}</strong>
                        <span class="badge badge-${tour.toLowerCase()}">${tour}</span>
                        ${match.match_round ? `<span style="margin-left: 0.5rem; color: #666;">Round ${match.match_round}</span>` : ''}
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                            <strong>${homeName}</strong> vs <strong>${awayName}</strong>
                        </div>
                        <div style="font-size: 0.9rem; color: #999; margin-top: 0.25rem;">
                            ${matchDate.toLocaleDateString()} ${matchDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1rem; font-weight: bold; color: #1976d2;">
                            ${scoreDisplay}
                        </div>
                        ${match.is_in_progress ? '<div style="color: #f44336; font-size: 0.8rem; margin-top: 0.25rem;">● LIVE</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('total-matches').textContent = data.length;
    } catch (error) {
        console.error('Error loading matches:', error);
        container.innerHTML = `<div class="loading">Error loading matches: ${error.message}</div>`;
    }
}

// Make functions globally available
window.showPage = showPage;
window.showSignIn = showSignIn;
window.handleSignOut = handleSignOut;
window.filterPlayers = filterPlayers;
window.addPlayerToTeam = addPlayerToTeam;
window.removePlayerFromTeam = removePlayerFromTeam;
window.searchPlayers = searchPlayers;

// Initialize app
async function init() {
    console.log('🚀 App starting...');
    await initSupabase();
    await checkAuth();
    await loadPlayers();
    console.log('✅ App ready!');
}

// Start the app
init();