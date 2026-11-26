import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { workspaceService } from '../../services/workspaceService';
import styles from '../dashboard/ModalOverlay.module.css';

export const CreateWorkspaceModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ws = await workspaceService.create({ name: name.trim(), description: description.trim() });
      onCreated(ws);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2 className={styles.modalTitle}>Create Workspace</h2>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Workspace Name *</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Engineering"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose of this agile workspace..."
                rows={3}
              />
            </div>

            {error && <span className={styles.error}>{error}</span>}

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Workspace'}
              </Button>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};

