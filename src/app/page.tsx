import { MarketPanelTabs } from "@/components/market-panel-tabs";
import { OrderEntryPanel } from "@/components/order-entry-panel";
import { PositionsPnLPanel } from "@/components/positions-pnl-panel";
import { TradingChart } from "@/components/trading-chart";
import { TradingDocumentTitle } from "@/components/trading-document-title";
import { TradingHeader } from "@/components/trading-header";
import { normalizePair } from "@/lib/trading";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const pairParam = params.pair;
  const pairValue = Array.isArray(pairParam) ? pairParam[0] : pairParam;
  const selectedPair = normalizePair(pairValue);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-background px-2 py-2 text-text-primary sm:px-3 lg:px-4">
      <TradingDocumentTitle pair={selectedPair} />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2">
        <TradingHeader selectedPair={selectedPair} />

        {/*
          Mobile: single column — chart+book, then place order, then positions (last).
          Desktop: grid areas — left column chart (70vh row) + positions; right column order spans full height.
        */}
        <main className="trading-main-grid">
          <section className="relative z-0 flex w-full min-w-0 flex-col overflow-hidden self-start px-0 py-0 [grid-area:chart] lg:min-h-0 lg:self-stretch lg:overflow-visible lg:px-1 lg:py-1">
            <div className="grid min-h-[280px] grid-cols-1 gap-2 sm:min-h-[320px] lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)]">
              <div className="flex min-h-[220px] min-w-0 flex-col sm:min-h-[260px] lg:min-h-0">
                <div className="min-h-0 flex-1 rounded-lg border border-border bg-panel-elevated p-1.5 sm:p-2">
                  <TradingChart pair={selectedPair} />
                </div>
              </div>
              <div className="min-h-[240px] min-w-0 lg:min-h-0">
                <MarketPanelTabs key={selectedPair} pair={selectedPair} />
              </div>
            </div>
          </section>

          <div className="relative z-0 flex w-full min-w-0 shrink-0 flex-col bg-background lg:z-auto lg:h-full lg:min-h-0 lg:self-stretch lg:overflow-hidden lg:bg-transparent [grid-area:order]">
            <OrderEntryPanel pair={selectedPair} />
          </div>

          <div className="mt-1 w-full min-w-0 shrink-0 sm:mt-0 lg:mt-0 lg:min-h-0 lg:px-1 lg:self-stretch [grid-area:positions]">
            <PositionsPnLPanel key={selectedPair} pair={selectedPair} />
          </div>
        </main>
      </div>
    </div>
  );
}
