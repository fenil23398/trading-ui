"use client";

type TradingMainColumnProps = {
  children: React.ReactNode;
};

export function TradingMainColumn({ children }: TradingMainColumnProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
      {children}
    </div>
  );
}
