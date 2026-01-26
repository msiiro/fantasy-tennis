import { state, setCurrentSection, setCurrentFilter } from '../state.js';
import { loadMatches } from '../components/matches.js';

export function switchSection(section) {
    setCurrentSection(section);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}Section`);
    });
}

export function filterMatches(filter) {
    setCurrentFilter(filter);
    
    document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    loadMatches();
}

export function filterMatchesByTeam(matches) {
    if (!state.currentUserTeam) {
        return matches;
    }
    
    if (state.currentFilter === 'all') {
        return matches;
    }
    
    if (state.currentFilter === 'myteam') {
        return matches.filter(match => 
            match.homePlayer.teamId === state.currentUserTeam.id || 
            match.awayPlayer.teamId === state.currentUserTeam.id
        );
    }
    
    if (state.currentFilter === 'headtohead') {
        return matches.filter(match => 
            match.homePlayer.teamId !== null && 
            match.awayPlayer.teamId !== null &&
            match.homePlayer.teamId !== match.awayPlayer.teamId
        );
    }
    
    if (state.currentFilter === 'anyteam') {
        return matches.filter(match => 
            match.homePlayer.teamId !== null || 
            match.awayPlayer.teamId !== null
        );
    }
    
    return matches;
}