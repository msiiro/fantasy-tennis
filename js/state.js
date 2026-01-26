// Global state management
export const state = {
    currentUser: null,
    currentUserTeam: null,
    playerTeamMap: {},
    currentFilter: 'myteam',
    currentSection: 'leaderboard',
    allPlayers: [],
    allTeams: [],
    currentGenderFilter: 'all',
    currentTeamFilter: 'all',
    currentSpecificTeam: null
};

// State setters
export function setCurrentUser(user) {
    state.currentUser = user;
}

export function setCurrentUserTeam(team) {
    state.currentUserTeam = team;
    state.currentSpecificTeam = team?.id || null;
}

export function setPlayerTeamMap(map) {
    state.playerTeamMap = map;
}

export function setCurrentFilter(filter) {
    state.currentFilter = filter;
}

export function setCurrentSection(section) {
    state.currentSection = section;
}

export function setAllPlayers(players) {
    state.allPlayers = players;
}

export function setAllTeams(teams) {
    state.allTeams = teams;
}

export function setGenderFilter(filter) {
    state.currentGenderFilter = filter;
}

export function setTeamFilter(filter) {
    state.currentTeamFilter = filter;
}

export function setSpecificTeam(teamId) {
    state.currentSpecificTeam = teamId;
}