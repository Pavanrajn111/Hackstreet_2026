import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Sprout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabase';

const copy = {
  login: {
    eyebrow: 'WELCOME BACK',
    title: 'Return to your field.',
    body: 'Your field record is ready when you are.',
    action: 'Sign in',
    alternate: 'New to AquaGrow?',
    alternateLink: 'Create an account',
    alternatePath: '/register',
  },
  register: {
    eyebrow: 'BEGIN YOUR FIELD RECORD',
    title: 'Grow with clarity.',
    body: 'Create your account and make the next decision count.',
    action: 'Create account',
    alternate: 'Already have an account?',
    alternateLink: 'Sign in',
    alternatePath: '/login',
  },
  recover: {
    eyebrow: 'ACCOUNT RECOVERY',
    title: 'Back to the field.',
    body: 'Enter your email and we will send a password recovery link.',
    action: 'Send recovery link',
    alternate: 'Remembered your password?',
    alternateLink: 'Sign in',
    alternatePath: '/login',
  },
  reset: {
    eyebrow: 'CHOOSE A NEW PASSWORD',
    title: 'A fresh start.',
    body: 'Set a new password for your AquaGrow account.',
    action: 'Update password',
    alternate: 'Need another recovery link?',
    alternateLink: 'Recover account',
    alternatePath: '/recover',
  },
};

const successCopy = {
  register: {
    title: 'Check your inbox.',
    body: 'If email confirmation is enabled, use the link we sent to finish creating your account.',
  },
  recover: {
    title: 'Check your inbox.',
    body: 'If an account exists for that address, Supabase will send a password recovery link.',
  },
  reset: {
    title: 'Password updated.',
    body: 'Your new password is ready. Sign in to continue.',
  },
};

export default function AuthPage({ mode = 'login' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const content = copy[mode] ?? copy.login;
  const passwordMode = mode === 'login' || mode === 'register' || mode === 'reset';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      const supabase = getSupabaseClient();

      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        navigate('/app', { replace: true });
        return;
      }

      if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (authError) throw authError;
        if (data.session) {
          navigate('/app', { replace: true });
          return;
        }
      } else if (mode === 'recover') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (authError) throw authError;
      } else if (mode === 'reset') {
        const confirmation = String(form.get('password-confirmation') ?? '');
        if (password !== confirmation) {
          setError('The passwords do not match.');
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      } else {
        throw new Error('This authentication action is not supported.');
      }

      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Supabase could not complete the request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const successMessage = successCopy[mode];

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-shade" />
        <Link to="/" className="auth-logo">
          <span><Sprout size={19} /></span>AquaGrow
        </Link>
        <div className="auth-quote">
          <span>FIELD NOTE / 001</span>
          <h2>Every field<br /><em>has a rhythm.</em></h2>
        </div>
        <div className="auth-visual-foot">
          <span>INTELLIGENCE FOR EVERY FIELD</span>
          <span>SOIL • WEATHER • WATER</span>
        </div>
      </div>

      <div className="auth-panel">
        <Link to="/" className="auth-back">← Back to AquaGrow</Link>
        <div className="auth-form-wrap">
          {success ? (
            <div className="auth-success" aria-live="polite">
              <CheckCircle2 size={37} />
              <span className="auth-eyebrow">REQUEST COMPLETE</span>
              <h1>{successMessage.title}</h1>
              <p>{successMessage.body}</p>
              <Link to="/login" className="auth-submit">
                Sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <span className="auth-eyebrow">{content.eyebrow}</span>
              <h1>{content.title}</h1>
              <p className="auth-intro">{content.body}</p>
              <form onSubmit={submit}>
                {mode !== 'reset' && (
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      placeholder="you@yourfarm.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                )}
                {passwordMode && (
                  <label>
                    {mode === 'reset' ? 'New password' : 'Password'}
                    <div className="password-field">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={mode === 'reset' ? 'Choose a new password' : 'Your password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </label>
                )}
                {mode === 'reset' && (
                  <label>
                    Confirm new password
                    <input
                      name="password-confirmation"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter the new password again"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                )}
                {mode === 'login' && (
                  <div className="auth-options">
                    <label className="remember">
                      <input type="checkbox" /> Remember me
                    </label>
                    <Link to="/recover">Forgot password?</Link>
                  </div>
                )}
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait…' : content.action}
                  <ArrowRight size={16} />
                </button>
              </form>
              <p className="auth-alternate">
                {content.alternate} <Link to={content.alternatePath}>{content.alternateLink}</Link>
              </p>
              <p className="auth-disclaimer">
                Supabase handles account sign-in only. Backend APIs and farm data are not protected by this frontend authentication.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
