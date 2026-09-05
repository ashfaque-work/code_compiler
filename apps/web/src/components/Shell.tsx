import type { ReactNode } from "react";
import { NavLink } from "react-router";

interface ShellProps {
  /** Page-specific controls, right-aligned in the header. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export function Shell({ actions, children }: ShellProps) {
  return (
    <div className="flex h-full flex-col bg-ground">
      <header className="flex shrink-0 items-center gap-5 border-b border-line px-5 py-3">
        <NavLink to="/" className="font-mono text-sm text-ink">
          exec<span className="text-action">.</span>
        </NavLink>

        <nav className="flex items-center gap-4 text-sm">
          <Tab to="/">Playground</Tab>
          <Tab to="/problems">Problems</Tab>
        </nav>

        {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}

function Tab({ to, children }: { readonly to: string; readonly children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        isActive ? "text-ink" : "text-muted hover:text-ink"
      }
    >
      {children}
    </NavLink>
  );
}
