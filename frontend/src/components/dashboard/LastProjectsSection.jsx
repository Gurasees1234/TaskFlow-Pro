import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import styles from './LastProjectsSection.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

export const LastProjectsSection = ({ projects }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [sortByProgress, setSortByProgress] = useState(false);

  const displayedProjects = sortByProgress
    ? [...projects].sort((a, b) => (b.progress || 0) - (a.progress || 0))
    : projects;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Last Projects</h2>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => setSortByProgress((prev) => !prev)}
            className={cn(styles.sortBtn, sortByProgress && styles.controlActive)}
            title="Sort by completion progress"
          >
            <span>{sortByProgress ? 'Sort by progress' : 'Sort by recent'}</span>
            <ArrowUpDown size={12} />
          </button>

          <div className={styles.viewGroup}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive)}
              aria-label="Grid view"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(styles.viewBtn, viewMode === 'list' && styles.viewBtnActive)}
              aria-label="List view"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className={cn(styles.grid, viewMode === 'list' && styles.listMode)}>
        {displayedProjects.map((project) => {
          const pct = typeof project.progress === 'number' ? project.progress : 50;
          const dashOffset = circumference - (pct / 100) * circumference;
          const statusLabel = project.status || (project.active ? 'In Progress' : 'Completed');
          const members = project.members || ['AL', 'SM'];

          return (
            <motion.article
              key={project.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -3 }}
              className={cn(styles.projectCard, viewMode === 'list' && styles.projectCardList)}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTitleBlock}>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  <div className={styles.statusRow}>
                    <span className={styles.statusDot} />
                    <span className={styles.statusText}>{statusLabel}</span>
                    {project.team && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span className={styles.teamTag}>{project.team}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.ringWrap} title={`${pct}% complete`}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <span className={styles.ringNum}>{pct}</span>
                </div>
              </div>

              <p className={styles.activityText}>
                {project.recentActivity || project.description}
              </p>

              <div className={styles.cardFoot}>
                <div className={styles.avatarStack}>
                  {members.map((initials, idx) => (
                    <span key={`${project.id}-${initials}-${idx}`} className={styles.memberChip}>
                      {initials}
                    </span>
                  ))}
                </div>
                <span className={styles.pctLabel}>{pct}% complete</span>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
};

