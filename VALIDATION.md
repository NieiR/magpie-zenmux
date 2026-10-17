# Validation — 0.1.0

Date: 2026-10-17. Windows 11 amd64; Magpie `0.1.1278`; Bun `1.3.14`.

## Contract and unit checks

- `npm run check`: single exported plugin function (`ZenMuxAuthPlugin`), `config`, `auth` (`provider: "zenmux"`, `methods`, `loader`, `usage`), and `provider.models` hooks verified offline with no credentials.
- `npm test` / `bun test`: **2 passed, 0 failed**.
- Unit coverage verifies:
  - Automatic key-type classification (`sk-ss-v1-…` → `subscription`, `sk-ai-v1-…` → `payg`, `sk-mg-v1-…` → `management`).
  - Subscription detail mapping (`usage_percentage` ratio `0..1` → `0..100`%, 5-hour and 7-day rolling Flow windows, USD equivalent values, and `remaining_resets` → `resets.fiveHour`).
  - PAYG balance mapping (`total_credits` → `balance: "$..."` with empty `windows`).
  - Protocol selection (`anthropic/*` → `@ai-sdk/anthropic` at `/api/anthropic/v1`, `openai/*` → `@ai-sdk/openai` at `/api/v1`, `typesafe/jev-*` → `decides: true`).
  - `403 access_denied` (`X-Magpie-Sign-In: expired`) vs `403 safety_check_failed` (`X-Magpie-Sign-In: kept`).

## Real Magpie host & live ZenMux API verification

- Verified against Magpie CLI `0.1.1278` and Bun `1.3.14` plugin host in an isolated sandbox (`HOME` / `XDG_CONFIG_HOME` / `XDG_CACHE_HOME`), then installed into the live Magpie environment after removing the legacy custom `zenmux` provider entry.
- Tested with three real ZenMux keys (a Builder Starter subscription key `sk-ss-v1-…`, a Pay-As-You-Go key `sk-ai-v1-…`, and a personal Management API key `sk-mg-v1-…`):
  - **Per-account model filtering**: Total discovered chat/decision models: **182**. The Builder Starter seat (`sk-ss-v1-…`) automatically filtered its model list to **165** Starter-eligible models (excluding Max/Ultra-only models such as `anthropic/claude-opus-4.5`), while the PAYG seat (`sk-ai-v1-…`) listed all **182** models.
  - **Shared Management API key**: The second account (`zenmux#payg`) automatically reused the `sk-mg-v1-…` Management API key saved in `plugin-auth.json` without requiring duplicate input.
  - **Live `magpie quota zenmux` output**:
    ```text
    zenmux · Pay As You Go · API key …6756                   subscription  $26.77 left
    zenmux · Builder Starter · until Oct 27 · API key …dff9  subscription  5h 0% (0 / 50 flows · $0.00 / $1.64) ↻4h38m 14:40  7d 5% (9.86 / 213 flows · $0.32 / $6.99) ↻4d4h Wed 14:39  ↺ 4 five-hour resets until Oct 27 18:01
    ```
  - **Live inference**: `magpie provider test zenmux inclusionai/ling-3.1-flash` passed (`✓ chat · inclusionai/ling-3.1-flash`), and direct Anthropic Messages (`POST /api/anthropic/v1/messages` with `metadata`) and OpenAI Chat Completions (`POST /api/v1/chat/completions`) both answered `200 OK`.
- No API keys or account credentials are stored in this repository.
