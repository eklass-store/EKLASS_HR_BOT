// ============================================================
// src/db/announcements.db.ts — Announcements Database Operations
// ============================================================
import { Env } from '../types';

export async function createAnnouncement(
  env: Env,
  message: string,
  createdBy: number
): Promise<void> {
  // [USER-REQUEST] Stop saving public messages to save database space
  // await env.DB.prepare(
  //   "INSERT INTO Announcements (message, created_by) VALUES (?, ?)"
  // ).bind(message, createdBy).run();
}
