import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { issueService } from '../services/issueService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { CreateIssueModal } from '../components/common/CreateIssueModal';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';

export const MyTasksPage = () => {
  const { currentWorkspace, projects, refreshWorkspaceMeta } = useWorkspace();
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await issueService.listMy({
        workspaceId: currentWorkspace?._id || undefined,
        status: statusFilter || undefined,
      });
      setIssues(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = async (id, status) => {
    try {
      await issueService.changeStatus(id, status);
      await Promise.all([loadTasks(), refreshWorkspaceMeta()]);
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
        eyebrow="Overview"
        title="My Tasks"
        subtitle="Issues and stories assigned directly to you across the active workspace."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)} disabled={projects.length === 0}>
            New Task
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
                placeholder="Search my tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className={pageStyles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} tasks</span>
        </div>
      </GlassPanel>

      {loading ? (
        <LoadingState label="Loading your tasks..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTasks} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No assigned tasks"
          description="You have no matching tasks assigned in this workspace."
        />
      ) : (
        <GlassPanel padding="none" className={pageStyles.tableWrap}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Project</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((iss) => (
                <tr key={iss._id}>
                  <td><Badge variant="outline" mono>{iss.issueKey}</Badge></td>
                  <td>
                    <button type="button" onClick={() => setSelectedIssueId(iss._id)} style={{ fontWeight: 500, textAlign: 'left' }}>
                      {iss.title}
                    </button>
                  </td>
                  <td>{iss.project?.name || '—'}</td>
                  <td><Badge variant="neutral" mono>{iss.type}</Badge></td>
                  <td><Badge variant={iss.priority === 'critical' || iss.priority === 'high' ? 'contrast' : 'outline'} mono>{iss.priority}</Badge></td>
                  <td>{iss.dueDate ? new Date(iss.dueDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <select
                      className={pageStyles.select}
                      value={iss.status}
                      onChange={(e) => handleStatusChange(iss._id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      )}

      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadTasks();
            refreshWorkspaceMeta();
          }}
        />
      )}

      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadTasks}
          onDeleted={loadTasks}
        />
      )}
    </div>
  );
};

