import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

const DropdownContext = createContext(null);

export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
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

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        if (children.props.onClick) children.props.onClick(e);
        handleClick(e);
      },
      'aria-expanded': open,
      'aria-haspopup': true,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

export const DropdownMenuContent = ({ align = 'end', className, children, ...props }) => {
  const { open } = useContext(DropdownContext);

  if (!open) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 duration-150",
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = ({ className, onClick, destructive = false, children, ...props }) => {
  const { setOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (onClick) onClick(e);
    setOpen(false);
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuLabel = ({ className, children, ...props }) => (
  <div className={cn("px-2.5 py-1.5 text-xs font-semibold text-foreground", className)} {...props}>
    {children}
  </div>
);

export const DropdownMenuSeparator = ({ className, ...props }) => (
  <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
);
