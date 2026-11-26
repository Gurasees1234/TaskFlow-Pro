import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BrandMark } from '../components/common/BrandMark';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import styles from './AuthPages.module.css';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || undefined,
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
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
            <span className={styles.eyebrow}>Initialize Account</span>
            <h1 className={styles.heading}>Create workspace</h1>
            <p className={styles.subheading}>Start managing sprints, issues, and teams in minutes.</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-email">Work Email</label>
              <input
                id="reg-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-title">Role / Title (Optional)</label>
              <input
                id="reg-title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product Lead"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" icon={ArrowRight} iconPosition="right" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className={styles.footerRow}>
            <span>Already have an account?</span>
            <Link to="/login" className={styles.link}>
              Sign in
            </Link>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
};

