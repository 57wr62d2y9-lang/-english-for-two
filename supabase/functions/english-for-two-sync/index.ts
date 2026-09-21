import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const encoder = new TextEncoder();
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || 'https://english-for-two.onrender.com';
const APP_URL = Deno.env.get('APP_URL') || 'https://english-for-two.onrender.com/';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function adminKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try { return String(JSON.parse(modern).default || ''); } catch { /* use legacy fallback */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const databaseUrl = Deno.env.get('SUPABASE_URL') || '';
const databaseKey = adminKey();
const db = createClient(databaseUrl, databaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function headers(request: Request) {
  const origin = request.headers.get('origin') || '';
  const allowed = !origin || origin === APP_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    allowed,
    value: {
      'access-control-allow-origin': allowed && origin ? origin : APP_ORIGIN,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-telegram-init-data',
      'access-control-max-age': '86400',
      'content-type': 'application/json; charset=utf-8',
      'vary': 'origin'
    }
  };
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request).value });
}

async function hmac(key: Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function hex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function telegramUser(request: Request) {
  if (!BOT_TOKEN) throw new RequestError('Сервер синхронизации ещё не настроен.', 503);
  const raw = request.headers.get('x-telegram-init-data') || '';
  if (!raw || raw.length > 8192) throw new RequestError('Открой приложение внутри Telegram.', 401);
  const params = new URLSearchParams(raw);
  const receivedHash = params.get('hash') || '';
  params.delete('hash');
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = await hmac(encoder.encode('WebAppData'), BOT_TOKEN);
  const expectedHash = hex(await hmac(secret, checkString));
  if (!receivedHash || !constantTimeEqual(expectedHash, receivedHash)) throw new RequestError('Telegram не подтвердил пользователя.', 401);

  const authDate = Number(params.get('auth_date') || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || authDate > now + 60 || now - authDate > 86400) throw new RequestError('Сессия устарела. Закрой и снова открой приложение.', 401);
  let user: { id?: number; first_name?: string; username?: string };
  try { user = JSON.parse(params.get('user') || '{}'); } catch { throw new RequestError('Не удалось прочитать профиль Telegram.', 401); }
  if (!user.id || !/^\d+$/.test(String(user.id))) throw new RequestError('Telegram не передал пользователя.', 401);
  return {
    id: String(user.id),
    firstName: String(user.first_name || '').slice(0, 64),
    username: String(user.username || '').slice(0, 64)
  };
}

function cleanProfile(payload: Record<string, unknown>, user: { firstName: string; username: string }) {
  const requested = String(payload.displayName || '');
  const rawGoals = Array.isArray(payload.goals) ? payload.goals.slice(0, 12) : [];
  const goals = rawGoals.map(value => {
    const goal = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      id:String(goal.id || '').replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 100),
      title:String(goal.title || '').trim().slice(0, 60),
      cost:Math.max(1, Math.min(10000, Math.round(Number(goal.cost) || 0))),
      active:goal.active !== false,
      at:Math.max(0, Number(goal.at) || 0)
    };
  }).filter(goal => goal.id.length >= 4 && goal.title);
  return {
    display_name: ['Artur', 'Anna'].includes(requested) ? requested : user.firstName || 'Learner',
    username: user.username || null,
    level: ['A2', 'B1', 'B2', 'C1'].includes(String(payload.level)) ? String(payload.level) : 'A2',
    percent: Math.max(0, Math.min(100, Math.round(Number(payload.percent) || 0))),
    balance: Math.max(0, Math.min(10000, Math.round(Number(payload.balance) || 0))),
    today_minutes: Math.max(0, Math.min(1440, Math.round(Number(payload.todayMinutes) || 0))),
    routines: { morning:payload.morningDone === true, evening:payload.eveningDone === true },
    goals,
    updated_at: new Date().toISOString()
  };
}

function mapGift(row: Record<string, unknown>, from = '') {
  return {
    id: row.id,
    title: row.title,
    cost: row.cost,
    status: row.status,
    from,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}

async function snapshot(userId: string) {
  const { data: pair, error: pairError } = await db.from('eft_pairs').select('partner_id').eq('user_id', userId).maybeSingle();
  if (pairError) throw pairError;
  if (!pair?.partner_id) return { paired: false, partner: null, incoming: [], outgoing: [] };
  const partnerId = String(pair.partner_id);
  const [partnerResult, incomingResult, outgoingResult] = await Promise.all([
    db.from('eft_users').select('display_name, level, percent, balance, today_minutes, routines, goals, updated_at').eq('telegram_id', partnerId).maybeSingle(),
    db.from('eft_gift_requests').select('id, title, cost, status, created_at, updated_at, resolved_at').eq('recipient_id', userId).order('updated_at', { ascending: false }).limit(25),
    db.from('eft_gift_requests').select('id, title, cost, status, created_at, updated_at, resolved_at').eq('requester_id', userId).order('updated_at', { ascending: false }).limit(25)
  ]);
  if (partnerResult.error) throw partnerResult.error;
  if (incomingResult.error) throw incomingResult.error;
  if (outgoingResult.error) throw outgoingResult.error;
  const partner = partnerResult.data ? {
    displayName: partnerResult.data.display_name,
    level: partnerResult.data.level,
    percent: partnerResult.data.percent,
    balance: partnerResult.data.balance,
    todayMinutes: partnerResult.data.today_minutes,
    morningDone: partnerResult.data.routines?.morning === true,
    eveningDone: partnerResult.data.routines?.evening === true,
    goals: Array.isArray(partnerResult.data.goals) ? partnerResult.data.goals : [],
    updatedAt: partnerResult.data.updated_at
  } : null;
  return {
    paired: true,
    partner,
    incoming: (incomingResult.data || []).map(row => mapGift(row, String(partner?.displayName || 'Partner'))),
    outgoing: (outgoingResult.data || []).map(row => mapGift(row))
  };
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function notify(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: 'Открыть English for Two', web_app: { url: APP_URL } }]] }
      })
    });
  } catch (error) {
    console.error('Telegram notification failed', error);
  }
}

async function pairFor(userId: string) {
  const { data, error } = await db.from('eft_pairs').select('partner_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data?.partner_id) throw new RequestError('Сначала свяжи кабинеты в настройках.', 409);
  return String(data.partner_id);
}

async function handle(action: string, payload: Record<string, unknown>, user: { id: string; firstName: string; username: string }) {
  if (action === 'sync') {
    const profile = cleanProfile((payload.profile || {}) as Record<string, unknown>, user);
    const { error } = await db.from('eft_users').upsert({ telegram_id: user.id, ...profile }, { onConflict: 'telegram_id' });
    if (error) throw error;
    return snapshot(user.id);
  }

  if (action === 'create_pair_code') {
    const { error: userError } = await db.from('eft_users').upsert({ telegram_id:user.id, display_name:user.firstName || 'Learner', username:user.username || null, updated_at:new Date().toISOString() }, { onConflict:'telegram_id' });
    if (userError) throw userError;
    await db.from('eft_pair_codes').delete().lt('expires_at', new Date().toISOString());
    await db.from('eft_pair_codes').delete().eq('owner_id', user.id);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { error } = await db.from('eft_pair_codes').insert({ code, owner_id: user.id, expires_at: new Date(Date.now() + 15 * 60000).toISOString() });
      if (!error) return { code };
      if (error.code !== '23505') throw error;
    }
    throw new RequestError('Не удалось создать код. Попробуй ещё раз.', 503);
  }

  if (action === 'join_pair') {
    const code = String(payload.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) throw new RequestError('Введи код из 6 символов.');
    const { data: invitation, error: invitationError } = await db.from('eft_pair_codes').select('owner_id, expires_at').eq('code', code).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (invitationError) throw invitationError;
    if (!invitation?.owner_id) throw new RequestError('Код неверный или уже истёк.', 404);
    const ownerId = String(invitation.owner_id);
    if (ownerId === user.id) throw new RequestError('Этот код нужно ввести во втором аккаунте.');
    const { error: profileError } = await db.from('eft_users').upsert({ telegram_id: user.id, display_name: user.firstName || 'Learner', username: user.username || null, updated_at: new Date().toISOString() }, { onConflict: 'telegram_id' });
    if (profileError) throw profileError;
    const { error: pairError } = await db.rpc('eft_pair_users', { p_owner_id: ownerId, p_joiner_id: user.id });
    if (pairError) throw pairError;
    await notify(ownerId, `✅ ${escapeHtml(user.firstName || 'Партнёр')} связал(а) кабинет с твоим English for Two.`);
    return snapshot(user.id);
  }

  if (action === 'create_request') {
    const request = (payload.request || {}) as Record<string, unknown>;
    const id = String(request.id || '').slice(0, 100);
    const title = String(request.title || '').trim().slice(0, 60);
    const cost = Math.round(Number(request.cost));
    if (!/^[A-Za-z0-9:_-]{4,100}$/.test(id) || !title || !Number.isInteger(cost) || cost < 1 || cost > 10000) throw new RequestError('Некорректный запрос подарка.');
    const partnerId = await pairFor(user.id);
    const { data: requester } = await db.from('eft_users').select('display_name').eq('telegram_id', user.id).maybeSingle();
    const { error } = await db.from('eft_gift_requests').insert({ id, requester_id: user.id, recipient_id: partnerId, title, cost });
    if (error && error.code !== '23505') throw error;
    await notify(partnerId, `🎁 <b>${escapeHtml(String(requester?.display_name || user.firstName || 'Партнёр'))}</b> накопил(а) $${cost} и хочет «${escapeHtml(title)}». Открой приложение, чтобы решить.`);
    return { created: true, ...(await snapshot(user.id)) };
  }

  if (action === 'resolve_request') {
    const id = String(payload.id || '').slice(0, 100);
    const status = String(payload.status || '');
    if (!/^[A-Za-z0-9:_-]{4,100}$/.test(id) || !['approved', 'rejected'].includes(status)) throw new RequestError('Некорректное решение.');
    const { data: gift, error: giftError } = await db.from('eft_gift_requests').select('id, title, requester_id, status').eq('id', id).eq('recipient_id', user.id).maybeSingle();
    if (giftError) throw giftError;
    if (!gift) throw new RequestError('Запрос не найден.', 404);
    if (gift.status === 'pending') {
      const now = new Date().toISOString();
      const { error } = await db.from('eft_gift_requests').update({ status, resolved_at: now, updated_at: now }).eq('id', id).eq('recipient_id', user.id).eq('status', 'pending');
      if (error) throw error;
      const verb = status === 'approved' ? 'согласован' : 'отклонён, баллы возвращены';
      await notify(String(gift.requester_id), `🎁 Запрос «${escapeHtml(String(gift.title))}» ${verb}.`);
    }
    return { resolved: true, ...(await snapshot(user.id)) };
  }

  throw new RequestError('Неизвестное действие.', 404);
}

Deno.serve(async (request: Request) => {
  const cors = headers(request);
  if (!cors.allowed) return response(request, { ok: false, error: 'Недопустимый источник запроса.' }, 403);
  if (request.method === 'OPTIONS') return response(request, { ok: true });
  if (request.method !== 'POST') return response(request, { ok: false, error: 'Используй POST.' }, 405);
  if (!databaseUrl || !databaseKey) return response(request, { ok: false, error: 'База синхронизации ещё не настроена.' }, 503);
  try {
    const user = await telegramUser(request);
    const body = await request.json();
    const action = String(body?.action || '');
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const data = await handle(action, payload, user);
    return response(request, { ok: true, ...data });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    if (status >= 500) console.error(error);
    return response(request, { ok: false, error: error instanceof RequestError ? error.message : 'Синхронизация временно недоступна.' }, status);
  }
});
