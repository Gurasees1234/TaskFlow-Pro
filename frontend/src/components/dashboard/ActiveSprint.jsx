import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Badge } from '../ui/Badge';
import styles from './ActiveSprint.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export const ActiveSprint = ({ sprint }) => {
  const { name, goal, start, end, completedPoints, remainingPoints } = sprint;
  const totalPoints = completedPoints + remainingPoints;
  const pct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const startLabel = new Date(start).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  const endLabel = new Date(end).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <GlassPanel padding="md" className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Active Sprint</h2>
          <Badge variant="contrast" mono>
            <Zap size={10} /> {pct}%
          </Badge>
        </div>

        <div className={styles.sprintName}>{name}</div>
        <div className={styles.goal}>{goal}</div>

        <div className={styles.dates}>
          <span>{startLabel}</span>
          <span className={styles.dateSep}>→</span>
          <span>{endLabel}</span>
        </div>

        <div className={styles.barOuter}>
          <motion.div
            className={styles.barInner}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </div>

        <div className={styles.points}>
          <div className={styles.pointBlock}>
            <span className={styles.pointValue}>{completedPoints}</span>
            <span className={styles.pointLabel}>Completed</span>
          </div>
          <div className={styles.pointBlock}>
            <span className={styles.pointValue}>{remainingPoints}</span>
            <span className={styles.pointLabel}>Remaining</span>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

