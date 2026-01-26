import { state } from '../state.js';

export function createLeaderboardRow(team, rank) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.style.opacity = '1';
    row.style.animation = 'none';
    
    const changeIcon = team.change > 0 ? '▲' : team.change < 0 ? '▼' : '—';
    const changeClass = team.change > 0 ? 'positive' : team.change < 0 ? 'negative' : 'neutral';
    
    row.innerHTML = `
        <div class="col-rank">
            <div class="rank-badge">${rank}</div>
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

export function createMatchCard(match, isComplete) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    const matchDateTime = match.startTimestamp 
        ? new Date(match.startTimestamp * 1000) 
        : new Date(match.date);
    
    const dateOptions = { 
        month: 'short', 
        day: 'numeric'
    };
    
    let dateTimeDisplay;
    if (isComplete) {
        dateTimeDisplay = matchDateTime.toLocaleDateString('en-US', dateOptions);
    } else {
        const timeOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        
        const date = matchDateTime.toLocaleDateString('en-US', dateOptions);
        const time = matchDateTime.toLocaleTimeString('en-US', timeOptions);
        
        const timezone = new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short'
        }).formatToParts(matchDateTime).find(part => part.type === 'timeZoneName')?.value || '';
        
        dateTimeDisplay = `${date} • ${time} ${timezone}`;
    }
    
    const homeOnMyTeam = state.currentUserTeam && match.homePlayer.teamId === state.currentUserTeam.id;
    const awayOnMyTeam = state.currentUserTeam && match.awayPlayer.teamId === state.currentUserTeam.id;
    
    const homeBadge = homeOnMyTeam 
        ? '<span class="player-badge my-team">MY TEAM</span>' 
        : (match.homePlayer.teamName 
            ? `<span class="player-badge other-team">${match.homePlayer.teamName}</span>` 
            : '');
    
    const awayBadge = awayOnMyTeam 
        ? '<span class="player-badge my-team">MY TEAM</span>' 
        : (match.awayPlayer.teamName 
            ? `<span class="player-badge other-team">${match.awayPlayer.teamName}</span>` 
            : '');
    
    const showStatusDescription = isComplete && match.statusDescription && match.statusDescription !== 'Ended';
    
    card.innerHTML = `
        <div class="match-header">
            <div class="tournament-name">${match.tournament} • ${match.round}</div>
            <div class="match-date">${dateTimeDisplay}</div>
        </div>
        ${!isComplete && match.pointsAtStake > 0 ? `
            <div class="points-at-stake">
                <span class="stake-label">Points at stake:</span>
                <span class="stake-value">${match.pointsAtStake} pts</span>
            </div>
        ` : ''}
        <div class="match-players">
            <div class="player-row">
                <div class="player-info">
                    <span>${match.homePlayer.name}</span>
                    ${homeBadge}
                </div>
                ${isComplete ? 
                    `<div class="score-section">
                        ${match.winner === 'home' && match.homePoints > 0 ? `<span class="points-earned winner">+${match.homePoints} pts</span>` : ''}
                        ${showStatusDescription && match.winner === 'home' 
                            ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                            : `<div class="score ${match.winner === 'home' ? 'winner' : ''}">${match.homeScore}</div>`}
                    </div>`
                    : ''}
            </div>
            <div class="player-row">
                <div class="player-info">
                    <span>${match.awayPlayer.name}</span>
                    ${awayBadge}
                </div>
                ${isComplete ? 
                    `<div class="score-section">
                        ${match.winner === 'away' && match.awayPoints > 0 ? `<span class="points-earned winner">+${match.awayPoints} pts</span>` : ''}
                        ${showStatusDescription && match.winner === 'away' 
                            ? `<span class="status-badge status-${match.statusDescription.toLowerCase()}">${match.statusDescription}</span>`
                            : `<div class="score ${match.winner === 'away' ? 'winner' : ''}">${match.awayScore}</div>`}
                    </div>`
                    : ''}
            </div>
        </div>
    `;
    
    return card;
}

export function createPlayerRow(player, rank) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.dataset.playerName = player.name.toLowerCase();
    
    const isMyTeam = state.currentUserTeam && player.teamId === state.currentUserTeam.id;
    const hasTeam = player.teamId !== null;
    
    if (isMyTeam) {
        row.classList.add('my-team-row');
    } else if (hasTeam) {
        row.classList.add('other-team-row');
    } else {
        row.classList.add('no-team-row');
    }
    
    const gender = player.gender || 'M';
    
    row.innerHTML = `
        <div class="col-rank">
            <div class="rank-badge">${rank}</div>
        </div>
        <div class="col-player">
            <div class="player-name">${player.name}</div>
        </div>
        <div class="col-gender">
            <span class="gender-badge gender-${gender}">${gender}</span>
        </div>
        <div class="col-team">
            <span class="gender-badge gender-${gender}">${gender}</span>
            ${player.team !== 'Free Agent' 
                ? `<span class="team-badge ${isMyTeam ? 'my-team' : 'other-team'}">${player.team}</span>` 
                : ''}
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