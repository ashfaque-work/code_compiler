import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { AuthorMark } from "./AuthorMark.js";

interface ShellProps {
  /** Page-specific controls, right-aligned in the header. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export function Shell({ actions, children }: ShellProps) {
  return (
    <div className="app-ground flex h-full flex-col bg-ground">
      <header className="flex shrink-0 items-center gap-6 border-b border-line-soft px-4 py-3 sm:px-5">
        <NavLink to="/" className="group flex items-baseline gap-px">
          <span className="font-mono text-[15px] tracking-tight text-ink">
            exec
          </span>
          {/* A block cursor, the way a prompt sits waiting for input. */}
          <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-px bg-action transition-opacity group-hover:opacity-70" />
        </NavLink>

        <nav className="flex items-center gap-1 text-sm">
          <Tab to="/">Playground</Tab>
          <Tab to="/problems">Problems</Tab>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          {actions}
          {/* The maker's credit. This shell is a full-height app layout with no
              footer, so it sits at the end of the header instead - the mark
              alone until there is room for the name. */}
          <a
            href="https://ashfaqueahmad.com"
            target="_blank"
            rel="noreferrer noopener"
            className="ml-1 hidden items-center gap-1.5 text-xs text-muted transition-colors hover:text-dim sm:inline-flex"
          >
            <AuthorMark className="size-4" title="Ashfaque Ahmad" />
            <span className="hidden lg:inline">built by Ashfaque Ahmad</span>
          </a>
        </div>
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
        `rounded-md px-2.5 py-1 transition-colors ${
          isActive
            ? "bg-raised text-ink lift"
            : "text-muted hover:bg-surface hover:text-dim"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/** Small pill for terse status, used for the sandbox spec in the header. */
export function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line-soft bg-surface/70 px-3 py-1 font-mono text-[11px] text-muted lg:inline-flex">
      {children}
    </span>
  );
}

export function RunButton({
  onClick,
  busy,
  disabled,
  label,
  busyLabel,
}: {
  readonly onClick: () => void;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly busyLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex items-center gap-2 rounded-md bg-action px-3.5 py-1.5 text-sm font-medium text-ground transition hover:bg-action/90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
    >
      {busy ? (
        <span className="size-1.5 rounded-full bg-ground pulse-soft" />
      ) : (
        <span className="size-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-ground" />
      )}
      {busy ? busyLabel : label}
      <kbd className="ml-0.5 hidden font-mono text-[10px] text-ground/55 sm:inline group-disabled:text-muted/60">
        ⌘↵
      </kbd>
    </button>
  );
}

export function LanguageSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly options: readonly { id: string; label: string }[];
  readonly disabled?: boolean;
}) {
  return (
    <>
      <label className="sr-only" htmlFor="language">
        Language
      </label>
      <select
        id="language"
        value={value}
        disabled={disabled ?? false}
        onChange={(event) => onChange(event.target.value)}
        className="field lift cursor-pointer rounded-md border border-line bg-raised py-1.5 pr-8 pl-3 text-sm text-ink transition-colors hover:border-action/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
