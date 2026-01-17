const fetch = require('node-fetch');

// Free tennis API endpoint
const ATP_RANKINGS_URL = 'https://www.atptour.com/en/rankings/singles';

async function getATPRankings() {
  try {
    // We'll use a simpler approach - scraping the ATP website
    // For now, let's create mock data that you can replace later
    const mockData = {
      lastUpdated: new Date().toISOString(),
      rankings: [
        { rank: 1, name: 'Novak Djokovic', points: 9855, country: 'SRB' },
        { rank: 2, name: 'Carlos Alcaraz', points: 8805, country: 'ESP' },
        { rank: 3, name: 'Daniil Medvedev', points: 7555, country: 'RUS' },
        // Add more players as needed
      ]
    };
    return mockData;
  } catch (error) {
    console.error('Error fetching rankings:', error);
    throw error;
  }
}

module.exports = { getATPRankings };