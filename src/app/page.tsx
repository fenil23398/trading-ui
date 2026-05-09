import { ConnectedPositionsSection } from "@/components/connected-positions-section";
import { TradingLeftStack } from "@/components/trading-left-stack";
import { TradingMainColumn } from "@/components/trading-main-column";
import { TradingMainGrid } from "@/components/trading-main-grid";
import { OrderEntryPanel } from "@/components/order-entry-panel";
import { TradingChartSlot } from "@/components/trading-chart-slot";
import { TradingPageBody } from "@/components/trading-page-body";
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
    <TradingPageBody>
      <TradingDocumentTitle pair={selectedPair} />
      <TradingMainColumn>
        <TradingHeader selectedPair={selectedPair} />

        {/*
          Mobile: left stack → place order.
          lg: left (chart + book + positions) | place order (max 100vh on columns via components).
        */}
        <TradingMainGrid>
          <TradingLeftStack>
            <TradingChartSlot pair={selectedPair} />
            <ConnectedPositionsSection pair={selectedPair} />
          </TradingLeftStack>

          <div className="order-3 flex w-full min-w-0 shrink-0 flex-col bg-background lg:order-none lg:h-full lg:min-h-0 lg:max-h-full lg:overflow-hidden lg:self-stretch lg:bg-transparent [grid-area:order]">
            <OrderEntryPanel pair={selectedPair} />
          </div>
        </TradingMainGrid>
      </TradingMainColumn>
    </TradingPageBody>
  );
}
