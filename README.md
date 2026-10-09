# Trazor Ledger

Contas contábeis pessoais, entradas e despesas, histórico persistente, exportação e lançamentos transacionais com revisão esperada.

## Executar

Requisitos: React, TypeScript e Supabase.

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

## Funcionamento

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Valores são convertidos para centavos antes do registro. `bd_book_entry` atualiza o saldo e conserva o histórico na mesma transação. Trata-se de registro contábil de valores informados, sem custódia nem movimentação de criptoativos.

## Persistência de resultados

O arquivo de operações está em [vercel-home-telemetry-api.vercel.app](https://vercel-home-telemetry-api.vercel.app/laboratory.html?project=trazorbypasssafe7). As migrações Supabase estão no [repositório da API](https://github.com/brunnojob/vercel-home-telemetry-api/tree/main/supabase/migrations).

```sh
python cloud/sync.py enqueue resultado.json --project trazorbypasssafe7
python cloud/sync.py sync
```

Defina `BRUNNODEV_ACCESS_TOKEN` com sua sessão. A fila SQLite conserva os relatórios até confirmação do servidor; o mesmo conteúdo não gera registros duplicados. Tokens não são gravados no código.
