import { isSameMonth } from 'date-fns';

export interface BalanceLike {
  amount: number;
  monthlyIncome: number;
}

export interface MonthlyBalances {
  realBalance: number;
  projectedBalance: number;
}

/**
 * Calcula el balance "Real" y "Proyectado" de un mes.
 *
 * - Real: dinero disponible de referencia.
 *   En el mes en curso es el saldo que hay en la cuenta; en los meses futuros,
 *   el ingreso mensual seguro que se espera cobrar.
 * - Proyectado: dinero que te quedaría una vez pagados los gastos.
 *   En el mes en curso se descuentan solo los gastos pendientes;
 *   en los meses futuros, todos los gastos del mes.
 *
 * @param balance Saldo global (amount + monthlyIncome)
 * @param totalExpenses Suma total de gastos del mes
 * @param totalPaid Suma de los gastos ya pagados del mes
 * @param month Mes a calcular
 */
export function calculateBalances(
  balance: BalanceLike | null | undefined,
  totalExpenses: number,
  totalPaid: number,
  month: Date
): MonthlyBalances {
  if (!balance) return { realBalance: 0, projectedBalance: 0 };

  const isCurrentMonth = isSameMonth(month, new Date());
  const pendingExpenses = totalExpenses - totalPaid;

  const realBalance = isCurrentMonth
    ? balance.amount
    : balance.monthlyIncome;

  const projectedBalance = isCurrentMonth
    ? balance.amount - pendingExpenses
    : balance.monthlyIncome - totalExpenses;

  return { realBalance, projectedBalance };
}
