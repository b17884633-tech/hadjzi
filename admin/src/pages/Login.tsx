import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { DEMO_PASSWORD, DEMO_PHONE, setSession } from '../session';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.login(phone.trim(), password);
      if (result.requiresOtp || !result.accessToken) {
        setError('This account still needs OTP verification.');
        return;
      }
      if (result.user.role !== 'ADMIN') {
        setError('Only admin accounts can open this dashboard.');
        return;
      }
      setSession(result.accessToken, result.user);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <section className="login-aside">
        <div>
          <div className="brand">
            <div className="brand-mark">H</div>
            <div>
              <strong>Hadjzi</strong>
              <span>Admin</span>
            </div>
          </div>
          <h1>The desk for the whole marketplace.</h1>
          <p>
            Review new facilities, look after users, answer complaints, and keep deposits and
            payments in one place — live from the same database as the mobile app.
          </p>
        </div>
        <p>Uses the Nest API on port 3000.</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="brand">
            <div className="brand-mark">H</div>
            <div>
              <strong>Hadjzi</strong>
              <span>Admin</span>
            </div>
          </div>
          <h2>Sign in</h2>
          <p>Use an ADMIN account from the shared database.</p>
          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}
          <div className="stack">
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                autoComplete="username"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <span className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Enter dashboard'}
            </button>
          </div>
          <div className="login-hint">
            Seeded admin (if demo data is loaded)
            <br />
            <code>{DEMO_PHONE}</code>
            <br />
            <code>{DEMO_PASSWORD}</code>
          </div>
        </form>
      </section>
    </main>
  );
}
