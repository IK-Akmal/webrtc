import { useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { roomsApi } from '../api/rooms.api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../contexts/ToastContext';
import { isGloballyHandled } from '../api/axios';

interface FieldErrors {
  email?: string;
  displayName?: string;
  password?: string;
}

function validate(email: string, displayName: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (displayName.trim().length < 2) {
    errors.displayName = 'At least 2 characters required';
  }
  if (password.length < 8) {
    errors.password = 'At least 8 characters required';
  }
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth, setIceServers } = useAuthStore();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    displayName: false,
    password: false,
  });
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const validationErrors = validate(email, displayName, password);

  function touch(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldError(field: keyof FieldErrors): string | undefined {
    // After blur: show live validation error; also show server error as fallback
    const validErr = touched[field] ? validationErrors[field] : undefined;
    return validErr ?? serverFieldErrors[field];
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Reveal all validation errors on submit attempt
    setTouched({ email: true, displayName: true, password: true });
    setServerFieldErrors({});

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await authApi.register(email.trim(), displayName.trim(), password);
      setAuth(data.accessToken, data.user);
      try {
        const ice = await roomsApi.iceConfig();
        setIceServers(ice.data.iceServers);
      } catch {
        // no TURN configured — use STUN defaults
      }
      toast.success('Account created! Welcome.');
      navigate('/rooms');
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setServerFieldErrors({ email: 'This email is already registered' });
        } else if (!isGloballyHandled(err)) {
          toast.error('Registration failed. Please try again.');
        }
        // 429 / 5xx / network: already toasted by axios interceptor
      } else if (!isGloballyHandled(err)) {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          <div className="field-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                if (serverFieldErrors.email) {
                  setServerFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
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
              type="text"
              placeholder="Display name"
              value={displayName}
              autoComplete="name"
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => touch('displayName')}
              className={fieldError('displayName') ? 'input-error' : undefined}
              aria-invalid={!!fieldError('displayName')}
              aria-describedby={fieldError('displayName') ? 'err-name' : undefined}
            />
            {fieldError('displayName') && (
              <span id="err-name" className="field-error" role="alert">
                {fieldError('displayName')}
              </span>
            )}
          </div>

          <div className="field-group">
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
