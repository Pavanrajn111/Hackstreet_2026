import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Sprout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const copy = {
  login: { eyebrow: 'WELCOME BACK', title: 'Return to your field.', body: 'Your field record is ready when you are.', action: 'Enter workspace', alternate: 'New to AquaGrow?', alternateLink: 'Create an account', alternatePath: '/register' },
  register: { eyebrow: 'BEGIN YOUR FIELD RECORD', title: 'Grow with clarity.', body: 'Create your free workspace and make the next decision count.', action: 'Create workspace', alternate: 'Already have an account?', alternateLink: 'Sign in', alternatePath: '/login' },
  recover: { eyebrow: 'ACCOUNT RECOVERY', title: 'Back to the field.', body: 'Enter your email and we will show where recovery belongs when authentication is connected.', action: 'Request recovery link', alternate: 'Remembered your password?', alternateLink: 'Sign in', alternatePath: '/login' },
};

export default function AuthPage({ mode = 'login' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const content = copy[mode];

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    if (mode !== 'recover' && !form.get('password')) {
      setError('Please enter a password to continue.');
      return;
    }
    if (!form.get('email') || !String(form.get('email')).includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitted(true);
    if (mode === 'login') setTimeout(() => navigate('/app'), 700);
  };

  return (
    <div className="auth-page">
      <div className="auth-visual"><div className="auth-visual-shade" /><Link to="/" className="auth-logo"><span><Sprout size={19} /></span>AquaGrow</Link><div className="auth-quote"><span>FIELD NOTE / 001</span><h2>Every field<br /><em>has a rhythm.</em></h2></div><div className="auth-visual-foot"><span>INTELLIGENCE FOR EVERY FIELD</span><span>SOIL • WEATHER • WATER</span></div></div>
      <div className="auth-panel"><Link to="/" className="auth-back">← Back to AquaGrow</Link><div className="auth-form-wrap">{submitted ? <div className="auth-success"><CheckCircle2 size={37} /><span className="auth-eyebrow">REQUEST RECEIVED</span><h1>{mode === 'recover' ? 'Check your inbox.' : 'Your workspace is ready.'}</h1><p>{mode === 'recover' ? 'This presentation flow is ready for an authentication service to be connected.' : 'We are taking you to the field console.'}</p>{mode !== 'login' && <Link to="/app" className="auth-submit">Open demo workspace <ArrowRight size={16} /></Link>}</div> : <><span className="auth-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p className="auth-intro">{content.body}</p><form onSubmit={submit} noValidate><label>Email address<input name="email" type="email" placeholder="you@yourfarm.com" autoComplete="email" /></label>{mode !== 'recover' && <label>Password<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}{mode === 'login' && <div className="auth-options"><label className="remember"><input type="checkbox" /> Remember me</label><Link to="/recover">Forgot password?</Link></div>}{error && <p className="auth-error">{error}</p>}<button type="submit" className="auth-submit">{content.action}<ArrowRight size={16} /></button></form><p className="auth-alternate">{content.alternate} <Link to={content.alternatePath}>{content.alternateLink}</Link></p><p className="auth-disclaimer">Presentation layer only — authentication APIs are not currently exposed by the backend.</p></>}</div></div>
    </div>
  );
}
