import { cn } from '../../utils/cn';
import styles from './GlassPanel.module.css';

export const GlassPanel = ({
  children,
  className,
  elevated = false,
  padding = 'md',
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={cn(
        styles.panel,
        elevated && styles.elevated,
        styles[`padding-${padding}`],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

