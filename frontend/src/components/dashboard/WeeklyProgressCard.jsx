import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { GlassPanel } from '../ui/GlassPanel';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';
import styles from './WeeklyProgressCard.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.05 } },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDay}>{item.label}</span>
      <span className={styles.tooltipVal}>{item.completed} tasks done</span>
    </div>
  );
};

export const WeeklyProgressCard = ({ data }) => {
  const { theme } = useTheme();
  const [activeDay, setActiveDay] = useState('F');

  const primaryStroke = theme === 'dark' ? '#f5f5f7' : '#141417';
  const secondaryStroke = theme === 'dark' ? '#6e6e7a' : '#a1a1aa';

  const totalDone = data.reduce((sum, d) => sum + d.completed, 0);

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className={styles.wrap}>
      <GlassPanel padding="md" className={styles.panel}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Weekly progress</h2>
            <p className={styles.subtitle}>{totalDone} tasks completed this week</p>
          </div>
          <div className={styles.iconPill}>
            <Activity size={14} strokeWidth={1.75} />
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dot} style={{ background: primaryStroke }} />
            Completed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dot} style={{ background: secondaryStroke }} />
            Planned
          </span>
        </div>

        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={138}>
            <AreaChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="weeklyFillPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryStroke} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={primaryStroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: secondaryStroke, strokeDasharray: '3 3', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="planned"
                stroke={secondaryStroke}
                strokeWidth={1.5}
                fill="none"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={primaryStroke}
                strokeWidth={2.2}
                fill="url(#weeklyFillPrimary)"
                activeDot={{ r: 4, fill: primaryStroke, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.daysRow}>
          {data.map((item) => {
            const isActive = activeDay === item.day;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveDay(item.day)}
                className={cn(styles.dayBtn, isActive && styles.dayBtnActive)}
                title={`${item.label}: ${item.completed} completed / ${item.planned} planned`}
              >
                {item.day.trim()}
              </button>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
};

