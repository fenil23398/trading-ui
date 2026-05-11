"use client";

type TradingLeftStackProps = {
  children: React.ReactNode;
};

/**
 * lg: fills grid row; chart + order book flex-7 (min 436px), positions flex-3 with min height; each scrolls inside.
 * Short viewports: whole column can scroll if min heights exceed the row.
 */
export function TradingLeftStack({ children }: TradingLeftStackProps) {
  return (
    <div className="order-1 flex w-full min-w-0 flex-col gap-3 sm:gap-2 lg:order-none lg:flex lg:h-full lg:min-h-0 lg:max-h-full lg:flex-1 lg:flex-col lg:items-stretch lg:gap-2 lg:overflow-y-auto lg:overscroll-contain [grid-area:left]">
      {children}
    </div>
  );
}
