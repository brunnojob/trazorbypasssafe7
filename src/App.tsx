import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Account = {
  id: string;
  name: string;
  currency: string;
  balance_minor: number;
  revision: number;
};
type Entry = {
  id: string;
  account_id: string;
  delta_minor: number;
  description: string;
  created_at: string;
};
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    minor / 100,
  );
function parseMinor(value: string) {
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(value))
    throw new Error("Informe um valor positivo com até duas casas decimais.");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor < 1 || minor > 1000000000000)
    throw new Error("Valor fora do limite.");
  return minor;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState("income");
  const [signup, setSignup] = useState(false);
  const pending = useRef<{ intent: string; request: { p_account: string; p_delta: number; p_key: string; p_description: string; p_revision: number } } | null>(null);
  const account = accounts.find((row) => row.id === selected);
  const authEpoch = useRef(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_, next) => {
      authEpoch.current += 1;
      pending.current = null;
      setSession(next);
      setAccounts([]);
      setEntries([]);
      setSelected("");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function refresh() {
    const epoch = authEpoch.current;
    const { data, error } = await supabase
      .from("bd_wallet_accounts")
      .select("*")
      .order("created_at");
    if (epoch !== authEpoch.current) return;
    if (error) throw error;
    setAccounts(data ?? []);
    setSelected((previous) =>
      data?.some((row) => row.id === previous)
        ? previous
        : (data?.[0]?.id ?? ""),
    );
  }
  useEffect(() => {
    if (session) refresh().catch((error) => setMessage(error.message));
  }, [session]);
  useEffect(() => {
    let active = true;
    if (!selected) {
      setEntries([]);
      return;
    }
    supabase
      .from("bd_wallet_entries")
      .select("*")
      .eq("account_id", selected)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(error.message);
        else setEntries(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [selected, accounts]);

  async function action(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Operação indisponível.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      const { data, error } = await (signup ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({
        email,
        password,
      }));
      if (error) throw error;
      setPassword("");
      if (signup && !data.session) setMessage("Confirme o e-mail e entre na conta.");
    });
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      const { error } = await supabase
        .from("bd_wallet_accounts")
        .insert({ owner_id: session!.user.id, name: name.trim(), currency });
      if (error) throw error;
      setName("");
      await refresh();
    });
  }
  async function book(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    await action(async () => {
      const delta = parseMinor(amount) * (direction === "income" ? 1 : -1);
      const intent = JSON.stringify({ account: account.id, delta, description: description.trim() });
      if (!pending.current || pending.current.intent !== intent) pending.current = { intent, request: {
        p_account: account.id, p_delta: delta, p_key: crypto.randomUUID(), p_description: description.trim(), p_revision: account.revision
      } };
      const { error } = await supabase.rpc("bd_book_entry", pending.current.request);
      if (error) throw error;
      pending.current = null;
      setAmount("");
      setDescription("");
      await refresh();
      setMessage("Lançamento registrado.");
    });
  }
  function exportEntries() {
    const blob = new Blob([JSON.stringify({ account, entries }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ledger.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="ledger-shell">
      <header>
        <div>
          <p className="eyebrow">BRUNNODEV / PERSONAL ACCOUNTING</p>
          <h1>Trazor Ledger</h1>
          <p>Contas, entradas e despesas com histórico persistente.</p>
        </div>
        {session && (
          <button onClick={() => supabase.auth.signOut()}>Sair</button>
        )}
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!session ? (
        <section>
          <h2>Acesse sua conta</h2>
          <form onSubmit={login}>
            <label>
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label><input type="checkbox" checked={signup} onChange={event => setSignup(event.target.checked)} />Criar conta</label><button disabled={busy}>{signup ? "Criar conta" : "Entrar"}</button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <h2>Nova conta contábil</h2>
            <form onSubmit={createAccount}>
              <label>
                Nome
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Moeda
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {["BRL", "USD", "EUR"].map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </label>
              <button disabled={busy}>Criar conta</button>
            </form>
          </section>
          <section>
            <h2>Contas</h2>
            <div className="account-grid">
              {accounts.map((row) => (
                <button
                  className={selected === row.id ? "account active" : "account"}
                  key={row.id}
                  onClick={() => setSelected(row.id)}
                >
                  <span>{row.name}</span>
                  <strong>{money(row.balance_minor, row.currency)}</strong>
                  <small>Revisão {row.revision}</small>
                </button>
              ))}
            </div>
            {!accounts.length && (
              <p>Crie uma conta para registrar seu primeiro lançamento.</p>
            )}
          </section>
          {account && (
            <>
              <section>
                <h2>Registrar lançamento · {account.name}</h2>
                <form onSubmit={book}>
                  <label>
                    Tipo
                    <select
                      value={direction}
                      onChange={(event) => setDirection(event.target.value)}
                    >
                      <option value="income">Entrada</option>
                      <option value="expense">Despesa</option>
                    </select>
                  </label>
                  <label>
                    Valor
                    <input
                      inputMode="decimal"
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </label>
                  <label>
                    Descrição
                    <input
                      required
                      maxLength={200}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </label>
                  <button disabled={busy}>Registrar</button>
                </form>
              </section>
              <section>
                <header>
                  <h2>Histórico</h2>
                  <button onClick={exportEntries}>Exportar JSON</button>
                </header>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {new Date(row.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td>{row.description}</td>
                          <td
                            className={
                              row.delta_minor > 0 ? "income" : "expense"
                            }
                          >
                            {money(row.delta_minor, account.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
      <footer>
        <a href="https://brunnodev.store">brunnodev.store</a> · Registro
        contábil pessoal. Os lançamentos documentam valores informados pelo
        usuário.
      </footer>
    </main>
  );
}
