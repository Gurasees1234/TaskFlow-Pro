import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Play, Plus, Trash2, Zap } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { sprintService } from '../services/sprintService';
import { issueService } from '../services/issueService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, LoadingState } from '../components/common/StateViews';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

export const SprintsPage = () => {
  const { currentWorkspace, projects, activeRole, refreshWorkspaceMeta } = useWorkspace();
  const canManage = ['admin', 'project_manager'].includes(activeRole);

  const [sprints, setSprints] = useState([]);
  const [sprintIssuesMap, setSprintIssuesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completionSummary, setCompletionSummary] = useState(null);

  // Create Sprint Modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [goal, setGoal] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadSprints = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [sprintList, allIssuesRes] = await Promise.all([
        sprintService.list({ workspaceId: currentWorkspace._id }),
        issueService.listWorkspace({ workspaceId: currentWorkspace._id, limit: 250 }),
      ]);
      setSprints(sprintList);

      const map = {};
      for (const iss of allIssuesRes.issues || []) {
        const sid = iss.sprint?._id || iss.sprint;
        if (sid) {
          if (!map[sid]) map[sid] = [];
          map[sid].push(iss);
        }
      }
      setSprintIssuesMap(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const pid = projectId || projects[0]?._id;
    if (!name.trim() || !pid) {
      setFormError('Sprint name and project are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await sprintService.create({
        name: name.trim(),
        projectId: pid,
        workspaceId: currentWorkspace._id,
        startDate,
        endDate,
        goal: goal.trim(),
      });
      setShowCreate(false);
      setName('');
      setGoal('');
      await Promise.all([loadSprints(), refreshWorkspaceMeta()]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await sprintService.start(id);
      await Promise.all([loadSprints(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async (sprint) => {
    try {
      const res = await sprintService.complete(sprint._id, { moveIncompleteToBacklog: true });
      setCompletionSummary({ name: sprint.name, ...res.summary });
      await Promise.all([loadSprints(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveIssue = async (sprintId, issueId) => {
    try {
      await sprintService.removeIssue(sprintId, issueId);
      await Promise.all([loadSprints(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSprint = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sprintService.remove(deleteTarget._id);
      setDeleteTarget(null);
      await Promise.all([loadSprints(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Active Sprints"
        subtitle="Plan sprint cycles, monitor execution velocity, and manage sprint scope."
        actions={
          canManage && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setProjectId(projects[0]?._id || '');
                setShowCreate(true);
              }}
              disabled={projects.length === 0}
            >
              New Sprint
            </Button>
          )
        }
      />

      {error && <div className={pageStyles.bannerError}>{error}</div>}
      {completionSummary && (
        <div className={pageStyles.bannerSuccess}>
          Sprint <strong>{completionSummary.name}</strong> completed: {completionSummary.completedIssues} / {completionSummary.totalIssues} issues done ({completionSummary.completionRate}%). Incomplete items were returned to backlog.
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading sprints..." />
      ) : sprints.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No sprints created yet"
          description="Create a sprint to organize issues into time-boxed delivery cycles."
          action={
            canManage &&
            projects.length > 0 && (
              <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
                Create First Sprint
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sprints.map((sprint) => {
            const sprintIssues = sprintIssuesMap[sprint._id] || [];
            const m = sprint.metrics || {};
            return (
              <GlassPanel key={sprint._id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Badge variant={sprint.status === 'active' ? 'contrast' : 'outline'} mono>
                        {sprint.status}
                      </Badge>
                      <Badge variant="neutral">{sprint.project?.name || 'Project'}</Badge>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{sprint.name}</h2>
                    {sprint.goal && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Goal: {sprint.goal}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {sprint.status === 'planned' && (
                        <Button size="sm" variant="primary" icon={Play} onClick={() => handleStart(sprint._id)}>
                          Start Sprint
                        </Button>
                      )}
                      {sprint.status === 'active' && (
                        <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => handleComplete(sprint)}>
                          Complete Sprint
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(sprint)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>
                      {m.completedIssues || 0} / {m.totalIssues || sprintIssues.length} issues done ({m.completedPoints || 0} / {m.totalPoints || 0} pts)
                    </span>
                    <span>{m.progressPct || 0}%</span>
                  </div>
                  <div className={pageStyles.progressTrack}>
                    <div className={pageStyles.progressFill} style={{ width: `${m.progressPct || 0}%` }} />
                  </div>
                </div>

                {sprintIssues.length > 0 && (
                  <div className={pageStyles.tableWrap}>
                    <table className={pageStyles.table}>
                      <thead>
                        <tr>
                          <th>Key</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Assignee</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {sprintIssues.map((iss) => (
                          <tr key={iss._id}>
                            <td><Badge variant="outline" mono>{iss.issueKey}</Badge></td>
                            <td>
                              <button type="button" onClick={() => setSelectedIssueId(iss._id)} style={{ fontWeight: 500 }}>
                                {iss.title}
                              </button>
                            </td>
                            <td><Badge variant="neutral" mono>{iss.status.replace('_', ' ')}</Badge></td>
                            <td><Badge variant="outline" mono>{iss.priority}</Badge></td>
                            <td>{iss.assignee?.name || 'Unassigned'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveIssue(sprint._id, iss._id)}
                              >
                                Move to Backlog
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className={modalStyles.overlay} onClick={() => setShowCreate(false)}>
          <div className={modalStyles.modalShell} onClick={(e) => e.stopPropagation()}>
            <GlassPanel elevated padding="lg" className={modalStyles.modal}>
              <div className={modalStyles.modalHead}>
                <h2 className={modalStyles.modalTitle}>Create Sprint</h2>
              </div>
              <form onSubmit={handleCreate} className={modalStyles.form}>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Sprint Name *</label>
                  <input
                    className={modalStyles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sprint 13 — Release Prep"
                    autoFocus
                  />
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Project *</label>
                  <select className={modalStyles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Start Date</label>
                    <input type="date" className={modalStyles.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>End Date</label>
                    <input type="date" className={modalStyles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Sprint Goal</label>
                  <textarea
                    className={modalStyles.textarea}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Key objective for this iteration..."
                  />
                </div>
                {formError && <span className={modalStyles.error}>{formError}</span>}
                <div className={modalStyles.actions}>
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Sprint'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Sprint"
          message={`Delete sprint "${deleteTarget.name}"? Issues inside will be returned to the backlog.`}
          confirmLabel="Delete Sprint"
          loading={saving}
          onConfirm={handleDeleteSprint}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          sprints={sprints}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadSprints}
          onDeleted={loadSprints}
        />
      )}
    </div>
  );
};
