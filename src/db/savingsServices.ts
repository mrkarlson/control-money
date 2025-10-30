import { SavingsGoal, getDB } from './config';
import { SAVINGS_CONSTANTS } from '../constants/savings';

// Calcular tiempo restante dinámico basado en fecha actual vs fecha objetivo
export function calculateTimeRemaining(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  currentDate: Date,
  targetDate?: Date
): string {
  if (currentAmount >= targetAmount) {
    return SAVINGS_CONSTANTS.MESSAGES.GOAL_REACHED;
  }

  if (targetDate) {
    // Calcular tiempo restante basado en fecha objetivo
    const timeDiff = targetDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) {
      return 'Fecha objetivo alcanzada';
    }
    
    const years = Math.floor(daysDiff / 365);
    const months = Math.floor((daysDiff % 365) / 30);
    const days = daysDiff % 30;
    
    let timeRemaining = '';
    if (years > 0) {
      timeRemaining += `${years} año${years > 1 ? 's' : ''}`;
    }
    if (months > 0) {
      if (timeRemaining) timeRemaining += ', ';
      timeRemaining += `${months} mes${months > 1 ? 'es' : ''}`;
    }
    if (days > 0) {
      if (timeRemaining) timeRemaining += ', ';
      timeRemaining += `${days} día${days > 1 ? 's' : ''}`;
    }
    
    return timeRemaining || SAVINGS_CONSTANTS.MESSAGES.LESS_THAN_ONE_DAY;
  } else if (monthlyContribution > 0) {
    // Usar el cálculo original basado en aporte mensual
    const { timeRemaining } = calculateEstimatedCompletion(
      currentAmount,
      targetAmount,
      monthlyContribution,
      currentDate
    );
    return timeRemaining;
  }
  
  return '-';
}
export function calculateMonthlyContribution(
  currentAmount: number,
  targetAmount: number,
  targetDate: Date,
  currentDate?: Date
): number {
  if (targetAmount <= 0) {
    throw new Error('La cantidad objetivo debe ser mayor que 0');
  }

  const remainingAmount = targetAmount - currentAmount;
  
  // Si ya se alcanzó el objetivo
  if (remainingAmount <= 0) {
    return 0;
  }

  const startDate = currentDate || new Date();
  const timeDiff = targetDate.getTime() - startDate.getTime();
  const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * SAVINGS_CONSTANTS.DAYS_PER_MONTH);

  // Si la fecha objetivo ya pasó o es muy cercana
  if (monthsDiff <= 0) {
    throw new Error('La fecha objetivo debe ser posterior a la fecha actual');
  }

  return remainingAmount / monthsDiff;
}

// Calcular la fecha estimada de consecución y el tiempo restante
export function calculateEstimatedCompletion(
  currentAmount: number, 
  targetAmount: number, 
  monthlyContribution: number, 
  startDate?: Date
): { estimatedDate: Date; timeRemaining: string } {
  if (monthlyContribution <= 0) {
    throw new Error('La contribución mensual debe ser mayor que 0');
  }
  
  if (targetAmount <= 0) {
    throw new Error('La cantidad objetivo debe ser mayor que 0');
  }

  const remainingAmount = targetAmount - currentAmount;
  
  // Si ya se alcanzó el objetivo
  if (remainingAmount <= 0) {
    return { 
      estimatedDate: startDate || new Date(), 
      timeRemaining: SAVINGS_CONSTANTS.MESSAGES.GOAL_REACHED 
    };
  }
  
  // Calcular meses exactos necesarios (con decimales)
  const exactMonthsToGoal = remainingAmount / monthlyContribution;
  
  // Calcular la fecha estimada basada en los meses exactos desde la fecha de inicio
  const estimatedDate = new Date(startDate || new Date());
  const wholeMonths = Math.floor(exactMonthsToGoal);
  const fractionalMonth = exactMonthsToGoal - wholeMonths;
  const additionalDays = Math.floor(fractionalMonth * SAVINGS_CONSTANTS.DAYS_PER_MONTH);
  
  estimatedDate.setMonth(estimatedDate.getMonth() + wholeMonths);
  estimatedDate.setDate(estimatedDate.getDate() + additionalDays);

  // Para mostrar el tiempo restante, usar los meses redondeados hacia arriba
  const monthsToGoal = Math.ceil(exactMonthsToGoal);
  const years = Math.floor(monthsToGoal / SAVINGS_CONSTANTS.MONTHS_PER_YEAR);
  const months = monthsToGoal % SAVINGS_CONSTANTS.MONTHS_PER_YEAR;
  
  // Calcular días para mostrar basado en la fracción decimal
  const days = Math.floor(fractionalMonth * SAVINGS_CONSTANTS.DAYS_PER_MONTH);

  let timeRemaining = '';
  if (years > 0) {
    timeRemaining += `${years} año${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (timeRemaining) timeRemaining += ', ';
    timeRemaining += `${months} mes${months > 1 ? 'es' : ''}`;
  }
  if (days > 0) {
    if (timeRemaining) timeRemaining += ', ';
    timeRemaining += `${days} día${days > 1 ? 's' : ''}`;
  }
  
  if (!timeRemaining) {
    timeRemaining = SAVINGS_CONSTANTS.MESSAGES.LESS_THAN_ONE_DAY;
  }

  return { estimatedDate, timeRemaining };
}

// Añadir un nuevo objetivo de ahorro
export async function addSavingsGoal(goal: Omit<SavingsGoal, 'id'>) {
  const db = await getDB();
  return db.add('savings', goal);
}

// Actualizar un objetivo de ahorro existente
export async function updateSavingsGoal(goal: SavingsGoal) {
  const db = await getDB();
  return db.put('savings', goal);
}

// Eliminar un objetivo de ahorro
export async function deleteSavingsGoal(id: number) {
  const db = await getDB();
  return db.delete('savings', id);
}

// Obtener todos los objetivos de ahorro
export async function getAllSavingsGoals() {
  const db = await getDB();
  return db.getAll('savings');
}

// Obtener un objetivo de ahorro específico
export async function getSavingsGoalById(id: number) {
  const db = await getDB();
  return db.get('savings', id);
}

// Obtener objetivos de ahorro por estado (completados o en progreso)
export async function getSavingsGoalsByStatus(completed: boolean) {
  const db = await getDB();
  const tx = db.transaction('savings', 'readonly');
  const index = tx.store.index('completed');
  return index.getAll(completed);
}

// Actualizar la cantidad actual de un objetivo de ahorro
export async function updateSavingsAmount(id: number, amount: number) {
  const db = await getDB();
  const goal = await db.get('savings', id);
  
  if (!goal) {
    throw new Error('Objetivo de ahorro no encontrado');
  }

  goal.currentAmount = amount;
  goal.completed = amount >= goal.targetAmount;

  if (!goal.completed && goal.monthlyContribution > 0) {
    const { estimatedDate, timeRemaining } = calculateEstimatedCompletion(
      goal.currentAmount,
      goal.targetAmount,
      goal.monthlyContribution,
      new Date(goal.startDate)
    );
    goal.targetDate = estimatedDate;
  }

  return db.put('savings', goal);
}