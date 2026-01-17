const express = require('express');
const cors = require('cors');
const { getATPRankings } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Rankings route
app.get('/api/rankings', async (req, res) => {
  try {
    const rankings = await getATPRankings();
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});