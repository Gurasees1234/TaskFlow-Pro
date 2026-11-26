import { cn } from '../../utils/cn';
import styles from './StatusPill.module.css';

export const StatusPill = ({ label, active = false, pulse = false }) => {
  return (
    <span className={cn(styles.pill, active && styles.active)}>
      <span className={cn(styles.dot, active && styles.dotActive, pulse && styles.pulse)} />
      <span className={styles.label}>{label}</span>
    </span>
  );
};

