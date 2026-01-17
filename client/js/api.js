// API communication layer
import { API_URL } from './config.js';

export async function fetchPlayers() {
    const response = await fetch(`${API_URL}/players`);
    if (!response.ok) {
        throw new Error('Failed to fetch players');
    }
    return await response.json();
}

export async function fetchUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return await response.json();
}

export async function createUser(userData) {
    const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        throw new Error('Failed to create user');
    }
    return await response.json();
}

export async function fetchTeam(userId) {
    const response = await fetch(`${API_URL}/teams/user/${userId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team');
    }
    return await response.json();
}

export async function addPlayerToTeam(teamId, playerId) {
    const response = await fetch(`${API_URL}/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to add player');
    }
    
    return data;
}

export async function removePlayerFromTeam(teamId, playerId) {
    const response = await fetch(`${API_URL}/teams/${teamId}/players/${playerId}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        throw new Error('Failed to remove player');
    }
    
    return await response.json();
}