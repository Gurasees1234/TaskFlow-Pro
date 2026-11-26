import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { documentService } from '../services/documentService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { ConfirmModal } from '../components/common/ConfirmModal';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

export const DocumentsPage = () => {
  const { currentWorkspace, projects } = useWorkspace();
  const [docs, setDocs] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('spec');
  const [projectId, setProjectId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDocs = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await documentService.list({
        workspaceId: currentWorkspace._id,
        category: categoryFilter || undefined,
      });
      setDocs(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, categoryFilter]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Document title is required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await documentService.create({
        title: title.trim(),
        category,
        projectId: projectId || undefined,
        externalUrl: externalUrl.trim(),
        content: content.trim(),
        workspaceId: currentWorkspace._id,
      });
      setModalOpen(false);
      setTitle('');
      setContent('');
      setExternalUrl('');
      await loadDocs();
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
      await documentService.remove(deleteTarget._id);
      setDeleteTarget(null);
      await loadDocs();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q));
  });

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Overview"
        title="Documents & Specs"
        subtitle="Workspace technical specifications, design docs, runbooks, and external attachment links."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)} disabled={!currentWorkspace}>
            New Document
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
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className={pageStyles.select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="spec">Specification</option>
              <option value="design">Design Doc</option>
              <option value="runbook">Runbook</option>
              <option value="meeting">Meeting Notes</option>
              <option value="attachment">Attachment / Link</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} documents</span>
        </div>
      </GlassPanel>

      {loading ? (
        <LoadingState label="Loading documents..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDocs} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Create architecture notes, sprint specs, or reference links for your workspace."
          action={
            <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
              Create Document
            </Button>
          }
        />
      ) : (
        <div className={pageStyles.grid3}>
          {filtered.map((doc) => (
            <GlassPanel key={doc._id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Badge variant="outline" mono>{doc.category}</Badge>
                {doc.project?.name && <Badge variant="neutral">{doc.project.name}</Badge>}
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{doc.title}</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1, whiteSpace: 'pre-wrap' }}>
                {doc.content || 'No notes provided.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  By {doc.createdBy?.name || 'Member'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {doc.externalUrl && (
                    <a
                      href={doc.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                    >
                      Open <ExternalLink size={11} />
                    </a>
                  )}
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(doc)} />
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
                <h2 className={modalStyles.modalTitle}>Add Document</h2>
              </div>
              <form onSubmit={handleCreate} className={modalStyles.form}>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Title *</label>
                  <input className={modalStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Architecture Spec v1" autoFocus />
                </div>
                <div className={modalStyles.fieldRow}>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Category</label>
                    <select className={modalStyles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="spec">Specification</option>
                      <option value="design">Design Doc</option>
                      <option value="runbook">Runbook</option>
                      <option value="meeting">Meeting Notes</option>
                      <option value="attachment">Attachment / Link</option>
                    </select>
                  </div>
                  <div className={modalStyles.field}>
                    <label className={modalStyles.label}>Project (Optional)</label>
                    <select className={modalStyles.select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">Workspace-wide</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>External Link / Attachment URL (Optional)</label>
                  <input type="url" className={modalStyles.input} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>Content / Notes</label>
                  <textarea className={modalStyles.textarea} value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Write technical notes or documentation..." />
                </div>
                {formError && <span className={modalStyles.error}>{formError}</span>}
                <div className={modalStyles.actions}>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Document'}</Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Document"
          message={`Delete "${deleteTarget.title}" permanently?`}
          confirmLabel="Delete Document"
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

