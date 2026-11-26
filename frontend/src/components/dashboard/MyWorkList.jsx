import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Code2,
  Layers,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import styles from './MyWorkList.module.css';

const ICON_MAP = {
  layers: Layers,
  sparkles: Sparkles,
  code: Code2,
  megaphone: Megaphone,
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
};

const priorityVariant = (p) => {
  if (p === 'High') return 'contrast';
  if (p === 'Medium') return 'neutral';
  return 'outline';
};

export const MyWorkList = ({
  issues,
  projects,
  onCreateIssue,
  onToggleStatus,
  onTogglePin,
  onDeleteIssue,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const visibleIssues = showCompleted
    ? issues
    : issues.filter((item) => item.status !== 'Done');

  const sortedIssues = [...visibleIssues].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const inProcessCount = issues.filter((i) => i.status !== 'Done').length;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h2 className={styles.title}>Task in process ({inProcessCount})</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowCompleted((prev) => !prev)}
          className={styles.archiveToggle}
        >
          {showCompleted ? 'Hide completed ›' : 'Show all ›'}
        </button>
      </div>

      <div className={styles.cardsGrid}>
        {sortedIssues.map((issue, idx) => {
          const Icon = ICON_MAP[issue.iconType] || Layers;
          const menuOpen = openMenuId === issue.id;
          const progressPct =
            typeof issue.progress === 'number'
              ? issue.progress
              : issue.status === 'Done'
                ? 100
                : issue.status === 'In Progress'
                  ? 55
                  : 15;

          return (
            <motion.article
              key={issue.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                styles.taskCard,
                idx === 0 && issue.pinned && styles.featuredCard
              )}
            >
              <div className={styles.cardTop}>
                <div className={styles.taskIcon}>
                  <Icon size={16} strokeWidth={1.75} />
                </div>

                <div className={styles.topRight}>
                  {issue.pinned && (
                    <span className={styles.pinIndicator} title="Pinned task">
                      <Pin size={11} />
                    </span>
                  )}
                  <div className={styles.menuAnchor}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(menuOpen ? null : issue.id)}
                      className={styles.moreBtn}
                      aria-label={`Actions for ${issue.title}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className={styles.contextMenu}
                        >
                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => {
                              onTogglePin(issue.id);
                              setOpenMenuId(null);
                            }}
                          >
                            <span>{issue.pinned ? 'Unpin note' : 'Pin note'}</span>
                            <Pin size={12} />
                          </button>
                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => {
                              onToggleStatus(issue.id);
                              setOpenMenuId(null);
                            }}
                          >
                            <span>Advance status</span>
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => {
                              onDeleteIssue(issue.id);
                              setOpenMenuId(null);
                            }}
                          >
                            <span>Delete</span>
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.projectRow}>
                  <span className={styles.issueId}>{issue.displayKey || issue.id}</span>
                  <span className={styles.projectName}>
                    {projectMap[issue.projectId] || issue.projectId}
                  </span>
                </div>
                <h3 className={styles.taskTitle}>{issue.title}</h3>
              </div>

              <div className={styles.progressBlock}>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className={styles.progressPct}>{progressPct}%</span>
              </div>

              <div className={styles.cardFoot}>
                <div className={styles.footMeta}>
                  <Badge variant={priorityVariant(issue.priority)} mono>
                    {issue.priority}
                  </Badge>
                  <span className={styles.dueText}>{issue.due}</span>
                  <span className={styles.assigneeChip} title={`Assignee: ${issue.assignee}`}>
                    {issue.assignee}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleStatus(issue.id)}
                  className={cn(
                    styles.cornerBadge,
                    issue.status === 'In Progress' && styles.cornerActive
                  )}
                  title={`Status: ${issue.status} (click to cycle)`}
                  aria-label={`Cycle status from ${issue.status}`}
                >
                  <Bell size={13} strokeWidth={1.8} />
                </button>
              </div>
            </motion.article>
          );
        })}

        {/* Dashed + Add task card */}
        <motion.button
          type="button"
          onClick={onCreateIssue}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          className={styles.addTaskCard}
        >
          <span className={styles.addTaskInner}>
            <Plus size={16} strokeWidth={1.75} />
            <span>Add task</span>
          </span>
        </motion.button>
      </div>
    </section>
  );
};
