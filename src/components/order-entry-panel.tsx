"use client";

import { useAppKit } from "@reown/appkit/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatCompact, formatPrice } from "@/lib/format";
import { validateOrderForm } from "@/lib/order-validation";
import { estimateLiquidationPrice } from "@/lib/position-risk";
import { formatPairLabel, MAX_LEVERAGE_BY_PAIR, type SupportedPair } from "@/lib/trading";
import { isReownConfigured } from "@/lib/wallet-config";
import { PAPER_FUND_TOP_UP_USDT, useTradingStore } from "@/store/trading-store";

type Side = "buy" | "sell";
type ExecutionState = "idle" | "validating" | "matching" | "filled";

type OrderEntryPanelProps = {
  pair: SupportedPair;
};

export function OrderEntryPanel({ pair }: OrderEntryPanelProps) {
  const [side, setSide] = useState<Side>("buy");
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [useProtection, setUseProtection] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [executionState, setExecutionState] = useState<ExecutionState>("idle");
  const [executionMessage, setExecutionMessage] = useState(
    "Ready to simulate order execution",
  );
  const [markPrice, setMarkPrice] = useState(0);
  const virtualBalance = useTradingStore((state) => state.virtualBalance);
  const initialized = useTradingStore((state) => state.initialized);
  const initializePaperSession = useTradingStore((state) => state.initializePaperSession);
  const placeOrder = useTradingStore((state) => state.placeOrder);
  const addPaperFunds = useTradingStore((state) => state.addPaperFunds);

  const effectiveBalance = initialized ? virtualBalance : 0;

  const maxLeverage = MAX_LEVERAGE_BY_PAIR[pair];
  const sizeNumber = Number(size) || 0;
  const needsAddFunds =
    initialized && sizeNumber > 0 && sizeNumber > effectiveBalance + 1e-9;

  const progress = useMemo(() => {
    switch (executionState) {
      case "validating":
        return 35;
      case "matching":
        return 75;
      case "filled":
        return 100;
      default:
        return 0;
    }
  }, [executionState]);

  const stages: Array<{ id: "validating" | "matching" | "filled"; label: string }> = [
    { id: "validating", label: "Validate" },
    { id: "matching", label: "Match" },
    { id: "filled", label: "Done" },
  ];

  const totalOrderSize = sizeNumber > 0 ? sizeNumber * leverage : 0;

  useEffect(() => {
    initializePaperSession();
  }, [initializePaperSession]);

  useEffect(() => {
    const symbol = pair.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { p: string };
      setMarkPrice(Number(payload.p));
    };

    return () => ws.close();
  }, [pair]);

  const riskInfo = useMemo(() => {
    const referencePrice = markPrice > 0 ? markPrice : 0;
    const openFeeRate = 0.0004;
    const borrowerHourlyRate = 0.0001;

    if (referencePrice <= 0 || sizeNumber <= 0 || leverage <= 0) {
      return {
        estLiquidationPrice: 0,
        openFee: 0,
        borrowerFee: 0,
      };
    }

    const openFee = sizeNumber * openFeeRate;
    const borrowerFee = sizeNumber * borrowerHourlyRate;

    return {
      estLiquidationPrice: estimateLiquidationPrice({
        side,
        referencePrice,
        sizeUsdt: sizeNumber,
        leverage,
      }),
      openFee,
      borrowerFee,
    };
  }, [leverage, markPrice, side, sizeNumber]);

  const validation = useMemo(
    () =>
      validateOrderForm({
        side,
        pair,
        sizeNumber,
        virtualBalance: effectiveBalance,
        markPrice,
        liquidationPrice: riskInfo.estLiquidationPrice,
        useProtection,
        stopLossStr: stopLoss,
        takeProfitStr: takeProfit,
      }),
    [
      side,
      pair,
      sizeNumber,
      effectiveBalance,
      markPrice,
      riskInfo.estLiquidationPrice,
      useProtection,
      stopLoss,
      takeProfit,
    ],
  );

  const sizePlaceholder = useMemo(() => {
    if (!initialized) return "Order size (USDT)";
    return `Order size (USDT) · max ${effectiveBalance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [initialized, effectiveBalance]);

  const simulateExecution = () => {
    if (!validation.isValid) {
      return;
    }

    setExecutionState("validating");
    setExecutionMessage("Validating order inputs...");

    window.setTimeout(() => {
      setExecutionState("matching");
      setExecutionMessage("Sending order to matching engine...");
    }, 700);

    window.setTimeout(() => {
      const entryPrice = markPrice > 0 ? markPrice : 0;
      const slRaw = useProtection ? Number(stopLoss) : NaN;
      const tpRaw = useProtection ? Number(takeProfit) : NaN;

      const result = placeOrder({
        pair,
        side,
        sizeUsdt: sizeNumber,
        leverage,
        entryPrice,
        liquidationPrice:
          entryPrice > 0
            ? estimateLiquidationPrice({
                side,
                referencePrice: entryPrice,
                sizeUsdt: sizeNumber,
                leverage,
              })
            : 0,
        stopLoss: Number.isFinite(slRaw) && slRaw > 0 ? slRaw : undefined,
        takeProfit: Number.isFinite(tpRaw) && tpRaw > 0 ? tpRaw : undefined,
      });

      if (!result.ok) {
        setExecutionState("idle");
        setExecutionMessage("Ready to simulate order execution");
        return;
      }

      setExecutionState("filled");
      setExecutionMessage("");
      setSize("");
    }, 1600);
  };

  useEffect(() => {
    if (executionState !== "filled") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExecutionState("idle");
      setExecutionMessage("Ready to simulate order execution");
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [executionState]);

  return (
    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel p-3 sm:p-4 lg:h-full">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
        <h2 className="text-sm font-semibold">Place Order</h2>
        <span className="rounded-md bg-panel-elevated px-2 py-1 text-xs text-text-secondary">
          Max leverage {maxLeverage}x
        </span>
      </div>

      <div className="grid max-h-[min(72vh,640px)] min-h-0 grid-cols-1 gap-3 overflow-y-auto overscroll-contain pr-1 lg:max-h-none lg:flex-1 lg:min-h-0">
        <div className="rounded-lg border border-border bg-panel-elevated p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                side === "buy"
                  ? "bg-buy/20 text-buy"
                  : "bg-panel text-text-secondary hover:bg-panel"
              }`}
            >
              Buy / Long
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                side === "sell"
                  ? "bg-sell/20 text-sell"
                  : "bg-panel text-text-secondary hover:bg-panel"
              }`}
            >
              Sell / Short
            </button>
          </div>

          <div className="my-3 border-t border-border/70" />

          <div>
            <input
              value={size}
              onChange={(event) => setSize(event.target.value)}
              inputMode="decimal"
              placeholder={sizePlaceholder}
              className={`w-full rounded-md border bg-panel px-3 py-2 text-sm outline-none focus:border-brand ${
                sizeNumber > 0 && sizeNumber > effectiveBalance ? "border-sell" : "border-border"
              }`}
            />
            {sizeNumber <= 0 ? (
              <p className="mt-1 text-[10px] text-text-secondary">
                Enter a valid order size (USDT).
              </p>
            ) : null}
            {sizeNumber > 0 && sizeNumber > effectiveBalance ? (
              <p className="mt-1 text-[10px] text-sell">{validation.sizeError}</p>
            ) : null}
          </div>

          <div className="my-3 border-t border-border/70" />

          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-text-secondary">Leverage</p>
            <p className="text-xs font-semibold">{leverage}x</p>
          </div>
          <input
            type="range"
            min={1}
            max={maxLeverage}
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
            className="w-full accent-brand"
          />

          <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-panel px-2 py-1.5 text-xs">
            <span className="text-text-secondary">Total order size</span>
            <span className="font-semibold text-text-primary">
              {totalOrderSize > 0 ? `${formatCompact(totalOrderSize, 2)} USDT` : "--"}
            </span>
          </div>

          <div className="my-3 border-t border-border/70" />

          <label className="mb-2 flex flex-col gap-1 text-xs text-text-secondary">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useProtection}
                onChange={(event) => setUseProtection(event.target.checked)}
              />
              Stop loss / Take profit
            </span>
            {useProtection ? (
              <span className="pl-6 text-[10px] text-text-secondary/90">
                By price · {formatPairLabel(pair)}
              </span>
            ) : null}
          </label>
          {useProtection ? (
            <div className="grid grid-cols-1 gap-2">
              <div>
                <input
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                  inputMode="decimal"
                  placeholder="Stop loss"
                  className={`w-full rounded-md border bg-panel px-3 py-2 text-sm outline-none focus:border-brand ${
                    validation.stopLossError ? "border-sell" : "border-border"
                  }`}
                />
                {validation.stopLossError ? (
                  <p className="mt-1 text-[10px] text-sell">{validation.stopLossError}</p>
                ) : null}
              </div>
              <div>
                <input
                  value={takeProfit}
                  onChange={(event) => setTakeProfit(event.target.value)}
                  inputMode="decimal"
                  placeholder="Take profit"
                  className={`w-full rounded-md border bg-panel px-3 py-2 text-sm outline-none focus:border-brand ${
                    validation.takeProfitError ? "border-sell" : "border-border"
                  }`}
                />
                {validation.takeProfitError ? (
                  <p className="mt-1 text-[10px] text-sell">{validation.takeProfitError}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="my-3 border-t border-border/70" />
          {isReownConfigured ? (
            <OrderPrimaryCta
              side={side}
              needsAddFunds={needsAddFunds}
              executionState={executionState}
              validationIsValid={validation.isValid}
              onSimulateExecution={simulateExecution}
              onAddFunds={() => {
                addPaperFunds(PAPER_FUND_TOP_UP_USDT);
                setExecutionState("filled");
                setExecutionMessage("");
              }}
            />
          ) : (
            <button
              type="button"
              disabled
              title="Add NEXT_PUBLIC_REOWN_PROJECT_ID to enable Reown wallet modal"
              className="mt-4 w-full rounded-md bg-panel-elevated px-3 py-2 text-sm font-semibold text-text-primary transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}

          <div className="mt-3 rounded-md border border-border bg-panel p-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-text-secondary">Est. liquidation Price</span>
              <span className="text-right font-medium text-text-primary">
                {riskInfo.estLiquidationPrice > 0
                  ? formatPrice(riskInfo.estLiquidationPrice, pair)
                  : "--"}
              </span>

              <span className="text-text-secondary">Borrower Fees</span>
              <span className="text-right font-medium text-text-primary">
                {riskInfo.borrowerFee > 0 ? `${formatCompact(riskInfo.borrowerFee, 3)} USDT/h` : "--"}
              </span>

              <span className="text-text-secondary">Open Fees</span>
              <span className="text-right font-medium text-text-primary">
                {riskInfo.openFee > 0 ? `${formatCompact(riskInfo.openFee, 3)} USDT` : "--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {executionState !== "idle" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[92%] max-w-md -translate-x-1/2 rounded-md border border-border bg-panel px-3 py-2 shadow-lg"
          >
            <div className="mb-2 grid grid-cols-3 gap-1">
              {stages.map((stage) => {
                const active =
                  executionState === stage.id ||
                  (executionState === "matching" && stage.id === "validating") ||
                  (executionState === "filled" &&
                    (stage.id === "validating" || stage.id === "matching"));

                return (
                  <span
                    key={stage.id}
                    className={`rounded px-1.5 py-1 text-center text-[10px] font-medium ${
                      active ? "bg-brand/20 text-brand" : "bg-panel-elevated text-text-secondary"
                    }`}
                  >
                    {stage.label}
                  </span>
                );
              })}
            </div>

            <div className="mb-2 h-1.5 overflow-hidden rounded bg-panel-elevated">
              <motion.div
                className="h-full bg-brand"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            {executionMessage ? (
              <p className="text-[11px] text-text-secondary">{executionMessage}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

type OrderPrimaryCtaProps = {
  side: Side;
  needsAddFunds: boolean;
  executionState: ExecutionState;
  validationIsValid: boolean;
  onSimulateExecution: () => void;
  onAddFunds: () => void;
};

function OrderPrimaryCta({
  side,
  needsAddFunds,
  executionState,
  validationIsValid,
  onSimulateExecution,
  onAddFunds,
}: OrderPrimaryCtaProps) {
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  const isBusy = executionState === "validating" || executionState === "matching";

  const disabled =
    isBusy || (Boolean(isConnected) && !needsAddFunds && !validationIsValid);

  const handleClick = () => {
    if (!isConnected) {
      open();
      return;
    }
    if (needsAddFunds) {
      onAddFunds();
      return;
    }
    onSimulateExecution();
  };

  const colorClass =
    !isConnected || needsAddFunds
      ? "bg-brand hover:opacity-90"
      : side === "buy"
        ? "bg-buy hover:opacity-90"
        : "bg-sell hover:opacity-90";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={!isConnected ? "Connect wallet" : undefined}
      className={`mt-4 w-full rounded-md px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${colorClass}`}
    >
      {isBusy ? (
        "Processing..."
      ) : !isConnected ? (
        <>
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">Connect Wallet</span>
        </>
      ) : needsAddFunds ? (
        `ADD FUNDS (+${PAPER_FUND_TOP_UP_USDT} USDT)`
      ) : side === "buy" ? (
        "Place Buy Order"
      ) : (
        "Place Sell Order"
      )}
    </button>
  );
}
