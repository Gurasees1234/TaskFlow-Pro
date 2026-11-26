import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceContext } from './workspaceContextValue';
import { useAuth } from '../hooks/useAuth';
import { WORKSPACE_STORAGE_KEY } from '../services/apiClient';
import { workspaceService } from '../services/workspaceService';
import { projectService } from '../services/projectService';
import { notificationService } from '../services/notificationService';
import { backlogService } from '../services/backlogService';
import { getSocket, joinWorkspaceRoom } from '../services/socketService';

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    () => window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''
  );
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [backlogCount, setBacklogCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w._id === currentWorkspaceId) || workspaces[0] || null,
    [workspaces, currentWorkspaceId]
  );

  const activeRole = useMemo(() => {
    if (!currentWorkspace || !user) return 'developer';
    const uid = user.id || user._id;
    const found = currentWorkspace.members?.find(
      (m) => (m.user?._id || m.user)?.toString() === uid?.toString()
    );
    return found?.role || 'developer';
  }, [currentWorkspace, user]);

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
    if (!wsId || !isAuthenticated) return;
    try {
      const [projList, memberList, unread, backlog] = await Promise.all([
        projectService.list({ workspaceId: wsId }),
        workspaceService.getMembers(wsId),
        notificationService.getUnreadCount(),
        backlogService.getByWorkspace(wsId),
      ]);
      setProjects(projList);
      setMembers(memberList);
      setUnreadCount(unread);
      setBacklogCount(backlog.total ?? (backlog.issues?.length || 0));
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
    const activeId = currentWorkspace?._id;
    if (!activeId || !isAuthenticated) return;
    joinWorkspaceRoom(activeId);
    refreshWorkspaceMeta(activeId);
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

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      activeRole,
      projects,
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

