"use client";

type TradingMainGridProps = {
  children: React.ReactNode;
};

export function TradingMainGrid({ children }: TradingMainGridProps) {
  return (
    <main className="trading-main-grid lg:min-h-0 lg:flex-1 lg:overflow-hidden">{children}</main>
  );
}
