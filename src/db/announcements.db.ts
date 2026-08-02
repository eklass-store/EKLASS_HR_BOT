// ============================================================
// src/db/announcements.db.ts — Announcements Database Operations
// ============================================================
import { Env } from '../types';

export async function createAnnouncement(
  env: Env,
  message: string,
  createdBy: number
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO Announcements (message, created_by) VALUES (?, ?)"
  ).bind(message, createdBy).run();
}
