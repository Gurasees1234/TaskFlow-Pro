import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Pencil, Send, Trash2, X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from './ConfirmModal';
import { issueService } from '../../services/issueService';
import { commentService } from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';
import styles from './IssueDetailModal.module.css';

export const IssueDetailModal = ({ issueId, sprints = [], onClose, onUpdated, onDeleted }) => {
  const { user } = useAuth();
  const { members, projects } = useWorkspace();

  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('task');
  const [assignee, setAssignee] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [storyPoints, setStoryPoints] = useState(1);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await issueService.getById(issueId);
      const iss = data.issue;
      setIssue(iss);
      setComments(data.comments || []);
      setActivity(data.activity || []);
      setTitle(iss.title || '');
      setDescription(iss.description || '');
      setStatus(iss.status || 'todo');
      setPriority(iss.priority || 'medium');
      setType(iss.type || 'task');
      setAssignee(iss.assignee?._id || '');
      setSprintId(iss.sprint?._id || '');
      setDueDate(iss.dueDate ? iss.dueDate.slice(0, 10) : '');
      setStoryPoints(iss.storyPoints ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (issueId) loadDetails();
  }, [issueId, loadDetails]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await issueService.update(issueId, {
        title: title.trim(),
        description,
        status,
        priority,
        type,
        assignee: assignee || null,
        sprintId: sprintId || null,
        dueDate: dueDate || null,
        storyPoints: Number(storyPoints) || 1,
      });
      setIssue(updated);
      await loadDetails();
      onUpdated?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await commentService.add(issueId, commentText.trim());
      setComments((prev) => [...prev, c]);
      setCommentText('');
      await loadDetails();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveEditComment = async (id) => {
    if (!editingCommentText.trim()) return;
    try {
      const updated = await commentService.update(id, editingCommentText.trim());
      setComments((prev) => prev.map((c) => (c._id === id ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await commentService.remove(id);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteIssue = async () => {
    setSaving(true);
    try {
      await issueService.remove(issueId);
      onDeleted?.(issueId);
      onClose();
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const currentUserId = user?.id || user?._id;
  const projectName =
    issue?.project?.name || projects.find((p) => p._id === issue?.project)?.name || 'Project';

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modalShell}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel elevated padding="lg" className={styles.modal}>
          <div className={styles.head}>
            <div className={styles.headLeft}>
              <span className={styles.keyBadge}>{issue?.issueKey || 'ISSUE'}</span>
              <Badge variant="outline" mono>{projectName}</Badge>
              {issue?.reporter?.name && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Reported by {issue.reporter.name}
                </span>
              )}
            </div>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <p style={{ padding: 24, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Loading issue details...
            </p>
          ) : (
            <div className={styles.bodyGrid}>
              <div className={styles.mainCol}>
                <div className={styles.metaRow}>
                  <label className={styles.label}>Title</label>
                  <input
                    className={styles.titleInput}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className={styles.metaRow}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.descTextarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add technical details, acceptance criteria, or reproduction steps..."
                  />
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.sectionTitle}>
                    <MessageSquare size={14} />
                    <span>Comments ({comments.length})</span>
                  </div>
                  <div className={styles.commentList}>
                    {comments.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        No comments yet. Mention teammates with @name.
                      </span>
                    ) : (
                      comments.map((c) => {
                        const isAuthor = (c.author?._id || c.author) === currentUserId;
                        return (
                          <div key={c._id} className={styles.commentCard}>
                            <div className={styles.commentHead}>
                              <span className={styles.commentAuthor}>{c.author?.name || 'User'}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className={styles.commentTime}>
                                  {new Date(c.createdAt).toLocaleString()}
                                </span>
                                {isAuthor && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(c._id);
                                      setEditingCommentText(c.body);
                                    }}
                                    title="Edit comment"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c._id)}
                                  title="Delete comment"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                            {editingCommentId === c._id ? (
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <input
                                  className={styles.input}
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                />
                                <Button size="sm" variant="primary" onClick={() => handleSaveEditComment(c._id)}>
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <p className={styles.commentBody}>{c.body}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handleAddComment} className={styles.commentForm}>
                    <input
                      className={styles.input}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment... (use @name to mention)"
                    />
                    <Button type="submit" size="sm" variant="primary" icon={Send}>
                      Send
                    </Button>
                  </form>
                </div>
              </div>

              <div className={styles.sideCol}>
                <div className={styles.metaCard}>
                  <div className={styles.metaRow}>
                    <label className={styles.label}>Status</label>
                    <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div className={styles.metaRow}>
                    <label className={styles.label}>Priority</label>
                    <select className={styles.select} value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className={styles.metaRow}>
                    <label className={styles.label}>Issue Type</label>
                    <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="task">Task</option>
                      <option value="bug">Bug</option>
                      <option value="story">Story</option>
                      <option value="epic">Epic</option>
                    </select>
                  </div>

                  <div className={styles.metaRow}>
                    <label className={styles.label}>Assignee</label>
                    <select className={styles.select} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user._id} value={m.user._id}>
                          {m.user.name} ({m.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.metaRow}>
                    <label className={styles.label}>Sprint</label>
                    <select className={styles.select} value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                      <option value="">Backlog (Unscheduled)</option>
                      {sprints.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className={styles.metaRow}>
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
                    <div className={styles.metaRow}>
                      <label className={styles.label}>Due Date</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.metaCard}>
                  <div className={styles.sectionTitle}>
                    <Activity size={14} />
                    <span>Activity History</span>
                  </div>
                  <div className={styles.activityList}>
                    {activity.length === 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No history logged yet.</span>
                    ) : (
                      activity.map((act) => (
                        <div key={act._id} className={styles.activityItem}>
                          <strong>{act.actor?.name || 'Member'}</strong> · {act.action.replace('.', ' ')}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {new Date(act.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.foot}>
            <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>
              Delete Issue
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                Close
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete Issue"
          message={`Permanently delete ${issue?.issueKey} "${issue?.title}" and all its comments?`}
          confirmLabel="Delete Issue"
          loading={saving}
          onConfirm={handleDeleteIssue}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </motion.div>
  );
};

