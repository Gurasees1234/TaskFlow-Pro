import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Briefcase, Columns3, FolderKanban, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { projectService } from '../services/projectService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { ConfirmModal } from '../components/common/ConfirmModal';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

export const ProjectsPage = () => {
  const { currentWorkspace, activeRole, refreshWorkspaceMeta } = useWorkspace();
  const { searchQuery = '' } = useOutletContext() || {};
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localSearch, setLocalSearch] = useState('');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [team, setTeam] = useState('Development');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManage = ['admin', 'project_manager'].includes(activeRole);

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await projectService.list({ workspaceId: currentWorkspace._id });
      setProjects(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setKey('');
    setTeam('Development');
    setStatus('active');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setName(p.name);
    setKey(p.key || '');
    setTeam(p.team || 'Development');
    setStatus(p.status || 'active');
    setDescription(p.description || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setFormError('Project name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await projectService.update(editing._id, {
          name: name.trim(),
          key: key.trim() || undefined,
          team,
          status,
          description: description.trim(),
        });
      } else {
        await projectService.create({
          name: name.trim(),
          key: key.trim() || undefined,
          team,
          status,
          description: description.trim(),
          workspaceId: currentWorkspace._id,
        });
      }
      setModalOpen(false);
      await Promise.all([loadProjects(), refreshWorkspaceMeta()]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await projectService.remove(deleteTarget._id);
      setDeleteTarget(null);
      await Promise.all([loadProjects(), refreshWorkspaceMeta()]);
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const q = (localSearch || searchQuery).trim().toLowerCase();
  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.key && p.key.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        subtitle="Manage agile initiatives, track progress, and organize project teams."
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate} disabled={!currentWorkspace}>
            New Project
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
                placeholder="Search projects by name or key..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <select
              className={pageStyles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} project{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </GlassPanel>

      {loading ? (
        <LoadingState label="Loading projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProjects} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create your first project to organize sprints, issues, and team delivery."
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Create Project
            </Button>
          }
        />
      ) : (
        <div className={pageStyles.grid3}>
          {filtered.map((proj) => (
            <GlassPanel key={proj._id} padding="md" className={pageStyles.kpiCard} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge variant="contrast" mono>{proj.key || 'TF'}</Badge>
                    <Badge variant="outline">{proj.team || 'General'}</Badge>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{proj.name}</h3>
                </div>
                <Badge variant={proj.status === 'completed' ? 'neutral' : 'outline'}>
                  {proj.status}
                </Badge>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', minHeight: 34 }}>
                {proj.description || 'No description provided.'}
              </p>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>{proj.completedCount || 0} / {proj.issueCount || 0} issues done</span>
                  <span>{proj.progress ?? 0}%</span>
                </div>
                <div className={pageStyles.progressTrack}>
                  <div className={pageStyles.progressFill} style={{ width: `${proj.progress ?? 0}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <Users size={12} /> {proj.members?.length || 1} members
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Columns3}
                    onClick={() => navigate(`/board?projectId=${proj._id}`)}
                  >
                    Board
                  </Button>
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(proj)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(proj)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => setModalOpen(false)}>
          <div className={modalStyles.modalShell} onClick={(e) => e.stopPropagation()}>
            <GlassPanel elevated padding="lg" className={modalStyles.modal}>
              <div className={modalStyles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Briefcase size={16} />
                  <h2 className={modalStyles.modalTitle}>
                    {editing ? 'Edit Project' : 'Create Project'}
                  </h2>
                </div>
              </div>
              <form onSubmit={handleSave} className={modalStyles.form}>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Project Name *</label>
                    <input
                      className={modalStyles.input}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Core Platform"
                      autoFocus
                    />
                  </div>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Key (optional)</label>
                    <input
                      className={modalStyles.input}
                      value={key}
                      onChange={(e) => setKey(e.target.value.toUpperCase())}
                      placeholder="CP"
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Team</label>
                    <select className={modalStyles.select} value={team} onChange={(e) => setTeam(e.target.value)}>
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Product">Product</option>
                    </select>
                  </div>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Status</label>
                    <select className={modalStyles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Description</label>
                  <textarea
                    className={modalStyles.textarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project goals and scope..."
                  />
                </div>
                {formError && <span className={modalStyles.error}>{formError}</span>}
                <div className={modalStyles.actions}>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Project"
          message={`Delete "${deleteTarget.name}" and all of its issues and sprints? This action cannot be undone.`}
          confirmLabel="Delete Project"
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

