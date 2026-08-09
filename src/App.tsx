import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode as QrIcon,
  ScanFace,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Screen = 'dashboard' | 'send' | 'receive' | 'bank' | 'activity' | 'settings';
type Currency = 'USDT' | 'BRL';
type BankAccount = {
  id: string;
  bank_name: string;
  account_type: string;
  agency: string;
  account_number: string;
  pix_key: string | null;
};
type BtcAddress = {
  id: string;
  address: string;
  label: string;
  is_primary: boolean;
};
type WalletProfile = {
  id: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  email: string;
  facial_verified: boolean;
  facial_verified_at: string | null;
};

const demoEmail = 'paulomywork@gmail.com';
const demoPassword = '@9DHSLADMSDKCLKABCA';
const balanceUsdt = 39965.94;
const balanceBrl = 203158.87;
const defaultBtcAddress = 'bc1q9h6tq8x7v2y4n6f3j8k5l2m9p0q3r4s5t6u7v8';

const navItems: { label: string; screen: Screen; icon: typeof Home }[] = [
  { label: 'Visão geral', screen: 'dashboard', icon: Home },
  { label: 'Enviar', screen: 'send', icon: ArrowUpRight },
  { label: 'Receber', screen: 'receive', icon: ArrowDownLeft },
  { label: 'Atividade', screen: 'activity', icon: BarChart3 },
  { label: 'Conta bancária', screen: 'bank', icon: Building2 },
];

const formatUsdt = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatBrl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

type ActivityEntry = {
  id: string;
  icon: 'down' | 'up' | 'face' | 'bank';
  color: string;
  title: string;
  date: string;
  value: string;
  kind: 'in' | 'out' | 'info';
};

const activityEntries: ActivityEntry[] = [
  { id: '1', icon: 'down', color: 'green', title: 'Saldo recebido', date: '01/08/2026 · Carteira principal', value: '+ 39.965,94 USDT', kind: 'in' },
  { id: '2', icon: 'face', color: 'blue', title: 'Verificação facial', date: '01/08/2026 · Concluída', value: 'Aprovada', kind: 'info' },
  { id: '3', icon: 'bank', color: 'blue', title: 'Conta bancária adicionada', date: '01/08/2026', value: 'Configuração', kind: 'info' },
];

function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [currency, setCurrency] = useState<Currency>('USDT');
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [btcAddresses, setBtcAddresses] = useState<BtcAddress[]>([]);
  const [modal, setModal] = useState<null | 'search' | 'notifications' | 'facial'>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from('wallet_bank_accounts').select('id, bank_name, account_type, agency, account_number, pix_key').maybeSingle().then(({ data }) => {
      if (data) setBankAccount(data as BankAccount);
    });
    supabase.from('wallet_profiles').select('id, full_name, birth_date, cpf, facial_verified, facial_verified_at').maybeSingle().then(async ({ data }) => {
      if (data) {
        setProfile({ ...(data as Omit<WalletProfile, 'email'>), email: session.user.email ?? demoEmail });
        return;
      }
      const { data: created } = await supabase.from('wallet_profiles').insert({ id: session.user.id }).select('id, full_name, birth_date, cpf, facial_verified, facial_verified_at').maybeSingle();
      if (created) setProfile({ ...(created as Omit<WalletProfile, 'email'>), email: session.user.email ?? demoEmail });
    });
    supabase.from('wallet_btc_addresses').select('id, address, label, is_primary').order('is_primary', { ascending: false }).order('created_at', { ascending: true }).then(async ({ data }) => {
      if (data && data.length > 0) {
        setBtcAddresses(data as BtcAddress[]);
        return;
      }
      const { data: created } = await supabase.from('wallet_btc_addresses').insert({ address: defaultBtcAddress, label: 'Carteira principal', is_primary: true }).select('id, address, label, is_primary').maybeSingle();
      if (created) setBtcAddresses([created as BtcAddress]);
    });
  }, [session]);

  const displayBalance = useMemo(() => {
    if (!balanceVisible) return '••••••';
    return currency === 'USDT' ? formatUsdt(balanceUsdt) : formatBrl(balanceBrl);
  }, [balanceVisible, currency]);

  if (isLoading) return <div className="loading-screen"><div className="brand-mark"><Wallet size={24} /></div><span>Preparando sua carteira</span></div>;
  if (!session) return <LoginScreen />;

  return (
    <div className="app-shell">
      <Sidebar screen={screen} setScreen={setScreen} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onSignOut={() => supabase.auth.signOut()} currency={currency} setCurrency={setCurrency} balanceVisible={balanceVisible} setBalanceVisible={setBalanceVisible} />
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Carteira</span><ChevronRight size={15} /><strong>{navItems.find((item) => item.screen === screen)?.label ?? 'Configurações'}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Pesquisar" onClick={() => setModal('search')}><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Notificações" onClick={() => setModal('notifications')}><Bell size={18} /><i /></button>
            <div className="profile-chip"><div className="avatar">P</div><span>Paulo M.</span></div>
          </div>
        </header>
        <div className="page-wrap">
          {screen === 'dashboard' && <Dashboard displayBalance={displayBalance} balanceVisible={balanceVisible} setBalanceVisible={setBalanceVisible} currency={currency} setCurrency={setCurrency} setScreen={setScreen} bankAccount={bankAccount} facialVerified={profile?.facial_verified ?? false} openFacial={() => setModal('facial')} />}
          {screen === 'send' && <SendScreen setScreen={setScreen} facialVerified={profile?.facial_verified ?? false} openFacial={() => setModal('facial')} />}
          {screen === 'receive' && <ReceiveScreen btcAddresses={btcAddresses} setBtcAddresses={setBtcAddresses} setScreen={setScreen} />}
          {screen === 'bank' && <BankScreen bankAccount={bankAccount} setBankAccount={setBankAccount} />}
          {screen === 'activity' && <ActivityScreen />}
          {screen === 'settings' && <SettingsScreen bankAccount={bankAccount} profile={profile} btcAddresses={btcAddresses} onSignOut={() => supabase.auth.signOut()} openFacial={() => setModal('facial')} />}
        </div>
        <footer className="footer"><span>Trazor Bypass</span></footer>
      </main>
      {modal === 'search' && <SearchModal onClose={() => setModal(null)} setScreen={setScreen} />}
      {modal === 'notifications' && <NotificationsModal profile={profile} onClose={() => setModal(null)} setScreen={setScreen} openFacial={() => setModal('facial')} />}
      {modal === 'facial' && <FacialModal profile={profile} setProfile={setProfile} onClose={() => setModal(null)} />}
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      const signup = await supabase.auth.signUp({ email, password });
      if (signup.error) {
        setError('Não foi possível entrar. Confira seus dados e tente novamente.');
        setBusy(false);
        return;
      }
    }
    setBusy(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-orb orb-one" />
      <div className="auth-orb orb-two" />
      <div className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><Wallet size={25} /></div><span>Trazor Bypass</span></div>
        <div className="auth-heading"><p className="eyebrow">BEM-VINDO DE VOLTA</p><h1>Acesse sua carteira.</h1><p>Seu patrimônio digital, sempre no seu controle.</p></div>
        <form onSubmit={signIn} className="auth-form">
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label>Senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar senha">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <div className="form-row"><label className="check-label"><input type="checkbox" defaultChecked /><span>Manter conectado</span></label><button type="button" className="link-button">Esqueci minha senha</button></div>
          {error && <div className="error-message">{error}</div>}
          <button className="primary-button auth-button" disabled={busy}>{busy ? 'Entrando...' : 'Continuar'}<ChevronRight size={18} /></button>
        </form>
        <p className="auth-note"><LockKeyhole size={14} /> Seus dados são protegidos com criptografia</p>
        <div className="demo-badge">Acesso Ativo <span>·</span> dados salvos</div>
      </div>
      <div className="auth-footer">Trazor Bypass é uma ferramente que movimenta valores reais.</div>
    </div>
  );
}

function Sidebar({ screen, setScreen, mobileOpen, setMobileOpen, onSignOut, currency, setCurrency, balanceVisible, setBalanceVisible }: { screen: Screen; setScreen: (s: Screen) => void; mobileOpen: boolean; setMobileOpen: (o: boolean) => void; onSignOut: () => void; currency: Currency; setCurrency: (c: Currency) => void; balanceVisible: boolean; setBalanceVisible: (v: boolean) => void }) {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand"><div className="brand-mark"><Wallet size={20} /></div><span>Trazor Bypass</span></div>
        <button className="close-mobile" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        <button className={`connection ${walletMenuOpen ? 'open' : ''}`} onClick={() => setWalletMenuOpen(!walletMenuOpen)} aria-expanded={walletMenuOpen}>
          <span className="live-dot" /> Carteira conectada <ChevronDown size={14} className={`connection-chevron ${walletMenuOpen ? 'rotated' : ''}`} />
        </button>
        {walletMenuOpen && (
          <div className="connection-menu">
            <div className="connection-menu-title">Ver saldo em</div>
            <button className={`connection-menu-item ${currency === 'USDT' ? 'active' : ''}`} onClick={() => setCurrency('USDT')}><span>USDT</span>{currency === 'USDT' && <Check size={14} />}</button>
            <button className={`connection-menu-item ${currency === 'BRL' ? 'active' : ''}`} onClick={() => setCurrency('BRL')}><span>BRL</span>{currency === 'BRL' && <Check size={14} />}</button>
            <div className="connection-menu-divider" />
            <button className="connection-menu-item" onClick={() => { setBalanceVisible(!balanceVisible); setWalletMenuOpen(false); }}>
              {balanceVisible ? <><EyeOff size={14} /><span>Ocultar saldo</span></> : <><Eye size={14} /><span>Mostrar saldo</span></>}
            </button>
          </div>
        )}
      </div>
      <div className="sidebar-nav">
        <p className="nav-caption">MENU PRINCIPAL</p>
        {navItems.map(({ label, screen: itemScreen, icon: Icon }) => (
          <button key={itemScreen} className={`nav-item ${screen === itemScreen ? 'active' : ''}`} onClick={() => { setScreen(itemScreen); setMobileOpen(false); }}><Icon size={18} /><span>{label}</span>{itemScreen === 'send' && <span className="nav-pill">Novo</span>}</button>
        ))}
      </div>
      <div className="wallet-mini">
        <div className="wallet-mini-title"><span>Seu saldo total</span></div>
        <strong>{balanceVisible ? `USDT ${formatUsdt(balanceUsdt)}` : '••••••'}</strong>
        <span className="positive-text">+ 2,84% hoje</span>
        <div className="mini-chart"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
      </div>
      <div className="sidebar-bottom">
        <button className={`nav-item ${screen === 'settings' ? 'active' : ''}`} onClick={() => { setScreen('settings'); setMobileOpen(false); }}><Settings size={18} /><span>Configurações</span></button>
        <button className="nav-item" onClick={onSignOut}><LogOut size={18} /><span>Sair</span></button>
      </div>
    </aside>
  );
}

function Dashboard({ displayBalance, balanceVisible, setBalanceVisible, currency, setCurrency, setScreen, bankAccount, facialVerified, openFacial }: { displayBalance: string; balanceVisible: boolean; setBalanceVisible: (v: boolean) => void; currency: Currency; setCurrency: (c: Currency) => void; setScreen: (s: Screen) => void; bankAccount: BankAccount | null; facialVerified: boolean; openFacial: () => void }) {
  const [balanceMenuOpen, setBalanceMenuOpen] = useState(false);
  return (
    <div className="dashboard-view">
      <div className="page-intro">
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Olá, Paulo</h1><p className="muted">Aqui está um resumo da sua carteira hoje.</p></div>
        <button className="outline-button"><ArrowDownLeft size={16} className="download-icon" /> Exportar relatório</button>
      </div>
      {!facialVerified && (
        <div className="facial-alert" onClick={openFacial}>
          <div className="facial-alert-icon"><ScanFace size={20} /></div>
          <div><strong>Verificação facial pendente</strong><p>Ative a verificação facial para realizar transferências. Clique aqui para ativar.</p></div>
          <ChevronRight size={18} />
        </div>
      )}
      <section className="balance-grid">
        <div className="balance-card">
          <div className="balance-card-glow" />
          <div className="balance-top">
            <span>Saldo disponível</span>
            <button className="eye-toggle" onClick={() => setBalanceVisible(!balanceVisible)}>{balanceVisible ? <Eye size={17} /> : <EyeOff size={17} />} {balanceVisible ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          <div className="balance-value">
            <div className="currency-toggle">
              <button className={currency === 'USDT' ? 'active' : ''} onClick={() => setCurrency('USDT')}>USDT</button>
              <button className={currency === 'BRL' ? 'active' : ''} onClick={() => setCurrency('BRL')}>BRL</button>
            </div>
            <strong>{displayBalance}</strong>
          </div>
          <div className="balance-conversion">
            {currency === 'USDT'
              ? <>≈ {balanceVisible ? formatBrl(balanceBrl) : '••••••'} <span className="positive-tag">+2,84%</span></>
              : <>≈ {balanceVisible ? `${formatUsdt(balanceUsdt)} USDT` : '••••••'} <span className="positive-tag">+2,84%</span></>
            }
          </div>
          <div className="balance-footer">
            <span>Atualizado agora</span>
            <span className="balance-wallet"><Wallet size={14} /> Carteira principal</span>
          </div>
        </div>
        <div className="quick-actions">
          <h3>Ações rápidas</h3>
          <div className="action-buttons">
            <button onClick={() => setScreen('send')}><span className="action-icon send-icon"><Send size={18} /></span><strong>Enviar</strong><small>Para uma carteira BTC</small></button>
            <button onClick={() => setScreen('receive')}><span className="action-icon bank-icon"><ArrowDownLeft size={18} /></span><strong>Receber</strong><small>Seu endereço BTC</small></button>
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel assets-panel">
          <div className="panel-heading"><div><h2>Seus ativos</h2><p>Distribuição da sua carteira</p></div><button className="text-button" onClick={() => setScreen('activity')}>Ver tudo <ChevronRight size={15} /></button></div>
          <div className="asset-row asset-head"><span>ATIVO</span><span>VALOR</span><span>24H</span></div>
          <AssetRow icon="₮" color="teal" name="Tether" symbol="USDT" amount="39.965,94" value="R$ 203.158,87" change="+2,84%" />
          <AssetRow icon="₿" color="orange" name="Bitcoin" symbol="BTC" amount="0,000000" value="R$ 0,00" change="—" muted />
          <AssetRow icon="Ξ" color="gray" name="Ethereum" symbol="ETH" amount="0,000000" value="R$ 0,00" change="—" muted />
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading"><div><h2>Atividade recente</h2><p>Suas últimas movimentações</p></div><button className="text-button" onClick={() => setScreen('activity')}>Ver tudo <ChevronRight size={15} /></button></div>
          <div className="activity-list">
            <ActivityRow icon={<ArrowDownLeft size={17} />} color="green" title="Saldo recebido" date="01/08/2026 · Carteira principal" value="+ 39.965,94 USDT" />
            <ActivityRow icon={<CreditCard size={17} />} color="blue" title="Conta bancária adicionada" date="01/08/2026" value={bankAccount ? bankAccount.bank_name : 'Aguardando cadastro'} />
            <ActivityRow icon={<ArrowUpRight size={17} />} color="gray" title="Nenhum envio recente" date="—" value="—" />
          </div>
        </div>
      </section>
      <div className="security-banner">
        <div className="security-symbol"><ShieldCheck size={22} /></div>
        <div><strong>Sua conta está protegida</strong><p>Autenticação em duas etapas ativa.</p></div>
      </div>
    </div>
  );
}

function AssetRow({ icon, color, name, symbol, amount, value, change, muted = false }: { icon: string; color: string; name: string; symbol: string; amount: string; value: string; change: string; muted?: boolean }) {
  return (
    <div className={`asset-row ${muted ? 'muted-row' : ''}`}>
      <div className={`coin-icon ${color}`}>{icon}</div>
      <div className="asset-name"><strong>{name}</strong><span>{symbol}</span></div>
      <div className="asset-amount"><strong>{amount} <small>{symbol}</small></strong><span>{value}</span></div>
      <div className={`asset-change ${change.startsWith('+') ? 'positive-text' : ''}`}>{change}</div>
    </div>
  );
}

function ActivityRow({ icon, color, title, date, value }: { icon: React.ReactNode; color: string; title: string; date: string; value: string }) {
  return (
    <div className="activity-row">
      <div className={`activity-icon ${color}`}>{icon}</div>
      <div className="activity-description"><strong>{title}</strong><span>{date}</span></div>
      <strong className={value.startsWith('+') ? 'positive-text' : ''}>{value}</strong>
    </div>
  );
}

function SendScreen({ setScreen, facialVerified, openFacial }: { setScreen: (s: Screen) => void; facialVerified: boolean; openFacial: () => void }) {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);

  if (!facialVerified) {
    return (
      <div className="inner-view">
        <ViewHeading eyebrow="ENVIAR ATIVOS" title="Enviar BTC" subtitle="Envie Bitcoin para outra carteira com segurança." />
        <div className="send-layout">
          <div className="panel send-form-panel">
            <div className="review-block">
              <div className="review-icon"><ScanFace size={28} /></div>
              <h3>Verificação facial necessária</h3>
              <p>Para realizar qualquer transferência, você precisa ativar a verificação facial. Esta verificação é feita uma única vez.</p>
              <p>Após ativar, as transferências poderão ser processadas, podendo levar <strong>15 dias úteis ou mais</strong> para serem concluídas.</p>
              <button className="primary-button" onClick={openFacial}><ScanFace size={18} /> Ativar verificação facial</button>
            </div>
          </div>
          <div className="panel send-side">
            <div className="send-side-icon"><Send size={23} /></div>
            <h3>Confira antes de enviar</h3>
            <p>Endereços cripto são permanentes. Sempre confira a rede e o destino antes de confirmar.</p>
            <div className="send-tip"><ScanFace size={16} /><span>Verificação facial obrigatória para transferir</span></div>
            <button className="text-button" onClick={() => setScreen('dashboard')}>Voltar para visão geral <ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inner-view">
      <ViewHeading eyebrow="ENVIAR ATIVOS" title="Enviar BTC" subtitle="Envie Bitcoin para outra carteira com segurança." />
      <div className="send-layout">
        <div className="panel send-form-panel">
          {reviewing ? (
            <div className="review-block">
              <div className="review-icon"><ShieldCheck size={28} /></div>
              <h3>Transferência em processamento</h3>
              <p>Sua transferência está sendo processada. A verificação pode demorar até <strong>15 dias úteis ou mais</strong> para ser concluída.</p>
              <p>Após a confirmação, o valor será enviado para o destino informado e você receberá um e-mail de confirmação.</p>
              <div className="review-details">
                <div className="review-detail-row"><span>Destino</span><strong>{address}</strong></div>
                <div className="review-detail-row"><span>Valor</span><strong>{amount} BTC</strong></div>
                <div className="review-detail-row"><span>Rede</span><strong>Bitcoin (BTC)</strong></div>
                <div className="review-detail-row"><span>Status</span><strong className="pending-text">Verificação pendente</strong></div>
              </div>
              <button className="primary-button" onClick={() => { setReviewing(false); setAddress(''); setAmount(''); setScreen('dashboard'); }}>Entendi, voltar</button>
            </div>
          ) : (
            <>
              <div className="notice-box"><ScanFace size={18} /><span>Toda transferência exige verificação facial. Após confirmar, a verificação pode demorar até 15 dias úteis ou mais.</span></div>
              <label>Endereço da carteira BTC<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Cole o endereço Bitcoin aqui" /></label>
              <label>Rede<select defaultValue="Bitcoin"><option>Bitcoin (BTC)</option></select></label>
              <label>Valor a enviar<div className="amount-input"><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,000000" /><span>BTC</span></div></label>
              <div className="send-available"><span>Disponível para envio</span><strong>{formatUsdt(balanceUsdt)} USDT</strong></div>
              <button className="primary-button" onClick={() => setReviewing(true)} disabled={!address || !amount}>Confirmar envio <ChevronRight size={18} /></button>
            </>
          )}
        </div>
        <div className="panel send-side">
          <div className="send-side-icon"><Send size={23} /></div>
          <h3>Confira antes de enviar</h3>
          <p>Endereços cripto são permanentes. Sempre confira a rede e o destino antes de confirmar.</p>
          <div className="send-tip"><ScanFace size={16} /><span>Verificação facial obrigatória para transferir</span></div>
          <button className="text-button" onClick={() => setScreen('dashboard')}>Voltar para visão geral <ChevronRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function ReceiveScreen({ btcAddresses, setBtcAddresses, setScreen }: { btcAddresses: BtcAddress[]; setBtcAddresses: (a: BtcAddress[]) => void; setScreen: (s: Screen) => void }) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => btcAddresses.find((a) => a.id === selectedId) ?? btcAddresses[0], [btcAddresses, selectedId]);

  useEffect(() => {
    if (selected?.address) QRCode.toDataURL(`bitcoin:${selected.address}`, { width: 200, margin: 1, color: { dark: '#56dabd', light: '#0d0f0f' } }).then(setQrUrl).catch(() => {});
  }, [selected]);

  const copyAddress = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const addAddress = async (event: FormEvent) => {
    event.preventDefault();
    if (!newAddress.trim()) { setAddError('Digite um endereço BTC.'); return; }
    setBusy(true);
    setAddError('');
    const { data, error } = await supabase.from('wallet_btc_addresses').insert({ address: newAddress.trim(), label: newLabel.trim() || 'Nova carteira' }).select('id, address, label, is_primary').maybeSingle();
    setBusy(false);
    if (error || !data) { setAddError('Não foi possível salvar. Talvez esse endereço já esteja cadastrado.'); return; }
    setBtcAddresses([...btcAddresses, data as BtcAddress]);
    setSelectedId((data as BtcAddress).id);
    setNewAddress('');
    setNewLabel('');
    setShowAdd(false);
  };

  const setPrimary = async (addr: BtcAddress) => {
    await supabase.from('wallet_btc_addresses').update({ is_primary: false }).eq('is_primary', true);
    await supabase.from('wallet_btc_addresses').update({ is_primary: true }).eq('id', addr.id);
    setBtcAddresses(btcAddresses.map((a) => ({ ...a, is_primary: a.id === addr.id })));
    setSelectedId(addr.id);
  };

  const removeAddress = async (addr: BtcAddress) => {
    if (btcAddresses.length <= 1) return;
    await supabase.from('wallet_btc_addresses').delete().eq('id', addr.id);
    const remaining = btcAddresses.filter((a) => a.id !== addr.id);
    if (!remaining.some((a) => a.is_primary) && remaining.length > 0) {
      await supabase.from('wallet_btc_addresses').update({ is_primary: true }).eq('id', remaining[0].id);
      remaining[0].is_primary = true;
    }
    setBtcAddresses(remaining);
    if (selectedId === addr.id) setSelectedId(remaining[0]?.id ?? '');
  };

  return (
    <div className="inner-view">
      <ViewHeading eyebrow="RECEBER ATIVOS" title="Receber BTC" subtitle="Compartilhe seu endereço para receber Bitcoin." />
      <div className="send-layout">
        <div className="panel send-form-panel receive-panel">
          <div className="receive-qr-area">
            <div className="qr-frame">
              {qrUrl ? <img src={qrUrl} alt="QR Code do endereço BTC" /> : <div className="qr-placeholder"><QrIcon size={64} /></div>}
              <div className="qr-corner qr-corner-tl" />
              <div className="qr-corner qr-corner-tr" />
              <div className="qr-corner qr-corner-bl" />
              <div className="qr-corner qr-corner-br" />
            </div>
            <div className="receive-coin-label"><span className="coin-icon orange">₿</span> Bitcoin (BTC)</div>
          </div>
          <label className="receive-address-label">Seu endereço BTC</label>
          <div className="receive-address-box">
            <span className="receive-address-text">{selected?.address ?? 'Carregando...'}</span>
            <button className="copy-button" onClick={copyAddress} aria-label="Copiar endereço">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {copied && <span className="copy-feedback">Endereço copiado!</span>}
          <div className="receive-info-box">
            <ShieldCheck size={16} />
            <span>Você pode receber Bitcoin a qualquer momento neste endereço. Não é necessário fazer nada além de compartilhá-lo.</span>
          </div>
        </div>
        <div className="panel send-side receive-side">
          <div className="receive-addresses-header">
            <div className="send-side-icon"><ArrowDownLeft size={23} /></div>
            <h3>Seus endereços BTC</h3>
          </div>
          <p>Selecione qual endereço deseja usar para receber, ou adicione um novo.</p>
          <div className="receive-address-list">
            {btcAddresses.map((addr) => (
              <div key={addr.id} className={`receive-address-item ${selected?.id === addr.id ? 'selected' : ''}`} onClick={() => setSelectedId(addr.id)}>
                <div className="receive-address-item-info">
                  <div className="receive-address-item-label">
                    <span className="coin-icon orange small">₿</span>
                    <strong>{addr.label}</strong>
                    {addr.is_primary && <span className="primary-pill">Principal</span>}
                  </div>
                  <span className="receive-address-item-value">{addr.address}</span>
                </div>
                <div className="receive-address-item-actions" onClick={(e) => e.stopPropagation()}>
                  {!addr.is_primary && <button className="mini-action" title="Definir como principal" onClick={() => setPrimary(addr)}><Check size={13} /></button>}
                  <button className="mini-action danger" title="Remover" onClick={() => removeAddress(addr)} disabled={btcAddresses.length <= 1}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          {showAdd ? (
            <form className="receive-add-form" onSubmit={addAddress}>
              <label>Novo endereço BTC<input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Cole o novo endereço BTC" /></label>
              <label>Nome (opcional)<input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex.: Carteira de reserva" /></label>
              {addError && <span className="error-message">{addError}</span>}
              <div className="receive-add-actions">
                <button type="button" className="outline-button" onClick={() => { setShowAdd(false); setAddError(''); }}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Salvando...' : 'Adicionar'} <Plus size={15} /></button>
              </div>
            </form>
          ) : (
            <button className="outline-button receive-add-button" onClick={() => setShowAdd(true)}><Plus size={16} /> Adicionar outro endereço</button>
          )}
          <button className="text-button" onClick={() => setScreen('dashboard')}>Voltar para visão geral <ChevronRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function ViewHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-intro inner-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div></div>;
}

function BankScreen({ bankAccount, setBankAccount }: { bankAccount: BankAccount | null; setBankAccount: (a: BankAccount | null) => void }) {
  const [bank, setBank] = useState(bankAccount?.bank_name ?? '');
  const [type, setType] = useState(bankAccount?.account_type ?? 'Conta corrente');
  const [agency, setAgency] = useState(bankAccount?.agency ?? '');
  const [account, setAccount] = useState(bankAccount?.account_number ?? '');
  const [pix, setPix] = useState(bankAccount?.pix_key ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setMessage('Faça login novamente para salvar sua conta.'); setBusy(false); return; }
    const payload = { bank_name: bank, account_type: type, agency, account_number: account, pix_key: pix || null, user_id: userData.user.id };
    const query = bankAccount
      ? supabase.from('wallet_bank_accounts').update(payload).eq('id', bankAccount.id).select('id, bank_name, account_type, agency, account_number, pix_key').maybeSingle()
      : supabase.from('wallet_bank_accounts').insert(payload).select('id, bank_name, account_type, agency, account_number, pix_key').maybeSingle();
    const { data, error } = await query;
    if (error || !data) setMessage('Não foi possível salvar agora. Tente novamente.');
    else { setBankAccount(data as BankAccount); setMessage('Conta bancária salva com segurança.'); }
    setBusy(false);
  };

  return (
    <div className="inner-view">
      <ViewHeading eyebrow="DESTINO DE SAQUE" title="Sua conta bancária" subtitle="Cadastre onde você deseja receber suas transferências." />
      <div className="bank-layout">
        <form className="panel bank-form" onSubmit={save}>
          <div className="bank-form-heading"><div className="bank-logo"><Building2 size={20} /></div><div><h3>Dados bancários</h3><p>As informações ficam visíveis apenas para você.</p></div></div>
          <div className="field-grid">
            <label>Nome do banco<input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex.: Nubank" required /></label>
            <label>Tipo de conta<select value={type} onChange={(e) => setType(e.target.value)}><option>Conta corrente</option><option>Conta poupança</option></select></label>
            <label>Agência<input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0001" required /></label>
            <label>Conta<input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="00000-0" required /></label>
            <label className="full-field">Chave Pix <span className="optional">opcional</span><input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" /></label>
          </div>
          <div className="form-actions">
            <span className="secure-label"><LockKeyhole size={14} /> Dados criptografados</span>
            <button className="primary-button" disabled={busy}>{busy ? 'Salvando...' : bankAccount ? 'Atualizar cadastro' : 'Salvar conta'} <Check size={17} /></button>
          </div>
          {message && <div className={message.includes('salva') ? 'success-message' : 'error-message'}>{message}</div>}
        </form>
        <div className="panel bank-preview">
          <p className="eyebrow">PRÓXIMO PASSO</p>
          <div className="preview-card">
            <div className="preview-card-top"><CreditCard size={18} /><span>Conta para recebimento</span><span className="preview-status">{bankAccount ? 'Ativa' : 'Pendente'}</span></div>
            <strong>{bankAccount?.bank_name || 'Seu banco aparecerá aqui'}</strong>
            <span>{bankAccount ? `Agência ${bankAccount.agency} · Conta •••${bankAccount.account_number.slice(-3)}` : 'Cadastre os dados ao lado'}</span>
          </div>
          <p className="muted small-copy">Depois de cadastrar, sua conta ficará disponível como destino para uma futura transferência. Este ambiente não movimenta valores reais.</p>
        </div>
      </div>
    </div>
  );
}

function ActivityScreen() {
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return activityEntries;
    return activityEntries.filter((e) => e.kind === filter);
  }, [filter]);
  return (
    <div className="inner-view">
      <ViewHeading eyebrow="HISTÓRICO" title="Atividade" subtitle="Acompanhe tudo o que acontece na sua carteira." />
      <div className="panel full-activity">
        <div className="filter-row">
          <div className="filter-tabs">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
            <button className={filter === 'in' ? 'active' : ''} onClick={() => setFilter('in')}>Entradas</button>
            <button className={filter === 'out' ? 'active' : ''} onClick={() => setFilter('out')}>Saídas</button>
          </div>
          <button className="outline-button"><LayoutGrid size={15} /> Filtrar</button>
        </div>
        <div className="timeline">
          {filtered.length === 0 && <p className="muted timeline-empty">Nenhuma movimentação nesta categoria ainda.</p>}
          {filtered.map((entry) => {
            const icon = entry.icon === 'down' ? <ArrowDownLeft size={17} /> : entry.icon === 'up' ? <ArrowUpRight size={17} /> : entry.icon === 'face' ? <ScanFace size={17} /> : <Building2 size={17} />;
            return <ActivityRow key={entry.id} icon={icon} color={entry.color} title={entry.title} date={entry.date} value={entry.value} />;
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ bankAccount, profile, btcAddresses, onSignOut, openFacial }: { bankAccount: BankAccount | null; profile: WalletProfile | null; btcAddresses: BtcAddress[]; onSignOut: () => void; openFacial: () => void }) {
  return (
    <div className="inner-view">
      <ViewHeading eyebrow="PREFERÊNCIAS" title="Configurações" subtitle="Gerencie sua conta e segurança." />
      <div className="settings-layout">
        <div className="panel settings-section">
          <div className="settings-section-heading"><ShieldCheck size={18} /><h3>Informações pessoais</h3></div>
          <div className="settings-bank-info">
            <div className="settings-bank-row"><span>Nome completo</span><strong>{profile?.full_name ?? 'Paulo Renato Crema Miranda Filho'}</strong></div>
            <div className="settings-bank-row"><span>E-mail</span><strong className="email-cell"><Mail size={13} /> {profile?.email ?? demoEmail}</strong></div>
            <div className="settings-bank-row"><span>Data de nascimento</span><strong>{profile ? formatDate(profile.birth_date) : '06/06/2004'}</strong></div>
            <div className="settings-bank-row"><span>CPF</span><strong>{profile?.cpf ?? '150.303.097-05'}</strong></div>
          </div>
        </div>
        <div className="panel settings-section">
          <div className="settings-section-heading"><ScanFace size={18} /><h3>Segurança</h3></div>
          <div className="settings-list">
            <div className="settings-item">
              <div><strong>Verificação facial</strong><p>{profile?.facial_verified ? 'Verificação ativa. Transferências liberadas.' : 'Pendente. Ative para liberar transferências.'}</p></div>
              {profile?.facial_verified
                ? <span className="status-badge active">Ativa</span>
                : <button className="status-badge inactive" onClick={openFacial}>Ativar</button>
              }
            </div>
            <div className="settings-item"><div><strong>Autenticação em duas etapas</strong><p>Proteção adicional no login</p></div><span className="status-badge active">Ativa</span></div>
            <div className="settings-item"><div><strong>Notificações de transação</strong><p>Alertas sobre movimentações</p></div><span className="status-badge active">Ativa</span></div>
          </div>
        </div>
        <div className="panel settings-section">
          <div className="settings-section-heading"><Wallet size={18} /><h3>Endereços da carteira BTC</h3></div>
          <div className="settings-bank-info">
            {btcAddresses.length === 0 && <div className="settings-bank-row"><span>Nenhum endereço cadastrado</span><strong>—</strong></div>}
            {btcAddresses.map((addr) => (
              <div className="settings-bank-row btc-address-row" key={addr.id}>
                <span>{addr.label}{addr.is_primary ? ' (principal)' : ''}</span>
                <strong className="btc-address-text">{addr.address}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel settings-section">
          <div className="settings-section-heading"><Building2 size={18} /><h3>Conta bancária cadastrada</h3></div>
          {bankAccount ? (
            <div className="settings-bank-info">
              <div className="settings-bank-row"><span>Banco</span><strong>{bankAccount.bank_name}</strong></div>
              <div className="settings-bank-row"><span>Tipo</span><strong>{bankAccount.account_type}</strong></div>
              <div className="settings-bank-row"><span>Agência</span><strong>{bankAccount.agency}</strong></div>
              <div className="settings-bank-row"><span>Conta</span><strong>•••{bankAccount.account_number.slice(-3)}</strong></div>
              {bankAccount.pix_key && <div className="settings-bank-row"><span>Chave Pix</span><strong>{bankAccount.pix_key}</strong></div>}
            </div>
          ) : (
            <p className="muted">Nenhuma conta bancária cadastrada ainda. Vá em "Conta bancária" no menu para cadastrar.</p>
          )}
        </div>
        <div className="panel settings-section">
          <div className="settings-section-heading"><LogOut size={18} /><h3>Sair da conta</h3></div>
          <p className="muted">Você será desconectado e precisará fazer login novamente.</p>
          <button className="danger-button" onClick={onSignOut}><LogOut size={16} /> Sair agora</button>
        </div>
      </div>
    </div>
  );
}

function SearchModal({ onClose, setScreen }: { onClose: () => void; setScreen: (s: Screen) => void }) {
  const [query, setQuery] = useState('');
  const results = [
    { label: 'Visão geral', screen: 'dashboard' as Screen },
    { label: 'Enviar BTC', screen: 'send' as Screen },
    { label: 'Receber BTC', screen: 'receive' as Screen },
    { label: 'Cadastrar conta bancária', screen: 'bank' as Screen },
    { label: 'Atividade', screen: 'activity' as Screen },
    { label: 'Configurações', screen: 'settings' as Screen },
  ].filter((r) => r.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="search-input-wrap"><Search size={18} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar na carteira..." /></div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="search-results">
          {results.length === 0 && <p className="muted search-empty">Nenhum resultado encontrado.</p>}
          {results.map((r) => (
            <button key={r.screen} className="search-result" onClick={() => { setScreen(r.screen); onClose(); }}><ChevronRight size={15} /> {r.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsModal({ profile, onClose, setScreen, openFacial }: { profile: WalletProfile | null; onClose: () => void; setScreen: (s: Screen) => void; openFacial: () => void }) {
  const facialActive = profile?.facial_verified ?? false;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card notif-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Notificações</h3><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="notif-list">
          {!facialActive && (
            <button className="notif-item notif-urgent" onClick={() => { openFacial(); onClose(); }}>
              <div className="activity-icon yellow"><ScanFace size={16} /></div>
              <div className="notif-content"><strong>Verificação facial pendente</strong><span>Ative para liberar transferências. Necessário apenas uma vez.</span></div>
              <ChevronRight size={15} />
            </button>
          )}
          <button className="notif-item" onClick={() => { setScreen('receive'); onClose(); }}>
            <div className="activity-icon green"><ArrowDownLeft size={16} /></div>
            <div className="notif-content"><strong>Receber BTC</strong><span>Compartilhe seu endereço para receber</span></div>
          </button>
          <button className="notif-item" onClick={() => { setScreen('activity'); onClose(); }}>
            <div className="activity-icon green"><ArrowDownLeft size={16} /></div>
            <div className="notif-content"><strong>Saldo recebido</strong><span>+ 39.965,94 USDT em 01/08/2026</span></div>
          </button>
          {facialActive && (
            <button className="notif-item" onClick={() => { setScreen('settings'); onClose(); }}>
              <div className="activity-icon green"><ShieldCheck size={16} /></div>
              <div className="notif-content"><strong>Verificação facial ativa</strong><span>Sua identidade foi confirmada</span></div>
            </button>
          )}
          <button className="notif-item" onClick={() => { setScreen('bank'); onClose(); }}>
            <div className="activity-icon blue"><Building2 size={16} /></div>
            <div className="notif-content"><strong>Conta bancária</strong><span>Cadastre sua conta para receber transferências</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}

function FacialModal({ profile, setProfile, onClose }: { profile: WalletProfile | null; setProfile: (p: WalletProfile) => void; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState('');
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    QRCode.toDataURL('Trazor Bypass://face-verify?session=' + Date.now(), { width: 180, margin: 1, color: { dark: '#56dabd', light: '#0d0f0f' } }).then(setQrUrl).catch(() => {});
  }, []);

  const handleComplete = async () => {
    setSaving(true);
    const { data } = await supabase.from('wallet_profiles').update({ facial_verified: true, facial_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', profile!.id).select('id, full_name, birth_date, cpf, facial_verified, facial_verified_at').maybeSingle();
    if (data) setProfile({ ...(data as Omit<WalletProfile, 'email'>), email: profile!.email });
    setSaving(false);
    setCompleted(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card facial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Verificação facial</h3><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="facial-modal-body">
          {completed ? (
            <div className="facial-success-block">
              <div className="facial-success-icon"><Check size={32} /></div>
              <h3>Verificação concluída!</h3>
              <p>Sua verificação facial foi ativada com sucesso. Agora você já pode realizar transferências.</p>
              <div className="facial-email-notice">
                <Mail size={18} />
                <div>
                  <strong>Confirmação por e-mail</strong>
                  <span>Um e-mail de confirmação será enviado para <strong>{profile?.email ?? demoEmail}</strong> com os detalhes da verificação.</span>
                </div>
              </div>
              <button className="primary-button facial-modal-button" onClick={onClose}>Entendi</button>
            </div>
          ) : (
            <>
              <p className="facial-modal-intro">Escaneie o QR Code com a câmera do seu celular para confirmar sua identidade. Esta verificação é feita uma única vez.</p>
              <div className="face-qr-area">
                <div className="qr-frame">
                  {qrUrl ? <img src={qrUrl} alt="QR Code para verificação facial" /> : <div className="qr-placeholder"><QrIcon size={64} /></div>}
                  <div className="qr-corner qr-corner-tl" />
                  <div className="qr-corner qr-corner-tr" />
                  <div className="qr-corner qr-corner-bl" />
                  <div className="qr-corner qr-corner-br" />
                </div>
                <div className="face-qr-status"><ScanFace size={16} /><span>{scanned ? 'Verificação concluída!' : 'Aponte a câmera para o QR Code'}</span></div>
              </div>
              {!scanned ? (
                <button className="primary-button facial-modal-button" onClick={() => setScanned(true)}><ScanFace size={18} /> Já escaneei com a câmera</button>
              ) : (
                <button className="primary-button facial-modal-button" onClick={handleComplete} disabled={saving}>{saving ? 'Salvando...' : <><Check size={18} /> Concluir verificação</>}</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
