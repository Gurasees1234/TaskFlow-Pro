import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../hooks/useWorkspace';
import { issueService } from '../../services/issueService';
import styles from '../dashboard/ModalOverlay.module.css';

export const CreateIssueModal = ({
  defaultProjectId = '',
  defaultStatus = 'todo',
  defaultSprintId = '',
  sprints = [],
  onClose,
  onCreated,
}) => {
  const { projects, members } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?._id || '');
  const [type, setType] = useState('task');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprintId);
  const [storyPoints, setStoryPoints] = useState(2);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError('Issue title must be at least 3 characters');
      return;
    }
    if (!projectId) {
      setError('Please select a project first');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await issueService.create({
        title: title.trim(),
        description: description.trim(),
        projectId,
        type,
        status,
        priority,
        assignee: assignee || undefined,
        sprintId: sprintId || undefined,
        storyPoints: Number(storyPoints) || 1,
        dueDate: dueDate || undefined,
      });
      onCreated?.(created);
      onClose();
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
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className={styles.modalShell}
      >
        <GlassPanel elevated padding="lg" className={styles.modal}>
          <div className={styles.modalHead}>
            <h2 className={styles.modalTitle}>Create Issue</h2>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement JWT refresh interceptor"
                autoFocus
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Project *</label>
                <select className={styles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Type</label>
                <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="story">Story</option>
                  <option value="epic">Epic</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Priority</label>
                <select className={styles.select} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Assignee</label>
                <select className={styles.select} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Sprint</label>
                <select className={styles.select} value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                  <option value="">Backlog</option>
                  {sprints
                    .filter((s) => !projectId || (s.project?._id || s.project) === projectId)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Story Points</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={styles.input}
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Due Date</label>
                <input type="date" className={styles.input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope, acceptance criteria, or notes..."
                rows={2}
              />
            </div>

            {error && <span className={styles.error}>{error}</span>}

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Issue'}
              </Button>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};

