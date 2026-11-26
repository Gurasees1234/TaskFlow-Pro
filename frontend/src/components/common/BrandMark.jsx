import { Command } from 'lucide-react';
import styles from './BrandMark.module.css';

export const BrandMark = ({ collapsed = false }) => {
  return (
    <div className={styles.brand}>
      <div className={styles.emblem} aria-hidden="true">
        <Command size={16} strokeWidth={1.9} />
      </div>
      {!collapsed && (
        <div className={styles.meta}>
          <span className={styles.title}>TASKFLOW</span>
          <span className={styles.tier}>PRO</span>
        </div>
      )}
    </div>
  );
};

