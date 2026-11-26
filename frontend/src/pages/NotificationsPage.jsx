import { useCallback, useEffect, useState } from 'react';
import {
  AtSign,
  Bell,
  Check,
  CheckCheck,
  GitCommitHorizontal,
  MessageSquare,
  Trash2,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { getSocket } from '../services/socketService';
import { useWorkspace } from '../hooks/useWorkspace';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';

const TYPE_ICON = {
  assignment: UserCheck,
  mention: AtSign,
  comment: MessageSquare,
  status_change: GitCommitHorizontal,
  sprint_event: Zap,
  invitation: UserPlus,
  priority_change: GitCommitHorizontal,
};

const formatRelative = (dateStr) => {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const getInitials = (name = 'S') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const NotificationsPage = () => {
  const { setUnreadCount } = useWorkspace();
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationService.list({
        unreadOnly: tab === 'unread' ? 'true' : undefined,
      });
      setNotifications(res.notifications || []);
      if (typeof res.unreadCount === 'number') setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, setUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, wasUnread) => {
    try {
      await notificationService.remove(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Manage"
        title="Notifications"
        subtitle="Stay updated on assignments, mentions, comments, sprint milestones, and invitations."
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={handleMarkAll}>
            Mark all as read
          </Button>
        }
      />

      <div className={pageStyles.toolbar}>
        <div className={pageStyles.pillTabs}>
          <button
            type="button"
            className={`${pageStyles.pillTab} ${tab === 'all' ? pageStyles.pillTabActive : ''}`}
            onClick={() => setTab('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`${pageStyles.pillTab} ${tab === 'unread' ? pageStyles.pillTabActive : ''}`}
            onClick={() => setTab('unread')}
          >
            Unread
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description={tab === 'unread' ? 'No unread notifications right now.' : 'No notifications recorded yet.'}
        />
      ) : (
        <GlassPanel padding="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <div
                  key={n._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: n.read ? 'transparent' : 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    {!n.read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--text-primary)',
                          flexShrink: 0,
                        }}
                        title="Unread"
                      />
                    )}
                    <div className={pageStyles.avatar}>{getInitials(n.actor?.name || 'System')}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        <strong>{n.actor?.name || 'System'}</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{n.message}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <Badge variant="outline" mono>
                          <Icon size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {n.type.replace('_', ' ')}
                        </Badge>
                        {n.workspace?.name && <Badge variant="neutral">{n.workspace.name}</Badge>}
                        {n.entity === 'Issue' && n.entityId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.read) handleMarkRead(n._id);
                              setSelectedIssueId(n.entityId);
                            }}
                            style={{ fontSize: 11, fontWeight: 600, textDecoration: 'underline' }}
                          >
                            View {n.entityTitle || 'Issue'}
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {!n.read && (
                      <Button size="sm" variant="ghost" icon={Check} onClick={() => handleMarkRead(n._id)}>
                        Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => handleDelete(n._id, !n.read)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {selectedIssueId && (
        <IssueDetailModal issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} />
      )}
    </div>
  );
};

