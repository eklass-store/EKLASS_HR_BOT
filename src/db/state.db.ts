// ============================================================
// src/db/state.db.ts — Conversation State (Multi-step flows)
// يُمكّن من تتبع حالة المحادثات متعددة الخطوات في Worker Stateless
// ============================================================
import { Env, ConversationState } from '../types';

/** يجلب الحالة الحالية للمستخدم */
export async function getState(
  env: Env,
  telegramId: string
): Promise<ConversationState | null> {
  return await env.DB.prepare(
    "SELECT * FROM ConversationState WHERE telegram_id = ?"
  ).bind(telegramId).first() as ConversationState | null;
}

/**
 * يضبط حالة المحادثة مع بيانات إضافية اختيارية
 * @param state - اسم الحالة e.g. 'awaiting_leave_start_date'
 * @param data  - بيانات إضافية كـ JSON e.g. { type: 'annual' }
 */
export async function setState(
  env: Env,
  telegramId: string,
  state: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO ConversationState (telegram_id, state, data) VALUES (?, ?, ?)"
  ).bind(telegramId, state, JSON.stringify(data)).run();
}

/** يمسح حالة المحادثة (عند الإلغاء أو الانتهاء) */
export async function clearState(env: Env, telegramId: string): Promise<void> {
  await env.DB.prepare(
    "DELETE FROM ConversationState WHERE telegram_id = ?"
  ).bind(telegramId).run();
}

/** helper: يجلب بيانات الحالة كـ object */
export function parseStateData(stateRecord: ConversationState): Record<string, unknown> {
  try {
    return stateRecord.data ? JSON.parse(stateRecord.data) : {};
  } catch {
    return {};
  }
}
