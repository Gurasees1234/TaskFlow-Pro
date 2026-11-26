import { useCallback, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { activityService } from '../services/activityService';
import { getSocket } from '../services/socketService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';

const getInitials = (name = 'U') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const formatAction = (act) => {
  const map = {
    'issue.created': 'created issue',
    'issue.status_changed': `changed status (${act.meta?.from || ''} → ${act.meta?.to || ''})`,
    'issue.priority_changed': `changed priority (${act.meta?.from || ''} → ${act.meta?.to || ''})`,
    'issue.assigned': 'assigned issue',
    'issue.deleted': 'deleted issue',
    'project.created': 'created project',
    'project.updated': 'updated project',
    'project.deleted': 'deleted project',
    'sprint.created': 'created sprint',
    'sprint.started': 'started sprint',
    'sprint.completed': 'completed sprint',
    'comment.added': 'commented on',
    'workspace.created': 'created workspace',
    'workspace.updated': 'updated workspace',
    'workspace.member_added': 'added workspace member',
    'workspace.role_updated': 'updated member role',
    'workspace.member_removed': 'removed workspace member',
    'document.created': 'created document',
  };
  return map[act.action] || act.action;
};

export const ActivityPage = () => {
  const { currentWorkspace, projects } = useWorkspace();
  const [activities, setActivities] = useState([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadActivity = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await activityService.list({
        workspaceId: currentWorkspace._id,
        entity: entityFilter || undefined,
        projectId: projectFilter || undefined,
      });
      setActivities(res.activities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, entityFilter, projectFilter]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (entry) => {
      setActivities((prev) => [entry, ...prev]);
    };
    socket.on('activity:new', onNew);
    return () => socket.off('activity:new', onNew);
  }, []);

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Manage"
        title="Activity Feed"
        subtitle="Chronological audit trail of issues, sprints, comments, projects, and membership."
      />

      <GlassPanel padding="sm">
        <div className={pageStyles.toolbar}>
          <div className={pageStyles.toolbarLeft}>
            <select
              className={pageStyles.select}
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Events</option>
              <option value="Issue">Issues</option>
              <option value="Project">Projects</option>
              <option value="Sprint">Sprints</option>
              <option value="Workspace">Workspace & Team</option>
              <option value="Document">Documents</option>
            </select>

            <select
              className={pageStyles.select}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {activities.length} event{activities.length === 1 ? '' : 's'}
          </span>
        </div>
      </GlassPanel>

      {loading ? (
        <LoadingState label="Loading activity feed..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadActivity} />
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No recorded activity yet"
          description="Actions across issues, projects, sprints, and team members appear here automatically."
        />
      ) : (
        <GlassPanel padding="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((act) => (
              <div
                key={act._id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className={pageStyles.avatar}>{getInitials(act.actor?.name)}</div>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      <strong>{act.actor?.name || 'Member'}</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{formatAction(act)}</span>{' '}
                      {act.entity === 'Issue' && act.entityId && act.action !== 'issue.deleted' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedIssueId(act.entityId)}
                          style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
                        >
                          {act.entityTitle}
                        </button>
                      ) : (
                        <strong>{act.entityTitle}</strong>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      {act.entity && <Badge variant="outline" mono>{act.entity}</Badge>}
                      {act.project?.name && <Badge variant="neutral">{act.project.name}</Badge>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {currentWorkspace?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(act.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadActivity}
          onDeleted={loadActivity}
        />
      )}
    </div>
  );
};

