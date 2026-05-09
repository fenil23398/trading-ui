"use client";

import { useAccount } from "wagmi";
import type { SupportedPair } from "@/lib/trading";
import { PositionsPnLPanel } from "@/components/positions-pnl-panel";

type ConnectedPositionsSectionProps = {
  pair: SupportedPair;
};

export function ConnectedPositionsSection({ pair }: ConnectedPositionsSectionProps) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="relative mt-1 w-full min-w-0 shrink-0 bg-background sm:mt-0 lg:mt-0 lg:min-w-0 lg:shrink-0 lg:self-start lg:bg-background lg:px-1">
      <PositionsPnLPanel key={pair} pair={pair} />
    </div>
  );
}
