import { Env } from '../types';

export async function addHoliday(env: Env, date: string, description: string): Promise<boolean> {
  try {
    await env.DB.prepare(
      "INSERT INTO Holidays (holiday_date, description) VALUES (?, ?)"
    ).bind(date, description).run();
    return true;
  } catch (err) {
    return false;
  }
}

export async function removeHoliday(env: Env, date: string): Promise<void> {
  await env.DB.prepare(
    "DELETE FROM Holidays WHERE holiday_date = ?"
  ).bind(date).run();
}

export async function isHoliday(env: Env, date: string): Promise<boolean> {
  const record = await env.DB.prepare(
    "SELECT id FROM Holidays WHERE holiday_date = ?"
  ).bind(date).first();
  return !!record;
}

export async function getHolidaysInMonth(env: Env, month: string): Promise<any[]> {
  const res = await env.DB.prepare(
    "SELECT * FROM Holidays WHERE holiday_date LIKE ? ORDER BY holiday_date"
  ).bind(`${month}-%`).all();
  return res.results;
}
