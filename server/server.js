require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// ===== PLAYERS ENDPOINTS =====

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const { tour } = req.query; // Optional filter by ATP or WTA
    
    let query = supabase
      .from('players')
      .select('*')
      .order('rank', { ascending: true });
    
    if (tour) {
      query = query.eq('tour', tour.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single player
app.get('/api/players/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== USERS ENDPOINTS =====

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, team_name } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, email, team_name }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Also create a team for this user
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert([{ user_id: data.id, total_points: 0 }])
      .select()
      .single();
    
    if (teamError) throw teamError;
    
    res.json({ user: data, team: teamData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TEAMS ENDPOINTS =====

// Get team by user ID
app.get('/api/teams/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        users (username, email, team_name),
        team_players (
          player_id,
          added_at,
          players (*)
        )
      `)
      .eq('user_id', req.params.userId)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add player to team
app.post('/api/teams/:teamId/players', async (req, res) => {
  try {
    const { player_id } = req.body;
    const { teamId } = req.params;
    
    // Check if team already has this player
    const { data: existing } = await supabase
      .from('team_players')
      .select('*')
      .eq('team_id', teamId)
      .eq('player_id', player_id)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Player already on team' });
    }
    
    // Check team size (max 10 players)
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('*')
      .eq('team_id', teamId);
    
    if (teamPlayers && teamPlayers.length >= 10) {
      return res.status(400).json({ error: 'Team is full (max 10 players)' });
    }
    
    // Add player to team
    const { data, error } = await supabase
      .from('team_players')
      .insert([{ team_id: teamId, player_id }])
      .select(`
        *,
        players (*)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove player from team
app.delete('/api/teams/:teamId/players/:playerId', async (req, res) => {
  try {
    const { teamId, playerId } = req.params;
    
    const { error } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', playerId);
    
    if (error) throw error;
    
    res.json({ message: 'Player removed from team' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all teams with their players
app.get('/api/teams', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        users (username, team_name),
        team_players (
          players (name, rank, points)
        )
      `);
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Supabase connected: ${process.env.SUPABASE_URL}`);
});