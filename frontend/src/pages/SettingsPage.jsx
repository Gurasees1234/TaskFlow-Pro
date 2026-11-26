import { useEffect, useState } from 'react';
import { Bell, Building2, Lock, Palette, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTheme } from '../hooks/useTheme';
import { authService } from '../services/authService';
import { workspaceService } from '../services/workspaceService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import modalStyles from '../components/dashboard/ModalOverlay.module.css';
import pageStyles from './WorkspacePages.module.css';

export const SettingsPage = () => {
  const { user, setUser, logout } = useAuth();
  const { currentWorkspace, activeRole, refreshWorkspaces } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = activeRole === 'admin';

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState(user?.title || '');

  // Notification preferences
  const [prefs, setPrefs] = useState({
    assignments: true,
    mentions: true,
    comments: true,
    statusChanges: true,
    sprintEvents: true,
    invitations: true,
    ...(user?.notificationPreferences || {}),
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Workspace state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '');
  const [wsDesc, setWsDesc] = useState(currentWorkspace?.description || '');

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setTitle(user.title || '');
      setPrefs((prev) => ({ ...prev, ...(user.notificationPreferences || {}) }));
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name || '');
      setWsDesc(currentWorkspace.description || '');
    }
  }, [currentWorkspace]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const updated = await authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        notificationPreferences: prefs,
      });
      setUser(updated);
      setStatusMsg('Profile & notification preferences updated.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMsg('Password updated successfully.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!currentWorkspace?._id) return;
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workspaceService.update(currentWorkspace._id, {
        name: wsName.trim(),
        description: wsDesc.trim(),
      });
      await refreshWorkspaces();
      setStatusMsg('Workspace settings updated.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Manage"
        title="Settings"
        subtitle="Manage your personal profile, security credentials, workspace configuration, and appearance."
      />

      {errorMsg && <div className={pageStyles.bannerError}>{errorMsg}</div>}
      {statusMsg && <div className={pageStyles.bannerSuccess}>{statusMsg}</div>}

      <div className={pageStyles.grid2}>
        {/* Profile */}
        <GlassPanel padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <User size={16} />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Profile Settings</h2>
          </div>
          <form onSubmit={handleSaveProfile} className={modalStyles.form}>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Full Name</label>
              <input className={modalStyles.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Email Address</label>
              <input type="email" className={modalStyles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Job Title</label>
              <input className={modalStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={modalStyles.actions}>
              <Button type="submit" variant="primary" disabled={saving}>
                Save Profile
              </Button>
            </div>
          </form>
        </GlassPanel>

        {/* Change Password */}
        <GlassPanel padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Lock size={16} />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className={modalStyles.form}>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Current Password</label>
              <input
                type="password"
                className={modalStyles.input}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>New Password</label>
              <input
                type="password"
                className={modalStyles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Confirm New Password</label>
              <input
                type="password"
                className={modalStyles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className={modalStyles.actions}>
              <Button type="submit" variant="secondary" disabled={saving}>
                Update Password
              </Button>
            </div>
          </form>
        </GlassPanel>

        {/* Workspace Settings */}
        <GlassPanel padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} />
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Workspace Settings</h2>
            </div>
            <Badge variant="outline" mono>{activeRole.replace('_', ' ')}</Badge>
          </div>
          <form onSubmit={handleSaveWorkspace} className={modalStyles.form}>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Workspace Name</label>
              <input
                className={modalStyles.input}
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className={modalStyles.field}>
              <label className={modalStyles.label}>Description</label>
              <textarea
                className={modalStyles.textarea}
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            {!isAdmin && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Only workspace admins can modify workspace configuration.
              </span>
            )}
            <div className={modalStyles.actions}>
              <Button type="submit" variant="primary" disabled={!isAdmin || saving}>
                Save Workspace
              </Button>
            </div>
          </form>
        </GlassPanel>

        {/* Preferences & Account Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GlassPanel padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Bell size={16} />
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Notification Preferences</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['assignments', 'Task assignments'],
                ['mentions', '@Mentions'],
                ['comments', 'Issue comments'],
                ['statusChanges', 'Status transitions'],
                ['sprintEvents', 'Sprint milestones'],
                ['invitations', 'Workspace invites'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[key])}
                    onChange={(e) => setPrefs((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className={modalStyles.actions} style={{ marginTop: 12 }}>
              <Button size="sm" variant="secondary" onClick={handleSaveProfile} disabled={saving}>
                Save Preferences
              </Button>
            </div>
          </GlassPanel>

          <GlassPanel padding="md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={16} />
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Theme & Security</h2>
              </div>
              <Badge variant="neutral" mono>{theme.toUpperCase()} GLASS</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <ShieldCheck size={14} /> JWT session active for {user?.email}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </Button>
                <Button size="sm" variant="ghost" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

