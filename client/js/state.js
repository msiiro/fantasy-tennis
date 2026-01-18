// Application state management
export const state = {
    currentUser: null,
    currentAuthUser: null, // Supabase auth user
    currentTeam: null,
    session: null
};

export function setAuthUser(authUser) {
    state.currentAuthUser = authUser;
}

export function setUser(user) {
    state.currentUser = user;
}

export function setTeam(team) {
    state.currentTeam = team;
}

export function setSession(session) {
    state.session = session;
}

export function getAuthUser() {
    return state.currentAuthUser;
}

export function getUser() {
    return state.currentUser;
}

export function getTeam() {
    return state.currentTeam;
}

export function getSession() {
    return state.session;
}

export function clearAuth() {
    state.currentUser = null;
    state.currentAuthUser = null;
    state.currentTeam = null;
    state.session = null;
}