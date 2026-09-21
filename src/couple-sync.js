const ENDPOINT = String(import.meta.env?.VITE_COUPLE_SYNC_URL || '').trim().replace(/\/+$/, '');

const telegram = () => typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
const initData = () => String(telegram()?.initData || '');

export const coupleSyncConfigured = () => Boolean(ENDPOINT);
export const coupleSyncAvailable = () => Boolean(ENDPOINT && initData());
export const normalisePairCode = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

function stamp(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
}

export function mergeCoupleSnapshot(wallet, data = {}) {
  const next = {
    ...(wallet || {}),
    earned: wallet?.earned || {},
    spent: { ...(wallet?.spent || {}) },
    goals: wallet?.goals || {},
    incoming: { ...(wallet?.incoming || {}) },
    partner: data.paired === false ? null : data.partner ? {
      name: String(data.partner.displayName || 'Partner').slice(0, 30),
      level: String(data.partner.level || ''),
      percent: Math.max(0, Math.min(100, Number(data.partner.percent) || 0)),
      balance: Math.max(0, Math.round(Number(data.partner.balance) || 0)),
      todayMinutes: Math.max(0, Math.round(Number(data.partner.todayMinutes) || 0)),
      morningDone: data.partner.morningDone === true,
      eveningDone: data.partner.eveningDone === true,
      goals: (Array.isArray(data.partner.goals) ? data.partner.goals : []).slice(0, 12).map(goal => ({
        id: String(goal?.id || '').slice(0, 100),
        title: String(goal?.title || '').slice(0, 60),
        cost: Math.max(1, Math.min(10000, Math.round(Number(goal?.cost) || 0))),
        active: goal?.active !== false,
        at: Math.max(0, Number(goal?.at) || 0)
      })).filter(goal => goal.id && goal.title),
      at: stamp(data.partner.updatedAt) || Date.now(),
      automatic: true
    } : wallet?.partner || null
  };

  for (const entry of data.incoming || []) {
    if (!entry?.id) continue;
    const previous = next.incoming[entry.id];
    const updatedAt = stamp(entry.updatedAt) || stamp(entry.createdAt) || Date.now();
    if (previous && stamp(previous.resolvedAt || previous.updatedAt || previous.at) > updatedAt) continue;
    next.incoming[entry.id] = {
      ...previous,
      title: String(entry.title || '').slice(0, 60),
      cost: Math.max(1, Math.round(Number(entry.cost) || 0)),
      from: String(entry.from || 'Partner').slice(0, 30),
      at: stamp(entry.createdAt) || previous?.at || Date.now(),
      status: ['approved', 'rejected'].includes(entry.status) ? entry.status : 'pending',
      resolvedAt: entry.resolvedAt ? stamp(entry.resolvedAt) : previous?.resolvedAt,
      updatedAt,
      automatic: true
    };
  }

  for (const entry of data.outgoing || []) {
    if (!entry?.id || !next.spent[entry.id]) continue;
    const previous = next.spent[entry.id];
    const updatedAt = stamp(entry.updatedAt) || stamp(entry.createdAt) || Date.now();
    if (stamp(previous.resolvedAt || previous.updatedAt || previous.at) > updatedAt) continue;
    next.spent[entry.id] = {
      ...previous,
      status: ['approved', 'rejected'].includes(entry.status) ? entry.status : 'pending',
      resolvedAt: entry.resolvedAt ? stamp(entry.resolvedAt) : previous.resolvedAt,
      updatedAt,
      automatic: true
    };
  }

  return next;
}

async function invoke(action, payload = {}) {
  if (!ENDPOINT) return { ok: false, disabled: true, error: 'Синхронизация пары ещё не подключена.' };
  const auth = initData();
  if (!auth) return { ok: false, telegramOnly: true, error: 'Открой приложение внутри Telegram.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-init-data': auth },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `Ошибка синхронизации (${response.status})`);
    return { ok: true, ...data };
  } catch (error) {
    return { ok: false, error: error?.name === 'AbortError' ? 'Синхронизация отвечает слишком долго.' : String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

export const syncCouple = profile => invoke('sync', { profile });
export const createPairCode = () => invoke('create_pair_code');
export const joinPair = code => invoke('join_pair', { code: normalisePairCode(code) });
export const createCoupleGiftRequest = request => invoke('create_request', { request });
export const resolveCoupleGiftRequest = (id, status) => invoke('resolve_request', { id, status });
