// Supabase configuration
const SUPABASE_URL = 'https://ugxbybhbnoylantodnmc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneGJ5Ymhibm95bGFudG9kbm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODExNzgsImV4cCI6MjA4NDI1NzE3OH0.6S_SivqxxSPqd0KktZPohdCq8co6TLR7xLeao3w00d4';

let supabase;
let currentUser = null;
let currentTeam = null;
let allPlayers = [];
let currentFilter = 'all';

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
        
        // Load user's team
        const { data: team } = await supabase
            .from('teams')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        currentTeam = team;
        
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

// Sign in (simple prompt for now)
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

// Load players
async function loadPlayers() {
    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('rank', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        allPlayers = data;
        document.getElementById('total-players').textContent = data.length;
        
        displayPlayers();
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Display players
function displayPlayers() {
    const container = document.getElementById('available-players');
    
    let filtered = allPlayers;
    if (currentFilter !== 'all') {
        filtered = allPlayers.filter(p => p.tour === currentFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">No players found</div>';
        return;
    }
    
    container.innerHTML = filtered.slice(0, 20).map(player => `
        <div class="player-card">
            <div class="player-info">
                <span class="rank">#${player.rank}</span>
                <div>
                    <strong>${player.name}</strong>
                    <span class="badge badge-${player.tour.toLowerCase()}">${player.tour}</span>
                    <div style="font-size: 0.9rem; color: #666;">
                        ${player.country} • ${player.points.toLocaleString()} pts
                    </div>
                </div>
            </div>
            <button class="btn" onclick="addPlayerToTeam('${player.id}', '${player.name}')">
                Add to Team
            </button>
        </div>
    `).join('');
}

// Filter players
function filterPlayers(tour) {
    currentFilter = tour;
    
    // Update button styles
    document.querySelectorAll('#team-page .btn').forEach(btn => {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn');
    });
    
    if (tour === 'all') {
        document.getElementById('filter-all').classList.add('btn-secondary');
    } else if (tour === 'ATP') {
        document.getElementById('filter-atp').classList.add('btn-secondary');
    } else if (tour === 'WTA') {
        document.getElementById('filter-wta').classList.add('btn-secondary');
    }
    
    displayPlayers();
}

// Add player to team
async function addPlayerToTeam(playerId, playerName) {
    if (!currentUser) {
        alert('Please sign in first!');
        showSignIn();
        return;
    }
    
    if (!currentTeam) {
        alert('No team found. Creating one...');
        // Create team
        const { data, error } = await supabase
            .from('teams')
            .insert([{ user_id: currentUser.id }])
            .select()
            .single();
        
        if (error) {
            alert('Failed to create team: ' + error.message);
            return;
        }
        
        currentTeam = data;
    }
    
    try {
        // Check team size
        const { data: teamPlayers, error: checkError } = await supabase
            .from('team_players')
            .select('*')
            .eq('team_id', currentTeam.id);
        
        if (checkError) throw checkError;
        
        if (teamPlayers.length >= 10) {
            alert('❌ Team is full (max 10 players)');
            return;
        }
        
        // Add player
        const { error } = await supabase
            .from('team_players')
            .insert([{
                team_id: currentTeam.id,
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
    
    if (!currentUser || !currentTeam) {
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
            .eq('team_id', currentTeam.id);
        
        if (error) throw error;
        
        document.getElementById('user-team-info').classList.remove('hidden');
        document.getElementById('team-name').textContent = currentUser.team_name || 'My Team';
        document.getElementById('team-size').textContent = data.length;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="loading">No players yet. Add some from below!</div>';
            return;
        }
        
        const totalPoints = data.reduce((sum, tp) => sum + tp.players.points, 0);
        
        container.innerHTML = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 10px;">
                <strong>Total Team Points:</strong> ${totalPoints.toLocaleString()}
            </div>
            ${data.map(tp => {
                const player = tp.players;
                return `
                    <div class="player-card">
                        <div class="player-info">
                            <span class="rank">#${player.rank}</span>
                            <div>
                                <strong>${player.name}</strong>
                                <span class="badge badge-${player.tour.toLowerCase()}">${player.tour}</span>
                                <div style="font-size: 0.9rem; color: #666;">
                                    ${player.country} • ${player.points.toLocaleString()} pts
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="removePlayerFromTeam('${tp.id}', '${player.name}')">
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
            .select('*')
            .order('match_date', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="loading">No recent matches</div>';
            return;
        }
        
        container.innerHTML = data.map(match => `
            <div class="player-card">
                <div>
                    <strong>${match.tournament_name}</strong> - ${match.round}
                    <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                        ${match.player1_name} vs ${match.player2_name}
                    </div>
                    <div style="font-size: 0.9rem; color: #999;">
                        ${new Date(match.match_date).toLocaleDateString()} • ${match.surface}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; color: #666;">${match.score}</div>
                    <span class="badge badge-${match.tour.toLowerCase()}">${match.tour}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading matches:', error);
        container.innerHTML = '<div class="loading">Error loading matches</div>';
    }
}

// Make functions globally available
window.showPage = showPage;
window.showSignIn = showSignIn;
window.handleSignOut = handleSignOut;
window.filterPlayers = filterPlayers;
window.addPlayerToTeam = addPlayerToTeam;
window.removePlayerFromTeam = removePlayerFromTeam;

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