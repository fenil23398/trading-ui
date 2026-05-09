"use client";

import { useEffect } from "react";
import { formatPrice } from "@/lib/format";
import { formatPairLabel, type SupportedPair } from "@/lib/trading";

type TradingDocumentTitleProps = {
  pair: SupportedPair;
};

export function TradingDocumentTitle({ pair }: TradingDocumentTitleProps) {
  useEffect(() => {
    const label = formatPairLabel(pair);
    document.title = label;

    const symbol = pair.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { c?: string };
      const last = Number(payload.c);
      if (!Number.isFinite(last) || last <= 0) return;
      document.title = `${formatPrice(last, pair)} · ${label}`;
    };

    return () => {
      ws.close();
    };
  }, [pair]);

  return null;
}
