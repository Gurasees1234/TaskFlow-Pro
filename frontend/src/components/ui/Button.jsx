import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import styles from './Button.module.css';

export const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className,
  disabled = false,
  ...props
}) => {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      disabled={disabled}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        className
      )}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={15} strokeWidth={1.75} />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon size={15} strokeWidth={1.75} />}
    </motion.button>
  );
};

