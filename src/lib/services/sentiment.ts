import axios from "axios";
import { z } from "zod";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export interface NewsItem {
  id: string;
  title: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

export type SentimentLabel = "BEARISH" | "NEUTRAL" | "BULLISH";

export interface SentimentResult {
  tokenSymbol: string;
  score: number; // -1 to +1
  label: SentimentLabel;
  confidence: number; // 0 to 1
  reasoning: string;
  signals: string[];
  sourceCount: number;
  analyzedAt: string;
  fromCache: boolean;
}

export interface SentimentConfig {
  tokenSymbol: string;
  lookbackHours?: number;
  maxItems?: number;
  cacheTtlMinutes?: number;
}

type CacheEntry = {
  result: SentimentResult;
  digest: string;
  expiresAt: number;
};

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_MAX_ITEMS = 20;
const DEFAULT_CACHE_TTL_MINUTES = 15;
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const cache = new Map<string, CacheEntry>();

const sentimentSchema = z.object({
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  signals: z.array(z.string()).max(8),
});

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toLabel(score: number): SentimentLabel {
  if (score <= -0.2) return "BEARISH";
  if (score >= 0.2) return "BULLISH";
  return "NEUTRAL";
}

function digestNews(items: NewsItem[]): string {
  return items.map((i) => `${i.id}:${i.title}`).join("|");
}

function parseLunarCrushItems(raw: unknown): NewsItem[] {
  const data = raw as { data?: unknown[] };
  const results = Array.isArray(data?.data) ? data.data : [];

  return results
    .map((item) => {
      const post = item as Record<string, unknown>;
      const idCandidate =
        post.id ??
        post.post_id ??
        post.uuid ??
        post.slug ??
        `${post.url ?? post.link ?? post.title ?? post.headline ?? "item"}`;
      const titleCandidate =
        post.title ?? post.headline ?? post.name ?? post.body ?? post.content;

      if (!idCandidate || !titleCandidate) return null;

      const parsed: NewsItem = {
        id: String(idCandidate),
        title: String(titleCandidate),
      };

      const url = post.url ?? post.link;
      if (typeof url === "string" && url.length > 0) parsed.url = url;

      const publishedAt =
        post.published_at ??
        post.created_at ??
        post.post_created ??
        post.time ??
        post.datetime;
      if (typeof publishedAt === "string" && publishedAt.length > 0) {
        parsed.publishedAt = publishedAt;
      }

      const source =
        post.source ??
        post.site ??
        post.domain ??
        post.creator ??
        post.author ??
        post.publisher;
      if (typeof source === "string" && source.length > 0) parsed.source = source;

      return parsed;
    })
    .filter((v): v is NewsItem => v !== null);
}

async function fetchLunarCrushNews(
  tokenSymbol: string,
  lookbackHours: number,
  maxItems: number
): Promise<NewsItem[]> {
  const apiKey = process.env.LUNARCRUSH_API_KEY;
  if (!apiKey) {
    throw new Error("LUNARCRUSH_API_KEY is missing");
  }

  const lunarBaseUrl = (
    process.env.LUNARCRUSH_BASE_URL || "https://lunarcrush.com/api4"
  ).replace(/\/+$/, "");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };

  const topicCandidates = [
    tokenSymbol.toUpperCase(),
    tokenSymbol.toLowerCase(),
  ];

  // Resolve topic from coin endpoint when available.
  try {
    const coinResponse = await axios.get(`${lunarBaseUrl}/public/coins/${tokenSymbol}/v1`, {
      headers,
      timeout: 10_000,
    });
    const payload = coinResponse.data as {
      data?: { topic?: string; symbol?: string } | Array<{ topic?: string; symbol?: string }>;
    };
    const first = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
    if (first?.topic && !topicCandidates.includes(first.topic)) {
      topicCandidates.unshift(first.topic);
    }
  } catch {
    // Best-effort topic discovery; news endpoint attempts below still run.
  }

  const attempts: Array<{
    url: string;
    params: Record<string, string | number>;
    headers?: Record<string, string>;
  }> = topicCandidates.flatMap((topic) => [
    {
      url: `${lunarBaseUrl}/public/topic/${encodeURIComponent(topic)}/news/v1`,
      params: { limit: maxItems },
    },
    {
      url: `${lunarBaseUrl}/public/topic/${encodeURIComponent(topic)}/posts/v1`,
      params: { limit: maxItems },
    },
  ]);

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const response = await axios.get(attempt.url, {
        headers: attempt.headers ?? headers,
        params: attempt.params,
        timeout: 10_000,
      });
      const items = parseLunarCrushItems(response.data);
      if (items.length === 0) continue;

      const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
      return items
        .filter((i) => !i.publishedAt || new Date(i.publishedAt).getTime() >= cutoff)
        .slice(0, maxItems);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ? `status=${error.response.status}` : "";
        const message =
          typeof error.response?.data === "string"
            ? error.response.data
            : (error.response?.data as { message?: string; error?: string } | undefined)
                ?.message ||
              (error.response?.data as { message?: string; error?: string } | undefined)
                ?.error ||
              "";
        errors.push(`${attempt.url} ${status} ${message}`.trim());
      } else {
        errors.push(
          `${attempt.url} ${
            error instanceof Error ? error.message : "Unknown error"
          }`.trim()
        );
      }
    }
  }

  throw new Error(
    `LunarCrush fetch failed. Attempts: ${
      errors.length > 0 ? errors.join(" | ") : "No data returned"
    }`
  );
}

function heuristicSentiment(tokenSymbol: string, items: NewsItem[]): SentimentResult {
  const positive = [
    "partnership",
    "integration",
    "surge",
    "rally",
    "bullish",
    "growth",
    "adoption",
    "upgrade",
  ];
  const negative = [
    "exploit",
    "hack",
    "lawsuit",
    "bearish",
    "drop",
    "selloff",
    "liquidation",
    "outage",
  ];

  let score = 0;
  for (const item of items) {
    const text = item.title.toLowerCase();
    for (const p of positive) {
      if (text.includes(p)) score += 1;
    }
    for (const n of negative) {
      if (text.includes(n)) score -= 1;
    }
  }

  const normalized = items.length > 0 ? clamp(score / (items.length * 2), -1, 1) : 0;
  const label = toLabel(normalized);

  return {
    tokenSymbol: tokenSymbol.toUpperCase(),
    score: Number(normalized.toFixed(4)),
    label,
    confidence: items.length > 0 ? 0.45 : 0.2,
    reasoning:
      "Heuristic fallback used because LLM analysis was unavailable. Score is derived from positive/negative headline keywords.",
    signals: [
      `items=${items.length}`,
      "method=keyword-heuristic",
      label === "BEARISH"
        ? "negative-keywords-dominant"
        : label === "BULLISH"
          ? "positive-keywords-dominant"
          : "mixed-signals",
    ],
    sourceCount: items.length,
    analyzedAt: new Date().toISOString(),
    fromCache: false,
  };
}

async function llmSentiment(tokenSymbol: string, items: NewsItem[]): Promise<SentimentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const provider = createOpenRouter({ apiKey });
  const model = provider(process.env.OPENROUTER_MODEL || DEFAULT_MODEL);

  const headlines = items
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.title}${i.source ? ` | source: ${i.source}` : ""}${
          i.publishedAt ? ` | time: ${i.publishedAt}` : ""
        }`
    )
    .join("\n");

  const { object } = await generateObject({
    model,
    schema: sentimentSchema,
    prompt: [
      `Analyze short-term market sentiment for token ${tokenSymbol.toUpperCase()} from the following headlines.`,
      "Return a score from -1 (very bearish) to +1 (very bullish).",
      "Focus on directional impact in the next 24-72 hours.",
      "Headlines:",
      headlines || "No headlines available.",
    ].join("\n"),
  });

  const score = clamp(object.score, -1, 1);

  return {
    tokenSymbol: tokenSymbol.toUpperCase(),
    score: Number(score.toFixed(4)),
    label: toLabel(score),
    confidence: Number(clamp(object.confidence, 0, 1).toFixed(4)),
    reasoning: object.reasoning,
    signals: object.signals,
    sourceCount: items.length,
    analyzedAt: new Date().toISOString(),
    fromCache: false,
  };
}

export async function analyzeTokenSentiment(
  config: SentimentConfig
): Promise<{ sentiment: SentimentResult; headlines: NewsItem[] }> {
  const lookbackHours = config.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const maxItems = config.maxItems ?? DEFAULT_MAX_ITEMS;
  const cacheTtlMinutes = config.cacheTtlMinutes ?? DEFAULT_CACHE_TTL_MINUTES;
  const tokenSymbol = config.tokenSymbol.toUpperCase();

  const headlines = await fetchLunarCrushNews(tokenSymbol, lookbackHours, maxItems);
  const digest = digestNews(headlines);
  const cacheKey = `sentiment:${tokenSymbol}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.digest === digest) {
    return {
      headlines,
      sentiment: {
        ...cached.result,
        fromCache: true,
      },
    };
  }

  let sentiment: SentimentResult;
  try {
    sentiment = await llmSentiment(tokenSymbol, headlines);
  } catch {
    sentiment = heuristicSentiment(tokenSymbol, headlines);
  }

  cache.set(cacheKey, {
    result: sentiment,
    digest,
    expiresAt: now + cacheTtlMinutes * 60_000,
  });

  return { sentiment, headlines };
}
