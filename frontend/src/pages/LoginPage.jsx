import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BrandMark } from '../components/common/BrandMark';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import styles from './AuthPages.module.css';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail('alex@taskflow.pro');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className={styles.authShell}>
      <div className={styles.backdropGlow} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={styles.authCardWrap}
      >
        <GlassPanel elevated padding="lg" className={styles.authCard}>
          <div className={styles.brandRow}>
            <BrandMark />
            <ThemeToggle />
          </div>

          <div>
            <span className={styles.eyebrow}>Workspace Access</span>
            <h1 className={styles.heading}>Welcome back</h1>
            <p className={styles.subheading}>Sign in to your TaskFlow Pro agile workspace.</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" icon={ArrowRight} iconPosition="right" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className={styles.demoBox}>
              <span>Seed demo account (after running seed script)</span>
              <button type="button" className={styles.demoBtn} onClick={fillDemo}>
                Fill Demo
              </button>
            </div>
          )}

          <div className={styles.footerRow}>
            <span>New to TaskFlow Pro?</span>
            <Link to="/register" className={styles.link}>
              Create account
            </Link>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
};

