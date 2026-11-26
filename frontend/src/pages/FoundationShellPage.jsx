import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Cpu,
  Database,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { GlassPanel } from '../components/ui/GlassPanel';
import { useTheme } from '../hooks/useTheme';
import { formatTimestamp, formatUptime } from '../utils/formatters';
import latticeSvg from '../assets/abstract-lattice.svg';
import styles from './FoundationShellPage.module.css';

const ARCHITECTURE_LAYERS = [
  {
    code: '01',
    title: 'Client Runtime',
    spec: 'React 18 + Vite + CSS Modules',
    description: 'Strict JavaScript ES6+ foundation with monochromatic design tokens and layered glass surfaces.',
    icon: Layers,
  },
  {
    code: '02',
    title: 'API Gateway',
    spec: 'Node.js + Express ESM + Zod',
    description: 'Centralized error pipeline, structured not-found boundary, and typed request validation readiness.',
    icon: Server,
  },
  {
    code: '03',
    title: 'Persistence Layer',
    spec: 'MongoDB + Mongoose ODM',
    description: 'Credential-free environment wiring and connection lifecycle diagnostics ready for domain schemas.',
    icon: Database,
  },
  {
    code: '04',
    title: 'Realtime Bus',
    spec: 'Socket.IO WebSocket Transport',
    description: 'Attached to the HTTP server for low-latency sprint, board, and presence events in upcoming phases.',
    icon: Radio,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

export const FoundationShellPage = () => {
  const { health, healthLoading, healthError, refreshHealth } = useOutletContext();
  const { theme, toggleTheme } = useTheme();

  const isHealthy = Boolean(health?.status === 'ok' && !healthError);

  return (
    <motion.div
      className={styles.page}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Architectural Panel */}
      <motion.div variants={itemVariants}>
        <GlassPanel elevated padding="lg" className={styles.heroPanel}>
          <img src={latticeSvg} alt="" className={styles.latticeAccent} aria-hidden="true" />

          <div className={styles.heroTopRow}>
            <Badge variant="outline" mono>
              Phase 01 · System Foundation
            </Badge>
            <Badge variant="neutral" mono>
              Theme: {theme}
            </Badge>
          </div>

          <div className={styles.heroBody}>
            <h1 className={styles.headline}>
              Precision execution
              <br />
              for modern engineering teams.
            </h1>
            <p className={styles.subtitle}>
              TaskFlow Pro is initialized with a monochromatic glassmorphic design system,
              modular React architecture, and an ES-module Express + Socket.IO API core.
            </p>
          </div>

          <div className={styles.heroActions}>
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={refreshHealth}
              disabled={healthLoading}
            >
              {healthLoading ? 'Verifying API...' : 'Probe /api/health'}
            </Button>
            <Button variant="secondary" icon={ArrowUpRight} onClick={toggleTheme}>
              Toggle {theme === 'dark' ? 'Light' : 'Dark'} Surface
            </Button>
          </div>
        </GlassPanel>
      </motion.div>

      {/* Live Backend Telemetry Strip */}
      <motion.div variants={itemVariants} className={styles.telemetryGrid}>
        <GlassPanel padding="md" className={styles.telemetryCard}>
          <div className={styles.telemetryHeader}>
            <span className={styles.telemetryLabel}>Express API</span>
            <Cpu size={15} strokeWidth={1.6} className={styles.telemetryIcon} />
          </div>
          <div className={styles.telemetryValue}>
            {healthLoading ? 'Checking...' : isHealthy ? 'Operational' : 'Unreachable'}
          </div>
          <div className={styles.telemetryMeta}>
            {healthError
              ? healthError
              : `${health?.service || 'taskflow-pro-api'} · ${health?.environment || 'development'}`}
          </div>
        </GlassPanel>

        <GlassPanel padding="md" className={styles.telemetryCard}>
          <div className={styles.telemetryHeader}>
            <span className={styles.telemetryLabel}>MongoDB Status</span>
            <Database size={15} strokeWidth={1.6} className={styles.telemetryIcon} />
          </div>
          <div className={styles.telemetryValue}>
            {health?.database?.status ? health.database.status.replace('_', ' ') : 'Pending'}
          </div>
          <div className={styles.telemetryMeta}>
            {health?.database?.configured
              ? 'URI configured via environment'
              : 'Configure MONGO_URI in backend/.env'}
          </div>
        </GlassPanel>

        <GlassPanel padding="md" className={styles.telemetryCard}>
          <div className={styles.telemetryHeader}>
            <span className={styles.telemetryLabel}>Runtime Uptime</span>
            <Shield size={15} strokeWidth={1.6} className={styles.telemetryIcon} />
          </div>
          <div className={styles.telemetryValue}>{formatUptime(health?.uptimeSeconds)}</div>
          <div className={styles.telemetryMeta}>
            Last check: {formatTimestamp(health?.timestamp)}
          </div>
        </GlassPanel>
      </motion.div>

      {/* Foundation Layers */}
      <motion.section variants={itemVariants} className={styles.layersSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Architectural Blueprint</h2>
          <span className={styles.sectionCaption}>4 Core Subsystems Initialized</span>
        </div>

        <div className={styles.layersGrid}>
          {ARCHITECTURE_LAYERS.map(({ code, title, spec, description, icon: Icon }) => (
            <GlassPanel key={code} padding="md" className={styles.layerCard}>
              <div className={styles.layerTop}>
                <span className={styles.layerCode}>{code}</span>
                <div className={styles.layerIconBox}>
                  <Icon size={16} strokeWidth={1.7} />
                </div>
              </div>
              <h3 className={styles.layerTitle}>{title}</h3>
              <p className={styles.layerSpec}>{spec}</p>
              <p className={styles.layerDesc}>{description}</p>
            </GlassPanel>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};

