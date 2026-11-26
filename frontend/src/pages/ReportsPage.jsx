import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Briefcase, CheckCircle2, Clock, Layers } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { analyticsService } from '../services/analyticsService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import pageStyles from './WorkspacePages.module.css';

export const ReportsPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await analyticsService.getWorkspace(currentWorkspace._id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className={pageStyles.page}>
        <PageHeader eyebrow="Workspace" title="Reports & Analytics" />
        <LoadingState label="Aggregating MongoDB analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageStyles.page}>
        <PageHeader eyebrow="Workspace" title="Reports & Analytics" />
        <ErrorState message={error} onRetry={loadAnalytics} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={pageStyles.page}>
        <PageHeader eyebrow="Workspace" title="Reports & Analytics" />
        <EmptyState icon={BarChart3} title="No workspace selected" description="Select or create a workspace to view reports." />
      </div>
    );
  }

  const statusChartData = [
    { name: 'To Do', count: data.issuesByStatus?.todo || 0 },
    { name: 'In Progress', count: data.issuesByStatus?.in_progress || 0 },
    { name: 'In Review', count: data.issuesByStatus?.in_review || 0 },
    { name: 'Done', count: data.issuesByStatus?.done || 0 },
  ];

  const priorityChartData = [
    { name: 'Low', count: data.issuesByPriority?.low || 0 },
    { name: 'Medium', count: data.issuesByPriority?.medium || 0 },
    { name: 'High', count: data.issuesByPriority?.high || 0 },
    { name: 'Critical', count: data.issuesByPriority?.critical || 0 },
  ];

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Reports & Analytics"
        subtitle="Real-time metrics aggregated directly from MongoDB projects, sprints, and issues."
      />

      {/* KPI Strip */}
      <div className={pageStyles.kpiGrid4}>
        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}><Layers size={18} /></div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Total Issues</span>
            <span className={pageStyles.kpiValue}>{data.totalIssues}</span>
          </div>
        </GlassPanel>
        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}><CheckCircle2 size={18} /></div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Completed Issues</span>
            <span className={pageStyles.kpiValue}>{data.completedIssues}</span>
          </div>
        </GlassPanel>
        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}><Clock size={18} /></div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Pending Issues</span>
            <span className={pageStyles.kpiValue}>{data.pendingIssues}</span>
          </div>
        </GlassPanel>
        <GlassPanel padding="md" className={pageStyles.kpiCard}>
          <div className={pageStyles.kpiIconBox}><Briefcase size={18} /></div>
          <div className={pageStyles.kpiMeta}>
            <span className={pageStyles.kpiLabel}>Active Projects</span>
            <span className={pageStyles.kpiValue}>{data.activeProjects}</span>
          </div>
        </GlassPanel>
      </div>

      {/* Charts Row 1 */}
      <div className={pageStyles.grid2}>
        <GlassPanel padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Sprint Burndown</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {data.burndown ? `${data.burndown.sprintName} (${data.burndown.progressPct}% done)` : 'No sprint data yet'}
              </p>
            </div>
            {data.burndown && (
              <Badge variant="outline" mono>
                {data.burndown.completedPoints}/{data.burndown.totalPoints} pts
              </Badge>
            )}
          </div>
          <div style={{ width: '100%', height: 240 }}>
            {data.burndown?.series?.length ? (
              <ResponsiveContainer>
                <AreaChart data={data.burndown.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface-1)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="ideal" stroke="var(--text-muted)" fill="var(--bg-surface-2)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="remaining" stroke="var(--text-primary)" fill="var(--border-default)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 80, textAlign: 'center' }}>
                Create and start a sprint to view burndown trajectory.
              </p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel padding="md">
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Weekly Productivity</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Issues created vs completed over last 7 days</p>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data.weeklyProgress || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="planned" name="Created" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="var(--text-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      {/* Charts Row 2 */}
      <div className={pageStyles.grid2}>
        <GlassPanel padding="md">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 12 }}>Issues by Status</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--text-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel padding="md">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 12 }}>Issues by Priority</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--text-secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      {/* Team Workload & Project Progress */}
      <div className={pageStyles.grid2}>
        <GlassPanel padding="md">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 12 }}>Project Progress</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data.projectProgress || []).length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No projects yet.</span>
            ) : (
              data.projectProgress.map((p) => (
                <div key={p._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <strong>{p.name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{p.completed}/{p.total} ({p.progressPct}%)</span>
                  </div>
                  <div className={pageStyles.progressTrack}>
                    <div className={pageStyles.progressFill} style={{ width: `${p.progressPct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel padding="md">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 12 }}>Team Workload & Sprints</h2>
          <div className={pageStyles.tableWrap}>
            <table className={pageStyles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {(data.teamWorkload || []).map((w) => (
                  <tr key={w.userId}>
                    <td><strong>{w.name}</strong></td>
                    <td>{w.assigned}</td>
                    <td>{w.completed}</td>
                    <td>{w.inProgress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

