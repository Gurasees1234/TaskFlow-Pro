import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { analyticsService } from '../services/analyticsService';
import { projectService } from '../services/projectService';
import { issueService } from '../services/issueService';
import { sprintService } from '../services/sprintService';
import { goalService } from '../services/goalService';
import { getSocket } from '../services/socketService';

const STATUS_DISPLAY = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Progress',
  done: 'Done',
};

const PRIORITY_DISPLAY = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'High',
};

const ICON_FOR_TYPE = {
  task: 'layers',
  bug: 'code',
  story: 'sparkles',
  epic: 'megaphone',
};

const getInitials = (name = 'U') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const formatRelative = (dateStr) => {
  if (!dateStr) return 'Just now';
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const mapActivityType = (action = '') => {
  if (action.includes('assigned')) return 'task_assigned';
  if (action.includes('status')) return 'status_changed';
  if (action.includes('comment')) return 'comment_added';
  if (action.includes('sprint') || action.includes('project')) return 'sprint_updated';
  return 'issue_created';
};

export const useDashboardData = () => {
  const { user } = useAuth();
  const { currentWorkspace, currentProject, activeRole, refreshWorkspaceMeta } = useWorkspace();

  const [rawProjects, setRawProjects] = useState([]);
  const [rawIssues, setRawIssues] = useState([]);
  const [rawSprints, setRawSprints] = useState([]);
  const [rawGoals, setRawGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('taskflow-pinned-issues') || '[]');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    const projectId = currentProject?._id;
    if (projectId) {
      setLoading(true);
      setError('');
      try {
        const [project, issueRes, sprintList, goalList, analyticsRes] = await Promise.all([
          projectService.getById(projectId),
          issueService.listByProject(projectId, { limit: 100 }),
          sprintService.listByProject(projectId),
          goalService.list({ projectId }),
          analyticsService.getProject(projectId),
        ]);
        setRawProjects([project]);
        setRawIssues(issueRes.issues || []);
        setRawSprints(sprintList);
        setRawGoals(goalList);
        setAnalytics(analyticsRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    const wsId = currentWorkspace?._id;
    if (!wsId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [projList, issueRes, sprintList, goalList, analyticsRes] = await Promise.all([
        projectService.list({ workspaceId: wsId }),
        issueService.listWorkspace({ workspaceId: wsId, limit: 100 }),
        sprintService.list({ workspaceId: wsId }),
        goalService.list({ workspaceId: wsId }),
        analyticsService.getWorkspace(wsId),
      ]);
      setRawProjects(projList);
      setRawIssues(issueRes.issues || []);
      setRawSprints(sprintList);
      setRawGoals(goalList);
      setAnalytics(analyticsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, currentProject?._id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onRefresh = () => loadDashboard();
    socket.on('issue:created', onRefresh);
    socket.on('issue:updated', onRefresh);
    socket.on('issue:deleted', onRefresh);
    socket.on('project:created', onRefresh);
    socket.on('project:updated', onRefresh);
    socket.on('sprint:updated', onRefresh);
    socket.on('activity:new', onRefresh);
    return () => {
      socket.off('issue:created', onRefresh);
      socket.off('issue:updated', onRefresh);
      socket.off('issue:deleted', onRefresh);
      socket.off('project:created', onRefresh);
      socket.off('project:updated', onRefresh);
      socket.off('sprint:updated', onRefresh);
      socket.off('activity:new', onRefresh);
    };
  }, [loadDashboard]);

  const welcome = useMemo(
    () => ({
      user: user?.name?.split(' ')[0] || 'Member',
      role: user?.title || activeRole.replace('_', ' '),
      workspace: currentWorkspace?.name || 'TaskFlow Pro',
      date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }),
    [user, activeRole, currentWorkspace?.name]
  );

  const projects = useMemo(
    () =>
      rawProjects.map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description || 'Workspace project',
        active: p.status === 'active',
        status: p.status === 'completed' ? 'Completed' : 'In Progress',
        progress: p.progress ?? 0,
        team: p.team || 'Development',
        members: (p.members || []).slice(0, 4).map((m) => getInitials(m.name || 'M')),
        recentActivity: `${p.completedCount || 0}/${p.issueCount || 0} issues completed`,
      })),
    [rawProjects]
  );

  const issues = useMemo(
    () =>
      rawIssues.map((i) => ({
        id: i._id,
        displayKey: i.issueKey || i._id.slice(-5).toUpperCase(),
        title: i.title,
        projectId: i.project?._id || i.project,
        priority: PRIORITY_DISPLAY[i.priority] || 'Medium',
        status: STATUS_DISPLAY[i.status] || 'Todo',
        rawStatus: i.status,
        progress: i.status === 'done' ? 100 : i.status === 'in_review' ? 80 : i.status === 'in_progress' ? 50 : 15,
        due: i.dueDate ? i.dueDate.slice(0, 10) : 'No due date',
        assignee: i.assignee?.name || 'Unassigned',
        team: i.project?.team || 'Development',
        iconType: ICON_FOR_TYPE[i.type] || 'layers',
        pinned: pinnedIds.includes(i._id),
      })),
    [rawIssues, pinnedIds]
  );

  const goals = useMemo(
    () => rawGoals.map((g) => ({ id: g._id, title: g.title, completed: g.completed })),
    [rawGoals]
  );

  const activity = useMemo(() => {
    const acts = analytics?.recentActivity || [];
    return acts.map((a) => ({
      id: a._id,
      type: mapActivityType(a.action),
      user: a.actor?.name || 'Member',
      detail: `${a.action.replace('.', ' ')} — ${a.entityTitle || a.project?.name || ''}`,
      time: formatRelative(a.createdAt),
    }));
  }, [analytics]);

  const sprint = useMemo(() => {
    const active = rawSprints.find((s) => s.status === 'active') || rawSprints[0];
    if (!active) {
      return {
        name: 'No Active Sprint',
        goal: 'Create or start a sprint from Active Sprints to track velocity.',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 14 * 86400000).toISOString(),
        completedPoints: 0,
        remainingPoints: 0,
      };
    }
    const m = active.metrics || {};
    return {
      name: active.name,
      goal: active.goal || 'Deliver sprint commitment',
      start: active.startDate,
      end: active.endDate,
      completedPoints: m.completedPoints || 0,
      remainingPoints: Math.max(0, (m.totalPoints || 0) - (m.completedPoints || 0)),
    };
  }, [rawSprints]);

  const weeklyProgress = useMemo(() => {
    if (analytics?.weeklyProgress?.length) return analytics.weeklyProgress;
    return [
      { day: 'M', label: 'Monday', completed: 0, planned: 0 },
      { day: 'T', label: 'Tuesday', completed: 0, planned: 0 },
      { day: 'W', label: 'Wednesday', completed: 0, planned: 0 },
      { day: 'T ', label: 'Thursday', completed: 0, planned: 0 },
      { day: 'F', label: 'Friday', completed: 0, planned: 0 },
      { day: 'S', label: 'Saturday', completed: 0, planned: 0 },
      { day: 'S ', label: 'Sunday', completed: 0, planned: 0 },
    ];
  }, [analytics]);

  const progress = useMemo(() => {
    const completedGoals = goals.filter((g) => g.completed).length;
    const completedIssues = analytics?.completedIssues || 0;
    const totalIssues = analytics?.totalIssues || 0;
    const total = totalIssues + goals.length;
    const completed = completedIssues + completedGoals;

    const breakdown = (analytics?.projectProgress || []).slice(0, 3).map((p) => ({
      name: p.name,
      pct: p.progressPct,
      count: p.total,
    }));

    return {
      completed,
      total,
      deltaLabel: `${analytics?.activeProjects || 0} active projects in workspace`,
      breakdown,
    };
  }, [analytics, goals]);

  const addProject = useCallback(
    async (proj) => {
      if (!currentWorkspace?._id) return;
      await projectService.create({
        name: proj.name,
        description: proj.description,
        team: proj.team,
        workspaceId: currentWorkspace._id,
      });
      await Promise.all([loadDashboard(), refreshWorkspaceMeta()]);
    },
    [currentWorkspace?._id, loadDashboard, refreshWorkspaceMeta]
  );

  const addIssue = useCallback(
    async (issue) => {
      const priorityMap = { High: 'high', Medium: 'medium', Low: 'low' };
      const assigneeMember = currentWorkspace?.members?.find(
        (m) => m.user?.name?.toLowerCase().includes((issue.assignee || '').toLowerCase())
      );
      await issueService.create({
        title: issue.title,
        projectId: issue.projectId,
        priority: priorityMap[issue.priority] || 'medium',
        status: 'in_progress',
        dueDate: issue.due,
        assignee: assigneeMember?.user?._id || undefined,
      });
      await Promise.all([loadDashboard(), refreshWorkspaceMeta()]);
    },
    [currentWorkspace, loadDashboard, refreshWorkspaceMeta]
  );

  const toggleIssueStatus = useCallback(
    async (issueId) => {
      const target = rawIssues.find((i) => i._id === issueId);
      if (!target) return;
      const next =
        target.status === 'todo'
          ? 'in_progress'
          : target.status === 'in_progress'
            ? 'done'
            : 'todo';
      await issueService.changeStatus(issueId, next);
      await Promise.all([loadDashboard(), refreshWorkspaceMeta()]);
    },
    [rawIssues, loadDashboard, refreshWorkspaceMeta]
  );

  const togglePinIssue = useCallback((issueId) => {
    setPinnedIds((prev) => {
      const next = prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [issueId, ...prev];
      window.localStorage.setItem('taskflow-pinned-issues', JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteIssue = useCallback(
    async (issueId) => {
      await issueService.remove(issueId);
      await Promise.all([loadDashboard(), refreshWorkspaceMeta()]);
    },
    [loadDashboard, refreshWorkspaceMeta]
  );

  const toggleGoal = useCallback(
    async (goalId) => {
      await goalService.toggle(goalId);
      await loadDashboard();
    },
    [loadDashboard]
  );

  const addGoal = useCallback(
    async (title) => {
      if (!currentWorkspace?._id) return;
      await goalService.create({ title, workspaceId: currentWorkspace._id });
      await loadDashboard();
    },
    [currentWorkspace?._id, loadDashboard]
  );

  const deleteGoal = useCallback(
    async (goalId) => {
      await goalService.remove(goalId);
      await loadDashboard();
    },
    [loadDashboard]
  );

  return {
    welcome,
    projects,
    issues,
    sprint,
    activity,
    progress,
    weeklyProgress,
    goals,
    loading,
    error,
    reload: loadDashboard,
    addProject,
    addIssue,
    toggleIssueStatus,
    togglePinIssue,
    deleteIssue,
    toggleGoal,
    addGoal,
    deleteGoal,
  };
};
