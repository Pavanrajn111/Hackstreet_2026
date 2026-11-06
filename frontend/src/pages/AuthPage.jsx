import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import useAuth from '../auth/useAuth';

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
    body: 'Create your free workspace and make the next decision count.',
    action: 'Create workspace',
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

export default function AuthPage({ mode = 'login' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, resetPassword, updatePassword, error: authStateError } = useAuth();
  const content = copy[mode] ?? copy.login;

  const getDestination = () => {
    const from = location.state?.from;
    return from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/app';
  };

  const friendlyError = (authError) => {
    const message = authError?.message || 'Authentication could not be completed.';
    if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.';
    if (/user already registered|already exists/i.test(message)) return 'An account already exists for this email. Try signing in instead.';
    if (/password/i.test(message) && /characters|length|weak|leaked|common/i.test(message)) return 'Choose a stronger password with at least 6 characters.';
    if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
    return message;
  };

  useEffect(() => {
    if (authStateError) {
      setError(authStateError instanceof Error ? authStateError.message : 'Authentication could not be completed.');
    }
  }, [authStateError]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    const fullName = String(form.get('fullName') || '').trim();
    const phone = String(form.get('phone') || '').trim();

    if (mode !== 'reset' && (!email || !email.includes('@'))) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode !== 'recover' && !password) {
      setError('Please enter a password to continue.');
      return;
    }
    if (mode === 'register' && !fullName) {
      setError('Please enter your full name.');
      return;
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn({ email, password });
        navigate(getDestination(), { replace: true });
      } else if (mode === 'register') {
        const data = await signUp({ email, password, fullName, phone });
        if (data.session) {
          navigate(getDestination(), { replace: true });
        } else {
          setRequiresConfirmation(true);
          setSubmitted(true);
        }
      } else if (mode === 'recover') {
        await resetPassword(email);
        setSubmitted(true);
      } else if (mode === 'reset') {
        await updatePassword(password);
        setSubmitted(true);
      } else {
        throw new Error('This authentication action is not supported.');
      }
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      setLoading(false);
    }
  };

  const successEyebrow = mode === 'reset'
    ? 'PASSWORD UPDATED'
    : mode === 'recover'
      ? 'REQUEST RECEIVED'
      : requiresConfirmation
        ? 'CONFIRM YOUR EMAIL'
        : 'ACCOUNT READY';
  const successTitle = mode === 'reset'
    ? 'Password updated.'
    : mode === 'recover'
      ? 'Check your inbox.'
      : requiresConfirmation
        ? 'One last step.'
        : 'Your workspace is ready.';
  const successBody = mode === 'reset'
    ? 'Your new password is ready. Sign in to continue.'
    : mode === 'recover'
      ? 'If an account exists for that email, Supabase has sent a password recovery link.'
      : requiresConfirmation
        ? 'We sent a confirmation link to your email. Confirm your address before signing in.'
        : 'Your account is ready. We are taking you to the field console.';

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-shade" />
        <Link to="/" className="auth-logo"><BrandLogo theme="light" size="medium" /></Link>
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
          {submitted ? (
            <div className="auth-success" aria-live="polite">
              <CheckCircle2 size={37} />
              <span className="auth-eyebrow">{successEyebrow}</span>
              <h1>{successTitle}</h1>
              <p>{successBody}</p>
              {(mode === 'recover' || mode === 'reset' || requiresConfirmation) && (
                <Link to="/login" className="auth-submit">
                  Continue to sign in <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : (
            <>
              <span className="auth-eyebrow">{content.eyebrow}</span>
              <h1>{content.title}</h1>
              <p className="auth-intro">{content.body}</p>
              <form onSubmit={submit} noValidate>
                {mode !== 'reset' && (
                  <>
                    {mode === 'register' && (
                      <>
                        <label>
                          Full name
                          <input name="fullName" type="text" placeholder="Your full name" autoComplete="name" required />
                        </label>
                        <label>
                          Phone number <span>(optional)</span>
                          <input name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" />
                        </label>
                      </>
                    )}
                    <label>
                      Email address
                      <input name="email" type="email" placeholder="you@yourfarm.com" autoComplete="email" required />
                    </label>
                  </>
                )}
                {mode !== 'recover' && (
                  <>
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
                    {(mode === 'register' || mode === 'reset') && (
                      <label>
                        Confirm password
                        <input
                          name="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password again"
                          autoComplete="new-password"
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                {mode === 'login' && (
                  <div className="auth-options">
                    <Link to="/recover">Forgot password?</Link>
                  </div>
                )}
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? 'Please wait…' : content.action}
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
