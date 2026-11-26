import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import styles from '../dashboard/ModalOverlay.module.css';

export const ConfirmModal = ({
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className={styles.modalShell}
      >
        <GlassPanel elevated padding="lg" className={styles.modal}>
          <div className={styles.modalHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ color: danger ? '#ef4444' : 'var(--text-primary)' }} />
              <h2 className={styles.modalTitle}>{title}</h2>
            </div>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={onConfirm} disabled={loading}>
              {loading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};

