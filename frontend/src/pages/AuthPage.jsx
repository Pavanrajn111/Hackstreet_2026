import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import useAuth from '../auth/useAuth';

const copy = {
  login: { eyebrow: 'WELCOME BACK', title: 'Return to your field.', body: 'Your field record is ready when you are.', action: 'Enter workspace', alternate: 'New to AquaGrow?', alternateLink: 'Create an account', alternatePath: '/register' },
  register: { eyebrow: 'BEGIN YOUR FIELD RECORD', title: 'Grow with clarity.', body: 'Create your free workspace and make the next decision count.', action: 'Create workspace', alternate: 'Already have an account?', alternateLink: 'Sign in', alternatePath: '/login' },
  recover: { eyebrow: 'ACCOUNT RECOVERY', title: 'Back to the field.', body: 'Enter your email and we will show where recovery belongs when authentication is connected.', action: 'Request recovery link', alternate: 'Remembered your password?', alternateLink: 'Sign in', alternatePath: '/login' },
};

export default function AuthPage({ mode = 'login' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, resetPassword } = useAuth();
  const content = copy[mode];

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

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    const fullName = String(form.get('fullName') || '').trim();
    const phone = String(form.get('phone') || '').trim();

    if (!email || !email.includes('@')) {
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
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
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
          setSubmitted(true);
          navigate(getDestination(), { replace: true });
        } else {
          setRequiresConfirmation(true);
          setSubmitted(true);
        }
      } else {
        await resetPassword(email);
        setSubmitted(true);
      }
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual"><div className="auth-visual-shade" /><Link to="/" className="auth-logo"><BrandLogo theme="light" size="medium" /></Link><div className="auth-quote"><span>FIELD NOTE / 001</span><h2>Every field<br /><em>has a rhythm.</em></h2></div><div className="auth-visual-foot"><span>INTELLIGENCE FOR EVERY FIELD</span><span>SOIL • WEATHER • WATER</span></div></div>
      <div className="auth-panel"><Link to="/" className="auth-back">← Back to AquaGrow</Link><div className="auth-form-wrap">{submitted ? <div className="auth-success"><CheckCircle2 size={37} /><span className="auth-eyebrow">{mode === 'recover' ? 'REQUEST RECEIVED' : requiresConfirmation ? 'CONFIRM YOUR EMAIL' : 'ACCOUNT READY'}</span><h1>{mode === 'recover' ? 'Check your inbox.' : requiresConfirmation ? 'One last step.' : 'Your workspace is ready.'}</h1><p>{mode === 'recover' ? 'If an account exists for that email, Supabase has sent a password recovery link.' : requiresConfirmation ? 'We sent a confirmation link to your email. Confirm your address before signing in.' : 'Your account is ready. We are taking you to the field console.'}</p>{mode === 'recover' && <button type="button" className="auth-submit" onClick={() => navigate('/login', { replace: true })}>Return to sign in <ArrowRight size={16} /></button>}{requiresConfirmation && <button type="button" className="auth-submit" onClick={() => navigate('/login', { replace: true })}>Continue to sign in <ArrowRight size={16} /></button>}</div> : <><span className="auth-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p className="auth-intro">{content.body}</p><form onSubmit={submit} noValidate>{mode === 'register' && <><label>Full name<input name="fullName" type="text" placeholder="Your full name" autoComplete="name" /></label><label>Phone number <span>(optional)</span><input name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" /></label></>}<label>Email address<input name="email" type="email" placeholder="you@yourfarm.com" autoComplete="email" /></label>{mode !== 'recover' && <><label>Password<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{mode === 'register' && <label>Confirm password<input name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password" /></label>}</>}{mode === 'login' && <div className="auth-options"><label className="remember"><input type="checkbox" /> Remember me</label><Link to="/recover">Forgot password?</Link></div>}{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Please wait...' : content.action}<ArrowRight size={16} /></button></form><p className="auth-alternate">{content.alternate} <Link to={content.alternatePath}>{content.alternateLink}</Link></p></>}</div></div>
    </div>
  );
}
