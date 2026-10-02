/**
 * Proyección de inversiones ("bola de nieve").
 *
 * Modela el crecimiento de una inversión con interés compuesto y aportaciones
 * periódicas, mes a mes, para poder dibujar capital aportado vs. valor total.
 */

export interface ProjectionInput {
  /** Capital inicial */
  principal: number;
  /** Aportación mensual */
  monthlyContribution: number;
  /** Tasa anual nominal en porcentaje (ej. 7 = 7%) */
  annualRate: number;
  /** Número de meses a proyectar */
  months: number;
  /** Capital ya aportado antes de la proyección (para separar capital vs interés) */
  alreadyContributed?: number;
}

export interface ProjectionPoint {
  /** Mes desde el inicio (0 = hoy) */
  month: number;
  /** Años transcurridos (para el eje X) */
  year: number;
  /** Capital total aportado acumulado (inicial + aportaciones) */
  contributed: number;
  /** Valor total de la inversión en ese punto */
  value: number;
  /** Interés generado (value - contributed) */
  interest: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  /** Valor final proyectado */
  finalValue: number;
  /** Capital total aportado al final */
  totalContributed: number;
  /** Interés total generado al final */
  totalInterest: number;
}

/**
 * Calcula la proyección de interés compuesto con aportaciones mensuales.
 *
 * Convención: la tasa anual se convierte a mensual como `annualRate / 12 / 100`
 * (tasa nominal), y la aportación se realiza al principio de cada mes.
 */
export function projectInvestment(input: ProjectionInput): ProjectionResult {
  const { principal, monthlyContribution, annualRate, months, alreadyContributed } = input;

  const monthlyRate = annualRate / 100 / 12;
  const baseContributed = alreadyContributed ?? principal;

  const points: ProjectionPoint[] = [];
  let value = principal;

  points.push({
    month: 0,
    year: 0,
    contributed: baseContributed,
    value,
    interest: value - baseContributed,
  });

  for (let month = 1; month <= months; month++) {
    // Aportación al principio del mes + crecimiento del mes
    value = (value + monthlyContribution) * (1 + monthlyRate);
    const contributed = baseContributed + monthlyContribution * month;

    points.push({
      month,
      year: Number((month / 12).toFixed(2)),
      contributed,
      value,
      interest: value - contributed,
    });
  }

  const final = points[points.length - 1];

  return {
    points,
    finalValue: final.value,
    totalContributed: final.contributed,
    totalInterest: final.interest,
  };
}
