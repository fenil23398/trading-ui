"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCompact, formatPrice } from "@/lib/format";
import {
  estimateLiquidationPrice,
  isLiquidationTriggered,
  realizedPnlUsdt,
} from "@/lib/position-risk";
import { formatPairLabel, type SupportedPair } from "@/lib/trading";
import { useTradingStore } from "@/store/trading-store";

type PositionsPnLPanelProps = {
  pair: SupportedPair;
};

function orderLiquidation(order: {
  liquidationPrice?: number;
  entryPrice: number;
  side: "buy" | "sell";
  sizeUsdt: number;
  leverage: number;
}): number {
  const entry = order.entryPrice;
  let liq =
    order.liquidationPrice && order.liquidationPrice > 0
      ? order.liquidationPrice
      : entry > 0
        ? estimateLiquidationPrice({
            side: order.side,
            referencePrice: entry,
            sizeUsdt: order.sizeUsdt,
            leverage: order.leverage,
          })
        : 0;

  if (entry > 0 && liq > 0) {
    if (order.side === "buy" && liq >= entry) liq = 0;
    if (order.side === "sell" && liq <= entry) liq = 0;
  }
  return liq;
}

export function PositionsPnLPanel({ pair }: PositionsPnLPanelProps) {
  const [marksByPair, setMarksByPair] = useState<Partial<Record<SupportedPair, number>>>(
    {},
  );
  const orders = useTradingStore((state) => state.orders);
  const closeOrder = useTradingStore((state) => state.closeOrder);
  const closeAllOrders = useTradingStore((state) => state.closeAllOrders);

  const pairsKey = useMemo(() => {
    const unique = new Set<SupportedPair>();
    for (const o of orders) {
      unique.add(o.pair);
    }
    return [...unique].sort().join(",");
  }, [orders]);

  useEffect(() => {
    const pairs = pairsKey.split(",").filter(Boolean) as SupportedPair[];
    if (pairs.length === 0) {
      queueMicrotask(() => setMarksByPair({}));
      return;
    }

    const streams = pairs.map((p) => `${p.toLowerCase()}@trade`).join("/");
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`,
    );

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as {
        stream?: string;
        data?: { p?: string };
      };
      const stream = message.stream;
      const price = message.data?.p;
      if (!stream || price === undefined) return;
      const symbol = stream.split("@")[0]?.toUpperCase() as SupportedPair | undefined;
      if (!symbol) return;
      const next = Number(price);
      if (!Number.isFinite(next)) return;
      setMarksByPair((prev) => ({ ...prev, [symbol]: next }));
    };

    return () => ws.close();
  }, [pairsKey]);

  useEffect(() => {
    for (const order of orders) {
      const mark = marksByPair[order.pair];
      if (mark === undefined || mark <= 0) continue;
      const liq = orderLiquidation(order);
      if (liq <= 0) continue;
      if (isLiquidationTriggered(order.side, mark, liq)) {
        closeOrder(order.id, mark);
      }
    }
  }, [orders, marksByPair, closeOrder]);

  const rows = useMemo(() => {
    return orders.map((order) => {
      const liveMark = marksByPair[order.pair];
      const mark =
        liveMark !== undefined && liveMark > 0 ? liveMark : order.entryPrice;
      const quantity = order.entryPrice > 0 ? order.sizeUsdt / order.entryPrice : 0;
      const pnl = realizedPnlUsdt(order, mark);
      const notional = order.sizeUsdt;
      const roe = notional > 0 ? (pnl / notional) * 100 : 0;
      const liquidation = orderLiquidation(order);

      return {
        ...order,
        mark,
        quantity,
        pnl,
        roe,
        liquidation,
      };
    });
  }, [marksByPair, orders]);

  const totalPnl = useMemo(
    () => rows.reduce((total, row) => total + row.pnl, 0),
    [rows],
  );

  return (
    <aside className="rounded-lg border border-border bg-panel-elevated p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          Open Positions <span className="text-text-primary/70">· {formatPairLabel(pair)}</span>
        </p>
        <button
          type="button"
          onClick={() => closeAllOrders(marksByPair)}
          disabled={rows.length === 0}
          className="rounded border border-sell/50 px-2 py-1 text-[10px] font-medium text-sell transition hover:bg-sell/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Close all
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border bg-panel">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[0.85fr_0.95fr_0.95fr_0.65fr_0.95fr_0.85fr_0.85fr_0.9fr_0.65fr] border-b border-border px-2 py-1.5 text-[10px] text-text-secondary">
              <span>Pair</span>
              <span className="text-right">Entry</span>
              <span className="text-right">Mark</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Liq.</span>
              <span className="text-right">SL</span>
              <span className="text-right">TP</span>
              <span className="text-right">PnL</span>
              <span className="text-right">Action</span>
            </div>

            <div className="max-h-36 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-text-secondary">
                  No open positions
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[0.85fr_0.95fr_0.95fr_0.65fr_0.95fr_0.85fr_0.85fr_0.9fr_0.65fr] items-center border-b border-border/60 px-2 py-1.5 text-[11px]"
                  >
                    <span className={row.side === "buy" ? "text-buy" : "text-sell"}>
                      {row.pair.replace("USDT", "/USDT")}
                    </span>
                    <span className="text-right">{formatPrice(row.entryPrice, row.pair)}</span>
                    <span className="text-right">{formatPrice(row.mark, row.pair)}</span>
                    <span className="text-right">{formatCompact(row.quantity, 3)}</span>
                    <span className="text-right">
                      {row.liquidation > 0 ? formatPrice(row.liquidation, row.pair) : "--"}
                    </span>
                    <span className="text-right text-text-secondary">
                      {row.stopLoss != null && row.stopLoss > 0
                        ? formatPrice(row.stopLoss, row.pair)
                        : "--"}
                    </span>
                    <span className="text-right text-text-secondary">
                      {row.takeProfit != null && row.takeProfit > 0
                        ? formatPrice(row.takeProfit, row.pair)
                        : "--"}
                    </span>
                    <span
                      className={`text-right font-medium ${
                        row.pnl >= 0 ? "text-buy" : "text-sell"
                      }`}
                      title={`ROE ${row.roe.toFixed(2)}% | ${row.leverage}x`}
                    >
                      {row.pnl >= 0 ? "+" : "-"}${formatCompact(Math.abs(row.pnl), 2)}
                    </span>
                    <span className="text-right">
                      <button
                        type="button"
                        onClick={() => closeOrder(row.id, row.mark)}
                        className="rounded border border-sell/40 px-1.5 py-0.5 text-[10px] text-sell transition hover:bg-sell/10"
                      >
                        Close
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-text-secondary">Total Unrealized PnL</span>
        <span className={`font-semibold ${totalPnl >= 0 ? "text-buy" : "text-sell"}`}>
          {totalPnl >= 0 ? "+" : "-"}${formatCompact(Math.abs(totalPnl), 2)}
        </span>
      </div>
    </aside>
  );
}
