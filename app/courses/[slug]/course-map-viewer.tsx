"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

type Props = {
  src: string;
  alt: string;
  title: string;
};

export function CourseMapViewer({ src, alt, title }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setScale(1);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left"
        aria-label={`Open ${title} course map full screen`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public course map asset */}
        <img
          src={src}
          alt={alt}
          className="h-auto w-full rounded-lg border transition-opacity group-hover:opacity-90"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Tap to zoom</p>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-0 right-0 left-0 mx-auto flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-xl data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-3xl sm:rounded-b-xl sm:border-x sm:border-b"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
            <DialogHeader className="min-w-0 flex-1 gap-0 p-0 text-left">
              <DialogTitle className="truncate text-base font-semibold">{title} map</DialogTitle>
              <DialogDescription className="sr-only">Zoomable course map</DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))}
                disabled={scale <= MIN_SCALE}
                aria-label="Zoom out"
              >
                <MinusIcon className="size-4" aria-hidden />
              </Button>
              <span className="w-10 text-center font-mono text-xs tabular-nums text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))}
                disabled={scale >= MAX_SCALE}
                aria-label="Zoom in"
              >
                <PlusIcon className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setScale(1)}
                aria-label="Reset zoom"
              >
                <RotateCcwIcon className="size-4" aria-hidden />
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Close map">
                  <XIcon className="size-5" strokeWidth={2} aria-hidden />
                </Button>
              </DialogClose>
            </div>
          </header>
          <div className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- same public asset as thumbnail */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="mx-auto h-auto max-w-none select-none"
              style={{ width: `${scale * 100}%` }}
              onDoubleClick={() => setScale((current) => (current > 1 ? 1 : 2))}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
