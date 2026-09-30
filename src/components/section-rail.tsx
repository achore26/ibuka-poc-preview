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
      className="fixed inset-y-0 left-0 z-50 hidden overflow-y-auto w-[232px] flex-col bg-rail lg:flex"
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6"><span className="border-b-[3px] border-primary pb-1 text-xl font-semibold tracking-tight text-white">CMP</span><span className="text-sm text-rail-foreground">Kenya</span></div>
      <p className="px-5 pb-3 pt-8 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-rail-muted">
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
                className={`group flex min-h-11 w-full items-center gap-2.5 rounded-r-md border-l-[3px] px-3 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? "border-l-primary bg-rail-raised font-medium text-white"
                    : disabled
                      ? "border-l-transparent cursor-default text-rail-muted"
                      : "border-l-transparent text-rail-foreground hover:bg-rail-raised/70 hover:text-white"
                }`}
              >

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

              </button>
            </li>
          );
        })}
      </ul>
      <div id="rail-progress" className="mt-auto border-t border-white/15 px-5 py-6" />
      <p className="px-5 pb-5 text-[0.68rem] leading-relaxed text-rail-muted">
        CMP Kenya · IBUKA Phase 1
        <br />
        proof of concept
      </p>
    </nav>
  );
}
