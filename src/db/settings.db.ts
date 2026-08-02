// ============================================================
// src/db/settings.db.ts — Settings Database Operations
// ============================================================
import { Env } from '../types';

/** يجلب جميع الإعدادات كـ key-value object */
export async function getSettings(env: Env): Promise<Record<string, string>> {
  const results = await env.DB.prepare("SELECT key, value FROM Settings").all();
  const settings: Record<string, string> = {};
  (results.results as { key: string; value: string }[]).forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

/** يحدّث إعداداً واحداً (INSERT OR REPLACE) */
export async function updateSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)"
  ).bind(key, value).run();
}
