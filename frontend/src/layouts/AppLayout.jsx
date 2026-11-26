import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { useHealthCheck } from '../hooks/useHealthCheck';
import styles from './AppLayout.module.css';

export const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTeamFilter, setActiveTeamFilter] = useState('All');

  const { health, loading, error, refresh } = useHealthCheck();

  return (
    <div className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.ambient} />
        <div className={styles.orbTopRight} />
        <div className={styles.orbBottomLeft} />
        <svg
          className={styles.ribbonLayer}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="tfRibbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--ribbon-stroke)" stopOpacity="0.95" />
              <stop offset="50%" stopColor="var(--ribbon-fill-1)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--ribbon-fill-2)" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="tfRibbonGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--ribbon-fill-1)" stopOpacity="0.9" />
              <stop offset="65%" stopColor="var(--ribbon-fill-2)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--ribbon-stroke)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M-140,210 C180,30 460,420 790,260 C1120,100 1280,-40 1600,180 L1600,440 C1280,220 1090,390 770,510 C450,630 170,290 -140,460 Z"
            fill="url(#tfRibbonGrad1)"
            stroke="var(--ribbon-stroke)"
            strokeWidth="1.25"
          />
          <path
            d="M-120,690 C220,480 510,820 890,620 C1180,470 1370,560 1580,410 L1580,730 C1310,880 1070,740 820,860 C520,1000 220,760 -120,920 Z"
            fill="url(#tfRibbonGrad2)"
            stroke="var(--ribbon-stroke)"
            strokeWidth="1"
          />
          <ellipse
            cx="1140"
            cy="240"
            rx="240"
            ry="110"
            transform="rotate(-22 1140 240)"
            fill="var(--ribbon-fill-1)"
            stroke="var(--ribbon-stroke)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className={styles.vesselWrap}>
        <div className={styles.frame}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          <div className={styles.mainColumn}>
            <TopNav
              health={health}
              healthLoading={loading}
              healthError={error}
              onRefreshHealth={refresh}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />

            <main className={styles.content}>
              <Outlet
                context={{
                  health,
                  healthLoading: loading,
                  healthError: error,
                  refreshHealth: refresh,
                  searchQuery,
                  setSearchQuery,
                  activeTeamFilter,
                  setActiveTeamFilter,
                }}
              />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
