'use client';

import { useEffect, type ReactNode } from 'react';

type PhoneSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider dialog on desktop (forms with many fields) */
  wide?: boolean;
  /** Extra-wide (e.g. create sale) */
  xwide?: boolean;
};

/**
 * Full-screen sheet on mobile; centered dialog on sm+.
 * Use for all admin popups so phone UX is consistent.
 */
export default function PhoneSheet({
  title,
  onClose,
  children,
  footer,
  wide,
  xwide,
}: PhoneSheetProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const maxW = xwide ? 'sm:max-w-3xl' : wide ? 'sm:max-w-2xl' : 'sm:max-w-md';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div
        className={`bg-white flex flex-col w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl ${maxW} rounded-none sm:shadow-xl`}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="block w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 gap-3">
          <h2 className="font-bold text-lg truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
