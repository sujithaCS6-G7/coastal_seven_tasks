import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-card py-6 text-center text-xs text-muted-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 justify-center">
          <strong className="text-foreground">Nexora E-Commerce Store</strong> &bull; Day 13 Frontend (Part 1) &bull; Vite &bull; Tailwind CSS &bull; shadcn/ui
        </p>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> FastAPI (:8000) Connected
          </span>
          <span>&bull;</span>
          <span>JWT Interceptors Active</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
