# Cerberus

Cerberus is an AI keeper and observability platform for the Bonzo Lending Protocol on Hedera Testnet.

The system runs automated keeper decisions using market volatility, stablecoin de-peg risk, and sentiment analysis, then executes lending actions and writes auditable decision logs to Hedera Consensus Service (HCS).

## Project Details

Core capabilities:
- Autonomous lending risk actions (supply/withdraw paths)
- Volatility-aware rebalance checks
- De-peg monitoring with emergency safety flow
- Sentiment-aware harvest decisioning
- Session-based strategy configuration per connected user
- Verifiable on-chain audit logging (HCS) + Mirror Node retrieval
- Dashboard + chat interface for monitoring and control

Primary runtime target:
- Hedera Testnet

## Architecture

### High-level Components

- `Frontend (Next.js App Router)`
  - Dashboard views for keeper status, strategy controls, and logs
  - Chat panel for tool-driven operator queries
- `Backend API (Next.js route handlers)`
  - Auth/session routes
  - Keeper execution routes
  - Strategy CRUD routes
  - Audit log and health routes
- `Keeper Services`
  - Volatility monitor, rebalancer, peg monitor, circuit breaker, sentiment, harvester
  - Orchestrator for periodic loop execution
- `Hedera Execution Layer`
  - Hedera Agent Kit (`HederaAIToolkit`)
  - Bonzo lending plugin tools
  - Core Hedera plugins (account/token/consensus/query)
- `Audit Layer`
  - HCS topic creation and message submission
  - Mirror Node reads for audit-log API

### Execution Flow

1. User connects account through `/api/auth/connect`.
2. Backend creates a session-scoped Hedera client.
3. Keeper cycle endpoints or orchestrator invoke service logic.
4. Service logic calls Bonzo tools through Hedera Agent Kit.
5. Decision + reason + tx metadata are submitted to HCS.
6. UI and chat consume `/api/audit-log`, `/api/keeper/*`, and `/api/strategy`.

### Main Backend Modules

Located under `bonzo-guardian/src/lib/services/`:
- `volatility-monitor.ts`: Pyth feed reads and rolling volatility metrics
- `rebalancer.ts`: decision engine for volatility-based lending actions
- `peg-monitor.ts`: stablecoin peg state + alert levels
- `circuit-breaker.ts`: critical de-peg emergency flow + safety deposit path
- `sentiment.ts`: token sentiment synthesis from external feeds
- `harvester.ts`: sentiment-based harvest timing logic
- `hcs-logger.ts`: HCS write/read and structured audit event mapping
- `keeper-orchestrator.ts`: interval scheduler for keeper cycles
- `strategy-config.ts`: in-memory strategy config CRUD + validation
- `user-session.ts`: secure session-scoped client creation/resolution

## Hedera-specific Integration

### Hedera SDK Usage

- Package: `@hashgraph/sdk`
- Used for:
  - Testnet client creation
  - Operator/session signing context
  - transaction execution through toolkit-integrated tools

### Hedera Agent Kit Usage

- Package: `hedera-agent-kit`
- Mode: `AgentMode.AUTONOMOUS`
- Toolkit wrapper: `src/lib/agent-toolkit.ts`
- Enabled plugins:
  - `coreAccountPlugin`
  - `coreAccountQueryPlugin`
  - `coreConsensusPlugin`
  - `coreConsensusQueryPlugin`
  - `coreTokenPlugin`
  - `coreTokenQueryPlugin`
  - `coreMiscQueriesPlugin`
  - `bonzoPlugin`

### Bonzo Plugin Tools Used

- `bonzo_market_data_tool`
- `approve_erc20_tool`
- `bonzo_deposit_tool`
- `bonzo_withdraw_tool`
- `bonzo_borrow_tool`
- `bonzo_repay_tool`

### Hedera Consensus Service (HCS)

- Audit events are published as JSON messages to an HCS topic.
- Topic behavior:
  - Uses `HCS_AUDIT_TOPIC_ID` if provided
  - Otherwise can auto-create topic (config-controlled)
- Read path:
  - Mirror Node `topics/{topicId}/messages`
  - Decoding and structured filtering in `hcs-logger.ts`

## Repository Layout

- `bonzo-guardian/`: Main application
- `bonzoPlugin/`: Local Bonzo plugin workspace
- `hedera-agent-kit-js/`: Local Hedera Agent Kit workspace
- `documentation/`: Reference docs
- `project.md`, `phase.md`, `info.md`: internal planning docs

## API Surface

Auth/session:
- `POST /api/auth/connect`
- `POST /api/auth/disconnect`
- `GET /api/auth/status`

Keeper control:
- `POST /api/keeper/start`
- `POST /api/keeper/stop`
- `GET /api/keeper/start`

Keeper checks (manual/cron style):
- `GET|POST /api/keeper/rebalance`
- `GET|POST /api/keeper/depeg-check`
- `GET|POST /api/keeper/harvest`

Strategy and logging:
- `GET|POST|PUT|DELETE /api/strategy`
- `GET /api/audit-log`

System and assistant:
- `GET /api/health`
- `GET /api/vault-test` (returns lending market snapshot)
- `POST /api/chat`

## Tech Stack

- Next.js + TypeScript + Tailwind CSS
- Hedera Agent Kit + Hedera SDK
- Bonzo plugin (`@bonzofinancelabs/hak-bonzo-plugin`)
- Vercel AI SDK + OpenRouter
- Pyth price feeds

## Prerequisites

- Node.js 22+
- npm
- Hedera Testnet account (Account ID + ECDSA private key)
- OpenRouter API key

## Setup

From `bonzo-guardian/`:

```bash
npm install
```

Create `bonzo-guardian/.env.local`:

```bash
OPENROUTER_API_KEY=<your_openrouter_key>
OPENROUTER_MODEL=openai/gpt-4o-mini

HEDERA_OPERATOR_ID=<fallback_operator_account_id>
HEDERA_OPERATOR_KEY=<fallback_operator_private_key>

NEXT_PUBLIC_NETWORK=testnet

# Optional
# HCS_AUDIT_TOPIC_ID=0.0.xxxxx
# HCS_AUTO_CREATE_TOPIC=true
# HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1
```

## Run

```bash
cd bonzo-guardian
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

From `bonzo-guardian/`:

```bash
npm run lint
npm run build
```

## Operational Notes

- User-triggered actions run with session-scoped credentials when connected.
- The fallback operator client is used when no valid user session exists.
- The default network is Testnet unless explicitly overridden.
