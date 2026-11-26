import { motion } from 'framer-motion';
import { FilePlus2, UserPlus, ArrowRightLeft, MessageSquare, IterationCw } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import styles from './TeamActivity.module.css';

const ICONS = {
  issue_created: FilePlus2,
  task_assigned: UserPlus,
  status_changed: ArrowRightLeft,
  comment_added: MessageSquare,
  sprint_updated: IterationCw,
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: 6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export const TeamActivity = ({ activity }) => {
  return (
    <GlassPanel padding="none" className={styles.container}>
      <div className={styles.head}>
        <h2 className={styles.title}>Team Activity</h2>
        <span className={styles.count}>{activity.length}</span>
      </div>

      <motion.div
        className={styles.list}
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {activity.map((item, idx) => {
          const Icon = ICONS[item.type] || FilePlus2;
          return (
            <motion.div key={idx} variants={itemVariants} className={styles.item}>
              <div className={styles.iconBox}>
                <Icon size={14} strokeWidth={1.6} />
              </div>
              <div className={styles.body}>
                <div className={styles.detail}>{item.detail}</div>
                <div className={styles.meta}>
                  <span className={styles.user}>{item.user}</span>
                  <span className={styles.sep}>·</span>
                  <span>{item.time}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </GlassPanel>
  );
};
