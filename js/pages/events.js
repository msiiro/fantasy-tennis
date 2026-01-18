// Events and tournaments page
export async function renderEventsPage() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="page-header">
            <h1>Tennis Events</h1>
            <p>Upcoming tournaments and recent results</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Upcoming Events</h2>
            </div>
            <div id="upcoming-events">
                ${createMockUpcomingEvents()}
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Recent Results</h2>
            </div>
            <div id="recent-results">
                ${createMockRecentResults()}
            </div>
        </div>
    `;
}

function createMockUpcomingEvents() {
    // Mock data for upcoming events
    const events = [
        {
            title: 'Australian Open',
            location: 'Melbourne, Australia',
            date: 'January 14-27, 2026',
            status: 'upcoming',
            surface: 'Hard',
            prize: '$86.5M'
        },
        {
            title: 'ATP Dubai',
            location: 'Dubai, UAE',
            date: 'February 24 - March 2, 2026',
            status: 'upcoming',
            surface: 'Hard',
            prize: '$3.1M'
        },
        {
            title: 'Indian Wells Masters',
            location: 'California, USA',
            date: 'March 6-17, 2026',
            status: 'upcoming',
            surface: 'Hard',
            prize: '$9.8M'
        }
    ];
    
    return events.map(event => `
        <div class="event-card upcoming">
            <div class="event-header">
                <div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-date">📍 ${event.location}</div>
                </div>
                <span class="event-status upcoming">Upcoming</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
                <div>
                    <strong>Date:</strong><br>${event.date}
                </div>
                <div>
                    <strong>Surface:</strong><br>${event.surface}
                </div>
                <div>
                    <strong>Prize Money:</strong><br>${event.prize}
                </div>
            </div>
        </div>
    `).join('');
}

function createMockRecentResults() {
    // Mock data for recent results
    const results = [
        {
            tournament: 'Brisbane International',
            date: 'January 2026',
            winner: 'Grigor Dimitrov',
            runnerUp: 'Holger Rune',
            score: '6-4, 6-4'
        },
        {
            tournament: 'Auckland Open',
            date: 'January 2026',
            winner: 'Coco Gauff',
            runnerUp: 'Elina Svitolina',
            score: '6-7(4), 6-4, 6-1'
        },
        {
            tournament: 'United Cup',
            date: 'December 2025 - January 2026',
            winner: 'USA',
            runnerUp: 'Poland',
            score: 'Team Event'
        }
    ];
    
    return results.map(result => `
        <div class="event-card completed">
            <div class="event-header">
                <div>
                    <div class="event-title">${result.tournament}</div>
                    <div class="event-date">${result.date}</div>
                </div>
                <span class="event-status completed">Completed</span>
            </div>
            <div class="match-list">
                <div class="match-item">
                    <div class="match-players">
                        <div class="winner">🏆 ${result.winner}</div>
                        <div style="color: var(--text-secondary); margin-top: 0.25rem;">
                            def. ${result.runnerUp}
                        </div>
                    </div>
                    <div class="match-score">${result.score}</div>
                </div>
            </div>
        </div>
    `).join('');
}