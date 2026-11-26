/**
 * Development-only seed script for TaskFlow Pro (Project-Centric).
 * Populates realistic users, multiple isolated projects, ProjectMember roles, sprints, issues, comments, goals, and documents.
 * Run manually via: node src/utils/seed.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Invitation from '../models/Invitation.js';
import Sprint from '../models/Sprint.js';
import Issue from '../models/Issue.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import DocumentItem from '../models/DocumentItem.js';
import Goal from '../models/Goal.js';

const seed = async () => {
  const dbRes = await connectDB();
  if (!dbRes.connected) {
    console.error('[seed] MongoDB is not connected. Set MONGO_URI in backend/.env first.');
    process.exit(1);
  }

  console.info('[seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    ProjectMember.deleteMany({}),
    Invitation.deleteMany({}),
    Sprint.deleteMany({}),
    Issue.deleteMany({}),
    Comment.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
    DocumentItem.deleteMany({}),
    Goal.deleteMany({}),
  ]);

  const [alex, sam, mia, elena] = await User.create([
    { name: 'Alex Mercer', email: 'alex@taskflow.pro', password: 'Password123!', title: 'Principal Architect' },
    { name: 'Sam Rivera', email: 'sam@taskflow.pro', password: 'Password123!', title: 'Engineering Manager' },
    { name: 'Mia Chen', email: 'mia@taskflow.pro', password: 'Password123!', title: 'Senior Developer' },
    { name: 'Elena Rostova', email: 'elena@taskflow.pro', password: 'Password123!', title: 'QA Engineer' },
  ]);

  const now = new Date();
  const [coreProj, designProj] = await Project.create([
    {
      name: 'Core Platform API',
      key: 'CP',
      description: 'Project-centric RBAC, Socket.IO collaboration bus & sprint velocity engine.',
      type: 'Software Development',
      team: 'Backend & Core',
      startDate: new Date(now.getTime() - 21 * 86400000),
      targetEndDate: new Date(now.getTime() + 45 * 86400000),
      priority: 'high',
      status: 'active',
      lead: alex._id,
      createdBy: alex._id,
      goals: ['Zero cross-project leakage', 'Real-time Kanban persistence'],
      tags: ['api', 'realtime', 'rbac'],
      issueCounter: 105,
    },
    {
      name: 'Design System 2.0',
      key: 'DS',
      description: 'Monochrome frosted-glass UI tokens and accessible responsive layouts.',
      type: 'Design',
      team: 'UI/UX',
      startDate: new Date(now.getTime() - 10 * 86400000),
      targetEndDate: new Date(now.getTime() + 30 * 86400000),
      priority: 'medium',
      status: 'active',
      lead: mia._id,
      createdBy: mia._id,
      goals: ['Ship dark & light glass themes', 'Pass WCAG contrast audits'],
      tags: ['design', 'css-modules'],
      issueCounter: 102,
    },
  ]);

  await ProjectMember.create([
    { project: coreProj._id, user: alex._id, role: 'project_lead', invitedBy: alex._id },
    { project: coreProj._id, user: sam._id, role: 'project_manager', invitedBy: alex._id },
    { project: coreProj._id, user: mia._id, role: 'developer', invitedBy: alex._id },
    { project: coreProj._id, user: elena._id, role: 'tester', invitedBy: alex._id },
    { project: designProj._id, user: mia._id, role: 'project_lead', invitedBy: mia._id },
    { project: designProj._id, user: alex._id, role: 'developer', invitedBy: mia._id },
  ]);

  const [sprint12, sprint13, designSprint] = await Sprint.create([
    {
      name: 'Sprint 12 — Q4 Velocity',
      startDate: new Date(now.getTime() - 5 * 86400000),
      endDate: new Date(now.getTime() + 9 * 86400000),
      goal: 'Stabilize project-scoped rooms & ship Kanban + Backlog workflows',
      project: coreProj._id,
      createdBy: sam._id,
      status: 'active',
    },
    {
      name: 'Sprint 13 — Enterprise Scale',
      startDate: new Date(now.getTime() + 10 * 86400000),
      endDate: new Date(now.getTime() + 24 * 86400000),
      goal: 'Attachments pipeline and burndown reporting',
      project: coreProj._id,
      createdBy: sam._id,
      status: 'planned',
    },
    {
      name: 'Design Iteration 1',
      startDate: new Date(now.getTime() - 4 * 86400000),
      endDate: new Date(now.getTime() + 10 * 86400000),
      goal: 'Refine adaptive glass tokens across pages',
      project: designProj._id,
      createdBy: mia._id,
      status: 'active',
    },
  ]);

  const issues = await Issue.create([
    {
      issueKey: 'CP-101',
      title: 'Enforce project-scoped Socket.IO membership checks',
      description: 'Verify ProjectMember before joining project rooms.',
      type: 'story',
      status: 'in_progress',
      priority: 'high',
      storyPoints: 5,
      estimatedEffort: 12,
      actualEffort: 6,
      assignee: sam._id,
      reporter: alex._id,
      project: coreProj._id,
      sprint: sprint12._id,
      order: 1,
      dueDate: new Date(now.getTime() + 4 * 86400000),
      labels: ['realtime', 'security'],
    },
    {
      issueKey: 'CP-102',
      title: 'Verify Kanban drag-and-drop status rollback on failure',
      description: 'QA validation for optimistic Kanban status updates.',
      type: 'task',
      status: 'testing',
      priority: 'high',
      storyPoints: 3,
      estimatedEffort: 6,
      actualEffort: 5,
      assignee: elena._id,
      reporter: sam._id,
      project: coreProj._id,
      sprint: sprint12._id,
      order: 2,
      dueDate: new Date(now.getTime() + 3 * 86400000),
      labels: ['qa', 'board'],
    },
    {
      issueKey: 'CP-103',
      title: 'Fix sprint velocity rollup divide-by-zero edge case',
      description: 'Guard empty sprint velocity calculation.',
      type: 'bug',
      status: 'done',
      priority: 'medium',
      storyPoints: 2,
      assignee: alex._id,
      reporter: elena._id,
      project: coreProj._id,
      sprint: sprint12._id,
      order: 3,
      dueDate: new Date(now.getTime() - 1 * 86400000),
      completedAt: new Date(now.getTime() - 1 * 86400000),
      labels: ['analytics'],
    },
    {
      issueKey: 'CP-104',
      title: 'Implement Gmail SMTP project invitation flow',
      description: 'Send cryptographically signed single-use invitation links.',
      type: 'task',
      status: 'in_review',
      priority: 'critical',
      storyPoints: 5,
      assignee: mia._id,
      reporter: alex._id,
      project: coreProj._id,
      sprint: sprint12._id,
      order: 4,
      dueDate: new Date(now.getTime() + 5 * 86400000),
      labels: ['invitations', 'email'],
    },
    {
      issueKey: 'CP-105',
      title: 'Build burndown insufficiency guard in Reports UI',
      description: 'Queued in backlog for Sprint 13.',
      type: 'epic',
      status: 'todo',
      priority: 'low',
      storyPoints: 8,
      assignee: alex._id,
      reporter: alex._id,
      project: coreProj._id,
      sprint: null,
      order: 0,
      dueDate: new Date(now.getTime() + 14 * 86400000),
      labels: ['backlog', 'reports'],
    },
    {
      issueKey: 'DS-101',
      title: 'Audit WCAG contrast ratios on frosted glass cards',
      description: 'Check both light and dark surface contrast.',
      type: 'story',
      status: 'in_progress',
      priority: 'medium',
      storyPoints: 3,
      assignee: mia._id,
      reporter: mia._id,
      project: designProj._id,
      sprint: designSprint._id,
      order: 1,
      dueDate: new Date(now.getTime() + 6 * 86400000),
      labels: ['design-system'],
    },
    {
      issueKey: 'DS-102',
      title: 'Polish mobile sidebar drawer transition on 375px viewports',
      description: 'Ensure zero horizontal overflow on mobile.',
      type: 'task',
      status: 'done',
      priority: 'low',
      storyPoints: 2,
      assignee: alex._id,
      reporter: mia._id,
      project: designProj._id,
      sprint: designSprint._id,
      order: 2,
      completedAt: new Date(now.getTime() - 1 * 86400000),
      labels: ['responsive'],
    },
  ]);

  sprint12.issues = issues.filter((i) => i.sprint?.toString() === sprint12._id.toString()).map((i) => i._id);
  designSprint.issues = issues.filter((i) => i.sprint?.toString() === designSprint._id.toString()).map((i) => i._id);
  await Promise.all([sprint12.save(), sprint13.save(), designSprint.save()]);

  const c1 = await Comment.create({
    body: '@Sam Socket.IO project room auth is ready for verification.',
    author: mia._id,
    issue: issues[0]._id,
    project: coreProj._id,
    mentions: [sam._id],
  });
  issues[0].comments.push(c1._id);
  await issues[0].save();

  await Goal.create([
    { title: 'Enforce ProjectMember RBAC across all routes', completed: true, project: coreProj._id, createdBy: alex._id },
    { title: 'Complete Sprint 12 delivery commitments', completed: false, project: coreProj._id, createdBy: alex._id },
    { title: 'Publish Glass Design Tokens v2', completed: false, project: designProj._id, createdBy: mia._id },
  ]);

  await DocumentItem.create([
    {
      title: 'Core Platform RBAC Matrix',
      category: 'spec',
      content: 'Roles: project_lead, project_manager, developer, tester, viewer.',
      project: coreProj._id,
      createdBy: alex._id,
    },
    {
      title: 'Monochrome Glass Style Guide',
      category: 'design',
      content: 'Use CSS tokens in tokens.css exclusively.',
      project: designProj._id,
      createdBy: mia._id,
    },
  ]);

  await ActivityLog.create([
    {
      actor: alex._id,
      project: coreProj._id,
      action: 'project.created',
      entity: 'Project',
      entityId: coreProj._id,
      entityTitle: `${coreProj.key} — ${coreProj.name}`,
    },
    {
      actor: sam._id,
      project: coreProj._id,
      action: 'sprint.started',
      entity: 'Sprint',
      entityId: sprint12._id,
      entityTitle: sprint12.name,
    },
    {
      actor: mia._id,
      project: designProj._id,
      action: 'project.created',
      entity: 'Project',
      entityId: designProj._id,
      entityTitle: `${designProj.key} — ${designProj.name}`,
    },
  ]);

  await Notification.create([
    {
      recipient: alex._id,
      actor: mia._id,
      project: coreProj._id,
      type: 'comment',
      message: `commented on ${issues[0].issueKey} "${issues[0].title}"`,
      entity: 'Issue',
      entityId: issues[0]._id,
      entityTitle: `${issues[0].issueKey} ${issues[0].title}`,
      read: false,
    },
    {
      recipient: sam._id,
      actor: mia._id,
      project: coreProj._id,
      type: 'mention',
      message: `mentioned you in ${issues[0].issueKey} "${issues[0].title}"`,
      entity: 'Issue',
      entityId: issues[0]._id,
      entityTitle: `${issues[0].issueKey} ${issues[0].title}`,
      read: false,
    },
  ]);

  console.info('[seed] Project-centric seed complete! Demo accounts (password: Password123!):');
  console.info('  Project Lead (CP):  alex@taskflow.pro');
  console.info('  Project Manager:    sam@taskflow.pro');
  console.info('  Developer (Lead DS):mia@taskflow.pro');
  console.info('  Tester / QA:        elena@taskflow.pro');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
