import { initAuth, handleSignIn, handleSignOut } from './auth.js';
import { switchSection, filterMatches } from './ui/navigation.js';
import { state, setGenderFilter, setTeamFilter, setSpecificTeam } from './state.js';
import { renderFilteredPlayers, populateTeamDropdown } from './components/players.js';
import { updateLastUpdated } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initializeEventListeners();
});

function initializeEventListeners() {
    document.getElementById('signInForm').addEventListener('submit', handleSignIn);
    document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterMatches(btn.dataset.filter));
    });
    
    document.getElementById('playerSearch').addEventListener('input', (e) => {
        renderFilteredPlayers();
    });
    
    // Gender filters
    document.querySelectorAll('.filter-btn[data-gender]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.currentGenderFilter !== btn.dataset.gender) {
                setGenderFilter(btn.dataset.gender);
                document.querySelectorAll('.filter-btn[data-gender]').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                renderFilteredPlayers();
            }
        });
    });
    
    // Team filters
    document.querySelectorAll('.filter-btn[data-team-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.currentTeamFilter !== btn.dataset.teamFilter) {
                setTeamFilter(btn.dataset.teamFilter);
                document.querySelectorAll('.filter-btn[data-team-filter]').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                const dropdownGroup = document.getElementById('teamDropdownGroup');
                if (state.currentTeamFilter === 'specific') {
                    dropdownGroup.style.display = 'flex';
                } else {
                    dropdownGroup.style.display = 'none';
                    setSpecificTeam(null);
                }
                
                renderFilteredPlayers();
            }
        });
    });
    
    document.getElementById('teamDropdown').addEventListener('change', (e) => {
        setSpecificTeam(e.target.value ? parseInt(e.target.value) : null);
        renderFilteredPlayers();
    });
}

// Auto-refresh
setInterval(() => {
    if (state.currentUser) {
        updateLastUpdated();
    }
}, 60000);