import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { cn } from '../../utils/cn';
import styles from './MonthGoalsCard.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 } },
};

export const MonthGoalsCard = ({ goals, onToggleGoal, onAddGoal, onDeleteGoal }) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  const completedCount = goals.filter((g) => g.completed).length;
  const pct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Enter a goal title');
      return;
    }
    onAddGoal(newTitle.trim());
    setNewTitle('');
    setError('');
    setAdding(false);
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className={styles.wrap}>
      <GlassPanel padding="md" className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Month goals:</h2>

          <div className={styles.headRight}>
            <div className={styles.progressMini} title={`${completedCount} of ${goals.length} completed`}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  fill="none"
                  stroke="var(--border-default)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 14 14)"
                />
              </svg>
              <span className={styles.miniCount}>
                {completedCount}/{goals.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setAdding((prev) => !prev);
                setError('');
              }}
              className={styles.addBtn}
              aria-label={adding ? 'Close add goal' : 'Add monthly goal'}
              title="Add monthly goal"
            >
              {adding ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>
        </div>

        {adding && (
          <form onSubmit={handleCreate} className={styles.addForm}>
            <div className={styles.addRow}>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setError('');
                }}
                placeholder="New monthly goal..."
                className={styles.addInput}
                autoFocus
              />
              <button type="submit" className={styles.saveBtn}>
                Add
              </button>
            </div>
            {error && <span className={styles.error}>{error}</span>}
          </form>
        )}

        <ul className={styles.list}>
          {goals.map((goal) => (
            <li key={goal.id} className={styles.item}>
              <button
                type="button"
                onClick={() => onToggleGoal(goal.id)}
                className={styles.checkRow}
                aria-pressed={goal.completed}
              >
                <span className={cn(styles.checkbox, goal.completed && styles.checkboxChecked)}>
                  {goal.completed && <Check size={11} strokeWidth={2.5} />}
                </span>
                <span className={cn(styles.goalText, goal.completed && styles.goalDone)}>
                  {goal.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteGoal(goal.id)}
                className={styles.deleteBtn}
                aria-label={`Remove ${goal.title}`}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </motion.div>
  );
};

