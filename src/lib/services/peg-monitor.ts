import axios from "axios";

const HERMES_BASE = "https://hermes.pyth.network/v2";

export const PEG_FEEDS = {
  "USDC/USD":
    "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT/USD":
    process.env.PYTH_USDT_USD_FEED_ID ||
    "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
} as const;

export type PegFeedId = keyof typeof PEG_FEEDS;
export type PegAlertLevel = "NORMAL" | "WARNING" | "CRITICAL";

interface PythPriceData {
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

function errorToMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const nested = Array.from(error.errors || [])
      .map((e) => errorToMessage(e))
      .filter(Boolean);
    return nested.length > 0 ? nested.join(" | ") : error.message;
  }
  if (axios.isAxiosError(error)) {
    const parts = [
      error.message,
      error.code,
      error.response ? `status=${error.response.status}` : "",
      error.config?.url ? `url=${error.config.url}` : "",
    ].filter(Boolean);

    const cause = error.cause as
      | {
          message?: string;
          code?: string;
          errno?: string;
          syscall?: string;
          hostname?: string;
          address?: string;
          port?: number;
        }
      | undefined;

    if (cause) {
      parts.push(
        [
          cause.message,
          cause.code,
          cause.errno,
          cause.syscall,
          cause.hostname,
          cause.address,
          cause.port !== undefined ? `port=${cause.port}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    }

    return parts.join(" ");
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "[object]";
    }
  }
  return String(error);
}

export interface PegPriceState {
  feed: PegFeedId;
  price: number;
  confidence: number;
  publishTime: number;
  distanceFromPegPercent: number;
  alertLevel: PegAlertLevel;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface PegAssessment {
  overallAlert: PegAlertLevel;
  prices: PegPriceState[];
  warningCount: number;
  criticalCount: number;
  timestamp: string;
}

export interface PegMonitorConfig {
  warningThreshold?: number;
  criticalThreshold?: number;
  feeds?: PegFeedId[];
}

const DEFAULT_WARNING_THRESHOLD = 0.99;
const DEFAULT_CRITICAL_THRESHOLD = 0.98;

function toAlertLevel(
  price: number,
  warningThreshold: number,
  criticalThreshold: number
): PegAlertLevel {
  if (price < criticalThreshold) return "CRITICAL";
  if (price < warningThreshold) return "WARNING";
  return "NORMAL";
}

function getOverallAlert(prices: PegPriceState[]): PegAlertLevel {
  if (prices.some((p) => p.alertLevel === "CRITICAL")) return "CRITICAL";
  if (prices.some((p) => p.alertLevel === "WARNING")) return "WARNING";
  return "NORMAL";
}

export async function fetchPegPrice(
  feed: PegFeedId,
  warningThreshold: number = DEFAULT_WARNING_THRESHOLD,
  criticalThreshold: number = DEFAULT_CRITICAL_THRESHOLD
): Promise<PegPriceState> {
  const feedId = PEG_FEEDS[feed];
  const url = `${HERMES_BASE}/updates/price/latest?ids[]=${feedId}`;
  const response = await axios.get(url);
  const parsed: PythPriceData[] = response.data.parsed;

  if (!parsed || parsed.length === 0) {
    throw new Error(`No price data returned for ${feed}`);
  }

  const data = parsed[0];
  const price = Number(data.price.price) * Math.pow(10, data.price.expo);
  const confidence = Number(data.price.conf) * Math.pow(10, data.price.expo);
  const distanceFromPegPercent = Math.abs(price - 1) * 100;

  return {
    feed,
    price,
    confidence,
    publishTime: data.price.publish_time,
    distanceFromPegPercent,
    alertLevel: toAlertLevel(price, warningThreshold, criticalThreshold),
    warningThreshold,
    criticalThreshold,
  };
}

export async function assessStablecoinPeg(
  config: PegMonitorConfig = {}
): Promise<PegAssessment> {
  const warningThreshold = config.warningThreshold ?? DEFAULT_WARNING_THRESHOLD;
  const criticalThreshold = config.criticalThreshold ?? DEFAULT_CRITICAL_THRESHOLD;
  const feeds = config.feeds ?? (Object.keys(PEG_FEEDS) as PegFeedId[]);

  if (criticalThreshold >= warningThreshold) {
    throw new Error("criticalThreshold must be lower than warningThreshold");
  }

  const settled = await Promise.allSettled(
    feeds.map((feed) => fetchPegPrice(feed, warningThreshold, criticalThreshold))
  );

  const prices = settled
    .filter((r): r is PromiseFulfilledResult<PegPriceState> => r.status === "fulfilled")
    .map((r) => r.value);

  if (prices.length === 0) {
    const firstError = settled.find((r) => r.status === "rejected");
    const details = settled
      .map((result, index) => {
        const feed = feeds[index];
        if (result.status === "fulfilled") {
          return `${feed}: ok`;
        }
        return `${feed}: ${errorToMessage(result.reason)}`;
      })
      .join("; ");

    throw new Error(
      firstError?.status === "rejected"
        ? `No peg prices available. ${details}`
        : "No peg prices available"
    );
  }

  const warningCount = prices.filter((p) => p.alertLevel === "WARNING").length;
  const criticalCount = prices.filter((p) => p.alertLevel === "CRITICAL").length;

  return {
    overallAlert: getOverallAlert(prices),
    prices,
    warningCount,
    criticalCount,
    timestamp: new Date().toISOString(),
  };
}
