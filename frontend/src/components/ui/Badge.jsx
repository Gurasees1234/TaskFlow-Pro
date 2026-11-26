import { cn } from '../../utils/cn';
import styles from './Badge.module.css';

export const Badge = ({ children, variant = 'neutral', mono = false, className }) => {
  return (
    <span className={cn(styles.badge, styles[variant], mono && styles.mono, className)}>
      {children}
    </span>
  );
};

