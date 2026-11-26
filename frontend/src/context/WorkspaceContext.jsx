import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceContext } from './workspaceContextValue';
import { useAuth } from '../hooks/useAuth';
import {
  PROJECT_STORAGE_KEY,
  RECENT_PROJECTS_KEY,
  WORKSPACE_STORAGE_KEY,
} from '../services/apiClient';
import { workspaceService } from '../services/workspaceService';
import { projectService } from '../services/projectService';
import { notificationService } from '../services/notificationService';
import { backlogService } from '../services/backlogService';
import { getSocket, joinProjectRoom } from '../services/socketService';

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    () => window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''
  );
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(
    () => window.localStorage.getItem(PROJECT_STORAGE_KEY) || ''
  );
  const [members, setMembers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [backlogCount, setBacklogCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w._id === currentWorkspaceId) || workspaces[0] || null,
    [workspaces, currentWorkspaceId]
  );

  const currentProject = useMemo(
    () => projects.find((project) => project._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const activeRole = useMemo(() => {
    if (!user) return 'developer';
    if (currentProject?.myRole) return currentProject.myRole;
    if (!currentWorkspace) return 'developer';
    const uid = user.id || user._id;
    const found = currentWorkspace.members?.find(
      (m) => (m.user?._id || m.user)?.toString() === uid?.toString()
    );
    return found?.role || 'developer';
  }, [currentWorkspace, currentProject, user]);

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setProjects([]);
      setMembers([]);
      setUnreadCount(0);
      setBacklogCount(0);
      return [];
    }
    setLoading(true);
    try {
      const list = await workspaceService.list();
      setWorkspaces(list);
      if (list.length > 0) {
        const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
        const validSaved = list.find((w) => w._id === saved);
        const chosenId = validSaved ? validSaved._id : list[0]._id;
        setCurrentWorkspaceId(chosenId);
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, chosenId);
      } else {
        setCurrentWorkspaceId('');
      }
      return list;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshWorkspaceMeta = useCallback(async (wsId) => {
    if (!isAuthenticated) return;
    try {
      const [projList, unread] = await Promise.all([
        projectService.list(),
        notificationService.getUnreadCount(),
      ]);
      setProjects(projList);
      setUnreadCount(unread);
      if (wsId) {
        const [memberList, backlog] = await Promise.all([
          workspaceService.getMembers(wsId),
          backlogService.getByWorkspace(wsId),
        ]);
        setMembers(memberList);
        setBacklogCount(backlog.total ?? (backlog.issues?.length || 0));
      } else {
        setMembers([]);
        setBacklogCount(0);
      }
    } catch {
      // ignore background refresh error
    }
  }, [isAuthenticated]);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const unread = await notificationService.getUnreadCount();
      setUnreadCount(unread);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
  if (!isAuthenticated) return;

  refreshWorkspaceMeta(currentWorkspace?._id);
}, [currentWorkspace?._id, isAuthenticated, refreshWorkspaceMeta]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotif = () => {
      setUnreadCount((c) => c + 1);
    };
    const handleWorkspaceChange = () => {
      if (currentWorkspace?._id) refreshWorkspaceMeta(currentWorkspace._id);
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('issue:created', handleWorkspaceChange);
    socket.on('issue:updated', handleWorkspaceChange);
    socket.on('issue:deleted', handleWorkspaceChange);
    socket.on('project:created', handleWorkspaceChange);
    socket.on('project:updated', handleWorkspaceChange);
    socket.on('project:deleted', handleWorkspaceChange);
    socket.on('sprint:updated', handleWorkspaceChange);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('issue:created', handleWorkspaceChange);
      socket.off('issue:updated', handleWorkspaceChange);
      socket.off('issue:deleted', handleWorkspaceChange);
      socket.off('project:created', handleWorkspaceChange);
      socket.off('project:updated', handleWorkspaceChange);
      socket.off('project:deleted', handleWorkspaceChange);
      socket.off('sprint:updated', handleWorkspaceChange);
    };
  }, [isAuthenticated, currentWorkspace?._id, refreshWorkspaceMeta]);

  const selectWorkspace = useCallback((wsId) => {
    setCurrentWorkspaceId(wsId);
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, wsId);
  }, []);

  const selectProject = useCallback((projectId) => {
    setCurrentProjectId(projectId || '');
    if (projectId) {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
      let recent = [];
      try {
        recent = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
      } catch {
        recent = [];
      }
      const nextRecent = [projectId, ...recent.filter((id) => id !== projectId)].slice(0, 8);
      window.localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(nextRecent));
      joinProjectRoom(projectId);
    } else {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      activeRole,
      projects,
      currentProject,
      currentProjectId,
      selectProject,
      members,
      unreadCount,
      setUnreadCount,
      backlogCount,
      loading,
      selectWorkspace,
      refreshWorkspaces,
      refreshWorkspaceMeta: () => refreshWorkspaceMeta(currentWorkspace?._id),
      refreshUnreadCount,
    }),
    [
      workspaces,
      currentWorkspace,
      activeRole,
      projects,
      currentProject,
      currentProjectId,
      selectProject,
      members,
      unreadCount,
      backlogCount,
      loading,
      selectWorkspace,
      refreshWorkspaces,
      refreshWorkspaceMeta,
      refreshUnreadCount,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

