import { InvestmentType } from '../db/config';

export interface InvestmentCategoryMeta {
  value: InvestmentType;
  label: string;
  description: string;
  defaultRate: number;
  defaultCompounding: 'daily' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  deterministic: boolean;
  comingSoon?: boolean;
}

/**
 * Catálogo de categorías de inversión.
 * `deterministic` indica si el interés es predecible (producto con tasa pactada).
 * `comingSoon` marca categorías que se mostrarán pero no se pueden usar todavía.
 */
export const INVESTMENT_CATEGORIES: InvestmentCategoryMeta[] = [
  {
    value: 'indexed-fund',
    label: 'Fondo indexado',
    description: 'Fondo que replica un índice (MSCI World, S&P 500...). Largo plazo.',
    defaultRate: 7,
    defaultCompounding: 'annual',
    deterministic: false,
  },
  {
    value: 'etf',
    label: 'ETF',
    description: 'Fondo cotizado con bajo coste. Acumulación o reparto.',
    defaultRate: 7,
    defaultCompounding: 'annual',
    deterministic: false,
  },
  {
    value: 'managed-fund',
    label: 'Fondo de gestión activa',
    description: 'Gestionado por un equipo. Comisiones más altas.',
    defaultRate: 5,
    defaultCompounding: 'annual',
    deterministic: false,
  },
  {
    value: 'stock',
    label: 'Acciones',
    description: 'Acciones individuales. Volatilidad alta.',
    defaultRate: 8,
    defaultCompounding: 'annual',
    deterministic: false,
    comingSoon: true,
  },
  {
    value: 'crypto',
    label: 'Criptomonedas',
    description: 'Activos digitales. Muy volátiles.',
    defaultRate: 0,
    defaultCompounding: 'annual',
    deterministic: false,
    comingSoon: true,
  },
  {
    value: 'fixed-deposit',
    label: 'Depósito a plazo fijo',
    description: 'Tasa pactada y plazo conocido.',
    defaultRate: 3,
    defaultCompounding: 'monthly',
    deterministic: true,
  },
  {
    value: 'savings-account',
    label: 'Cuenta remunerada',
    description: 'Cuenta de ahorro con interés.',
    defaultRate: 2,
    defaultCompounding: 'monthly',
    deterministic: true,
  },
  {
    value: 'government-bond',
    label: 'Bono / Deuda pública',
    description: 'Deuda del Estado a plazo.',
    defaultRate: 3,
    defaultCompounding: 'annual',
    deterministic: true,
  },
  {
    value: 'mutual-fund',
    label: 'Fondo mutuo',
    description: 'Fondo clásico de inversión colectiva.',
    defaultRate: 5,
    defaultCompounding: 'annual',
    deterministic: false,
  },
  {
    value: 'other',
    label: 'Otro',
    description: 'Otra clase de inversión.',
    defaultRate: 0,
    defaultCompounding: 'annual',
    deterministic: false,
  },
];

export const getInvestmentCategory = (type: InvestmentType): InvestmentCategoryMeta | undefined =>
  INVESTMENT_CATEGORIES.find(category => category.value === type);
