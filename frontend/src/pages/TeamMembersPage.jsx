import { useCallback, useEffect, useState } from 'react';
import { Activity, Briefcase, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { workspaceService } from '../services/workspaceService';
import { projectService } from '../services/projectService';
import { invitationService } from '../services/invitationService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, LoadingState } from '../components/common/StateViews';
import { ConfirmModal } from '../components/common/ConfirmModal';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

const ROLE_LABELS = {
  admin: 'Workspace Admin',
  project_lead: 'Project Lead',
  project_manager: 'Project Manager',
  developer: 'Developer',
  tester: 'Tester / QA',
  viewer: 'Viewer',
};

const getInitials = (name = 'U') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const TeamMembersPage = () => {
  const { user } = useAuth();
  const { currentWorkspace, currentProject, projects, activeRole, refreshWorkspaces, refreshWorkspaceMeta } =
    useWorkspace();
  const isAdmin = currentProject
    ? ['project_lead', 'project_manager'].includes(activeRole)
    : activeRole === 'admin';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [inviteError, setInviteError] = useState('');
  const [saving, setSaving] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);

  const loadMembers = useCallback(async () => {
    if (!currentProject?._id && !currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = currentProject?._id
        ? await projectService.getMembers(currentProject._id)
        : await workspaceService.getMembers(currentWorkspace._id);
      setMembers(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id, currentWorkspace?._id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Member email is required');
      return;
    }
    setSaving(true);
    setInviteError('');
    try {
      if (currentProject?._id) {
        await invitationService.sendInvites(currentProject._id, {
          email: inviteEmail.trim(),
          role: inviteRole,
        });
      } else {
        await workspaceService.addMember(currentWorkspace._id, {
          email: inviteEmail.trim(),
          role: inviteRole,
        });
      }
      setInviteOpen(false);
      setInviteEmail('');
      await Promise.all([loadMembers(), refreshWorkspaces(), refreshWorkspaceMeta()]);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    setError('');
    try {
      if (currentProject?._id) {
        await projectService.updateMemberRole(currentProject._id, userId, nextRole);
      } else {
        await workspaceService.updateMemberRole(currentWorkspace._id, userId, nextRole);
      }
      await Promise.all([loadMembers(), refreshWorkspaces(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      if (currentProject?._id) {
        await projectService.removeMember(currentProject._id, removeTarget.user._id);
      } else {
        await workspaceService.removeMember(currentWorkspace._id, removeTarget.user._id);
      }
      setRemoveTarget(null);
      await Promise.all([loadMembers(), refreshWorkspaces(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
      setRemoveTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = members.filter((m) => {
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchQ =
      !q ||
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q);
    return matchRole && matchQ;
  });

  const avgCapacity =
    members.length > 0
      ? Math.max(
          15,
          100 -
            Math.round(
              (members.reduce((sum, m) => sum + Math.min(10, m.activeTaskCount || 0), 0) /
                (members.length * 10)) *
                100
            )
        )
      : 100;

  const currentUserId = user?.id || user?._id;

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Team members"
        subtitle="Manage access, roles, and team capacity across active projects."
        actions={
          isAdmin && (
            <Button variant="primary" icon={Plus} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          )
        }
      />

      {/* 3 KPI Cards */}
      <div className={pageStyles.kpiGrid3}>
        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}>
            <Users size={18} />
          </div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Total members</span>
            <span className={pageStyles.kpiValue}>{members.length}</span>
            <span className={pageStyles.kpiHint}>
              {members.filter((m) => m.role === 'admin').length} workspace admin(s)
            </span>
          </div>
        </GlassPanel>

        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}>
            <Activity size={18} />
          </div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Available capacity</span>
            <span className={pageStyles.kpiValue}>{avgCapacity}%</span>
            <span className={pageStyles.kpiHint}>Based on active assigned issues</span>
          </div>
        </GlassPanel>

        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}>
            <Briefcase size={18} />
          </div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Active projects</span>
            <span className={pageStyles.kpiValue}>{projects.length}</span>
            <span className={pageStyles.kpiHint}>{currentWorkspace?.name || 'Workspace'}</span>
          </div>
        </GlassPanel>
      </div>

      {/* Filter Toolbar */}
      <GlassPanel padding="sm">
        <div className={pageStyles.toolbar}>
          <div className={pageStyles.toolbarLeft}>
            <div className={pageStyles.searchInputWrap}>
              <Search size={14} className={pageStyles.searchIcon} />
              <input
                type="search"
                className={`${pageStyles.input} ${pageStyles.searchInput}`}
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={pageStyles.select}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {currentProject ? (
                <>
                  <option value="project_lead">Project Lead</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="developer">Developer</option>
                  <option value="tester">Tester / QA</option>
                  <option value="viewer">Viewer</option>
                </>
              ) : (
                <>
                  <option value="admin">Workspace Admin</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="developer">Developer</option>
                  <option value="tester">Tester / QA</option>
                </>
              )}
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} member{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </GlassPanel>

      {error && <div className={pageStyles.bannerError}>{error}</div>}

      {loading ? (
        <LoadingState label="Loading workspace members..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No members match filter"
          description="Try clearing the search query or invite a registered teammate by email."
        />
      ) : (
        <GlassPanel padding="none" className={pageStyles.tableWrap}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Projects</th>
                <th>Workload</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const workloadPct = Math.min(100, (m.activeTaskCount || 0) * 15);
                const isSelf = m.user._id === currentUserId;
                return (
                  <tr key={m.user._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={pageStyles.avatar}>{getInitials(m.user.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.user.name} {isSelf && '(You)'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          className={pageStyles.select}
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                        >
                          {currentProject ? (
                            <>
                              <option value="project_lead">Project Lead</option>
                              <option value="project_manager">Project Manager</option>
                              <option value="developer">Developer</option>
                              <option value="tester">Tester / QA</option>
                              <option value="viewer">Viewer</option>
                            </>
                          ) : (
                            <>
                              <option value="admin">Workspace Admin</option>
                              <option value="project_manager">Project Manager</option>
                              <option value="developer">Developer</option>
                              <option value="tester">Tester / QA</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <Badge variant="outline">{ROLE_LABELS[m.role] || m.role}</Badge>
                      )}
                    </td>
                    <td>{m.projectCount} project{m.projectCount === 1 ? '' : 's'}</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={pageStyles.progressTrack}>
                          <div className={pageStyles.progressFill} style={{ width: `${workloadPct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {m.activeTaskCount} open
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-primary)' }} />
                        Active
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          disabled={isSelf}
                          onClick={() => setRemoveTarget(m)}
                        >
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassPanel>
      )}

      {inviteOpen && (
        <div className={modalStyles.overlay} onClick={() => setInviteOpen(false)}>
          <div className={modalStyles.modalShell} onClick={(e) => e.stopPropagation()}>
            <GlassPanel elevated padding="lg" className={modalStyles.modal}>
              <div className={modalStyles.modalHead}>
                <h2 className={modalStyles.modalTitle}>{currentProject ? 'Invite project member' : 'Invite workspace member'}</h2>
              </div>
              <form onSubmit={handleInvite} className={modalStyles.form}>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Email address *</label>
                  <input
                    type="email"
                    className={modalStyles.input}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    autoFocus
                  />
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>{currentProject ? 'Project role' : 'Workspace role'}</label>
                  <select
                    className={modalStyles.select}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {currentProject ? (
                      <>
                        <option value="project_manager">Project Manager</option>
                        <option value="developer">Developer</option>
                        <option value="tester">Tester / QA</option>
                        <option value="viewer">Viewer</option>
                      </>
                    ) : (
                      <>
                        <option value="developer">Developer</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="tester">Tester / QA</option>
                        <option value="admin">Workspace Admin</option>
                      </>
                    )}
                  </select>
                </div>
                {inviteError && <span className={modalStyles.error}>{inviteError}</span>}
                <div className={modalStyles.actions}>
                  <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Adding...' : 'Add Member'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </div>
      )}

      {removeTarget && (
        <ConfirmModal
          title="Remove Member"
          message={`Remove ${removeTarget.user.name} (${removeTarget.user.email}) from ${currentWorkspace?.name}?`}
          confirmLabel="Remove Member"
          loading={saving}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
};
