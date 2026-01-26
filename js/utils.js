export function updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
    });
    element.textContent = `Updated: ${timeString}`;
}

export function formatTennisSetScores(match, playerPrefix) {
    const sets = [];
    
    for (let i = 1; i <= 5; i++) {
        const setScore = match[`${playerPrefix}_set${i}_score`];
        if (setScore !== null && setScore !== undefined) {
            const tiebreak = match[`${playerPrefix}_set${i}_tiebreak`];
            if (tiebreak !== null && tiebreak !== undefined) {
                sets.push(`${setScore}<sup>${tiebreak}</sup>`);
            } else {
                sets.push(setScore.toString());
            }
        }
    }
    
    return sets.join(' ');
}