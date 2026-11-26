import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Share2, TrendingUp } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import styles from './ProjectProgress.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1], delay: 0.1 } },
};

const RING_RADII = [54, 44, 34];

export const ProjectProgress = ({ progress }) => {
  const { completed, total, deltaLabel = '+20% compared to last month', breakdown = [] } = progress;
  const { theme } = useTheme();
  const [shared, setShared] = useState(false);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);

  const ringColors =
    theme === 'dark'
      ? ['#f5f5f7', '#a1a1aa', '#52525b']
      : ['#141417', '#52525b', '#a1a1aa'];

  const trackColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,20,0.08)';

  const handleDownloadReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      workspace: 'TaskFlow Pro',
      monthlyCompletionPct: pct,
      completedTasks: completed,
      remainingTasks: remaining,
      breakdown,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taskflow-pro-monthly-report-2026.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(`TaskFlow Pro Monthly Progress: ${pct}% (${completed}/${total} tasks completed)`)
        .catch(() => {});
    }
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className={styles.wrap}>
      <GlassPanel padding="md" className={styles.panel}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Month progress</h2>
            <p className={styles.delta}>{deltaLabel}</p>
          </div>
          <div className={styles.iconPill}>
            <TrendingUp size={14} strokeWidth={1.75} />
          </div>
        </div>

        <div className={styles.middle}>
          <div className={styles.legend}>
            {(breakdown.length > 0
              ? breakdown
              : [
                  { name: 'Completed', pct },
                  { name: 'Remaining', pct: 100 - pct },
                ]
            ).map((item, idx) => (
              <div key={item.name} className={styles.legendRow}>
                <span
                  className={styles.legendDot}
                  style={{ background: ringColors[idx % ringColors.length] }}
                />
                <span className={styles.legendName}>{item.name}</span>
              </div>
            ))}
            <div className={styles.summaryCounts}>
              <span>{completed} done</span>
              <span>·</span>
              <span>{remaining} left</span>
            </div>
          </div>

          <div className={styles.ringsWrap} aria-label={`Monthly progress ${pct}%`}>
            <svg viewBox="0 0 132 132" className={styles.ringsSvg}>
              {RING_RADII.map((radius, idx) => {
                const circumference = 2 * Math.PI * radius;
                const itemPct = breakdown[idx]?.pct ?? pct;
                const dashOffset = circumference - (itemPct / 100) * circumference;

                return (
                  <g key={radius}>
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke={trackColor}
                      strokeWidth="5.5"
                    />
                    <motion.circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke={ringColors[idx % ringColors.length]}
                      strokeWidth="5.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 0.9, delay: 0.15 + idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      transform="rotate(-90 66 66)"
                    />
                  </g>
                );
              })}
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringPct}>{pct}%</span>
              <span className={styles.ringSub}>Done</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={handleShare}
            className={styles.shareBtn}
            aria-label="Copy monthly report summary"
            title="Copy monthly summary"
          >
            {shared ? <Check size={14} /> : <Share2 size={14} />}
          </button>

          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            iconPosition="right"
            className={styles.downloadBtn}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
};
