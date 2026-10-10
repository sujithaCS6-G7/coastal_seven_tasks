import React, { memo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config/env';

const getBackendPort = () => {
  try {
    return new URL(API_BASE_URL).port || '8003';
  } catch {
    return '8003';
  }
};

const FooterBase = () => {
  const backendPort = getBackendPort();
  return (
    <footer className="w-full border-t border-border bg-card py-6 text-center text-xs text-muted-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 justify-center flex-wrap">
          <strong className="text-foreground">Nexora E-Commerce Store</strong> &bull; Day 19 Security, Compression &amp; Perf &bull; Vitest + RTL &bull; Playwright E2E
        </p>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> FastAPI (:{backendPort}) Connected
          </span>
          <span>&bull;</span>
          <span>SlowAPI + OWASP + GZip + Celery Active</span>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(FooterBase);
Footer.displayName = 'Footer';

export default Footer;
