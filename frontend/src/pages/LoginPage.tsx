import { useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { roomsApi } from '../api/rooms.api';
import { useAuthStore } from '../store/authStore';
import { isGloballyHandled } from '../api/axios';

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  }
  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, setIceServers } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [credentialError, setCredentialError] = useState('');
  const [loading, setLoading] = useState(false);

  const validationErrors = validate(email, password);

  function touch(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldError(field: keyof FieldErrors): string | undefined {
    return touched[field] ? validationErrors[field] : undefined;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setCredentialError('');

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim(), password);
      setAuth(data.accessToken, data.user);
      try {
        const ice = await roomsApi.iceConfig();
        setIceServers(ice.data.iceServers);
      } catch {
        // use STUN defaults
      }
      navigate('/rooms');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setCredentialError('Invalid email or password');
      } else if (!isGloballyHandled(err)) {
        // unexpected non-global error — show inline since we have no other mechanism here
        setCredentialError('Login failed. Please try again.');
      }
      // 429 / 5xx / network: interceptor already toasted
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          {credentialError && (
            <div className="error-banner" role="alert">{credentialError}</div>
          )}

          <div className="field-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                setCredentialError('');
              }}
              onBlur={() => touch('email')}
              className={fieldError('email') ? 'input-error' : undefined}
              aria-invalid={!!fieldError('email')}
              aria-describedby={fieldError('email') ? 'err-email' : undefined}
            />
            {fieldError('email') && (
              <span id="err-email" className="field-error" role="alert">
                {fieldError('email')}
              </span>
            )}
          </div>

          <div className="field-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setCredentialError('');
              }}
              onBlur={() => touch('password')}
              className={fieldError('password') ? 'input-error' : undefined}
              aria-invalid={!!fieldError('password')}
              aria-describedby={fieldError('password') ? 'err-password' : undefined}
            />
            {fieldError('password') && (
              <span id="err-password" className="field-error" role="alert">
                {fieldError('password')}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
