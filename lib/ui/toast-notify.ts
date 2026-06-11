import { toast } from "sonner";

export const SAVE_SCORES_TOAST_ID = "save-scores-error";

export function toastError(message: string, options?: Parameters<typeof toast.error>[1]) {
  toast.error(message, options);
}

export function toastSuccess(message: string) {
  toast.success(message);
}

export function toastInfo(message: string) {
  toast.info(message);
}

export function toastSaveError(message: string) {
  toast.error(message, { id: SAVE_SCORES_TOAST_ID, duration: Infinity });
}
