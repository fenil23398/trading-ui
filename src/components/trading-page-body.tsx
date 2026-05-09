"use client";

type TradingPageBodyProps = {
  children: React.ReactNode;
};

/**
 * Mobile: natural document flow.
 * lg: viewport-height shell — no page scroll; inner regions (e.g. left stack) scroll.
 */
export function TradingPageBody({ children }: TradingPageBodyProps) {
  return (
    <div className="flex min-h-0 w-full flex-col overflow-x-hidden bg-background px-2 py-2 text-text-primary sm:px-3 lg:box-border lg:flex lg:h-[100vh] lg:max-h-[100vh] lg:min-h-0 lg:flex-col lg:overflow-hidden">
      {children}
    </div>
  );
}
