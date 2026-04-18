import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="signin-screen">
      <div className="signin-left">
        <div className="signin-content">
          <div className="brand">
            <h1>Fantasy<br />Tennis</h1>
            <p className="brand-sub">Live League Standings</p>
          </div>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Enter League'}
              {!loading && (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="signin-visual">
        <div className="visual-grid" />
        <div className="visual-accent" />
      </div>
    </div>
  );
}
