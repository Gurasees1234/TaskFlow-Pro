import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ListTodo, Plus, Search } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { backlogService } from '../services/backlogService';
import { sprintService } from '../services/sprintService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, LoadingState } from '../components/common/StateViews';
import { CreateIssueModal } from '../components/common/CreateIssueModal';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';

export const BacklogPage = () => {
  const { currentWorkspace, projects, refreshWorkspaceMeta } = useWorkspace();

  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadBacklog = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [backlogRes, sprintList] = await Promise.all([
        backlogService.getByWorkspace(currentWorkspace._id, {
          projectId: projectFilter || undefined,
          priority: priorityFilter || undefined,
        }),
        sprintService.list({ workspaceId: currentWorkspace._id }),
      ]);
      setIssues(backlogRes.issues || []);
      setSprints(sprintList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, projectFilter, priorityFilter]);

  useEffect(() => {
    loadBacklog();
  }, [loadBacklog]);

  const handleMoveToSprint = async (issueId, sprintId) => {
    if (!sprintId) return;
    try {
      await backlogService.moveToSprint(issueId, sprintId);
      await Promise.all([loadBacklog(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReorder = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;
    const item = filtered[index];
    const projId = item.project?._id || item.project;
    const projectItems = issues.filter((i) => (i.project?._id || i.project) === projId);
    const pIdx = projectItems.findIndex((i) => i._id === item._id);
    const swapTarget = projectItems[pIdx + direction];
    if (!swapTarget) return;

    const copy = [...projectItems];
    [copy[pIdx], copy[pIdx + direction]] = [copy[pIdx + direction], copy[pIdx]];
    const orderedIds = copy.map((i) => i._id);

    try {
      await backlogService.reorder(projId, orderedIds);
      await loadBacklog();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = issues.filter((iss) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return iss.title.toLowerCase().includes(q) || (iss.issueKey && iss.issueKey.toLowerCase().includes(q));
  });

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Product Backlog"
        subtitle="Prioritize unscheduled issues and assign them into upcoming sprints."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)} disabled={projects.length === 0}>
            Add Backlog Issue
          </Button>
        }
      />

      <GlassPanel padding="sm">
        <div className={pageStyles.toolbar}>
          <div className={pageStyles.toolbarLeft}>
            <div className={pageStyles.searchInputWrap}>
              <Search size={14} className={pageStyles.searchIcon} />
              <input
                type="search"
                className={`${pageStyles.input} ${pageStyles.searchInput}`}
                placeholder="Search backlog issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className={pageStyles.select} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>

            <select className={pageStyles.select} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} unscheduled</span>
        </div>
      </GlassPanel>

      {error && <div className={pageStyles.bannerError}>{error}</div>}

      {loading ? (
        <LoadingState label="Loading backlog..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Backlog is clear"
          description="No unscheduled issues match your filter. Add a new backlog item or adjust filters."
          action={
            projects.length > 0 && (
              <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
                Create Backlog Item
              </Button>
            )
          }
        />
      ) : (
        <GlassPanel padding="none" className={pageStyles.tableWrap}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Key</th>
                <th>Issue</th>
                <th>Project</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Move to Sprint</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((iss, idx) => {
                const projSprints = sprints.filter(
                  (s) =>
                    s.status !== 'completed' &&
                    (s.project?._id || s.project) === (iss.project?._id || iss.project)
                );
                return (
                  <tr key={iss._id}>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => handleReorder(idx, -1)} title="Move up">
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" onClick={() => handleReorder(idx, 1)} title="Move down">
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </td>
                    <td><Badge variant="outline" mono>{iss.issueKey || 'ISS'}</Badge></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(iss._id)}
                        style={{ fontWeight: 500, textAlign: 'left' }}
                      >
                        {iss.title}
                      </button>
                    </td>
                    <td>{iss.project?.name || '—'}</td>
                    <td><Badge variant="neutral" mono>{iss.type}</Badge></td>
                    <td>
                      <Badge variant={iss.priority === 'critical' || iss.priority === 'high' ? 'contrast' : 'outline'} mono>
                        {iss.priority}
                      </Badge>
                    </td>
                    <td>{iss.assignee?.name || 'Unassigned'}</td>
                    <td>
                      <select
                        className={pageStyles.select}
                        defaultValue=""
                        onChange={(e) => handleMoveToSprint(iss._id, e.target.value)}
                      >
                        <option value="" disabled>Assign sprint...</option>
                        {projSprints.map((s) => (
                          <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassPanel>
      )}

      {showCreate && (
        <CreateIssueModal
          defaultProjectId={projectFilter || projects[0]?._id}
          sprints={sprints}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadBacklog();
            refreshWorkspaceMeta();
          }}
        />
      )}

      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          sprints={sprints}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={() => {
            loadBacklog();
            refreshWorkspaceMeta();
          }}
          onDeleted={() => {
            loadBacklog();
            refreshWorkspaceMeta();
          }}
        />
      )}
    </div>
  );
};
