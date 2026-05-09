"use client";

type TradingLeftStackProps = {
  children: React.ReactNode;
};

/**
 * lg: sole vertical scroll area for chart + order book + positions (main grid clips page).
 */
export function TradingLeftStack({ children }: TradingLeftStackProps) {
  return (
    <div className="order-1 flex w-full min-w-0 flex-col gap-3 sm:gap-2 lg:order-none lg:h-full lg:min-h-0 lg:max-h-full lg:flex-col lg:items-stretch lg:overflow-y-auto lg:overscroll-contain [grid-area:left]">
      {children}
    </div>
  );
}
