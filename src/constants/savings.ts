/**
 * Constantes para el módulo de ahorros
 */

export const SAVINGS_CONSTANTS = {
  // Validaciones
  MIN_CONTRIBUTION: 1,
  MIN_TARGET_AMOUNT: 1,
  MAX_YEARS_PROJECTION: 50,
  
  // Formateo
  DATE_FORMAT: 'dd/MM/yyyy',
  CURRENCY: 'EUR',
  LOCALE: 'es-ES',
  
  // UI
  PROGRESS_BAR_HEIGHT: 10,
  PROGRESS_BAR_BORDER_RADIUS: 5,
  DAYS_PER_MONTH: 30,
  MONTHS_PER_YEAR: 12,
  
  // Mensajes
  MESSAGES: {
    GOAL_REACHED: 'Objetivo alcanzado',
    CALCULATION_ERROR: 'Error en cálculo',
    LESS_THAN_ONE_DAY: 'Menos de 1 día',
    DELETE_CONFIRMATION: '¿Estás seguro de que quieres eliminar este objetivo de ahorro?',
    LOADING_ERROR: 'Error cargando objetivos de ahorro',
    SAVE_ERROR: 'Error guardando objetivo de ahorro',
    DELETE_ERROR: 'Error eliminando objetivo de ahorro'
  },
  
  // Formulario
  FORM_DEFAULTS: {
    NAME: '',
    DESCRIPTION: '',
    TARGET_AMOUNT: 0,
    CURRENT_AMOUNT: 0,
    MONTHLY_CONTRIBUTION: 0,
    COMPLETED: false
  }
} as const;

/**
 * Tipos derivados de las constantes
 */
export type SavingsMessage = typeof SAVINGS_CONSTANTS.MESSAGES[keyof typeof SAVINGS_CONSTANTS.MESSAGES];