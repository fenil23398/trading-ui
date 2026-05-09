"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCompact, formatPrice } from "@/lib/format";
import type { SupportedPair } from "@/lib/trading";

type MarketTab = "orderbook" | "trades";

type OrderLevel = {
  price: number;
  quantity: number;
  total: number;
};

type RecentTrade = {
  id: number;
  price: number;
  quantity: number;
  isSell: boolean;
  time: number;
};

type BinanceCombinedMessage = {
  stream: string;
  data: {
    b?: string[][];
    a?: string[][];
    bids?: string[][];
    asks?: string[][];
    p?: string;
    q?: string;
    m?: boolean;
    T?: number;
    t?: number;
  };
};

type BinanceDepthSnapshot = {
  bids: string[][];
  asks: string[][];
};

type BinanceDepthMessage = {
  b?: string[][];
  a?: string[][];
  bids?: string[][];
  asks?: string[][];
};

type BinanceTradeMessage = {
  p: string;
  q: string;
  m: boolean;
  T: number;
  t: number;
};

type MarketPanelTabsProps = {
  pair: SupportedPair;
};

/** Matches `@depth20` stream and REST `limit=20` — show full book on laptop/desktop. */
const DEPTH_LEVELS = 20;

function toOrderLevels(levels: string[][] = []): OrderLevel[] {
  let cumulative = 0;

  return levels.slice(0, DEPTH_LEVELS).map(([price, quantity]) => {
    const parsedPrice = Number(price);
    const parsedQty = Number(quantity);
    cumulative += parsedQty;

    return {
      price: parsedPrice,
      quantity: parsedQty,
      total: cumulative,
    };
  });
}

export function MarketPanelTabs({ pair }: MarketPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<MarketTab>("orderbook");
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [trades, setTrades] = useState<RecentTrade[]>([]);

  useEffect(() => {
    const streamPair = pair.toLowerCase();
    const depthSocket = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streamPair}@depth20@100ms`,
    );
    const tradeSocket = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streamPair}@trade`,
    );
    const abortController = new AbortController();

    const loadDepthSnapshot = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${pair}&limit=20`,
          { signal: abortController.signal },
        );
        const snapshot = (await response.json()) as BinanceDepthSnapshot;
        setBids(toOrderLevels(snapshot.bids));
        setAsks(toOrderLevels(snapshot.asks));
      } catch {
        // websocket updates still continue even if snapshot fails
      }
    };

    void loadDepthSnapshot();

    depthSocket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BinanceDepthMessage | BinanceCombinedMessage;
      const data = "data" in payload ? payload.data : payload;

      setBids(toOrderLevels(data.bids ?? data.b));
      setAsks(toOrderLevels(data.asks ?? data.a));
    };

    tradeSocket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BinanceTradeMessage | BinanceCombinedMessage;
      const data = "data" in payload ? payload.data : payload;
      const price = Number(data.p);
      const quantity = Number(data.q);
      const timestamp = data.T ?? Date.now();
      const tradeId = data.t ?? timestamp;

      setTrades((prev) =>
        [
          {
            id: tradeId,
            price,
            quantity,
            isSell: Boolean(data.m),
            time: timestamp,
          },
          ...prev,
        ].slice(0, 40),
      );
    };

    return () => {
      abortController.abort();
      depthSocket.close();
      tradeSocket.close();
    };
  }, [pair]);

  const maxTotal = useMemo(() => {
    const bidMax = bids.at(-1)?.total ?? 0;
    const askMax = asks.at(-1)?.total ?? 0;
    return Math.max(bidMax, askMax, 1);
  }, [asks, bids]);

  return (
    <div className="flex min-h-[220px] w-full flex-col overflow-hidden rounded-lg border border-border bg-panel-elevated p-2 sm:min-h-0 sm:p-2.5 lg:h-full">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("orderbook")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            activeTab === "orderbook"
              ? "bg-panel text-text-primary"
              : "text-text-secondary hover:bg-panel"
          }`}
        >
          Order Book
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("trades")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            activeTab === "trades"
              ? "bg-panel text-text-primary"
              : "text-text-secondary hover:bg-panel"
          }`}
        >
          Trades
        </button>
      </div>

      <div className="relative isolate flex min-h-[200px] flex-1 flex-col overflow-hidden pt-0.5 sm:min-h-[160px] lg:min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "orderbook" ? (
            <motion.div
              key="orderbook"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <div className="h-full overflow-hidden rounded-md border border-border bg-panel">
            <div className="grid grid-cols-3 px-3 py-1.5 text-[11px] text-text-secondary">
              <span>Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Total</span>
            </div>

            <div className="flex h-[calc(100%-27px)] min-h-0 flex-col px-1.5 py-1 text-[11px]">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {[...asks].reverse().map((level) => (
                  <div key={`ask-${level.price}`} className="relative grid grid-cols-3 px-1 py-0.5 lg:py-px">
                  <div
                    className="absolute right-0 top-0 h-full bg-sell/10"
                    style={{ width: `${(level.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative z-10 text-sell">{formatPrice(level.price, pair)}</span>
                  <span className="relative z-10 text-right">{formatCompact(level.quantity, 3)}</span>
                  <span className="relative z-10 text-right text-text-secondary">
                    {formatCompact(level.total, 3)}
                  </span>
                </div>
                ))}
              </div>

              <div className="shrink-0 py-1 text-center text-xs font-semibold text-text-primary">
                Spread{" "}
                {asks[0] && bids[0] ? formatPrice(asks[0].price - bids[0].price, pair) : "--"}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {bids.map((level) => (
                  <div key={`bid-${level.price}`} className="relative grid grid-cols-3 px-1 py-0.5 lg:py-px">
                  <div
                    className="absolute right-0 top-0 h-full bg-buy/10"
                    style={{ width: `${(level.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative z-10 text-buy">{formatPrice(level.price, pair)}</span>
                  <span className="relative z-10 text-right">{formatCompact(level.quantity, 3)}</span>
                  <span className="relative z-10 text-right text-text-secondary">
                    {formatCompact(level.total, 3)}
                  </span>
                </div>
                ))}
              </div>
            </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="trades"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <div className="h-full overflow-hidden rounded-md border border-border bg-panel">
            <div className="grid grid-cols-3 px-3 py-1.5 text-[11px] text-text-secondary">
              <span>Price</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Time</span>
            </div>
            <div className="h-[calc(100%-31px)] overflow-y-auto px-1.5 py-1">
              {trades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-3 px-1 py-0.5 text-[11px]">
                  <span className={trade.isSell ? "text-sell" : "text-buy"}>
                    {formatPrice(trade.price, pair)}
                  </span>
                  <span className="text-right">{formatCompact(trade.quantity, 3)}</span>
                  <span className="text-right text-text-secondary">
                    {new Date(trade.time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
