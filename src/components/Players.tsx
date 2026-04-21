// src/components/Players.tsx
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { type GenderFilter, type TeamFilter } from '../types';
import { useAuth } from '../hooks/useAuth';

type PlayerStat = {
  player_id: number;
  gender: string | null;
  name: string;
  short_name: string | null;
  country_code: string | null;
  country: string | null;
  team_id: number | null;
  team_name: string | null;
  tournament_count: number;
  match_count: number;
  wins: number;
  losses: number;
  retired: number;
  walkovers: number;
  points: number;
  cost: number | null;
  roi: number | null;
  roi_index: number | null;
};

type SortField = 'points' | 'cost' | 'roi_index';
type TeamOption = { id: number; name: string; league_id: number };

export default function Players() {
  const { userTeam } = useAuth();
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [specificTeam, setSpecificTeam] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('points');

  useEffect(() => {
    async function load() {
      const [{ data: statsData }, { data: teamsData }] = await Promise.all([
        supabase.from('player_stats').select('*').limit(500),
        supabase.from('teams').select('id, name, league_id'),
      ]);
      setPlayers(statsData ?? []);
      setTeams(teamsData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return players
      .filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
        if (teamFilter === 'league' && !p.team_id) return false;
        if (teamFilter === 'available' && p.team_id) return false;
        return true;
      })
      .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  }, [players, search, genderFilter, teamFilter, specificTeam, sortBy]);

  function getRowClass(p: PlayerStat): string {
    if (!p.team_id) return 'no-team-row';
    if (userTeam && Number(p.team_id) === Number(userTeam.id)) return 'my-team-row';
    return 'other-team-row';
  }

  return (
    <div className="players-page">
      <div className="players-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="filter-group">
          <span className="filter-label">Gender</span>
          <div className="filter-btns">
            {(['all', 'M', 'F'] as GenderFilter[]).map(g => (
              <button
                key={g}
                className={`filter-btn ${genderFilter === g ? 'active' : ''}`}
                onClick={() => setGenderFilter(g)}
              >
                {g === 'all' ? 'All' : g === 'M' ? 'Men' : 'Women'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Players</span>
          <div className="filter-btns">
            {(['all', 'league', 'available'] as TeamFilter[]).map(t => (
              <button
                key={t}
                className={`filter-btn ${teamFilter === t ? 'active' : ''}`}
                onClick={() => { setTeamFilter(t); if (t !== 'specific') setSpecificTeam(null); }}
              >
                {t === 'league' ? 'League' : t === 'available' ? 'Available': 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Sort By</span>
          <div className="filter-btns">
            {([['points', 'Points'], ['cost', 'Cost'], ['roi_index', 'ROI Index']] as [SortField, string][]).map(([field, label]) => (
              <button
                key={field}
                className={`filter-btn ${sortBy === field ? 'active' : ''}`}
                onClick={() => setSortBy(field)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {teamFilter === 'specific' && (
          <div className="filter-group">
            <span className="filter-label">Team</span>
            <select
              className="team-select"
              value={specificTeam ?? ''}
              onChange={e => setSpecificTeam(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select team…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="state-msg">Loading players…</div>
      ) : (
        <div className="players-table">
          <div className="table-header players-header">
            <span>#</span>
            <span>Player</span>
            <span className="center">Gender</span>
            <span>Team</span>
            <span className="center">W–L</span>
              <span className="center">Tournaments</span>
              <span className={`right ${sortBy === 'points' ? 'active-sort' : ''}`}>Points</span>
              <span className={`right ${sortBy === 'cost' ? 'active-sort' : ''}`}>Cost</span>
              <span className={`right ${sortBy === 'roi_index' ? 'active-sort' : ''}`}>ROI Index</span>
            <span className="right stats-header">Stats</span>
          </div>
          <div className="table-body">
            {filtered.length === 0
              ? <div className="state-msg">No players found.</div>
              : filtered.map((p, i) => (
                <div key={p.player_id} className={`table-row player-row-item ${getRowClass(p)}`}>
                  <span className="rank-num">
                    <span className="rank-badge">{i + 1}</span>
                  </span>
                  <span className="player-info">
                    <span className="player-name">{p.name}</span>
                    {p.country && <span className="country">{p.country}</span>}
                    <span className="player-meta">
                      <span>
                        <span className="wins">{p.wins ?? 0}</span>
                        <span className="wl-sep">–</span>
                        <span className="losses">{p.losses ?? 0}</span>
                      </span>
                      {p.team_name && <span>{p.team_name}</span>}
                    </span>
                  </span>
                  <span className={`gender-badge center ${p.gender ?? ''}`}>{p.gender ?? '—'}</span>
                  <span className="team-name">
                    {p.team_name
                      ? <span className={`team-badge ${userTeam && Number(p.team_id) === Number(userTeam.id) ? 'my-team' : 'other-team'}`}>{p.team_name}</span>
                      : <span className="muted">—</span>
                    }
                  </span>
                  <span className="center wl-record">
                    <span className="wins">{p.wins ?? 0}</span>
                    <span className="wl-sep">–</span>
                    <span className="losses">{p.losses ?? 0}</span>
                  </span>
                  <span className="center">{p.tournament_count ?? 0}</span>
                  <span className={`right ${sortBy === 'points' ? 'active-sort' : ''}`}>{(p.points ?? 0).toLocaleString()}</span>
                  <span className={`right ${sortBy === 'cost' ? 'active-sort' : ''}`}>{p.cost != null ? p.cost.toLocaleString() : '—'}</span>
                  <span className={`roi right ${(p.roi_index ?? 0) >= 0 ? 'roi-pos' : 'roi-neg'} ${sortBy === 'roi_index' ? 'active-sort' : ''}`}>
                    {p.roi_index != null ? p.roi_index.toFixed(1) : '—'}
                  </span>
                 <span className="player-stats-cell">
                    <span className={`stat-points ${sortBy === 'points' ? 'active-sort' : ''}`}>{(p.points ?? 0).toLocaleString()}</span>
                    <span className={`stat-secondary ${sortBy === 'cost' ? 'active-sort' : ''}`}>{p.cost != null ? p.cost.toLocaleString() : '—'}</span>
                    <span className={`stat-secondary ${sortBy === 'roi_index' ? 'active-sort' : (p.roi_index ?? 0) >= 0 ? 'roi-pos' : 'roi-neg'}`}>
                      {p.roi_index != null ? p.roi_index.toFixed(1) : '—'}
                    </span>
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}