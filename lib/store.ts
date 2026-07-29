"use client";

/**
 * Saved-report persistence. Kept deliberately simple: reports live in the
 * customer's own MotherDuck account (created via the MCP save_dive tool);
 * this just records which dive IDs to surface on the "Saved" page, per browser.
 *
 * To make saved reports shared across devices/users instead, swap this module
 * for a small server route that lists dives from your account (e.g. via the
 * MCP list_dives tool filtered by a title tag).
 */
const KEY = "dive-starter-kit:saved-reports";

export interface SavedReport {
  diveId: string;
  version?: number;
  title: string;
  description?: string;
  createdAt: number;
}

export function listReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveReport(report: SavedReport): void {
  const all = listReports().filter((r) => r.diveId !== report.diveId);
  all.unshift(report);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function removeReport(diveId: string): void {
  const all = listReports().filter((r) => r.diveId !== diveId);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}
