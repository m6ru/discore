/** Shared page chrome — use on tab screens and round route headers. */
export const pageTitleClassName = "font-display text-[30px] font-semibold leading-tight tracking-tight";

export const pageSubtitleClassName = "text-sm text-muted-foreground";

/** Framed section on Home (nearest course, continue round). */
export const homeFrameClassName = "space-y-3.5 rounded-md border bg-secondary px-[18px] pt-4 pb-[18px]";

/** Small label row at the top of a Home frame. */
export const homeFrameLabelClassName =
  "flex items-center justify-between gap-3 border-b pb-3 text-[13px] font-semibold text-muted-foreground";

/** The big name inside a Home frame. */
export const homeFrameTitleClassName =
  "line-clamp-2 font-display text-[22px] font-semibold leading-tight tracking-tight";

/** Home list rows: single body size; weight/color for hierarchy. */
export const homeRowLinkClassName =
  "flex min-h-11 items-center justify-between gap-3 py-2 text-sm transition-colors hover:bg-muted/50";

export const homeRowTitleClassName = "font-medium text-foreground";

export const homeRowMetaClassName = "text-sm text-muted-foreground";

/** Full-width primary actions on tab screens (Home, Course detail). */
export const pagePrimaryButtonClassName =
  "min-h-12 w-full text-[15px] font-semibold";

/** Multi-line text input matching `components/ui/input`. */
export const textareaClassName =
  "min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm";
