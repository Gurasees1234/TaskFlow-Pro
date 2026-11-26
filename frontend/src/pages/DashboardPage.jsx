import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useDashboardData } from '../hooks/useDashboardData';
import { WelcomeSection } from '../components/dashboard/WelcomeSection';
import { ProjectOverview } from '../components/dashboard/ProjectOverview';
import { WeeklyProgressCard } from '../components/dashboard/WeeklyProgressCard';
import { ProjectProgress } from '../components/dashboard/ProjectProgress';
import { MonthGoalsCard } from '../components/dashboard/MonthGoalsCard';
import { MyWorkList } from '../components/dashboard/MyWorkList';
import { LastProjectsSection } from '../components/dashboard/LastProjectsSection';
import { ActiveSprint } from '../components/dashboard/ActiveSprint';
import { TeamActivity } from '../components/dashboard/TeamActivity';
import { QuickCreateProjectModal } from '../components/dashboard/QuickCreateProjectModal';
import { QuickCreateIssueModal } from '../components/dashboard/QuickCreateIssueModal';
import { LoadingState } from '../components/common/StateViews';
import styles from './DashboardPage.module.css';

export const DashboardPage = () => {
  const outletContext = useOutletContext() || {};
  const {
    searchQuery = '',
    activeTeamFilter = 'All',
    setActiveTeamFilter = () => {},
  } = outletContext;

  const {
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
    addProject,
    addIssue,
    toggleIssueStatus,
    togglePinIssue,
    deleteIssue,
    toggleGoal,
    addGoal,
    deleteGoal,
  } = useDashboardData();

  const [showProjModal, setShowProjModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [actionError, setActionError] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredIssues = issues.filter((issue) => {
    const matchesTeam = activeTeamFilter === 'All' || issue.team === activeTeamFilter;
    const matchesSearch =
      !normalizedQuery ||
      issue.title.toLowerCase().includes(normalizedQuery) ||
      (issue.displayKey || issue.id).toLowerCase().includes(normalizedQuery) ||
      issue.assignee.toLowerCase().includes(normalizedQuery);
    return matchesTeam && matchesSearch;
  });

  const filteredProjects = projects.filter((project) => {
    const matchesTeam = activeTeamFilter === 'All' || project.team === activeTeamFilter;
    const matchesSearch =
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      (project.description && project.description.toLowerCase().includes(normalizedQuery));
    return matchesTeam && matchesSearch;
  });

  const filteredGoals = goals.filter(
    (goal) => !normalizedQuery || goal.title.toLowerCase().includes(normalizedQuery)
  );

  if (loading && projects.length === 0 && issues.length === 0) {
    return <LoadingState label="Syncing workspace telemetry..." />;
  }

  return (
    <div id="section-dashboard" className={styles.dashboard}>
      {(error || actionError) && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            fontSize: 'var(--text-xs)',
          }}
        >
          {actionError || error}
        </div>
      )}

      {/* Top Section */}
      <WelcomeSection
        data={welcome}
        onCreateProject={() => setShowProjModal(true)}
        onCreateIssue={() => setShowIssueModal(true)}
        activeTeamFilter={activeTeamFilter}
        onClearTeamFilter={() => setActiveTeamFilter('All')}
      />

      {/* Row 1: Overall Information + Weekly Progress + Monthly Progress */}
      <div id="section-statistics" className={styles.topAsymmetricGrid}>
        <ProjectOverview projects={projects} issues={issues} totalCompletedAllTime={1} />
        <WeeklyProgressCard data={weeklyProgress} />
        <ProjectProgress progress={progress} />
      </div>

      {/* Row 2: Month Goals + Floating Tasks In Process */}
      <div id="section-tasks" className={styles.middleAsymmetricGrid}>
        <MonthGoalsCard
          goals={filteredGoals}
          onToggleGoal={toggleGoal}
          onAddGoal={addGoal}
          onDeleteGoal={deleteGoal}
        />
        <MyWorkList
          issues={filteredIssues}
          projects={projects}
          onCreateIssue={() => setShowIssueModal(true)}
          onToggleStatus={toggleIssueStatus}
          onTogglePin={togglePinIssue}
          onDeleteIssue={deleteIssue}
        />
      </div>

      {/* Row 3: Last Projects Dark Showcase */}
      <div id="section-documents">
        <LastProjectsSection projects={filteredProjects} />
      </div>

      {/* Row 4: Active Sprint & Team Activity Strip */}
      <div id="section-calendar" className={styles.bottomStripGrid}>
        <ActiveSprint sprint={sprint} />
        <TeamActivity activity={activity} />
      </div>

      <AnimatePresence>
        {showProjModal && (
          <QuickCreateProjectModal
            onClose={() => setShowProjModal(false)}
            onSubmit={async (proj) => {
              setActionError('');
              try {
                await addProject(proj);
                setShowProjModal(false);
              } catch (err) {
                setActionError(err.message);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIssueModal && (
          <QuickCreateIssueModal
            projects={projects}
            onClose={() => setShowIssueModal(false)}
            onSubmit={async (issue) => {
              setActionError('');
              try {
                await addIssue(issue);
                setShowIssueModal(false);
              } catch (err) {
                setActionError(err.message);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
