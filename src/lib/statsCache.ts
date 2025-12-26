// src/lib/statsCache.ts
export type StatsSnapshot = {
    profileId: string;
    updatedAt: number;
    x01?: any;
    cricket?: any;
    dartSets?: any;
  };
  
  const LS_KEY = "dc-stats-cache-v1";
  
  export function loadStatsCache(): Record<string, StatsSnapshot> {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  
  export function saveStatsCache(map: Record<string, StatsSnapshot>) {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  }
  