"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Button } from "@/components/ui/button";

type Props = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Puts the two buttons side by side, also on phones. */
  sideBySide?: boolean;
  onConfirm: () => void;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
};

export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  sideBySide = false,
  onConfirm,
  confirmVariant = "destructive",
  disabled,
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={sideBySide ? "grid grid-cols-2 sm:grid" : undefined}>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={confirmVariant} onClick={() => void onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
