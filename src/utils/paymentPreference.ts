/**
 * Preferencia para el modal "¿actualizar el balance al marcar como pagado?".
 *
 * El usuario puede silenciar el modal, pero la preferencia caduca a los 30 días
 * para volver a preguntar de vez en cuando, y puede restablecerse a mano.
 */

const SKIP_KEY = 'payment_balance_modal_skip_until';
const DEFAULT_SNOOZE_DAYS = 30;

export function shouldAskBalanceOnPayment(): boolean {
  try {
    const raw = localStorage.getItem(SKIP_KEY);
    if (!raw) return true;
    const until = Number(raw);
    if (!Number.isFinite(until)) return true;
    return Date.now() >= until;
  } catch {
    return true;
  }
}

export function snoozeBalancePrompt(days: number = DEFAULT_SNOOZE_DAYS): void {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(SKIP_KEY, String(until));
  } catch {
    /* ignore */
  }
}

export function resetBalancePrompt(): void {
  try {
    localStorage.removeItem(SKIP_KEY);
  } catch {
    /* ignore */
  }
}

export function getBalancePromptSnoozeUntil(): Date | null {
  try {
    const raw = localStorage.getItem(SKIP_KEY);
    if (!raw) return null;
    const until = Number(raw);
    return Number.isFinite(until) ? new Date(until) : null;
  } catch {
    return null;
  }
}
