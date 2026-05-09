"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  closeOrder: (id: string) => void;
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
      closeOrder: (id) => {
        const closingOrder = get().orders.find((o) => o.id === id);
        if (!closingOrder) return;

        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
          virtualBalance: state.virtualBalance + closingOrder.sizeUsdt,
        }));
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
