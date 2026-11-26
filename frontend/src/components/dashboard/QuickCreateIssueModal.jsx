import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import styles from './ModalOverlay.module.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2 } },
};

export const QuickCreateIssueModal = ({ projects, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [priority, setPriority] = useState('Medium');
  const [assignee, setAssignee] = useState('Alex');
  const [due, setDue] = useState('2026-12-10');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Issue title is required';
    if (title.trim().length > 0 && title.trim().length < 3) errs.title = 'Must be at least 3 characters';
    if (!projectId) errs.projectId = 'Please select a project';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const selectedProj = projects.find((p) => p.id === projectId);
    onSubmit({
      title: title.trim(),
      projectId,
      priority,
      status: 'In Progress',
      progress: 25,
      team: selectedProj?.team || 'Development',
      due: due || '2026-12-31',
      assignee: assignee || 'Alex',
    });
  };

  return (
    <motion.div
      className={styles.overlay}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className={styles.modalShell}
      >
        <GlassPanel elevated padding="lg" className={styles.modal}>
          <div className={styles.modalHead}>
            <h2 className={styles.modalTitle}>Create Task / Issue</h2>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="e.g. Fix login timeout"
                autoFocus
              />
              {errors.title && <span className={styles.error}>{errors.title}</span>}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Project *</label>
                <select
                  className={styles.select}
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setErrors((prev) => ({ ...prev, projectId: undefined }));
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.projectId && <span className={styles.error}>{errors.projectId}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Priority</label>
                <select
                  className={styles.select}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Assignee</label>
                <select
                  className={styles.select}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="Alex">Alex</option>
                  <option value="Sam">Sam</option>
                  <option value="Mia">Mia</option>
                  <option value="Elena">Elena</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Due Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary">Create Task</Button>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};
