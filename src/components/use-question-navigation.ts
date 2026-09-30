import { useEffect, useState } from "react";
import { enabledSections } from "@/lib/enabled-sample";

/** Section changes retain parent-owned answers; focus follows an explicit user action only. */
export function useQuestionNavigation() {
  const [activeKey, setActiveKey] = useState(enabledSections[0].key);
  const [request, setRequest] = useState<{ id: string; sequence: number } | null>(null);
  useEffect(() => {
    if (!request) return;
    const frame = requestAnimationFrame(() => {
      const article = document.getElementById(`question-${request.id}`);
      const control = article?.querySelector<HTMLElement>("input:not([disabled]), select, textarea");
      control?.focus({ preventScroll: true });
      control?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeKey, request]);
  function navigateTo(id: string) {
    const section = enabledSections.find((group) => group.items.some((item) => item.id === id));
    if (!section) return;
    setActiveKey(section.key);
    setRequest((previous) => ({ id, sequence: (previous?.sequence ?? 0) + 1 }));
  }
  return { activeKey, setActiveKey, navigateTo };
}
