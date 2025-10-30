import { useMemo } from 'react';
import { SavingsGoal } from '../db/config';
import { calculateEstimatedCompletion } from '../db/savingsServices';

interface SavingsCalculationResult {
  estimatedDate: Date;
  timeRemaining: string;
  isGoalReached: boolean;
  progressPercentage: number;
}

/**
 * Hook personalizado para cálculos de ahorros
 * @param goal - Objetivo de ahorro
 * @returns Resultado de los cálculos memoizados
 */
export const useSavingsCalculations = (goal: SavingsGoal): SavingsCalculationResult => {
  return useMemo(() => {
    try {
      const { estimatedDate, timeRemaining } = calculateEstimatedCompletion(
        goal.currentAmount,
        goal.targetAmount,
        goal.monthlyContribution,
        new Date(goal.startDate)
      );

      const progressPercentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
      const isGoalReached = goal.currentAmount >= goal.targetAmount;

      return {
        estimatedDate,
        timeRemaining,
        isGoalReached,
        progressPercentage
      };
    } catch (error) {
      console.error('Error calculating savings completion:', error);
      return {
        estimatedDate: new Date(),
        timeRemaining: 'Error en cálculo',
        isGoalReached: false,
        progressPercentage: 0
      };
    }
  }, [goal.currentAmount, goal.targetAmount, goal.monthlyContribution, goal.startDate]);
};

/**
 * Hook para calcular totales de múltiples objetivos
 * @param goals - Array de objetivos de ahorro
 * @returns Totales calculados
 */
export const useSavingsTotals = (goals: SavingsGoal[]) => {
  return useMemo(() => {
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalMonthly = goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
    const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return {
      totalTarget,
      totalCurrent,
      totalMonthly,
      totalProgress
    };
  }, [goals]);
};