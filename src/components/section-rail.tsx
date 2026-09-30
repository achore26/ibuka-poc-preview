/*
 * Section navigation shell pieces (accepted redesign, 30 September 2026).
 *
 * The navy rail is app chrome, but its content — the four real assessment
 * groups, their per-group prepared counts and the ACTIVE group — is live
 * form state, so the assessment form reports it upward through this tiny
 * context and the rail renders whatever the mounted form reports. Nothing
 * else may drive it: no fake settings, documents or placeholder navigation
 * exist. While no form is mounted (loading, failed, onboarding), the rail
 * shows the configured groups without counts and with inert buttons so
 * there are no dead clickable affordances.
 */

import { createContext, useContext } from "react";
import { enabledSections } from "@/lib/enabled-sample";

export interface SectionNavGroup {
  key: string;
  title: string;
  ready: number;
  total: number;
}

export interface SectionNavConfig {
  activeKey: string;
  groups: SectionNavGroup[];
  onSelect: (key: string) => void;
}

type ReportSectionNav = (config: SectionNavConfig | null) => void;

const SectionNavContext = createContext<ReportSectionNav>(() => {});

export const SectionNavProvider = SectionNavContext.Provider;

export function useReportSectionNav(): ReportSectionNav {
  return useContext(SectionNavContext);
}

/** Small local marker for a group's state (optical alignment, no font icon). */
function GroupDot({ ready, total }: { ready: number; total: number }) {
  const done = total > 0 && ready === total;
  const started = ready > 0;
  return (
    <span
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full ${
        done ? "bg-primary" : started ? "bg-rail-foreground" : "bg-transparent ring-1 ring-rail-muted"
      }`}
    />
  );
}

export function SectionRail({ nav }: { nav: SectionNavConfig | null }) {
  const groups: SectionNavGroup[] =
    nav?.groups ??
    enabledSections.map((section) => ({
      key: section.key,
      title: section.title,
      ready: 0,
      total: section.items.length,
    }));

  return (
    <nav
      aria-label="Assessment sections"
      className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 flex-col bg-rail lg:flex"
    >
      <p className="px-5 pb-2 pt-5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-rail-muted">
        Sections
      </p>
      <ul className="flex flex-col gap-0.5 px-3">
        {groups.map((group, index) => {
          const isActive = nav !== null && group.key === nav.activeKey;
          const disabled = nav === null;
          return (
            <li key={group.key}>
              <button
                type="button"
                disabled={disabled}
                aria-current={isActive ? "true" : undefined}
                onClick={() => nav?.onSelect(group.key)}
                className={`group flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-rail-raised font-medium text-white"
                    : disabled
                      ? "cursor-default text-rail-muted"
                      : "text-rail-foreground hover:bg-rail-raised/70 hover:text-white"
                }`}
              >
                <GroupDot ready={group.ready} total={group.total} />
                <span className="min-w-0 flex-1">
                  <span className="me-1.5 font-mono text-[0.7rem] text-rail-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {group.title}
                </span>
                {nav !== null ? (
                  <span className="font-mono text-xs tabular-nums text-rail-muted">
                    {group.ready}/{group.total}
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={`-me-1 h-4 w-0.5 rounded-full bg-primary transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-5 pb-5 text-[0.68rem] leading-relaxed text-rail-muted">
        CMP Kenya · IBUKA Phase 1
        <br />
        proof of concept
      </p>
    </nav>
  );
}
