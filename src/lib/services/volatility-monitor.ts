import axios from "axios";

// Pyth Hermes API — free, no API key required
const HERMES_BASE = "https://hermes.pyth.network/v2";

// Pyth price feed IDs
export const PYTH_FEEDS = {
  "HBAR/USD": "3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd",
  "USDC/USD": "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
} as const;

export type FeedId = keyof typeof PYTH_FEEDS;

export interface PricePoint {
  price: number;
  confidence: number;
  timestamp: number; // unix seconds
}

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export interface VolatilityState {
  currentPrice: number;
  priceHistory: PricePoint[];
  priceDeltaPercent: number; // % change over the window
  realizedVolatility: number; // std dev of returns
  windowMinutes: number;
  isHighVolatility: boolean;
  threshold: number;
}

// In-memory rolling price window (per feed)
const priceWindows: Map<string, PricePoint[]> = new Map();

// Max history to retain (2 hours at ~30s intervals = 240 points)
const MAX_HISTORY_POINTS = 240;

/**
 * Fetch latest price from Pyth Hermes API
 */
export async function fetchPythPrice(feed: FeedId): Promise<PricePoint> {
  const feedId = PYTH_FEEDS[feed];
  const url = `${HERMES_BASE}/updates/price/latest?ids[]=${feedId}`;

  const response = await axios.get(url);
  const parsed: PythPriceData[] = response.data.parsed;

  if (!parsed || parsed.length === 0) {
    throw new Error(`No price data returned for ${feed}`);
  }

  const data = parsed[0];
  const price = Number(data.price.price) * Math.pow(10, data.price.expo);
  const confidence = Number(data.price.conf) * Math.pow(10, data.price.expo);

  return {
    price,
    confidence,
    timestamp: data.price.publish_time,
  };
}

/**
 * Record a price point in the rolling window
 */
export function recordPrice(feed: FeedId, point: PricePoint): void {
  const key = feed;
  const window = priceWindows.get(key) || [];

  // Avoid duplicate timestamps
  if (window.length > 0 && window[window.length - 1].timestamp >= point.timestamp) {
    return;
  }

  window.push(point);

  // Trim to max size
  if (window.length > MAX_HISTORY_POINTS) {
    window.splice(0, window.length - MAX_HISTORY_POINTS);
  }

  priceWindows.set(key, window);
}

/**
 * Get price points within a time window (in minutes)
 */
export function getPriceWindow(feed: FeedId, windowMinutes: number): PricePoint[] {
  const window = priceWindows.get(feed) || [];
  const cutoff = Math.floor(Date.now() / 1000) - windowMinutes * 60;
  return window.filter((p) => p.timestamp >= cutoff);
}

/**
 * Calculate price delta % over a time window
 */
export function calculatePriceDelta(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;

  const oldest = prices[0].price;
  const newest = prices[prices.length - 1].price;

  if (oldest === 0) return 0;
  return ((newest - oldest) / oldest) * 100;
}

/**
 * Calculate max absolute price delta % within the window
 * (captures spikes even if price returns to original)
 */
export function calculateMaxDelta(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;

  const oldest = prices[0].price;
  if (oldest === 0) return 0;

  let maxDelta = 0;
  for (const p of prices) {
    const delta = Math.abs((p.price - oldest) / oldest) * 100;
    if (delta > maxDelta) maxDelta = delta;
  }
  return maxDelta;
}

/**
 * Calculate realized volatility (annualized std dev of log returns)
 */
export function calculateRealizedVolatility(prices: PricePoint[]): number {
  if (prices.length < 3) return 0;

  // Calculate log returns
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].price > 0 && prices[i].price > 0) {
      logReturns.push(Math.log(prices[i].price / prices[i - 1].price));
    }
  }

  if (logReturns.length < 2) return 0;

  // Mean
  const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;

  // Variance
  const variance =
    logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (logReturns.length - 1);

  // Std dev (not annualized — raw for the window)
  return Math.sqrt(variance) * 100; // as percentage
}

/**
 * Full volatility assessment — fetch price, record, analyze
 */
export async function assessVolatility(
  feed: FeedId,
  windowMinutes: number,
  thresholdPercent: number
): Promise<VolatilityState> {
  // Fetch latest price
  const latest = await fetchPythPrice(feed);
  recordPrice(feed, latest);

  // Get windowed prices
  const prices = getPriceWindow(feed, windowMinutes);
  const maxDelta = calculateMaxDelta(prices);
  const realizedVol = calculateRealizedVolatility(prices);

  return {
    currentPrice: latest.price,
    priceHistory: prices,
    priceDeltaPercent: maxDelta,
    realizedVolatility: realizedVol,
    windowMinutes,
    isHighVolatility: maxDelta >= thresholdPercent,
    threshold: thresholdPercent,
  };
}

/**
 * Get the current price window size (for diagnostics)
 */
export function getWindowSize(feed: FeedId): number {
  return (priceWindows.get(feed) || []).length;
}

/**
 * Clear the price window (for testing)
 */
export function clearWindow(feed: FeedId): void {
  priceWindows.delete(feed);
}
