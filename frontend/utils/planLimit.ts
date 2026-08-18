import { ApiError } from './api';
import type { AuthUser } from '@/context/AuthContext';

// Mirrors backend/src/utils/planLimits.js — kept here too so the copy in
// Settings/UpgradePlanModal doesn't hardcode its own numbers that could
// silently go stale if the backend limits ever change again.
export const FREE_CATALOG_LIMIT = 1;
export const FREE_PRODUCT_LIMIT = 10;

export function isFreePlan(user: AuthUser | null | undefined): boolean {
  return user?.subscriptionType !== 'paid';
}

// Backend's plan-limit checks (catalog.controller.js, product.controller.js)
// throw a 403 AppError whose message always starts with "Free plan is
// limited to ..." — this is the one place that string is matched, so if
// that wording ever changes, only this needs updating.
export function isPlanLimitError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.message.toLowerCase().includes('free plan');
}
