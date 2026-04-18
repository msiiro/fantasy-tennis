import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import SignIn from './pages/SignIn';
import Leaderboard from './components/Leaderboard';
import Matches from './components/Matches';
import Players from './components/Players';
import { type Section } from './types';

const NAV_ITEMS: { key: Section; label: string; num: string }[] = [
  { key: 'leaderboard', label: 'Leaderboard', num: '01' },
  { key: 'matches',     label: 'Matches',     num: '02' },
  { key: 'players',     label: 'Players',     num: '03' },
];

export default function App() {
  const { user, userTeam, loading, signOut } = useAuth();
  const [section, setSection] = useState<Section>('leaderboard');

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-brand">Fantasy Tennis</div>
      </div>
    );
  }

  if (!user) return <SignIn />;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="logo">Fantasy<br />Tennis</h1>
        <div className="user-area">
          <span className="user-email">{user.email}</span>
          {userTeam && <span className="user-team">{userTeam.name}</span>}
          <button className="btn-ghost" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <nav className="main-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`nav-btn ${section === item.key ? 'active' : ''}`}
            onClick={() => setSection(item.key)}
          >
            <span className="nav-num">{item.num}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {section === 'leaderboard' && (
          <div className="section-wrap">
            <div className="section-heading">
              <h2>Team Standings</h2>
            </div>
            <Leaderboard />
          </div>
        )}
        {section === 'matches' && (
          <div className="section-wrap">
            <div className="section-heading">
              <h2>Match Center</h2>
            </div>
            <Matches />
          </div>
        )}
        {section === 'players' && (
          <div className="section-wrap">
            <div className="section-heading">
              <h2>Players</h2>
            </div>
            <Players />
          </div>
        )}
      </main>
    </div>
  );
}
