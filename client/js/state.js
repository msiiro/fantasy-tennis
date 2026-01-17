// Application state management
export const state = {
    currentUser: null,
    currentTeam: null
};

export function setUser(user) {
    state.currentUser = user;
}

export function setTeam(team) {
    state.currentTeam = team;
}

export function getUser() {
    return state.currentUser;
}

export function getTeam() {
    return state.currentTeam;
}