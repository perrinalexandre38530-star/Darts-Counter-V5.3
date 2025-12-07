// @ts-nocheck
// =============================================================
// src/components/stats/StatsLeaderboardsTab.tsx
// Wrapper pour la page CLASSEMENTS globale
// =============================================================

import * as React from "react";
import type { Store } from "../../lib/types";
import StatsLeaderboardsPage from "../../pages/StatsLeaderboardsPage";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export default function StatsLeaderboardsTab({ store, go }: Props) {
  return <StatsLeaderboardsPage store={store} go={go} />;
}