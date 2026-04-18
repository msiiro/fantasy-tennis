import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { type PlayerWithRank, type GenderFilter, type TeamFilter} from '../types';
import { useAuth } from '../hooks/useAuth';

export default function Players() {

  // Local type just for Players.tsx - teams table shape
  type TeamOption = {
    id: number;
    name: string;
    league_id: number;
  };

  const { userTeam } = useAuth();
  const [players, setPlayers] = useState<PlayerWithRank[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [specificTeam, setSpecificTeam] = useState<number | null>(null);

  

  useEffect(() => {
    async function load() {
      const [{ data: rankingsData }, { data: teamsData }, { data: teamPlayersData }] = await Promise.all([
        supabase
          .from('player_ranking_history')
          .select('player_id, player_name, short_name, country, country_code, gender, rank, points')
          .in('ranking_type', ['atp', 'wta'])
          .order('ranking_date', { ascending: false }),
        supabase.from('teams').select('id, name, current_points, league_id'),
        supabase.from('current_rosters').select('player_id, team_id, teams(id, name)'),
      ]);

      // Deduplicate to latest ranking per player
      const seen = new Set<number>();
      const latestRankings: typeof rankingsData = [];
      for (const r of rankingsData ?? []) {
        if (!seen.has(r.player_id)) {
          seen.add(r.player_id);
          latestRankings.push(r);
        }
      }

      const teamMap: Record<number, { teamId: number; teamName: string }> = {};
      (teamPlayersData ?? []).forEach((tp: any) => {
        teamMap[tp.player_id] = { teamId: tp.team_id, teamName: tp.teams?.name ?? '' };
      });

      const merged: PlayerWithRank[] = latestRankings.map(r => ({
        player_id: r.player_id,
        name: r.player_name,
        short_name: r.short_name,
        country: r.country,
        country_code: r.country_code,
        gender: r.gender,
        rank: r.rank,
        points: r.points,
        teamId: teamMap[r.player_id]?.teamId ?? null,
        teamName: teamMap[r.player_id]?.teamName ?? null,
        matchesCount: 0,
      }));

      setPlayers(merged);
      setTeams(teamsData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
      if (teamFilter === 'league' && !p.teamId) return false;
      if (teamFilter === 'specific' && p.teamId !== specificTeam) return false;
      return true;
    });
  }, [players, search, genderFilter, teamFilter, specificTeam]);

  function getRowClass(p: PlayerWithRank): string {
    if (!p.teamId) return 'no-team-row';
    if (userTeam && Number(p.teamId) === Number(userTeam.id)) return 'my-team-row';
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
            {(['all', 'league', 'specific'] as TeamFilter[]).map(t => (
              <button
                key={t}
                className={`filter-btn ${teamFilter === t ? 'active' : ''}`}
                onClick={() => { setTeamFilter(t); if (t !== 'specific') setSpecificTeam(null); }}
              >
                {t === 'all' ? 'All' : t === 'league' ? 'League' : 'By Team'}
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
            <span>Rank</span>
            <span>Player</span>
            <span className="center">Gender</span>
            <span>Team</span>
            <span className="right">Points</span>
          </div>
          <div className="table-body">
            {filtered.length === 0
              ? <div className="state-msg">No players found.</div>
              : filtered.map((p, i) => (
                <div key={p.player_id} className={`table-row player-row-item ${getRowClass(p)}`}>
                  <span className="rank-num">
                    <span className="rank-badge">{p.rank ?? i + 1}</span>
                  </span>
                  <span className="player-info">
                    <span className="player-name">{p.name}</span>
                    {p.country && <span className="country">{p.country}</span>}
                  </span>
                  <span className={`gender-badge center ${p.gender ?? ''}`}>{p.gender ?? '—'}</span>
                  <span className="team-name">
                    {p.teamName
                      ? <span className={`team-badge ${userTeam && Number(p.teamId) === Number(userTeam.id) ? 'my-team' : 'other-team'}`}>{p.teamName}</span>
                      : <span className="muted">—</span>
                    }
                  </span>
                  <span className="points right">{p.points?.toLocaleString() ?? '—'}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}