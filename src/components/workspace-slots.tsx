import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Keep state and handlers in the assessment; move only its presentation into app chrome. */
export function WorkspaceUtility({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById("workspace-utility")); }, []);
  return target ? createPortal(children, target) : null;
}

export function WorkspaceProgress({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    setTarget(document.getElementById("rail-progress"));
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop ? (target ? createPortal(children, target) : null) : <div>{children}</div>;
}
