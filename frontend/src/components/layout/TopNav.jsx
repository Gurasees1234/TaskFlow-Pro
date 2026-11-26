import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, RefreshCw, Search, X } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useWorkspace } from '../../hooks/useWorkspace';
import { notificationService } from '../../services/notificationService';
import styles from './TopNav.module.css';

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/board': 'Kanban Board',
  '/backlog': 'Backlog',
  '/sprints': 'Active Sprints',
  '/reports': 'Reports & Analytics',
  '/tasks': 'My Tasks',
  '/calendar': 'Calendar',
  '/documents': 'Documents',
  '/team': 'Team Members',
  '/activity': 'Activity Feed',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/foundation': 'System Foundation',
};

export const TopNav = ({
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace, currentProject, unreadCount, setUnreadCount } = useWorkspace();

  const [notifOpen, setNotifOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);

  const projectRouteLabel = location.pathname.match(/\/projects\/[^/]+\/([^/]+)/)?.[1];
  const routeLabel =
    (projectRouteLabel &&
      ({
        dashboard: 'Dashboard',
        'my-tasks': 'My Tasks',
        board: 'Kanban Board',
        backlog: 'Backlog',
        sprints: 'Sprints',
        team: 'Team Members',
        reports: 'Reports & Analytics',
        activity: 'Activity',
        notifications: 'Notifications',
        settings: 'Settings',
      }[projectRouteLabel])) ||
    ROUTE_TITLES[location.pathname] ||
    'Workspace';
  const apiConnected = Boolean(health?.status === 'ok' && !healthError);

  const statusLabel = healthLoading
    ? 'API: CHECKING'
    : apiConnected
      ? 'API: ONLINE'
      : 'API: OFFLINE';

  useEffect(() => {
    if (!notifOpen) return;
    notificationService
      .list({ limit: 5 })
      .then((res) => {
        setRecentNotifs(res.notifications || []);
        if (typeof res.unreadCount === 'number') setUnreadCount(res.unreadCount);
      })
      .catch(() => {});
  }, [notifOpen, setUnreadCount]);

  return (
    <header className={styles.topnav}>
      <div className={styles.left}>
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={styles.mobileMenuBtn}
          aria-label="Open workspace navigation"
        >
          <Menu size={16} strokeWidth={1.75} />
        </button>

        <div className={styles.breadcrumb}>
          <span className={styles.workspace}>
            {currentProject ? `${currentProject.key || 'TF'} — ${currentProject.name}` : currentWorkspace?.name || 'TASKFLOW PRO'}
          </span>
          <span className={styles.separator}>/</span>
          <span className={styles.route}>{routeLabel}</span>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.searchWrap}>
          <Search size={14} strokeWidth={1.75} className={styles.searchIcon} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, projects, issues..."
            className={styles.searchInput}
            aria-label="Search workspace"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className={styles.clearBtn}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className={styles.kbd}>⌘K</kbd>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.apiStatusWrap}>
          <StatusPill label={statusLabel} active={apiConnected} pulse={healthLoading} />
        </div>

        <button
          type="button"
          onClick={onRefreshHealth}
          className={styles.iconBtn}
          aria-label="Re-check API health"
          title="Re-check API health"
        >
          <RefreshCw size={14} strokeWidth={1.75} className={healthLoading ? styles.spin : ''} />
        </button>

        <div className={styles.notifAnchor}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className={styles.iconBtn}
            aria-label="Workspace notifications"
            title="Notifications"
          >
            <Bell size={14} strokeWidth={1.75} />
            {unreadCount > 0 && <span className={styles.notifBadge} />}
          </button>

          {notifOpen && (
            <div className={styles.notifPopover}>
              <div className={styles.notifHead}>
                <span>Notifications ({unreadCount})</span>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className={styles.clearBtn}
                  aria-label="Close notifications"
                >
                  <X size={12} />
                </button>
              </div>
              <ul className={styles.notifList}>
                {recentNotifs.length === 0 ? (
                  <li className={styles.notifItem}>
                    <span className={styles.notifText}>No recent notifications</span>
                  </li>
                ) : (
                  recentNotifs.map((item) => (
                    <li key={item._id} className={styles.notifItem}>
                      <span className={styles.notifText}>
                        <strong>{item.actor?.name || 'System'}</strong> {item.message}
                      </span>
                      <span className={styles.notifTime}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/notifications');
                }}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-2)',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                Open Notifications Inbox
              </button>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
};
