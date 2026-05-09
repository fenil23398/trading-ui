"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { SupportedPair } from "@/lib/trading";

type TradingChartProps = {
  pair: SupportedPair;
};

type Theme = "dark" | "light";
type BinanceRestKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceKlineStreamMessage = {
  k: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
};

const DEFAULT_BAR_SPACING = 7;
const MIN_BAR_SPACING = 3;
const MAX_BAR_SPACING = 22;
const INTERVALS = ["1m", "5m", "15m", "1h", "4h"] as const;
type Interval = (typeof INTERVALS)[number];

function getTheme(): Theme {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function applyThemeOptions(chart: IChartApi, isDark: boolean) {
  chart.applyOptions({
    layout: {
      background: {
        type: ColorType.Solid,
        color: isDark ? "#121215" : "#f1f5f9",
      },
      textColor: isDark ? "#a1a1aa" : "#475569",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: isDark ? "#27272a" : "#dbe4ef" },
      horzLines: { color: isDark ? "#27272a" : "#dbe4ef" },
    },
    rightPriceScale: {
      borderColor: isDark ? "#2b2b30" : "#cbd5e1",
      scaleMargins: { top: 0.1, bottom: 0.06 },
    },
    timeScale: {
      borderColor: isDark ? "#2b2b30" : "#cbd5e1",
      timeVisible: true,
      secondsVisible: false,
      barSpacing: DEFAULT_BAR_SPACING,
    },
    crosshair: {
      vertLine: { color: isDark ? "#3f3f46" : "#94a3b8", width: 1, style: LineStyle.Dashed },
      horzLine: { color: isDark ? "#3f3f46" : "#94a3b8", width: 1, style: LineStyle.Dashed },
    },
  });
}

function klineToCandle(
  kline:
    | BinanceRestKline
    | { t: number; o: string; h: string; l: string; c: string; v?: string },
): CandlestickData<Time> {
  if (Array.isArray(kline)) {
    return {
      time: Math.floor(kline[0] / 1000) as Time,
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
    };
  }

  return {
    time: Math.floor(kline.t / 1000) as Time,
    open: Number(kline.o),
    high: Number(kline.h),
    low: Number(kline.l),
    close: Number(kline.c),
  };
}

function klineToVolume(
  kline: BinanceRestKline | { t: number; o: string; c: string; v?: string },
): { time: Time; value: number; color: string } {
  const open = Number(Array.isArray(kline) ? kline[1] : kline.o);
  const close = Number(Array.isArray(kline) ? kline[4] : kline.c);
  const volume = Number(Array.isArray(kline) ? kline[5] : kline.v ?? 0);

  return {
    time: Math.floor((Array.isArray(kline) ? kline[0] : kline.t) / 1000) as Time,
    value: volume,
    color: close >= open ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)",
  };
}

export function TradingChart({ pair }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const barSpacingRef = useRef(DEFAULT_BAR_SPACING);
  const [interval, setInterval] = useState<Interval>("15m");

  const updateBarSpacing = (delta: number) => {
    if (!chartRef.current) {
      return;
    }

    const nextBarSpacing = Math.min(
      MAX_BAR_SPACING,
      Math.max(MIN_BAR_SPACING, barSpacingRef.current + delta),
    );

    barSpacingRef.current = nextBarSpacing;
    chartRef.current.timeScale().applyOptions({ barSpacing: nextBarSpacing });
  };

  const fitChart = () => {
    chartRef.current?.timeScale().fitContent();
    barSpacingRef.current = DEFAULT_BAR_SPACING;
    chartRef.current?.timeScale().applyOptions({ barSpacing: DEFAULT_BAR_SPACING });
  };

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const theme = getTheme();
    const isDark = theme === "dark";
    const chart = createChart(containerRef.current, {
      autoSize: true,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });
    applyThemeOptions(chart, isDark);

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: true,
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceLineVisible: true,
      lastValueVisible: true,
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dotted,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    const observer = new MutationObserver(() => {
      const nextTheme = getTheme();
      const nextIsDark = nextTheme === "dark";
      applyThemeOptions(chart, nextIsDark);
      chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) {
      return;
    }

    const streamPair = pair.toLowerCase();
    const selectedInterval = interval;
    const abortController = new AbortController();
    let socket: WebSocket | null = null;
    let cancelled = false;

    const loadInitialCandles = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${selectedInterval}&limit=300`,
          { signal: abortController.signal },
        );
        const rawKlines = (await response.json()) as BinanceRestKline[];

        if (cancelled || !seriesRef.current) {
          return;
        }

        const candles = rawKlines.map((kline) => klineToCandle(kline));
        const volumes = rawKlines.map((kline) => klineToVolume(kline));
        seriesRef.current.setData(candles);
        volumeSeriesRef.current?.setData(volumes);
        fitChart();

        socket = new WebSocket(
          `wss://stream.binance.com:9443/ws/${streamPair}@kline_${selectedInterval}`,
        );

        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data) as BinanceKlineStreamMessage;
          const nextCandle = klineToCandle(payload.k);
          const nextVolume = klineToVolume(payload.k);
          seriesRef.current?.update(nextCandle);
          volumeSeriesRef.current?.update(nextVolume);
        };
      } catch {
        // Keep chart alive; websocket/live data can retry on next pair switch.
      }
    };

    void loadInitialCandles();

    return () => {
      cancelled = true;
      abortController.abort();
      socket?.close();
    };
  }, [interval, pair]);

  return (
    <div className="relative h-full min-h-[200px] w-full min-w-0 rounded-lg">
      <div className="absolute left-1.5 right-1.5 top-1.5 z-10 flex max-w-full flex-wrap items-center gap-1.5 sm:left-2 sm:right-auto sm:top-2 sm:max-w-[calc(100%-1rem)] sm:gap-2">
        <span className="pointer-events-none shrink-0 rounded-md bg-panel/90 px-1.5 py-0.5 text-[9px] font-semibold text-text-primary shadow sm:px-2 sm:py-1 sm:text-[10px]">
          {pair.replace("USDT", "/USDT")}
        </span>
        <div className="flex min-w-0 max-w-full flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-md bg-panel/90 p-0.5 shadow [scrollbar-width:none] sm:flex-initial sm:max-w-none sm:gap-1 sm:p-1 [&::-webkit-scrollbar]:hidden">
          {INTERVALS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setInterval(item)}
              className={`shrink-0 rounded px-1 py-0.5 text-[9px] transition sm:px-1.5 sm:text-[10px] ${
                interval === item
                  ? "bg-brand/20 text-brand"
                  : "text-text-secondary hover:bg-panel-elevated"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 z-10 flex max-w-[calc(100%-0.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-md bg-panel/80 p-0.5 shadow sm:bottom-3 sm:gap-1 sm:p-1">
        <button
          type="button"
          onClick={() => updateBarSpacing(1)}
          className="rounded-md border border-border bg-panel/90 px-2 py-1 text-xs text-text-primary transition hover:bg-panel"
          aria-label="Zoom in chart"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => updateBarSpacing(-1)}
          className="rounded-md border border-border bg-panel/90 px-2 py-1 text-xs text-text-primary transition hover:bg-panel"
          aria-label="Zoom out chart"
        >
          -
        </button>
        <button
          type="button"
          onClick={fitChart}
          className="rounded-md border border-border bg-panel/90 px-2 py-1 text-[10px] text-text-primary transition hover:bg-panel"
          aria-label="Fit chart to data"
        >
          Fit
        </button>
      </div>

      <div ref={containerRef} className="h-full w-full rounded-lg" />
    </div>
  );
}
