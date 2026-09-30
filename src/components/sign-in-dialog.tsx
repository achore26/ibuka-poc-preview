/*
 * Header "Sign in" dialog (accepted redesign, 30 September 2026). Sign-in is
 * no longer a large page block — the assessment leads the page and signing
 * in is a compact header action. The Radix dialog provides the focus trap,
 * Escape handling, a real Close control and focus return to the trigger.
 *
 * The dialog states the observable truth: preview entries are temporary and
 * reset on reload; signing in starts a SAVED assessment against the
 * account's synthetic company; anonymous preview answers are never promised
 * to transfer. A failed link callback may OPEN this dialog once to surface
 * the recovery notice, but it never forces it back open after the user
 * closes it.
 */

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignInForm } from "@/components/auth-panel";
import type { AuthNotice, SignInResult } from "@/lib/auth-session";

export function SignInDialog({
  open,
  onOpenChange,
  notice,
  onSignIn,
  triggerClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: AuthNotice | null;
  onSignIn: (email: string) => Promise<SignInResult>;
  triggerClassName?: string;
}) {
  // Open once per new link-error notice (identity-tracked), never per render.
  const openedFor = useRef<AuthNotice | null>(null);
  useEffect(() => {
    if (notice && notice.kind === "link-error" && openedFor.current !== notice) {
      openedFor.current = notice;
      onOpenChange(true);
    }
  }, [notice, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>Sign in</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a saved assessment</DialogTitle>
          <DialogDescription>
            Entries in this preview are temporary — reloading the page resets
            them. Signing in starts a saved assessment for your synthetic test
            company that resumes on any reload. Nothing you typed in the
            preview is transferred.
          </DialogDescription>
        </DialogHeader>
        <SignInForm notice={notice} onSignIn={onSignIn} />
      </DialogContent>
    </Dialog>
  );
}
