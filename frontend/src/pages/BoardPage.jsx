import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Columns3, Plus, Search } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { issueService } from '../services/issueService';
import { sprintService } from '../services/sprintService';
import { getSocket } from '../services/socketService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, LoadingState } from '../components/common/StateViews';
import { CreateIssueModal } from '../components/common/CreateIssueModal';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';
import boardStyles from './BoardPage.module.css';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const DraggableIssueCard = ({ issue, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue._id,
    data: { issue },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(issue._id)}
      className={`${boardStyles.card} ${isDragging ? boardStyles.cardDragging : ''}`}
    >
      <div className={boardStyles.cardTop}>
        <span className={boardStyles.issueKey}>{issue.issueKey || 'ISS'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Badge variant="outline" mono>{issue.type}</Badge>
          <Badge variant={issue.priority === 'critical' || issue.priority === 'high' ? 'contrast' : 'neutral'} mono>
            {issue.priority}
          </Badge>
        </div>
      </div>
      <div className={boardStyles.cardTitle}>{issue.title}</div>
      <div className={boardStyles.cardFoot}>
        <span>{issue.project?.name || ''}</span>
        <span>{issue.assignee?.name || 'Unassigned'}</span>
      </div>
    </div>
  );
};

const BoardColumn = ({ col, issues, onSelectIssue, onQuickAdd }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div ref={setNodeRef} className={`${boardStyles.column} ${isOver ? boardStyles.columnOver : ''}`}>
      <div className={boardStyles.columnHead}>
        <span className={boardStyles.columnTitle}>{col.label}</span>
        <span className={boardStyles.countPill}>{issues.length}</span>
      </div>

      <div className={boardStyles.cardsList}>
        {issues.map((iss) => (
          <DraggableIssueCard key={iss._id} issue={iss} onSelect={onSelectIssue} />
        ))}
      </div>

      <button type="button" className={boardStyles.colAddBtn} onClick={() => onQuickAdd(col.id)}>
        <Plus size={13} /> Add issue
      </button>
    </div>
  );
};

export const BoardPage = () => {
  const { currentWorkspace, currentProject, projects, members, refreshWorkspaceMeta } = useWorkspace();
  const { projectId: routeProjectId } = useParams();
  const { searchQuery = '' } = useOutletContext() || {};
  const [searchParams] = useSearchParams();

  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [projectFilter, setProjectFilter] = useState(routeProjectId || searchParams.get('projectId') || currentProject?._id || '');
  const [sprintFilter, setSprintFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  // Modals
  const [createStatus, setCreateStatus] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadBoard = useCallback(async () => {
    if (!projectFilter && !currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [issueRes, sprintList] = await Promise.all([
        projectFilter
          ? issueService.listByProject(projectFilter, {
              sprintId: sprintFilter || undefined,
              limit: 200,
            })
          : issueService.listWorkspace({
              workspaceId: currentWorkspace._id,
              limit: 200,
            }),
        projectFilter
          ? sprintService.listByProject(projectFilter)
          : sprintService.list({ workspaceId: currentWorkspace._id }),
      ]);
      setIssues(issueRes.issues || []);
      setSprints(sprintList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, projectFilter, sprintFilter]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onSync = () => loadBoard();
    socket.on('issue:created', onSync);
    socket.on('issue:updated', onSync);
    socket.on('issue:deleted', onSync);
    return () => {
      socket.off('issue:created', onSync);
      socket.off('issue:updated', onSync);
      socket.off('issue:deleted', onSync);
    };
  }, [loadBoard]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    const draggedId = active.id;
    const targetStatus = over.id;
    if (!COLUMNS.some((c) => c.id === targetStatus)) return;

    const currentIssue = issues.find((i) => i._id === draggedId);
    if (!currentIssue || currentIssue.status === targetStatus) return;

    const previousIssues = issues;
    // Optimistic UI update
    setIssues((prev) =>
      prev.map((item) => (item._id === draggedId ? { ...item, status: targetStatus } : item))
    );

    try {
      await issueService.changeStatus(draggedId, targetStatus);
      refreshWorkspaceMeta();
    } catch (err) {
      setIssues(previousIssues);
      setError(err.message);
    }
  };

  const q = (localSearch || searchQuery).trim().toLowerCase();
  const visibleIssues = issues.filter((iss) => {
    if (assigneeFilter && (iss.assignee?._id || '') !== assigneeFilter) return false;
    if (priorityFilter && iss.priority !== priorityFilter) return false;
    if (typeFilter && iss.type !== typeFilter) return false;
    if (
      q &&
      !iss.title.toLowerCase().includes(q) &&
      !(iss.issueKey && iss.issueKey.toLowerCase().includes(q))
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Kanban Board"
        subtitle="Drag issues across workflow stages. Status updates persist immediately."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setCreateStatus('todo')}
            disabled={projects.length === 0}
          >
            Create Issue
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
                placeholder="Search board..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

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

            <select
              className={pageStyles.select}
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
            >
              <option value="">All Sprints</option>
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
              ))}
            </select>

            <select
              className={pageStyles.select}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">All Assignees</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
              ))}
            </select>

            <select
              className={pageStyles.select}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              className={pageStyles.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </div>
        </div>
      </GlassPanel>

      {error && <div className={pageStyles.bannerError}>{error}</div>}

      {loading ? (
        <LoadingState label="Loading Kanban board..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Columns3}
          title="No projects available"
          description="Create a project first before tracking issues on the Kanban board."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className={boardStyles.boardGrid}>
            {COLUMNS.map((col) => (
              <BoardColumn
                key={col.id}
                col={col}
                issues={visibleIssues.filter((i) => i.status === col.id)}
                onSelectIssue={(id) => setSelectedIssueId(id)}
                onQuickAdd={(status) => setCreateStatus(status)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {createStatus && (
        <CreateIssueModal
          defaultProjectId={projectFilter || projects[0]?._id}
          defaultStatus={createStatus}
          defaultSprintId={sprintFilter}
          sprints={sprints}
          onClose={() => setCreateStatus(null)}
          onCreated={() => {
            loadBoard();
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
            loadBoard();
            refreshWorkspaceMeta();
          }}
          onDeleted={() => {
            loadBoard();
            refreshWorkspaceMeta();
          }}
        />
      )}
    </div>
  );
};
