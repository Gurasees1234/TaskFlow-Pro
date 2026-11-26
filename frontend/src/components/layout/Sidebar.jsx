import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { BrandMark } from '../common/BrandMark';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';
import { CreateWorkspaceModal } from '../common/CreateWorkspaceModal';
import { cn } from '../../utils/cn';
import styles from './Sidebar.module.css';

const OVERVIEW_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/documents', label: 'Documents', icon: FileText },
];

const WORKSPACE_NAV = [
  { to: '/projects', label: 'Projects', icon: Briefcase },
  { to: '/board', label: 'Board', icon: Columns3 },
  { to: '/backlog', label: 'Backlog', icon: ListTodo, badgeKey: 'backlog' },
  { to: '/sprints', label: 'Active Sprints', icon: Zap },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const MANAGE_NAV = [
  { to: '/team', label: 'Team Members', icon: Users },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const getInitials = (name = 'User') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'U';

export const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const {
    projects,
    currentProject,
    selectProject,
    activeRole,
    unreadCount,
    backlogCount,
    selectWorkspace,
    refreshWorkspaces,
  } = useWorkspace();
  const navigate = useNavigate();

  const [showCreateWs, setShowCreateWs] = useState(false);
  const projectPrefix = currentProject ? `/projects/${currentProject._id}` : '';
  const overviewNav = projectPrefix
    ? [
        { to: `${projectPrefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { to: `${projectPrefix}/my-tasks`, label: 'My Tasks', icon: CheckSquare },
        { to: `${projectPrefix}/board`, label: 'Board', icon: Columns3 },
      ]
    : OVERVIEW_NAV;
  const projectNav = projectPrefix
    ? [
        { to: '/projects', label: 'Projects', icon: Briefcase },
        { to: `${projectPrefix}/backlog`, label: 'Backlog', icon: ListTodo, badgeKey: 'backlog' },
        { to: `${projectPrefix}/sprints`, label: 'Sprints', icon: Zap },
        { to: `${projectPrefix}/reports`, label: 'Reports', icon: BarChart3 },
      ]
    : WORKSPACE_NAV;
  const manageNav = projectPrefix
    ? [
        { to: `${projectPrefix}/team`, label: 'Team Members', icon: Users },
        { to: `${projectPrefix}/activity`, label: 'Activity', icon: Activity },
        { to: `${projectPrefix}/notifications`, label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
        { to: `${projectPrefix}/settings`, label: 'Settings', icon: Settings },
      ]
    : MANAGE_NAV;

  const badgeCounts = {
    backlog: backlogCount,
    notifications: unreadCount,
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const renderNavGroup = (items) => (
    <ul className={styles.list}>
      {items.map(({ to, label, icon: Icon, badgeKey }) => {
        const badgeVal = badgeKey ? badgeCounts[badgeKey] : 0;
        return (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(styles.navItem, isActive && styles.navItemActive)
              }
              title={label}
            >
              <Icon size={16} strokeWidth={1.75} className={styles.icon} />
              {!collapsed && <span className={styles.itemLabel}>{label}</span>}
              {!collapsed && badgeVal > 0 && (
                <span className={styles.counterBadge}>{badgeVal > 99 ? '99+' : badgeVal}</span>
              )}
              {collapsed && badgeVal > 0 && <span className={styles.collapsedDot} />}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          styles.sidebar,
          collapsed && styles.collapsed,
          mobileOpen && styles.mobileOpen
        )}
        aria-label="Workspace Sidebar"
      >
        <div className={styles.header}>
          <BrandMark collapsed={collapsed} />
          <div className={styles.headerControls}>
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(styles.collapseBtn, styles.desktopOnly)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              className={cn(styles.collapseBtn, styles.mobileOnly)}
              aria-label="Close sidebar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Project Switcher */}
        {!collapsed && (
          <div className={styles.wsSwitcherWrap}>
            <select
              aria-label="Active project"
              className={styles.wsSelect}
              value={currentProject?._id || ''}
              onChange={(e) => {
                const projectId = e.target.value;
                if (!projectId) return;
                selectProject(projectId);
                navigate(`/projects/${projectId}/dashboard`);
              }}
            >
              {projects.length === 0 ? (
                <option value="">No project selected</option>
              ) : (
                projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.key} — {project.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className={styles.wsAddBtn}
              title="Project selection"
              aria-label="Project selection"
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        <nav className={styles.nav} aria-label="Main Navigation">
          <div className={styles.section}>
            {!collapsed && <span className={styles.sectionLabel}>Overview</span>}
            {renderNavGroup(overviewNav)}
          </div>

          <div className={styles.section}>
            {!collapsed && <span className={styles.sectionLabel}>Workspace</span>}
            {renderNavGroup(projectNav)}
          </div>

          <div className={styles.section}>
            {!collapsed && <span className={styles.sectionLabel}>Manage</span>}
            {renderNavGroup(manageNav)}
          </div>
        </nav>

        <div className={styles.footer}>
          <NavLink
            to="/foundation"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(styles.navItem, isActive && styles.navItemActive)
            }
            title="System Foundation Shell"
          >
            <Layers size={15} strokeWidth={1.7} className={styles.icon} />
            {!collapsed && <span className={styles.itemLabel}>Foundation</span>}
          </NavLink>

          <div className={cn(styles.profileCard, collapsed && styles.profileCollapsed)}>
            <div className={styles.avatar}>{getInitials(user?.name)}</div>
            {!collapsed && (
              <>
                <div className={styles.profileMeta}>
                  <span className={styles.profileName}>{user?.name || 'Member'}</span>
                  <span className={styles.profileRole}>{activeRole.replace('_', ' ')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.logoutBtn}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={async (ws) => {
            await refreshWorkspaces();
            selectWorkspace(ws._id);
            setShowCreateWs(false);
          }}
        />
      )}
    </>
  );
};
