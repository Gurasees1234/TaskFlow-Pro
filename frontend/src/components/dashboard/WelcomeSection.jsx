import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronDown, FilePlus2, FolderPlus, Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './WelcomeSection.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
};

function getGreetingPeriod() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const WelcomeSection = ({
  data,
  onCreateProject,
  onCreateIssue,
  activeTeamFilter,
  onClearTeamFilter,
}) => {
  const { user, workspace, date } = data;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.section variants={fadeUp} initial="hidden" animate="visible" className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.greeting}>
          Hi, {user}!
        </h1>
        <div className={styles.meta}>
          <span className={styles.period}>{getGreetingPeriod()}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.workspace}>{workspace}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.dateWrap}>
            <CalendarDays size={12} strokeWidth={1.75} />
            <span>{date}</span>
          </span>
          {activeTeamFilter && activeTeamFilter !== 'All' && (
            <button
              type="button"
              onClick={onClearTeamFilter}
              className={styles.teamFilterChip}
              title="Clear team filter"
            >
              <span>Team: {activeTeamFilter}</span>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          icon={FolderPlus}
          onClick={onCreateProject}
        >
          New Project
        </Button>

        <div className={styles.createAnchor}>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
          >
            Create <ChevronDown size={13} className={styles.chevron} />
          </Button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className={styles.createMenu}
              >
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateIssue();
                  }}
                >
                  <FilePlus2 size={14} />
                  <span>Create Task / Issue</span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateProject();
                  }}
                >
                  <FolderPlus size={14} />
                  <span>Create Project</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
};
