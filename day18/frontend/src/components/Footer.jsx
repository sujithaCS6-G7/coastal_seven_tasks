import React, { memo } from 'react';
import { ShieldCheck } from 'lucide-react';

const FooterBase = () => {
  return (
    <footer className="w-full border-t border-border bg-card py-6 text-center text-xs text-muted-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 justify-center flex-wrap">
          <strong className="text-foreground">Nexora E-Commerce Store</strong> &bull; Day 18 Celery Tasks &amp; PostgreSQL FTS/pg_trgm &bull; Vitest + RTL &bull; Playwright E2E
        </p>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> FastAPI (:8002) Connected
          </span>
          <span>&bull;</span>
          <span>Celery Worker &amp; GIN Indexes Active</span>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(FooterBase);
Footer.displayName = 'Footer';

export default Footer;
