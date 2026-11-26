import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import styles from './StateViews.module.css';

export const LoadingState = ({ label = 'Loading workspace data...' }) => (
  <GlassPanel className={styles.box}>
    <div className={styles.spinner} />
    <p className={styles.desc}>{label}</p>
  </GlassPanel>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <GlassPanel className={styles.box}>
    <div className={styles.iconCircle}>
      <Icon size={20} strokeWidth={1.6} />
    </div>
    <h3 className={styles.title}>{title}</h3>
    {description && <p className={styles.desc}>{description}</p>}
    {action}
  </GlassPanel>
);

export const ErrorState = ({ message, onRetry }) => (
  <GlassPanel className={styles.box}>
    <div className={styles.iconCircle}>
      <AlertTriangle size={20} strokeWidth={1.6} />
    </div>
    <h3 className={styles.title}>Unable to load data</h3>
    <p className={styles.errorText}>{message}</p>
    {onRetry && (
      <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
        Retry
      </Button>
    )}
  </GlassPanel>
);

