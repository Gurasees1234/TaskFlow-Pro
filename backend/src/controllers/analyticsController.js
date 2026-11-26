import { asyncHandler } from '../utils/asyncHandler.js';
import Issue from '../models/Issue.js';
import Sprint from '../models/Sprint.js';
import ProjectMember from '../models/ProjectMember.js';
import ActivityLog from '../models/ActivityLog.js';
import { requireProjectMember } from '../utils/projectAuth.js';

const buildSprintBurndown = (sprint, sprintIssues) => {
  if (!sprint || !sprintIssues || sprintIssues.length === 0) {
    return {
      hasSufficientData: false,
      sprintId: sprint?._id || null,
      sprintName: sprint?.name || null,
      series: [],
    };
  }

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const totalDays = Math.max(2, Math.min(31, Math.ceil((end - start) / 86400000) + 1));
  const totalPoints =
    sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 1), 0) || sprintIssues.length;

  const series = [];
  const today = new Date();

  for (let d = 0; d < totalDays; d++) {
    const dayDate = new Date(start.getTime() + d * 86400000);
    const ideal = Math.max(
      0,
      Math.round((totalPoints - (totalPoints / Math.max(1, totalDays - 1)) * d) * 10) / 10
    );

    let remaining = null;
    if (dayDate <= today || sprint.status === 'completed') {
      const doneByDay = sprintIssues
        .filter(
          (i) =>
            i.status === 'done' &&
            i.completedAt &&
            new Date(i.completedAt) <= new Date(dayDate.getTime() + 86399999)
        )
        .reduce((sum, i) => sum + (i.storyPoints || 1), 0);
      remaining = Math.max(0, totalPoints - doneByDay);
    }

    series.push({
      day: `D${d + 1}`,
      date: dayDate.toISOString().slice(5, 10),
      ideal,
      remaining,
    });
  }

  const completedIssues = sprintIssues.filter((i) => i.status === 'done').length;
  const completedPoints = sprintIssues
    .filter((i) => i.status === 'done')
    .reduce((sum, i) => sum + (i.storyPoints || 1), 0);

  return {
    hasSufficientData: true,
    sprintId: sprint._id,
    sprintName: sprint.name,
    goal: sprint.goal,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    totalIssues: sprintIssues.length,
    completedIssues,
    remainingIssues: sprintIssues.length - completedIssues,
    totalPoints,
    completedPoints,
    progressPct:
      sprintIssues.length > 0 ? Math.round((completedIssues / sprintIssues.length) * 100) : 0,
    series,
  };
};

export const getProjectAnalytics = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { sprintId, assigneeId, startDate, endDate } = req.query;

  const { project } = await requireProjectMember(projectId, req.user.id);

  const issueFilter = { project: project._id };
  if (sprintId === 'backlog') issueFilter.sprint = null;
  else if (sprintId) issueFilter.sprint = sprintId;
  if (assigneeId) issueFilter.assignee = assigneeId;
  if (startDate || endDate) {
    issueFilter.createdAt = {};
    if (startDate) issueFilter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const endObj = new Date(endDate);
      endObj.setHours(23, 59, 59, 999);
      issueFilter.createdAt.$lte = endObj;
    }
  }

  const [issues, allProjectIssues, sprints, memberships, recentActivity] = await Promise.all([
    Issue.find(issueFilter).populate('assignee', 'name email avatarUrl title'),
    Issue.find({ project: project._id }),
    Sprint.find({ project: project._id }).sort({ startDate: -1 }),
    ProjectMember.find({ project: project._id }).populate('user', 'name email avatarUrl title'),
    ActivityLog.find({ project: project._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('actor', 'name email avatarUrl')
      .populate('project', 'name key'),
  ]);

  const issuesByStatus = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    testing: 0,
    done: 0,
    blocked: 0,
  };
  const issuesByPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  const issuesByType = { task: 0, bug: 0, story: 0, epic: 0 };

  const now = new Date();
  let overdueIssues = 0;

  for (const iss of issues) {
    if (issuesByStatus[iss.status] !== undefined) issuesByStatus[iss.status] += 1;
    if (issuesByPriority[iss.priority] !== undefined) issuesByPriority[iss.priority] += 1;
    if (issuesByType[iss.type] !== undefined) issuesByType[iss.type] += 1;
    if (iss.status !== 'done' && iss.dueDate && new Date(iss.dueDate) < now) {
      overdueIssues += 1;
    }
  }

  const totalIssues = issues.length;
  const completedIssues = issuesByStatus.done;
  const pendingIssues = totalIssues - completedIssues;
  const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  const targetSprint = sprintId && sprintId !== 'backlog'
    ? sprints.find((s) => s._id.toString() === sprintId) || null
    : sprints.find((s) => s.status === 'active') ||
      sprints.find((s) => s.status === 'completed') ||
      null;

  const targetSprintIssues = targetSprint
    ? allProjectIssues.filter(
        (i) => i.sprint && i.sprint.toString() === targetSprint._id.toString()
      )
    : [];
  const burndown = buildSprintBurndown(targetSprint, targetSprintIssues);

  const sprintVelocity = sprints.map((s) => {
    const sIssues = allProjectIssues.filter(
      (i) => i.sprint && i.sprint.toString() === s._id.toString()
    );
    const done = sIssues.filter((i) => i.status === 'done');
    const plannedPoints = sIssues.reduce((acc, i) => acc + (i.storyPoints || 1), 0);
    const completedPoints = done.reduce((acc, i) => acc + (i.storyPoints || 1), 0);
    return {
      _id: s._id,
      name: s.name,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      totalIssues: sIssues.length,
      completedIssues: done.length,
      incompleteIssues: sIssues.length - done.length,
      plannedPoints,
      completedPoints,
      completionRate: sIssues.length > 0 ? Math.round((done.length / sIssues.length) * 100) : 0,
    };
  });

  const teamWorkload = memberships
    .filter((m) => m.user)
    .map((m) => {
      const uid = m.user._id.toString();
      const userIssues = issues.filter(
        (i) => (i.assignee?._id?.toString() || i.assignee?.toString()) === uid
      );
      const done = userIssues.filter((i) => i.status === 'done').length;
      return {
        userId: uid,
        name: m.user.name,
        email: m.user.email,
        title: m.user.title,
        role: m.role,
        assigned: userIssues.length,
        completed: done,
        inProgress: userIssues.length - done,
      };
    });

  // Last 7 days productivity series strictly from MongoDB timestamps
  const weeklyProgress = [];
  const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const nextD = new Date(d.getTime() + 86400000);
    const created = issues.filter(
      (i) => new Date(i.createdAt) >= d && new Date(i.createdAt) < nextD
    ).length;
    const completed = issues.filter(
      (i) => i.completedAt && new Date(i.completedAt) >= d && new Date(i.completedAt) < nextD
    ).length;
    weeklyProgress.push({
      day: DAY_SHORT[d.getDay()],
      label: DAY_LONG[d.getDay()],
      date: d.toISOString().slice(0, 10),
      completed,
      planned: created,
      highlight: offset === 0,
    });
  }

  res.json({
    success: true,
    projectId: project._id,
    projectName: project.name,
    projectKey: project.key,
    totalIssues,
    completedIssues,
    pendingIssues,
    overdueIssues,
    progressPct,
    backlogCount: allProjectIssues.filter((i) => !i.sprint).length,
    activeSprintsCount: sprints.filter((s) => s.status === 'active').length,
    memberCount: memberships.length,
    issuesByStatus,
    issuesByPriority,
    issuesByType,
    burndown,
    sprintVelocity,
    teamWorkload,
    weeklyProgress,
    recentActivity,
  });
});
