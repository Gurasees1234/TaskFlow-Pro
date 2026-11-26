let ioInstance = null;

export const registerIo = (io) => {
  ioInstance = io;
};

export const emitToProject = (projectId, event, payload) => {
  if (!ioInstance || !projectId) return;
  ioInstance.to(`project:${projectId.toString()}`).emit(event, payload);
};

export const emitToWorkspace = (workspaceId, event, payload) => {
  if (!ioInstance || !workspaceId) return;
  ioInstance.to(`workspace:${workspaceId.toString()}`).emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId.toString()}`).emit(event, payload);
};
