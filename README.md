# Trazor Ledger

Personal ledger accounts, income and expenses, persistent history, export, and transactional entries with expected revisions.

## Run

Requirements: React, TypeScript, and Supabase.

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

## Behavior

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Amounts are converted to cents before recording. `bd_book_entry` updates the balance and preserves history in the same transaction. This application records amounts supplied by the user; it does not hold or transfer cryptocurrency.

## Result synchronization

The [operations archive](https://vercel-home-telemetry-api.vercel.app/laboratory.html?project=trazorbypasssafe7) stores execution results. Supabase migrations are in the [API repository](https://github.com/brunnojob/vercel-home-telemetry-api/tree/main/supabase/migrations).

```sh
python cloud/sync.py enqueue result.json --project trazorbypasssafe7
python cloud/sync.py sync
```

Set `BRUNNODEV_ACCESS_TOKEN` to your session token. The SQLite outbox retains reports until the server confirms persistence; identical content does not create duplicate records. Tokens are not stored in source code. To run the synchronization tests:

```sh
python -m unittest discover -s cloud
```
