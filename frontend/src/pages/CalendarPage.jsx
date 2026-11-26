import { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { issueService } from '../services/issueService';
import { sprintService } from '../services/sprintService';
import { PageHeader } from '../components/common/PageHeader';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorState, LoadingState } from '../components/common/StateViews';
import { IssueDetailModal } from '../components/common/IssueDetailModal';
import pageStyles from './WorkspacePages.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const loadData = useCallback(async () => {
    if (!currentWorkspace?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [issRes, sprintList] = await Promise.all([
        issueService.listWorkspace({ workspaceId: currentWorkspace._id, limit: 250 }),
        sprintService.list({ workspaceId: currentWorkspace._id }),
      ]);
      setIssues(issRes.issues || []);
      setSprints(sprintList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Overview"
        title="Schedule & Calendar"
        subtitle="Track issue due dates and sprint delivery milestones across the month."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              icon={ChevronLeft}
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              Prev
            </Button>
            <Badge variant="outline" mono>{monthLabel}</Badge>
            <Button
              size="sm"
              variant="secondary"
              icon={ChevronRight}
              iconPosition="right"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              Next
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState label="Loading calendar schedule..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <GlassPanel padding="md">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '4px 6px',
                }}
              >
                {wd}
              </div>
            ))}

            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} style={{ minHeight: 96, opacity: 0.25 }} />;
              }
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayIssues = issues.filter((i) => i.dueDate && i.dueDate.slice(0, 10) === dateKey);
              const daySprints = sprints.filter(
                (s) =>
                  (s.startDate && s.startDate.slice(0, 10) === dateKey) ||
                  (s.endDate && s.endDate.slice(0, 10) === dateKey)
              );

              return (
                <div
                  key={dateKey}
                  style={{
                    minHeight: 100,
                    padding: 8,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {day}
                  </span>
                  {daySprints.map((s) => (
                    <div
                      key={s._id}
                      style={{
                        fontSize: 10,
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: 'var(--accent-solid)',
                        color: 'var(--accent-solid-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CalendarIcon size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      {s.name}
                    </div>
                  ))}
                  {dayIssues.map((iss) => (
                    <button
                      key={iss._id}
                      type="button"
                      onClick={() => setSelectedIssueId(iss._id)}
                      style={{
                        fontSize: 10,
                        padding: '3px 6px',
                        borderRadius: 4,
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={iss.title}
                    >
                      <strong>{iss.issueKey}</strong> {iss.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          sprints={sprints}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  );
};

