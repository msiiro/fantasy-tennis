import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type MatchFact, type MatchFilter } from '../types';
import { useAuth } from '../hooks/useAuth';

function formatScore(m: MatchFact, player: 1 | 2): string {
  const sets = player === 1
    ? [m.player1_set1_score, m.player1_set2_score, m.player1_set3_score]
    : [m.player2_set1_score, m.player2_set2_score, m.player2_set3_score];
  return sets.filter(s => s !== null && s !== undefined).join(' ');
}

const FINISHED_STATUSES = ['ended', 'finished', 'complete', 'retired', 'walkover', 'canceled'];

function isFinished(m: MatchFact): boolean {
  return FINISHED_STATUSES.some(s => m.status_description?.toLowerCase().includes(s));
}

function MatchCard({ match, playerTeamMap, userTeamId }: {
  match: MatchFact;
  playerTeamMap: Record<number, { teamId: number; teamName: string }>;
  userTeamId: number | null;
}) {
  const complete = isFinished(match);
  const p1Won = match.winner_code === 1;
  const p2Won = match.winner_code === 2;

  const p1Team = playerTeamMap[match.player1_id];
  const p2Team = playerTeamMap[match.player2_id];

  // Points earned by each player in a completed match
  const pts = match.points_at_stake

  const isMyTeam = (teamId: number) =>
    userTeamId !== null && Number(teamId) === Number(userTeamId);

  const matchDate = match.match_date
    ? new Date(match.match_date).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <div className={`match-card ${complete ? 'complete' : 'upcoming'}`}>
      <div className="match-meta">
        <span className="tournament">{match.tournament_name}</span>
        {!complete && pts != null && pts > 0 && (
          <span className="points-at-stake">Points at Stake: {pts}</span>
        )}
        <span className="round">{match.round_name}</span>
      </div>
      <div className="match-players">
        <div className={`player-row ${p1Won ? 'winner' : ''}`}>
          <span className="player-name">{match.player1_name ?? '—'}</span>
          {p1Team && (
            <span className={`team-badge ${p1Team ? (isMyTeam(p1Team.teamId) ? 'my-team' : 'other-team') : 'placeholder'}`}>
              {p1Team.teamName}
            </span>
          )}
          {complete && (
            <>
              {p1Won && pts != null && pts > 0 && (
                <span className="points-earned">+{pts}</span>
              )}
              <span className="score">{formatScore(match, 1)}</span>
            </>
          )}
        </div>
        <div className={`player-row ${p2Won ? 'winner' : ''}`}>
          <span className="player-name">{match.player2_name ?? '—'}</span>
          {p2Team && (
            <span className={`team-badge ${isMyTeam(p2Team.teamId) ? 'my-team' : 'other-team'}`}>
              {p2Team.teamName}
            </span>
          )}
          {complete && (
            <>
              {p2Won && pts != null && pts > 0 && (
                <span className="points-earned">+{pts}</span>
              )}
              <span className="score">{formatScore(match, 2)}</span>
            </>
          )}
        </div>
      </div>
      {!complete && matchDate && (
        <div className="match-time">{matchDate}</div>
      )}
      {complete && match.status_description && match.status_description.toLowerCase() !== 'ended' && (
        <div className="match-time">{match.status_description}</div>
      )}
    </div>
  );
}

export default function Matches() {
  const { userTeam } = useAuth();
  const [upcoming, setUpcoming] = useState<MatchFact[]>([]);
  const [recent, setRecent]     = useState<MatchFact[]>([]);
  const [playerTeamMap, setPlayerTeamMap] = useState<Record<number, { teamId: number; teamName: string }>>({});
  const [filter, setFilter]     = useState<MatchFilter>('anyteam');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Player-team map
      const { data: tp } = await supabase
        .from('current_rosters')
        .select('player_id, team_id, team_name');
      const teamMap: Record<number, { teamId: number; teamName: string }> = {};
      (tp ?? []).forEach((item: any) => {
        teamMap[item.player_id] = { teamId: item.team_id, teamName: item.team_name ?? 'Unknown' };
      });
      setPlayerTeamMap(teamMap);

      const teamPlayerIds = Object.keys(teamMap).map(Number);
      if (!teamPlayerIds.length) { setLoading(false); return; }
      const idList = teamPlayerIds.join(',');

      // 2. Fetch from match_fact — upcoming (no winner yet) and recent (has winner)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayISO = yesterday.toISOString();

      const CANCELLED_STATUSES = ['cancelled', 'canceled', 'postponed', 'abandoned', 'walkover'];

      const [{ data: upcomingData }, { data: recentData }] = await Promise.all([
        supabase
          .from('match_fact')
          .select('*')
          .is('winner_code', null)
          .gte('match_date', yesterdayISO)
          .not('status_description', 'in', `({${CANCELLED_STATUSES.join(',')}})`)
          .or(`player1_id.in.(${idList}),player2_id.in.(${idList})`)
          .order('match_date', { ascending: true })
          .limit(50),
        supabase
          .from('match_fact')
          .select('*')
          .not('winner_code', 'is', null)
          .or(`player1_id.in.(${idList}),player2_id.in.(${idList})`)
          .order('match_date', { ascending: false })
          .limit(100),
      ]);

      setUpcoming(upcomingData ?? []);
      setRecent(recentData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function applyFilter(matches: MatchFact[]): MatchFact[] {
    if (filter === 'all') return matches;
    if (filter === 'myteam' && userTeam) {
      return matches.filter(m =>
        Number(playerTeamMap[m.player1_id]?.teamId) === Number(userTeam.id) ||
        Number(playerTeamMap[m.player2_id]?.teamId) === Number(userTeam.id)
      );
    }
    if (filter === 'headtohead') {
      return matches.filter(m =>
        playerTeamMap[m.player1_id] &&
        playerTeamMap[m.player2_id] &&
        playerTeamMap[m.player1_id].teamId !== playerTeamMap[m.player2_id].teamId
      );
    }
    // anyteam
    return matches.filter(m => playerTeamMap[m.player1_id] || playerTeamMap[m.player2_id]);
  }

  const filters: { key: MatchFilter; label: string }[] = [
    { key: 'anyteam',    label: 'League' },
    { key: 'myteam',     label: 'My Team' },
    { key: 'headtohead', label: 'Head-to-Head' },
  ];

  const filteredUpcoming = applyFilter(upcoming);
  const filteredRecent   = applyFilter(recent);
  const userTeamId       = userTeam?.id ?? null;

  return (
    <div className="matches-page">
      <div className="filter-tabs">
        {filters.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state-msg">Loading matches…</div>
      ) : (
        <div className="matches-container">
          <section className="matches-group">
            <h3 className="group-title">Upcoming Matches</h3>
            {filteredUpcoming.length === 0
              ? <p className="state-msg">No upcoming matches.</p>
              : filteredUpcoming.map(m => (
                  <MatchCard
                    key={m.match_id}
                    match={m}
                    playerTeamMap={playerTeamMap}
                    userTeamId={userTeamId}
                  />
                ))
            }
          </section>
          <section className="matches-group">
            <h3 className="group-title">Recent Results</h3>
            {filteredRecent.length === 0
              ? <p className="state-msg">No recent results.</p>
              : filteredRecent.map(m => (
                  <MatchCard
                    key={m.match_id}
                    match={m}
                    playerTeamMap={playerTeamMap}
                    userTeamId={userTeamId}
                  />
                ))
            }
          </section>
        </div>
      )}
    </div>
  );
}