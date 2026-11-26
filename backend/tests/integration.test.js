// Comprehensive real-MongoDB integration test for TaskFlow Pro backend
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { initializeSockets } from '../src/sockets/index.js';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Project from '../src/models/Project.js';
import Sprint from '../src/models/Sprint.js';
import Issue from '../src/models/Issue.js';
import Comment from '../src/models/Comment.js';
import ActivityLog from '../src/models/ActivityLog.js';
import Notification from '../src/models/Notification.js';
import DocumentItem from '../src/models/DocumentItem.js';
import Goal from '../src/models/Goal.js';

const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
};

const run = async () => {
  const db = await connectDB();
  if (!db.connected) throw new Error(`MongoDB did not connect: ${db.error || db.status}`);

  // Clean test DB before run
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Project.deleteMany({}),
    Sprint.deleteMany({}),
    Issue.deleteMany({}),
    Comment.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
    DocumentItem.deleteMany({}),
    Goal.deleteMany({}),
  ]);

  const server = http.createServer(app);
  initializeSockets(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const req = async (method, path, body = null, token = null) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  try {
    // 1. Health
    const health = await req('GET', '/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Health check failed');
    assert(health.data.database.status === 'connected', 'MongoDB health not connected');

    // 2. Register Admin (Alice) & Developer (Bob) & Outsider (Eve)
    const regA = await req('POST', '/auth/register', {
      name: 'Alice Admin',
      email: 'alice@test.io',
      password: 'Password123!',
    });
    assert(regA.status === 201 && regA.data.token, 'Alice register failed');
    const tokenA = regA.data.token;
    const wsId = regA.data.defaultWorkspace._id;

    const regB = await req('POST', '/auth/register', {
      name: 'Bob Dev',
      email: 'bob@test.io',
      password: 'Password123!',
    });
    assert(regB.status === 201 && regB.data.token, 'Bob register failed');
    const tokenB = regB.data.token;
    const bobId = regB.data.user.id;

    const regE = await req('POST', '/auth/register', {
      name: 'Eve Outsider',
      email: 'eve@test.io',
      password: 'Password123!',
    });
    assert(regE.status === 201, 'Eve register failed');
    const tokenE = regE.data.token;

    // 3. Login + Profile + Change password
    const loginA = await req('POST', '/auth/login', { email: 'alice@test.io', password: 'Password123!' });
    assert(loginA.status === 200 && loginA.data.token, 'Alice login failed');

    const badLogin = await req('POST', '/auth/login', { email: 'alice@test.io', password: 'wrong' });
    assert(badLogin.status === 401, 'Bad login should return 401');

    const profA = await req('GET', '/auth/profile', null, tokenA);
    assert(profA.status === 200 && profA.data.user.email === 'alice@test.io', 'Profile failed');

    // 4. Workspace RBAC: Add Bob by email, verify Eve denied
    const addBob = await req('POST', `/workspaces/${wsId}/members`, { email: 'bob@test.io', role: 'developer' }, tokenA);
    assert(addBob.status === 201, `Add member failed: ${JSON.stringify(addBob.data)}`);

    const eveTry = await req('GET', `/workspaces/${wsId}`, null, tokenE);
    assert(eveTry.status === 403, 'Cross-workspace access by Eve must be 403');

    const bobTryRole = await req('PATCH', `/workspaces/${wsId}/members/${bobId}`, { role: 'admin' }, tokenB);
    assert(bobTryRole.status === 403, 'Non-admin Bob must not escalate own role');

    // 5. Project CRUD
    const createProj = await req('POST', '/projects', {
      name: 'Core Platform',
      description: 'Agile Engine',
      team: 'Development',
      workspaceId: wsId,
    }, tokenA);
    assert(createProj.status === 201, `Create project failed: ${JSON.stringify(createProj.data)}`);
    const projId = createProj.data.project._id;

    const listProj = await req('GET', `/projects?workspaceId=${wsId}`, null, tokenB);
    assert(listProj.status === 200 && listProj.data.projects.length === 1, 'List projects failed');

    const updProj = await req('PUT', `/projects/${projId}`, { name: 'Core Platform V2' }, tokenA);
    assert(updProj.status === 200 && updProj.data.project.name === 'Core Platform V2', 'Update project failed');

    const bobDelProj = await req('DELETE', `/projects/${projId}`, null, tokenB);
    assert(bobDelProj.status === 403, 'Developer Bob must not delete project');

    // 6. Issue CRUD + Filters + Assign + Status + Priority
    const iss1 = await req('POST', '/issues', {
      title: 'Implement Kanban drag',
      description: 'Persist board columns',
      type: 'story',
      priority: 'high',
      storyPoints: 5,
      assignee: bobId,
      projectId: projId,
    }, tokenA);
    assert(iss1.status === 201 && iss1.data.issue.issueKey, `Create issue failed: ${JSON.stringify(iss1.data)}`);
    const issId = iss1.data.issue._id;

    const statusRes = await req('PATCH', `/issues/${issId}/status`, { status: 'in_progress' }, tokenB);
    assert(statusRes.status === 200 && statusRes.data.issue.status === 'in_progress', 'Status change failed');

    const prioRes = await req('PATCH', `/issues/${issId}/priority`, { priority: 'critical' }, tokenB);
    assert(prioRes.status === 200 && prioRes.data.issue.priority === 'critical', 'Priority change failed');

    const searchRes = await req('GET', `/issues/search?q=Kanban&workspaceId=${wsId}`, null, tokenB);
    assert(searchRes.status === 200 && searchRes.data.issues.length === 1, 'Issue search failed');

    // 7. Backlog & Sprint flow
    const backlogRes = await req('GET', `/backlog/project/${projId}`, null, tokenB);
    assert(backlogRes.status === 200 && backlogRes.data.issues.length === 1, 'Backlog listing failed');

    const sprintRes = await req('POST', '/sprints', {
      name: 'Sprint 1',
      startDate: '2026-11-25',
      endDate: '2026-12-09',
      goal: 'Ship MVP',
      workspaceId: wsId,
      projectId: projId,
    }, tokenA);
    assert(sprintRes.status === 201, `Create sprint failed: ${JSON.stringify(sprintRes.data)}`);
    const sprintId = sprintRes.data.sprint._id;

    const moveRes = await req('POST', '/backlog/move', { issueId: issId, sprintId }, tokenA);
    assert(moveRes.status === 200 && moveRes.data.issue.sprint._id === sprintId, 'Move to sprint failed');

    const startSprintRes = await req('POST', `/sprints/${sprintId}/start`, {}, tokenA);
    assert(startSprintRes.status === 200 && startSprintRes.data.sprint.status === 'active', 'Start sprint failed');

    await req('PATCH', `/issues/${issId}/status`, { status: 'done' }, tokenB);
    const completeRes = await req('POST', `/sprints/${sprintId}/complete`, {}, tokenA);
    assert(completeRes.status === 200 && completeRes.data.summary.completedIssues === 1, 'Complete sprint failed');

    // 8. Comments + Mentions + Notifications + Activity
    const commRes = await req('POST', `/comments/issue/${issId}`, { body: 'Great work @Bob!' }, tokenA);
    assert(commRes.status === 201 && commRes.data.comment.mentions.includes(bobId), 'Comment mention failed');

    const bobEditFail = await req('PUT', `/comments/${commRes.data.comment._id}`, { body: 'hijack' }, tokenB);
    assert(bobEditFail.status === 403, 'Bob should not edit Alice comment');

    const bobNotifs = await req('GET', '/notifications', null, tokenB);
    assert(bobNotifs.status === 200 && bobNotifs.data.unreadCount >= 2, 'Bob notifications missing');

    const markAll = await req('PATCH', '/notifications/mark-all-read', {}, tokenB);
    assert(markAll.status === 200 && markAll.data.unreadCount === 0, 'Mark all read failed');

    const actRes = await req('GET', `/activity?workspaceId=${wsId}`, null, tokenA);
    assert(actRes.status === 200 && actRes.data.activities.length >= 4, 'Activity feed failed');

    // 9. Analytics + Documents + Goals
    const analytics = await req('GET', `/analytics/workspace/${wsId}`, null, tokenA);
    assert(analytics.status === 200 && analytics.data.totalIssues === 1 && analytics.data.completedIssues === 1, 'Analytics failed');

    const docRes = await req('POST', '/documents', {
      title: 'API Architecture',
      category: 'spec',
      content: 'Node + Express + MongoDB',
      workspaceId: wsId,
      projectId: projId,
    }, tokenA);
    assert(docRes.status === 201, 'Document create failed');

    const goalRes = await req('POST', '/goals', { title: 'Ship Sprint 1', workspaceId: wsId }, tokenA);
    assert(goalRes.status === 201, 'Goal create failed');

    console.log('ALL_INTEGRATION_TESTS_PASSED');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

