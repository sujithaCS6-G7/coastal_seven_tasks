import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-card py-6 text-center text-xs text-muted-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          <strong className="text-foreground">Nexora Tech Store</strong> &bull; Next-Gen Gear &bull; Tailwind CSS &bull; shadcn/ui
        </p>
        <p className="text-[11px]">
          FastAPI Backend &bull; Redis Cache &bull; PostgreSQL
        </p>
      </div>
    </footer>
  );
};

export default Footer;
