import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, Clock, FolderOpen, Share2 } from 'lucide-react';
import styles from './ProjectOverview.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export const ProjectOverview = ({ projects, issues, totalCompletedAllTime = 43 }) => {
  const [copied, setCopied] = useState(false);

  const activeProjects = projects.filter((p) => p.active).length;
  const totalIssues = issues.length;
  const completedIssues = issues.filter((i) => i.status === 'Done').length;
  const pendingIssues = issues.filter((i) => i.status !== 'Done').length;
  const displayCompleted = totalCompletedAllTime - 1 + completedIssues;

  const handleCopySummary = () => {
    const summary = `TaskFlow Pro: ${displayCompleted} tasks done, ${activeProjects} active projects, ${pendingIssues} pending.`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(summary).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const tiles = [
    { key: 'projects', label: 'Projects', value: projects.length, icon: FolderOpen },
    { key: 'pending', label: 'Pending', value: pendingIssues, icon: Clock },
    { key: 'completed', label: 'Completed', value: completedIssues, icon: CheckCircle2 },
  ];

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Overall Information</h2>
        <button
          type="button"
          onClick={handleCopySummary}
          className={styles.iconBtn}
          aria-label="Copy overview summary"
          title="Copy overview summary"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
        </button>
      </div>

      <div className={styles.heroStats}>
        <div className={styles.heroStatBlock}>
          <span className={styles.heroNumber}>{displayCompleted}</span>
          <span className={styles.heroCaption}>
            Tasks done
            <br />
            across workspace
          </span>
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.heroStatBlock}>
          <span className={styles.heroNumber}>{activeProjects}</span>
          <span className={styles.heroCaption}>
            Active projects
            <br />
            {totalIssues} open scope
          </span>
        </div>
      </div>

      <div className={styles.tilesGrid}>
        {tiles.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className={styles.tile}>
            <div className={styles.tileIcon}>
              <Icon size={13} strokeWidth={1.75} />
            </div>
            <div className={styles.tileValue}>{value}</div>
            <div className={styles.tileLabel}>{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
