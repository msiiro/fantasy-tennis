import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type TeamLeaderboard } from '../types';

export default function Leaderboard() {
  const [teams, setTeams] = useState<TeamLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('team_leaderboard')
        .select('team_id, team_name, total_points, league_id, rank')
        .order('total_points', { ascending: false });
      if (error) setError(error.message);
      else setTeams(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="state-msg">Loading standings…</div>;
  if (error) return <div className="state-msg error">{error}</div>;
  if (!teams.length) return <div className="state-msg">No teams found.</div>;

  const leaderPoints = teams[0]?.total_points ?? 0;

    return (
    <div className="leaderboard">
      <div className="table-header leaderboard-header">
        <span>Rank</span>
        <span>Team</span>
        <span className="right">Points</span>
        <span className="right">Gap</span>
      </div>
      <div className="table-body">
        {teams.map((team, i) => {
          const gap = (team.total_points ?? 0) - leaderPoints;
          return (
            <div key={team.team_id} className="table-row leaderboard-row">
              <span className={`rank-badge ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span>
              <span className="team-name">{team.team_name}</span>
              <span className="points right">{team.total_points?.toLocaleString() ?? 0}</span>
              <span className={`gap right ${gap < 0 ? 'behind' : 'leader'}`}>
                {i === 0 ? '—' : gap.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
