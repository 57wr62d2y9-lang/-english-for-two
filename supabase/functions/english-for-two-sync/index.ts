import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const encoder = new TextEncoder();
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || 'https://english-for-two.onrender.com';
const APP_URL = Deno.env.get('APP_URL') || 'https://english-for-two.onrender.com/';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function adminKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try { return String(JSON.parse(modern).default || ''); } catch { /* legacy fallback */ }
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

type TelegramUser = { id: string; firstName: string; username: string };
type Account = { id: string; telegram: TelegramUser | null };

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '';
  const allowed = !origin || origin === APP_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    allowed,
    value: {
      'access-control-allow-origin': allowed && origin ? origin : APP_ORIGIN,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-pair-id, x-pair-secret, x-telegram-init-data',
      'access-control-max-age': '86400',
      'content-type': 'application/json; charset=utf-8',
      'vary': 'origin'
    }
  };
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request).value });
}

async function hmac(key: Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function hex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function optionalTelegramUser(request: Request): Promise<TelegramUser | null> {
  const raw = request.headers.get('x-telegram-init-data') || '';
  if (!BOT_TOKEN || !raw) return null;
  if (raw.length > 8192) throw new RequestError('Telegram session is too large.', 401);
  const params = new URLSearchParams(raw);
  const receivedHash = params.get('hash') || '';
  params.delete('hash');
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = await hmac(encoder.encode('WebAppData'), BOT_TOKEN);
  const expectedHash = hex(await hmac(secret, checkString));
  if (!receivedHash || !constantTimeEqual(expectedHash, receivedHash)) throw new RequestError('Telegram не подтвердил пользователя.', 401);
  const authDate = Number(params.get('auth_date') || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || authDate > now + 60 || now - authDate > 86400) throw new RequestError('Сессия Telegram устарела.', 401);
  let user: { id?: number; first_name?: string; username?: string };
  try { user = JSON.parse(params.get('user') || '{}'); } catch { throw new RequestError('Не удалось прочитать профиль Telegram.', 401); }
  if (!user.id || !/^\d+$/.test(String(user.id))) throw new RequestError('Telegram не передал пользователя.', 401);
  return { id:String(user.id), firstName:String(user.first_name || '').slice(0, 64), username:String(user.username || '').slice(0, 64) };
}

async function authenticate(request: Request): Promise<Account> {
  const accountId = String(request.headers.get('x-pair-id') || '');
  const secret = String(request.headers.get('x-pair-secret') || '');
  if (!UUID_PATTERN.test(accountId) || !SECRET_PATTERN.test(secret)) throw new RequestError('Защищённый ключ кабинета не найден. Обнови страницу.', 401);
  const secretHash = await sha256(secret);
  const telegram = await optionalTelegramUser(request);
  const { data: existing, error: lookupError } = await db.from('eft_users').select('secret_hash').eq('account_id', accountId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    if (!constantTimeEqual(String(existing.secret_hash || ''), secretHash)) throw new RequestError('Ключ кабинета не совпадает.', 401);
  } else {
    const row = {
      account_id:accountId,
      secret_hash:secretHash,
      telegram_id:telegram ? Number(telegram.id) : null,
      display_name:telegram?.firstName || 'Learner',
      username:telegram?.username || null
    };
    let { error } = await db.from('eft_users').insert(row);
    if (error?.code === '23505' && telegram) {
      ({ error } = await db.from('eft_users').insert({ ...row, telegram_id:null, username:null }));
    }
    if (error?.code === '23505') {
      const { data: raced, error: raceError } = await db.from('eft_users').select('secret_hash').eq('account_id', accountId).maybeSingle();
      if (raceError || !raced || !constantTimeEqual(String(raced.secret_hash || ''), secretHash)) throw new RequestError('Этот кабинет уже зарегистрирован.', 409);
    } else if (error) throw error;
  }
  if (telegram) {
    const { error } = await db.from('eft_users').update({ telegram_id:Number(telegram.id), username:telegram.username || null }).eq('account_id', accountId).is('telegram_id', null);
    if (error?.code !== '23505' && error) throw error;
  }
  return { id:accountId, telegram };
}

function cleanProfile(payload: Record<string, unknown>, telegram: TelegramUser | null) {
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
    display_name:['Artur', 'Anna'].includes(requested) ? requested : telegram?.firstName || 'Learner',
    username:telegram?.username || null,
    level:['A2', 'B1', 'B2', 'C1'].includes(String(payload.level)) ? String(payload.level) : 'A2',
    percent:Math.max(0, Math.min(100, Math.round(Number(payload.percent) || 0))),
    balance:Math.max(0, Math.min(10000, Math.round(Number(payload.balance) || 0))),
    today_minutes:Math.max(0, Math.min(1440, Math.round(Number(payload.todayMinutes) || 0))),
    routines:{ morning:payload.morningDone === true, evening:payload.eveningDone === true },
    goals,
    updated_at:new Date().toISOString()
  };
}

function mapGift(row: Record<string, unknown>, from = '') {
  return {
    id:row.id, title:row.title, cost:row.cost, status:row.status, from,
    createdAt:row.created_at, updatedAt:row.updated_at, resolvedAt:row.resolved_at
  };
}

async function snapshot(accountId: string) {
  const { data: pair, error: pairError } = await db.from('eft_pairs').select('partner_id').eq('user_id', accountId).maybeSingle();
  if (pairError) throw pairError;
  if (!pair?.partner_id) return { paired:false, partner:null, incoming:[], outgoing:[], notifications:[], telegramNotifications:Boolean(BOT_TOKEN) };
  const partnerId = String(pair.partner_id);
  const [partnerResult, incomingResult, outgoingResult, noticesResult] = await Promise.all([
    db.from('eft_users').select('display_name, level, percent, balance, today_minutes, routines, goals, updated_at').eq('account_id', partnerId).maybeSingle(),
    db.from('eft_gift_requests').select('id, title, cost, status, created_at, updated_at, resolved_at').eq('recipient_id', accountId).order('updated_at', { ascending:false }).limit(25),
    db.from('eft_gift_requests').select('id, title, cost, status, created_at, updated_at, resolved_at').eq('requester_id', accountId).order('updated_at', { ascending:false }).limit(25),
    db.from('eft_notifications').select('id, payload, created_at').eq('recipient_id',accountId).order('created_at',{ascending:false}).limit(50)
  ]);
  if (partnerResult.error) throw partnerResult.error;
  if (incomingResult.error) throw incomingResult.error;
  if (outgoingResult.error) throw outgoingResult.error;
  if (noticesResult.error) throw noticesResult.error;
  const partner = partnerResult.data ? {
    displayName:partnerResult.data.display_name,
    level:partnerResult.data.level,
    percent:partnerResult.data.percent,
    balance:partnerResult.data.balance,
    todayMinutes:partnerResult.data.today_minutes,
    morningDone:partnerResult.data.routines?.morning === true,
    eveningDone:partnerResult.data.routines?.evening === true,
    goals:Array.isArray(partnerResult.data.goals) ? partnerResult.data.goals : [],
    updatedAt:partnerResult.data.updated_at
  } : null;
  return {
    paired:true,
    notifications:noticesResult.data || [],
    telegramNotifications:Boolean(BOT_TOKEN),
    partner,
    incoming:(incomingResult.data || []).map(row => mapGift(row, String(partner?.displayName || 'Partner'))),
    outgoing:(outgoingResult.data || []).map(row => mapGift(row))
  };
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function telegramIdFor(accountId: string) {
  const { data } = await db.from('eft_users').select('telegram_id').eq('account_id', accountId).maybeSingle();
  return data?.telegram_id ? String(data.telegram_id) : '';
}

async function notify(accountId: string, text: string) {
  if (!BOT_TOKEN) return;
  const chatId = await telegramIdFor(accountId);
  if (!chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{ 'content-type':'application/json' },
      body:JSON.stringify({
        chat_id:chatId, text, parse_mode:'HTML', disable_web_page_preview:true,
        reply_markup:{ inline_keyboard:[[{ text:'Открыть English for Two', web_app:{ url:APP_URL } }]] }
      })
    });
  } catch (error) { console.error('Telegram notification failed', error); }
}

async function pairFor(accountId: string) {
  const { data, error } = await db.from('eft_pairs').select('partner_id').eq('user_id', accountId).maybeSingle();
  if (error) throw error;
  if (!data?.partner_id) throw new RequestError('Сначала свяжи кабинеты в настройках.', 409);
  return String(data.partner_id);
}

async function guardJoinAttempts(accountId: string) {
  const cutoff = new Date(Date.now() - 15 * 60000).toISOString();
  await db.from('eft_pair_join_attempts').delete().lt('attempted_at', new Date(Date.now() - 86400000).toISOString());
  const { count, error } = await db.from('eft_pair_join_attempts').select('id', { count:'exact', head:true }).eq('account_id', accountId).gte('attempted_at', cutoff);
  if (error) throw error;
  if ((count || 0) >= 10) throw new RequestError('Слишком много попыток. Попробуй через 15 минут.', 429);
  const { error: insertError } = await db.from('eft_pair_join_attempts').insert({ account_id:accountId });
  if (insertError) throw insertError;
}

async function handle(action: string, payload: Record<string, unknown>, account: Account) {
  if (action === 'load_state') {
    const offset=Math.max(0,Math.min(9500,Math.trunc(Number(payload.offset)||0)));
    const {data,error}=await db.from('eft_private_records').select('record_key,payload,updated_ms').eq('account_id',account.id).order('record_key').range(offset,offset+499);
    if(error) throw error;
    return {records:data || []};
  }
  if (action === 'save_state') {
    const records=Array.isArray(payload.records) ? payload.records : [];
    if(records.length>120) throw new RequestError('Слишком много записей за один запрос.',413);
    const clean=records.map(raw=>{
      const value=raw as Record<string,unknown>;
      const key=String(value.key || '');
      const at=Math.trunc(Number(value.at));
      if(!/^(progress:(A2|B1|B2|C1):[\w:-]+|lesson:[\w:-]+|day:\d{4}-\d{2}-\d{2}|wallet:(earned|spent|goals):[\w:-]+|legacy|draft)$/.test(key) || key.length>180 || !Number.isSafeInteger(at) || at<1 || at>Date.now()+86400000 || JSON.stringify(value.data ?? null).length>90000) throw new RequestError('Некорректная запись прогресса.');
      return {key,at,data:value.data ?? null};
    });
    const {error}=await db.rpc('eft_merge_private_records',{p_account_id:account.id,p_records:clean});
    if(error) throw error;
    return {saved:clean.length};
  }
  if (action === 'publish_lesson') {
    const lesson=(payload.lesson || {}) as Record<string,unknown>;
    const id=String(lesson.id || '');
    if(!/^[\w-]{6,100}$/.test(id) || !['A2','B1','B2','C1'].includes(String(lesson.level))) throw new RequestError('Некорректный урок.');
    const {data:pair,error:pairError}=await db.from('eft_pairs').select('partner_id').eq('user_id',account.id).maybeSingle();
    if(pairError) throw pairError;
    if(!pair?.partner_id) return {published:false};
    const {data:user,error:userError}=await db.from('eft_users').select('display_name').eq('account_id',account.id).single();
    if(userError) throw userError;
    const earned=Math.max(0,Math.min(3,Math.trunc(Number(lesson.reward)||0)));
    const notice={kind:'lesson',from:user.display_name,level:lesson.level,reward:earned,seconds:Math.max(0,Math.min(3600,Math.round(Number(lesson.seconds)||0))),answers:Math.max(0,Math.min(500,Math.round(Number(lesson.answers)||0))),accuracy:Math.max(0,Math.min(100,Math.round(Number(lesson.accuracy)||0))),steps:Math.max(0,Math.min(10000,Number(lesson.steps)||0))};
    const {data:existing,error:lookupError}=await db.from('eft_notifications').select('id').eq('id',`${account.id}:${id}`).maybeSingle();
    if(lookupError) throw lookupError;
    if(!existing) {
      const {error}=await db.from('eft_notifications').insert({id:`${account.id}:${id}`,recipient_id:pair.partner_id,sender_id:account.id,payload:notice});
      if(error?.code !== '23505' && error) throw error;
      if(!error) await notify(String(pair.partner_id),`🐿 <b>${escapeHtml(String(user.display_name))}</b>: урок ${escapeHtml(String(lesson.level))} завершён!\n${notice.answers} ответов · точность ${notice.accuracy}%\nВ копилку +$${earned} · подъём до отметки ${Math.round(notice.steps*10)/10}.`);
    }
    return {published:true};
  }
  if (action === 'sync') {
    const profile = cleanProfile((payload.profile || {}) as Record<string, unknown>, account.telegram);
    const { error } = await db.from('eft_users').update(profile).eq('account_id', account.id);
    if (error) throw error;
    return snapshot(account.id);
  }

  if (action === 'create_pair_code') {
    await db.from('eft_pair_codes').delete().lt('expires_at', new Date().toISOString());
    await db.from('eft_pair_codes').delete().eq('owner_id', account.id);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { error } = await db.from('eft_pair_codes').insert({ code, owner_id:account.id, expires_at:new Date(Date.now() + 15 * 60000).toISOString() });
      if (!error) return { code };
      if (error.code !== '23505') throw error;
    }
    throw new RequestError('Не удалось создать код. Попробуй ещё раз.', 503);
  }

  if (action === 'join_pair') {
    await guardJoinAttempts(account.id);
    const code = String(payload.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) throw new RequestError('Введи код из 6 символов.');
    const { data: invitation, error } = await db.from('eft_pair_codes').select('owner_id').eq('code', code).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) throw error;
    if (!invitation?.owner_id) throw new RequestError('Код неверный или уже истёк.', 404);
    const ownerId = String(invitation.owner_id);
    if (ownerId === account.id) throw new RequestError('Этот код нужно ввести во втором кабинете.');
    const { error: pairError } = await db.rpc('eft_pair_users', { p_owner_id:ownerId, p_joiner_id:account.id });
    if (pairError) throw pairError;
    const { data: joiner } = await db.from('eft_users').select('display_name').eq('account_id', account.id).maybeSingle();
    await notify(ownerId, `✅ ${escapeHtml(String(joiner?.display_name || 'Партнёр'))} связал(а) кабинет с твоим English for Two.`);
    return snapshot(account.id);
  }

  if (action === 'create_request') {
    const request = (payload.request || {}) as Record<string, unknown>;
    const id = String(request.id || '').slice(0, 100);
    const title = String(request.title || '').trim().slice(0, 60);
    const cost = Math.round(Number(request.cost));
    if (!/^[A-Za-z0-9:_-]{4,100}$/.test(id) || !title || !Number.isInteger(cost) || cost < 1 || cost > 10000) throw new RequestError('Некорректный запрос подарка.');
    const partnerId = await pairFor(account.id);
    const { data: requester, error: requesterError } = await db.from('eft_users').select('display_name, balance').eq('account_id', account.id).single();
    if (requesterError) throw requesterError;
    if (cost > Number(requester.balance || 0)) throw new RequestError('В общей копилке пока недостаточно баллов.', 409);
    const { data: existing, error: existingError } = await db.from('eft_gift_requests').select('requester_id').eq('id', id).maybeSingle();
    if (existingError) throw existingError;
    if (existing && String(existing.requester_id) !== account.id) throw new RequestError('Такой запрос уже существует.', 409);
    if (!existing) {
      const { error } = await db.from('eft_gift_requests').insert({ id, requester_id:account.id, recipient_id:partnerId, title, cost });
      if (error) throw error;
      await notify(partnerId, `🎁 <b>${escapeHtml(String(requester.display_name || 'Партнёр'))}</b> накопил(а) $${cost} и хочет «${escapeHtml(title)}». Открой приложение, чтобы решить.`);
    }
    return { created:true, ...(await snapshot(account.id)) };
  }

  if (action === 'resolve_request') {
    const id = String(payload.id || '').slice(0, 100);
    const status = String(payload.status || '');
    if (!/^[A-Za-z0-9:_-]{4,100}$/.test(id) || !['approved', 'rejected'].includes(status)) throw new RequestError('Некорректное решение.');
    const { data: gift, error } = await db.from('eft_gift_requests').select('id, title, requester_id, status').eq('id', id).eq('recipient_id', account.id).maybeSingle();
    if (error) throw error;
    if (!gift) throw new RequestError('Запрос не найден.', 404);
    if (gift.status === 'pending') {
      const now = new Date().toISOString();
      const { error: updateError } = await db.from('eft_gift_requests').update({ status, resolved_at:now, updated_at:now }).eq('id', id).eq('recipient_id', account.id).eq('status', 'pending');
      if (updateError) throw updateError;
      await notify(String(gift.requester_id), `🎁 Запрос «${escapeHtml(String(gift.title))}» ${status === 'approved' ? 'согласован' : 'отклонён, баллы возвращены'}.`);
    }
    return { resolved:true, ...(await snapshot(account.id)) };
  }

  throw new RequestError('Неизвестное действие.', 404);
}

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (!cors.allowed) return response(request, { ok:false, error:'Недопустимый источник запроса.' }, 403);
  if (request.method === 'OPTIONS') return response(request, { ok:true });
  if (request.method !== 'POST') return response(request, { ok:false, error:'Используй POST.' }, 405);
  if (!databaseUrl || !databaseKey) return response(request, { ok:false, error:'База синхронизации ещё не настроена.' }, 503);
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1000000) throw new RequestError('Запрос слишком большой.', 413);
    const raw = await request.text();
    if (raw.length > 1000000) throw new RequestError('Запрос слишком большой.', 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw || '{}'); } catch { throw new RequestError('Некорректный JSON.'); }
    const account = await authenticate(request);
    const action = String(body.action || '');
    const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : {};
    const data = await handle(action, payload, account);
    return response(request, { ok:true, ...data });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    if (status >= 500) console.error(error);
    return response(request, { ok:false, error:error instanceof RequestError ? error.message : 'Синхронизация временно недоступна.' }, status);
  }
});
