import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Briefcase, FolderKanban, Plus, Search, Users } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { projectService } from '../services/projectService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

const PROJECT_TYPES = [
  'Software Development',
  'Web Development',
  'Mobile Application',
  'Research',
  'Marketing',
  'Design',
  'General',
];

export const ProjectsPage = () => {
  const { refreshWorkspaceMeta, selectProject } = useWorkspace();
  const { searchQuery = '' } = useOutletContext() || {};
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    key: '',
    description: '',
    type: 'Software Development',
    startDate: '',
    targetEndDate: '',
    priority: 'medium',
    status: 'planning',
    goals: '',
    tags: '',
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await projectService.list({ sort }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openCreate = () => {
    setForm({
      name: '',
      key: '',
      description: '',
      type: 'Software Development',
      startDate: '',
      targetEndDate: '',
      priority: 'medium',
      status: 'planning',
      goals: '',
      tags: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError('Project name must be at least 2 characters');
      return;
    }
    if (!form.key.trim()) {
      setFormError('Project key is required');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Project description is required');
      return;
    }
    if (!form.startDate || !form.targetEndDate) {
      setFormError('Start date and target end date are required');
      return;
    }
    if (new Date(form.targetEndDate) < new Date(form.startDate)) {
      setFormError('Target end date must not precede start date');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        goals: form.goals.split(',').map((item) => item.trim()).filter(Boolean),
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      };
      const result = await projectService.create(payload);
      const created = result.project;
      setModalOpen(false);
      await refreshWorkspaceMeta();
      selectProject(created._id);
      navigate(`/projects/${created._id}/dashboard`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openProject = (project) => {
    selectProject(project._id);
    navigate(`/projects/${project._id}/dashboard`);
  };

  const q = (localSearch || searchQuery).trim().toLowerCase();
  const filtered = useMemo(() => projects.filter((project) => {
    const matchStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchSearch =
      !q ||
      project.name?.toLowerCase().includes(q) ||
      project.key?.toLowerCase().includes(q) ||
      project.description?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [projects, statusFilter, q]);

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Projects"
        title="Project selection"
        subtitle="Choose a project or create a new one."
        actions={<Button variant="primary" icon={Plus} onClick={openCreate}>Create project</Button>}
      />

      <GlassPanel padding="sm">
        <div className={pageStyles.toolbar}>
          <div className={pageStyles.toolbarLeft}>
            <div className={pageStyles.searchInputWrap}>
              <Search size={14} className={pageStyles.searchIcon} />
              <input
                type="search"
                className={`${pageStyles.input} ${pageStyles.searchInput}`}
                placeholder="Search projects..."
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
              />
            </div>
            <select className={pageStyles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <select className={pageStyles.select} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recent">Recently updated</option>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="progress">Progress</option>
              <option value="targetEndDate">Target date</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} projects</span>
        </div>
      </GlassPanel>

      {loading ? (
        <LoadingState label="Loading projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProjects} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="You don't have any projects yet."
          description="Create your first project to get started."
          action={<Button variant="primary" icon={Plus} onClick={openCreate}>Create Project</Button>}
        />
      ) : (
        <div className={pageStyles.grid3}>
          {filtered.map((project) => (
            <GlassPanel key={project._id} padding="md" className={pageStyles.kpiCard} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <Badge variant="contrast" mono>{project.key}</Badge>
                  <h3 style={{ marginTop: 8, fontSize: 'var(--text-base)' }}>{project.name}</h3>
                </div>
                <Badge variant="outline">{project.status?.replace('_', ' ')}</Badge>
              </div>
              <p style={{ minHeight: 34, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {project.description || 'No description provided.'}
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <div>Lead: {project.lead?.name || 'Project Lead'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <Users size={12} /> {project.memberCount || 1} members
                </div>
                <div style={{ marginTop: 4 }}>
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'No start'} — {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'No target'}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Progress</span><span>{project.progress ?? 0}%</span>
                </div>
                <div className={pageStyles.progressTrack}>
                  <div className={pageStyles.progressFill} style={{ width: `${project.progress ?? 0}%` }} />
                </div>
              </div>
              <Button variant="primary" onClick={() => openProject(project)}>Open project</Button>
            </GlassPanel>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => setModalOpen(false)}>
          <div className={modalStyles.modalShell} onClick={(event) => event.stopPropagation()}>
            <GlassPanel elevated padding="lg" className={modalStyles.modal}>
              <div className={modalStyles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Briefcase size={16} />
                  <h2 className={modalStyles.modalTitle}>Create project</h2>
                </div>
              </div>
              <form onSubmit={handleCreate} className={modalStyles.form}>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Project name *</label><input className={modalStyles.input} value={form.name} onChange={(e) => updateField('name', e.target.value)} /></div>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Project key *</label><input className={modalStyles.input} value={form.key} maxLength={10} onChange={(e) => updateField('key', e.target.value.toUpperCase())} placeholder="TFP" /></div>
                </div>
                <div className={modalStyles.field}><label className={modalStyles.label}>Description *</label><textarea className={modalStyles.textarea} value={form.description} onChange={(e) => updateField('description', e.target.value)} /></div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Project type *</label><select className={modalStyles.select} value={form.type} onChange={(e) => updateField('type', e.target.value)}>{PROJECT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Priority *</label><select className={modalStyles.select} value={form.priority} onChange={(e) => updateField('priority', e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                </div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Start date *</label><input type="date" className={modalStyles.input} value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} /></div>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Target end date *</label><input type="date" className={modalStyles.input} value={form.targetEndDate} onChange={(e) => updateField('targetEndDate', e.target.value)} /></div>
                </div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Status</label><select className={modalStyles.select} value={form.status} onChange={(e) => updateField('status', e.target.value)}><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option><option value="archived">Archived</option></select></div>
                  <div className={modalStyles.field}><label className={modalStyles.label}>Tags (comma separated)</label><input className={modalStyles.input} value={form.tags} onChange={(e) => updateField('tags', e.target.value)} /></div>
                </div>
                <div className={modalStyles.field}><label className={modalStyles.label}>Goals (comma separated)</label><textarea className={modalStyles.textarea} value={form.goals} onChange={(e) => updateField('goals', e.target.value)} /></div>
                {formError && <span className={modalStyles.error}>{formError}</span>}
                <div className={modalStyles.actions}>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating...' : 'Create project'}</Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
};
