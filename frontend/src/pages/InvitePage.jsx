import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { invitationService } from '../services/invitationService';
import { BrandMark } from '../components/common/BrandMark';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import styles from './AuthPages.module.css';

export const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    invitationService.verifyToken(token)
      .then((data) => setInvitation(data.invitation))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError('');
    try {
      const data = await invitationService.acceptByToken(token);
      navigate(`/projects/${data.projectId}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className={styles.authShell}>
      <div className={styles.backdropGlow} aria-hidden="true" />
      <GlassPanel elevated padding="lg" className={styles.authCard}>
        <div className={styles.brandRow}><BrandMark /></div>
        {loading ? (
          <p className={styles.subheading}>Verifying invitation...</p>
        ) : error ? (
          <><h1 className={styles.heading}>Invitation unavailable</h1><div className={styles.errorBox}>{error}</div></>
        ) : (
          <>
            <h1 className={styles.heading}>Project invitation</h1>
            <p className={styles.subheading}>
              {invitation.inviter?.name || 'A teammate'} invited you to join {invitation.project?.name || 'a project'} as {invitation.roleLabel}.
            </p>
            {invitation.message && <div className={styles.errorBox}>{invitation.message}</div>}
            {isAuthenticated ? (
              <Button variant="primary" onClick={accept} disabled={accepting}>
                {accepting ? 'Joining...' : 'Accept invitation'}
              </Button>
            ) : (
              <div className={styles.actions}>
                <Link to="/login" state={{ from: { pathname: `/invite/${token}` } }}>Sign in</Link>
                <Link to="/register" state={{ email: invitation.email, from: { pathname: `/invite/${token}` } }}>Create account</Link>
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </div>
  );
};
