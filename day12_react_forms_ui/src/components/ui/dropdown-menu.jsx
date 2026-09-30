import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

const DropdownContext = createContext();

export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger = ({ asChild, children, className, ...props }) => {
  const { open, setOpen } = useContext(DropdownContext);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={open}
      className={cn("cursor-pointer select-none", className)}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuContent = ({ align = 'end', className, children, ...props }) => {
  const { open } = useContext(DropdownContext);
  if (!open) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-150 focus:outline-none",
        align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        "mt-2 w-56",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = ({ className, children, onClick, destructive = false, ...props }) => {
  const { setOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (onClick) onClick(e);
    setOpen(false);
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        destructive && "text-destructive hover:bg-destructive/10 focus:bg-destructive/10",
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuLabel = ({ className, children, ...props }) => (
  <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...props}>
    {children}
  </div>
);

export const DropdownMenuSeparator = ({ className, ...props }) => (
  <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
);
