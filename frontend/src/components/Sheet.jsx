import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./ui";

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Closes on Esc, on a
 * tap outside, or with the × button. Locks page scroll while open.
 */
export default function Sheet({ open, onClose, title, children, footer }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-fade absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        className="sheet-up relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl border border-line-strong bg-card shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="ปิด">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <div className="flex shrink-0 gap-2 border-t border-line px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
