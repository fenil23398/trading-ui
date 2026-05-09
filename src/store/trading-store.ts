"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { realizedPnlUsdt } from "@/lib/position-risk";
import type { SupportedPair } from "@/lib/trading";

export type OpenOrder = {
  id: string;
  pair: SupportedPair;
  side: "buy" | "sell";
  sizeUsdt: number;
  leverage: number;
  entryPrice: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: number;
};

export const PAPER_FUND_TOP_UP_USDT = 20;

const DEFAULT_BALANCE = 100;

type TradingState = {
  virtualBalance: number;
  orders: OpenOrder[];
  initialized: boolean;
  initializePaperSession: () => void;
  addPaperFunds: (amountUsdt?: number) => void;
  placeOrder: (
    order: Omit<OpenOrder, "id" | "createdAt">,
  ) => { ok: boolean; reason?: string };
  closeOrder: (id: string, exitPrice: number) => void;
  closeAllOrders: (marksByPair: Partial<Record<SupportedPair, number>>) => void;
};

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      virtualBalance: 0,
      orders: [],
      initialized: false,
      initializePaperSession: () => {
        set((state) => {
          if (state.initialized) return state;
          return {
            virtualBalance: DEFAULT_BALANCE,
            orders: [],
            initialized: true,
          };
        });
      },
      addPaperFunds: (amountUsdt = PAPER_FUND_TOP_UP_USDT) => {
        const n = Number(amountUsdt);
        if (!Number.isFinite(n) || n <= 0) return;
        set((state) => ({
          virtualBalance: state.virtualBalance + n,
        }));
      },
      placeOrder: (order) => {
        const { initialized, virtualBalance } = get();
        if (!initialized) {
          return { ok: false, reason: "Paper session not initialized" };
        }

        if (order.sizeUsdt <= 0) {
          return { ok: false, reason: "Invalid order size" };
        }

        if (order.sizeUsdt > virtualBalance) {
          return { ok: false, reason: "Insufficient virtual balance" };
        }

        const nextOrder: OpenOrder = {
          ...order,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };

        set((state) => ({
          orders: [nextOrder, ...state.orders],
          virtualBalance: Math.max(0, state.virtualBalance - order.sizeUsdt),
        }));

        return { ok: true };
      },
      closeOrder: (id, exitPrice) => {
        const closingOrder = get().orders.find((o) => o.id === id);
        if (!closingOrder) return;

        const exit =
          exitPrice > 0 && Number.isFinite(exitPrice)
            ? exitPrice
            : closingOrder.entryPrice;
        const pnl = realizedPnlUsdt(closingOrder, exit);
        const credit = closingOrder.sizeUsdt + pnl;

        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
          virtualBalance: Math.max(0, state.virtualBalance + credit),
        }));
      },
      closeAllOrders: (marksByPair) => {
        set((state) => {
          if (state.orders.length === 0) return state;
          let credit = 0;
          for (const o of state.orders) {
            const mark = marksByPair[o.pair];
            const exit =
              mark !== undefined && mark > 0 && Number.isFinite(mark)
                ? mark
                : o.entryPrice;
            const pnl = realizedPnlUsdt(o, exit);
            credit += o.sizeUsdt + pnl;
          }
          return {
            orders: [],
            virtualBalance: Math.max(0, state.virtualBalance + credit),
          };
        });
      },
    }),
    {
      name: "trading-ui-paper",
      partialize: (state) => ({
        virtualBalance: state.virtualBalance,
        orders: state.orders,
        initialized: state.initialized,
      }),
    },
  ),
);
