"use client";

import { Layers, X } from "lucide-react";
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

/** Two-line stacks — same density as order book / place order helpers */
const stackOuter =
  "flex flex-col gap-0.5 font-mono text-[10px] tabular-nums leading-tight text-text-primary lg:text-[11px]";
const stackRow = "flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0";
const stackLabel =
  "shrink-0 text-[9px] font-medium uppercase tracking-wide text-text-secondary";

function EntryLiqStack({
  row,
  className = "",
}: {
  row: { pair: SupportedPair; entryPrice: number; liquidation: number };
  className?: string;
}) {
  const entry = formatPrice(row.entryPrice, row.pair);
  const liq = row.liquidation > 0 ? formatPrice(row.liquidation, row.pair) : "—";
  return (
    <div className={`${stackOuter} ${className}`}>
      <div className={stackRow}>
        <span className={stackLabel}>Entry</span>
        <span className="min-w-0 text-text-primary">{entry}</span>
      </div>
      <div className={stackRow}>
        <span className={stackLabel}>Liq</span>
        <span className="min-w-0 text-text-primary">{liq}</span>
      </div>
    </div>
  );
}

function TpSlStack({
  row,
  className = "",
}: {
  row: { pair: SupportedPair; stopLoss?: number; takeProfit?: number };
  className?: string;
}) {
  const tp =
    row.takeProfit != null && row.takeProfit > 0
      ? formatPrice(row.takeProfit, row.pair)
      : "—";
  const sl =
    row.stopLoss != null && row.stopLoss > 0
      ? formatPrice(row.stopLoss, row.pair)
      : "—";
  return (
    <div className={`${stackOuter} ${className}`}>
      <div className={stackRow}>
        <span className={stackLabel}>TP</span>
        <span className="min-w-0 text-text-primary">{tp}</span>
      </div>
      <div className={stackRow}>
        <span className={stackLabel}>SL</span>
        <span className="min-w-0 text-text-primary">{sl}</span>
      </div>
    </div>
  );
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

  const isEmpty = rows.length === 0;

  return (
    <aside
      className={`flex w-full flex-col rounded-xl border border-border bg-panel-elevated ${
        isEmpty
          ? "min-h-0 shrink-0 overflow-hidden p-3 sm:p-4 lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col"
          : "max-h-[min(56vh,620px)] shrink-0 overflow-hidden p-3 sm:p-4 lg:max-h-none lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-1 lg:basis-0 lg:flex-col lg:overflow-hidden lg:p-3"
      }`}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Open positions</h2>
          {!isEmpty ? (
            <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none text-text-secondary ring-1 ring-border/80">
              {rows.length}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => closeAllOrders(marksByPair)}
          disabled={rows.length === 0}
          className="shrink-0 rounded border border-sell/40 bg-panel px-2 py-1 text-[10px] font-medium text-sell transition hover:bg-sell/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Close all
        </button>
      </div>

      <div
        className={`flex flex-col overflow-hidden rounded-lg border border-border bg-panel/50 ${
          isEmpty ? "shrink-0 lg:min-h-0 lg:flex-1" : "min-h-0 flex-1 basis-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden"
        }`}
      >
        <div className={`flex flex-col overflow-hidden lg:hidden ${isEmpty ? "shrink-0" : "min-h-0 flex-1"}`}>
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-elevated ring-1 ring-border/60">
                <Layers className="h-5 w-5 text-text-secondary" aria-hidden />
              </div>
              <p className="text-sm font-medium text-text-primary">No open positions</p>
              <p className="max-w-[240px] text-xs leading-relaxed text-text-secondary">
                Place an order to see live PnL, liquidation, and risk for {formatPairLabel(pair)}.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-auto p-2.5 sm:p-3 [scrollbar-width:thin] lg:overscroll-y-contain max-lg:[-webkit-overflow-scrolling:touch]">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`relative overflow-hidden rounded-lg border border-border bg-panel-elevated p-3 ${
                    row.side === "buy" ? "border-l-[3px] border-l-buy" : "border-l-[3px] border-l-sell"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        className={`truncate font-mono text-sm font-semibold tracking-tight ${
                          row.side === "buy" ? "text-buy" : "text-sell"
                        }`}
                      >
                        {row.pair.replace("USDT", "/USDT")}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ${
                          row.side === "buy"
                            ? "bg-buy/15 text-buy ring-buy/25"
                            : "bg-sell/15 text-sell ring-sell/25"
                        }`}
                      >
                        {row.leverage}x
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${
                          row.side === "buy"
                            ? "text-buy ring-buy/20 bg-buy/5"
                            : "text-sell ring-sell/20 bg-sell/5"
                        }`}
                      >
                        {row.side === "buy" ? "Long" : "Short"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => closeOrder(row.id, row.mark)}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-medium text-text-secondary transition hover:border-sell/40 hover:bg-sell/10 hover:text-sell"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      Close
                    </button>
                  </div>
                  <div className="mb-3 rounded-lg border border-border bg-panel px-2.5 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                      Unrealized PnL
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${
                        row.pnl >= 0 ? "text-buy" : "text-sell"
                      }`}
                    >
                      {row.pnl >= 0 ? "+" : "-"}${formatCompact(Math.abs(row.pnl), 2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-panel p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                        Entry/Liq
                      </p>
                      <div className="mt-1">
                        <EntryLiqStack row={row} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-panel p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">Mark</p>
                      <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-text-primary">
                        {formatPrice(row.mark, row.pair)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-panel p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">Qty</p>
                      <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-text-primary">
                        {formatCompact(row.quantity, 3)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-panel p-2 sm:col-span-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                        Collateral
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-text-primary">
                        ${formatCompact(row.sizeUsdt, 2)}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-border bg-panel p-2 sm:col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">TP/SL</p>
                      <div className="mt-1">
                        <TpSlStack row={row} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`hidden w-full min-w-0 flex-col overflow-hidden lg:flex ${isEmpty ? "min-h-0 shrink-0" : "min-h-0 flex-1 basis-0"}`}
        >
          {isEmpty ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-3 py-8 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-elevated ring-1 ring-border/60">
                <Layers className="h-4 w-4 text-text-secondary" aria-hidden />
              </div>
              <p className="text-xs font-medium text-text-primary">No open positions</p>
              <p className="max-w-xs text-[11px] leading-snug text-text-secondary">
                Place an order to see positions here. Markets update in real time.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
              <div className="min-h-0 min-w-0 flex-1 basis-0 overflow-x-auto overflow-y-auto overscroll-y-contain [scrollbar-width:thin] lg:overscroll-y-contain">
                <div className="flex min-w-[640px] flex-col">
                  <div className="sticky top-0 z-10 grid shrink-0 grid-cols-[0.62fr_0.92fr_0.72fr_0.48fr_0.52fr_0.82fr_0.58fr_0.48fr] gap-x-0.5 border-b border-border bg-panel-elevated px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                    <span>Pair</span>
                    <span className="text-right">Entry/Liq</span>
                    <span className="text-right">Mark</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Collateral</span>
                    <span className="text-right">TP/SL</span>
                    <span className="text-right">PnL</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="min-w-[640px] divide-y divide-border/50">
                    {rows.map((row, index) => (
                    <div
                      key={row.id}
                      className={`grid grid-cols-[0.62fr_0.92fr_0.72fr_0.48fr_0.52fr_0.82fr_0.58fr_0.48fr] items-start gap-x-0.5 px-2 py-1.5 text-[11px] transition-colors hover:bg-panel-elevated/40 ${
                        index % 2 === 1 ? "bg-panel/25" : ""
                      }`}
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-1 pt-0.5">
                        <span
                          className={`font-mono font-semibold ${
                            row.side === "buy" ? "text-buy" : "text-sell"
                          }`}
                        >
                          {row.pair.replace("USDT", "/USDT")}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1 py-px text-[9px] font-bold tabular-nums ring-1 ${
                            row.side === "buy"
                              ? "bg-buy/15 text-buy ring-buy/25"
                              : "bg-sell/15 text-sell ring-sell/25"
                          }`}
                        >
                          {row.leverage}x
                        </span>
                      </span>
                      <span className="text-right">
                        <EntryLiqStack row={row} className="items-end text-right" />
                      </span>
                      <span className="pt-0.5 text-right font-mono text-[11px] tabular-nums text-text-primary">
                        {formatPrice(row.mark, row.pair)}
                      </span>
                      <span className="pt-0.5 text-right font-mono text-[11px] tabular-nums text-text-primary">
                        {formatCompact(row.quantity, 3)}
                      </span>
                      <span className="pt-0.5 text-right font-mono text-[11px] tabular-nums text-text-primary">
                        ${formatCompact(row.sizeUsdt, 2)}
                      </span>
                      <span className="text-right">
                        <TpSlStack row={row} className="items-end text-right" />
                      </span>
                      <span
                        className={`pt-0.5 text-right font-mono text-xs font-semibold tabular-nums ${
                          row.pnl >= 0 ? "text-buy" : "text-sell"
                        }`}
                        title={`ROE ${row.roe.toFixed(2)}% · ${row.leverage}x`}
                      >
                        {row.pnl >= 0 ? "+" : "-"}${formatCompact(Math.abs(row.pnl), 2)}
                      </span>
                      <span className="pt-0.5 text-right">
                        <button
                          type="button"
                          onClick={() => closeOrder(row.id, row.mark)}
                          className="inline-flex items-center gap-0.5 rounded-md border border-border bg-panel px-1.5 py-0.5 text-[10px] font-medium text-text-secondary transition hover:border-sell/45 hover:bg-sell/10 hover:text-sell"
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                          Close
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`mt-3 flex shrink-0 items-center justify-between rounded-lg border border-border bg-panel px-2 py-2 sm:px-3 ${
          isEmpty ? "opacity-80" : ""
        }`}
      >
        <span className="text-xs text-text-secondary">Total unrealized PnL</span>
        <span
          className={`font-mono text-sm font-semibold tabular-nums ${
            totalPnl >= 0 ? "text-buy" : "text-sell"
          }`}
        >
          {totalPnl >= 0 ? "+" : "-"}${formatCompact(Math.abs(totalPnl), 2)}
        </span>
      </div>
    </aside>
  );
}
