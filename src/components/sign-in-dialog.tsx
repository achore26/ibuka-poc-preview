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
      <DialogContent className="sm:max-w-[425px] p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="font-heading text-2xl font-semibold tracking-tight text-[#0B2545]">
            Welcome Back
          </DialogTitle>
          <DialogDescription className="text-[15px] text-gray-500 mt-2">
            Sign in to securely save your assessment progress and resume at any time.
          </DialogDescription>
        </DialogHeader>
        <SignInForm notice={notice} onSignIn={onSignIn} />
      </DialogContent>
    </Dialog>
  );
}
