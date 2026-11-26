import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassPanel } from '../components/ui/GlassPanel';
import styles from './NotFoundPage.module.css';

export const NotFoundPage = () => {
  return (
    <div className={styles.wrapper}>
      <GlassPanel elevated padding="lg" className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Route not initialized</h1>
        <p className={styles.description}>
          This workspace route is not part of the Phase 1 foundation shell.
        </p>
        <Link to="/">
          <Button variant="primary" icon={ArrowLeft}>
            Return to Foundation
          </Button>
        </Link>
      </GlassPanel>
    </div>
  );
};

