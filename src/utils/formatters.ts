/**
 * Utilidades para formateo de datos
 */

/**
 * Formatea un número como moneda en euros
 * @param amount - Cantidad a formatear
 * @returns String formateado como moneda
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Formatea una fecha en formato dd/MM/yyyy
 * @param date - Fecha a formatear
 * @returns String formateado como fecha
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Calcula el porcentaje de progreso
 * @param current - Valor actual
 * @param target - Valor objetivo
 * @returns Porcentaje de progreso (máximo 100)
 */
export const calculateProgress = (current: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
};

/**
 * Formatea un porcentaje con decimales opcionales
 * @param percentage - Porcentaje a formatear
 * @param decimals - Número de decimales (por defecto 0)
 * @returns String formateado como porcentaje
 */
export const formatPercentage = (percentage: number, decimals: number = 0): string => {
  return `${percentage.toFixed(decimals)}%`;
};