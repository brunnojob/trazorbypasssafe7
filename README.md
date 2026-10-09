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

## Optional report archive

Export a JSON report from the command above, then run `python cloud/sync.py enqueue result.json --project trazorbypasssafe7` and `python cloud/sync.py sync`. Synchronization requires `BRUNNODEV_ACCESS_TOKEN` and the external operations API; the local outbox retains unacknowledged reports.

## License

Original source and documentation are MIT licensed; see [LICENSE](LICENSE). Third-party dependencies and media retain their respective terms. Maintained by [Brunno Dev](https://brunnodev.store).
