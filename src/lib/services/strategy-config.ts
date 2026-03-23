import { randomUUID } from "crypto";
import { z } from "zod";

export const strategyConfigSchema = z.object({
  name: z.string().min(1).max(80),
  vaultAddress: z.string().min(3),
  strategyAddress: z.string().min(3),
  rewardTokenSymbol: z.string().default("SAUCE"),
  volatility: z
    .object({
      enabled: z.boolean().default(true),
      threshold: z.number().min(0.1).max(20).default(3),
      timeWindowMinutes: z.number().min(1).max(120).default(20),
    })
    .default({ enabled: true, threshold: 3, timeWindowMinutes: 20 }),
  depeg: z
    .object({
      enabled: z.boolean().default(true),
      monitoredFeed: z.enum(["USDC/USD", "USDT/USD"]).default("USDC/USD"),
      warningThreshold: z.number().min(0.8).max(1.2).default(0.99),
      criticalThreshold: z.number().min(0.8).max(1.2).default(0.98),
    })
    .default({
      enabled: true,
      monitoredFeed: "USDC/USD",
      warningThreshold: 0.99,
      criticalThreshold: 0.98,
    }),
  harvest: z
    .object({
      enabled: z.boolean().default(true),
      bearishThreshold: z.number().min(-1).max(1).default(-0.2),
      bullishThreshold: z.number().min(-1).max(1).default(0.2),
      intervalMinutes: z.number().min(10).max(24 * 60).default(240),
    })
    .default({
      enabled: true,
      bearishThreshold: -0.2,
      bullishThreshold: 0.2,
      intervalMinutes: 240,
    }),
});

export type StrategyConfigInput = z.infer<typeof strategyConfigSchema>;

export type StoredStrategyConfig = StrategyConfigInput & {
  id: string;
  ownerSessionToken: string;
  createdAt: string;
  updatedAt: string;
};

const strategyStore = new Map<string, StoredStrategyConfig>();

function nowIso(): string {
  return new Date().toISOString();
}

export function createStrategyConfig(
  ownerSessionToken: string,
  input: StrategyConfigInput
): StoredStrategyConfig {
  const parsed = strategyConfigSchema.parse(input);
  const id = randomUUID();
  const ts = nowIso();
  const record: StoredStrategyConfig = {
    ...parsed,
    id,
    ownerSessionToken,
    createdAt: ts,
    updatedAt: ts,
  };
  strategyStore.set(id, record);
  return record;
}

export function listStrategyConfigs(ownerSessionToken: string): StoredStrategyConfig[] {
  return Array.from(strategyStore.values()).filter(
    (s) => s.ownerSessionToken === ownerSessionToken
  );
}

export function getStrategyConfig(
  ownerSessionToken: string,
  id: string
): StoredStrategyConfig | null {
  const record = strategyStore.get(id);
  if (!record || record.ownerSessionToken !== ownerSessionToken) return null;
  return record;
}

export function updateStrategyConfig(
  ownerSessionToken: string,
  id: string,
  input: StrategyConfigInput
): StoredStrategyConfig | null {
  const current = getStrategyConfig(ownerSessionToken, id);
  if (!current) return null;
  const parsed = strategyConfigSchema.parse(input);
  const updated: StoredStrategyConfig = {
    ...current,
    ...parsed,
    updatedAt: nowIso(),
  };
  strategyStore.set(id, updated);
  return updated;
}

export function deleteStrategyConfig(ownerSessionToken: string, id: string): boolean {
  const current = getStrategyConfig(ownerSessionToken, id);
  if (!current) return false;
  return strategyStore.delete(id);
}

