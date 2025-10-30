import { Investment, getDB } from './config';

// Calcular el interés compuesto
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundingFrequency: Investment['compoundingFrequency'],
  timeInYears: number
): number {
  const frequencyMap = {
    'daily': 365,
    'monthly': 12,
    'quarterly': 4,
    'semi-annual': 2,
    'annual': 1
  };

  const n = frequencyMap[compoundingFrequency];
  const r = annualRate / 100; // Convertir porcentaje a decimal
  
  return principal * Math.pow((1 + r / n), n * timeInYears);
}

// Calcular el valor actual de una inversión
export function calculateCurrentValue(investment: Investment): number {
  const currentDate = new Date();
  const startDate = new Date(investment.startDate);
  const timeInYears = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  if (timeInYears <= 0) {
    return investment.initialAmount;
  }
  
  return calculateCompoundInterest(
    investment.initialAmount,
    investment.annualRate,
    investment.compoundingFrequency,
    timeInYears
  );
}

// Calcular el valor al vencimiento
export function calculateMaturityValue(investment: Investment): number {
  const timeInYears = investment.termMonths / 12;
  
  return calculateCompoundInterest(
    investment.initialAmount,
    investment.annualRate,
    investment.compoundingFrequency,
    timeInYears
  );
}

// Calcular los días restantes hasta el vencimiento
export function calculateDaysToMaturity(investment: Investment): number {
  const currentDate = new Date();
  const maturityDate = new Date(investment.maturityDate);
  const timeDiff = maturityDate.getTime() - currentDate.getTime();
  
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// Calcular el rendimiento total esperado
export function calculateTotalReturn(investment: Investment): {
  totalReturn: number;
  returnPercentage: number;
} {
  const maturityValue = calculateMaturityValue(investment);
  const totalReturn = maturityValue - investment.initialAmount;
  const returnPercentage = (totalReturn / investment.initialAmount) * 100;
  
  return {
    totalReturn,
    returnPercentage
  };
}

// Servicios de base de datos
export async function addInvestment(investment: Omit<Investment, 'id'>) {
  const db = await getDB();
  return await db.add('investments', investment);
}

export async function updateInvestment(investment: Investment) {
  const db = await getDB();
  return await db.put('investments', investment);
}

export async function deleteInvestment(id: number) {
  const db = await getDB();
  return await db.delete('investments', id);
}

export async function getAllInvestments(): Promise<Investment[]> {
  const db = await getDB();
  return await db.getAll('investments');
}

export async function getInvestmentById(id: number): Promise<Investment | undefined> {
  const db = await getDB();
  return await db.get('investments', id);
}

export async function getActiveInvestments(): Promise<Investment[]> {
  const db = await getDB();
  const allInvestments = await db.getAll('investments');
  return allInvestments.filter(investment => investment.isActive);
}

export async function getInvestmentsByType(type: Investment['type']): Promise<Investment[]> {
  const db = await getDB();
  const allInvestments = await db.getAll('investments');
  return allInvestments.filter(investment => investment.type === type);
}

// Actualizar el valor actual de una inversión
export async function updateInvestmentCurrentValue(id: number) {
  const db = await getDB();
  const investment = await db.get('investments', id);
  
  if (investment) {
    const currentValue = calculateCurrentValue(investment);
    investment.currentAmount = currentValue;
    await db.put('investments', investment);
    return investment;
  }
  
  throw new Error('Inversión no encontrada');
}

// Actualizar todos los valores actuales de las inversiones activas
export async function updateAllInvestmentValues() {
  const activeInvestments = await getActiveInvestments();
  const updatedInvestments = [];
  
  for (const investment of activeInvestments) {
    const currentValue = calculateCurrentValue(investment);
    investment.currentAmount = currentValue;
    await updateInvestment(investment);
    updatedInvestments.push(investment);
  }
  
  return updatedInvestments;
}