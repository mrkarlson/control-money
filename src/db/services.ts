import { Expense, Balance, getDB, ExpenseDB } from './config';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

// Funciones para exportar e importar la base de datos
export async function exportDatabase() {
  const db = await getDB();
  const data: Record<string, any[]> = {};

  // Exportar datos de cada store
  if (db.objectStoreNames.contains('expenses')) {
    data.expenses = await db.getAll('expenses');
  }
  
  if (db.objectStoreNames.contains('balance')) {
    data.balance = await db.getAll('balance');
  }
  
  if (db.objectStoreNames.contains('savings')) {
    data.savings = await db.getAll('savings');
  }

  if (db.objectStoreNames.contains('investments')) {
    data.investments = await db.getAll('investments');
  }

  if (db.objectStoreNames.contains('sheetConfig')) {
    data.sheetConfig = await db.getAll('sheetConfig');
  }

  return data;
}

export async function importDatabase(data: Record<string, any[]>) {
  const db = await getDB();
  
  // Importar datos a cada store
  if (data.expenses && db.objectStoreNames.contains('expenses')) {
    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');
    
    // Limpiar store actual
    await store.clear();
    
    // Importar datos
    for (const expense of data.expenses) {
      // Normalizar campos de fecha para asegurar que sean objetos Date
      const normalized = {
        ...expense,
        date: expense?.date instanceof Date ? expense.date : new Date(expense?.date),
        nextPaymentDate: expense?.nextPaymentDate
          ? (expense.nextPaymentDate instanceof Date ? expense.nextPaymentDate : new Date(expense.nextPaymentDate))
          : undefined,
        paymentHistory: Array.isArray(expense?.paymentHistory)
          ? expense.paymentHistory.map((record: any) => ({
              ...record,
              date: record?.date instanceof Date ? record.date : new Date(record?.date)
            }))
          : expense?.paymentHistory
      };
      await store.add(normalized);
    }
    
    await tx.done;
  }
  
  if (data.balance && db.objectStoreNames.contains('balance')) {
    const tx = db.transaction('balance', 'readwrite');
    const store = tx.objectStore('balance');
    
    await store.clear();
    
    for (const balance of data.balance) {
      const normalized = {
        ...balance,
        date: balance?.date instanceof Date ? balance.date : new Date(balance?.date)
      };
      await store.add(normalized);
    }
    
    await tx.done;
  }
  
  if (data.savings && db.objectStoreNames.contains('savings')) {
    const tx = db.transaction('savings', 'readwrite');
    const store = tx.objectStore('savings');
    
    await store.clear();
    
    for (const goal of data.savings) {
      const normalized = {
        ...goal,
        startDate: goal?.startDate instanceof Date ? goal.startDate : new Date(goal?.startDate),
        targetDate: goal?.targetDate ? (goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate)) : undefined,
        completed: Boolean(goal?.completed)
      };
      await store.add(normalized);
    }
    
    await tx.done;
  }

  if (data.investments && db.objectStoreNames.contains('investments')) {
    const tx = db.transaction('investments', 'readwrite');
    const store = tx.objectStore('investments');
    
    await store.clear();
    
    for (const inv of data.investments) {
      const normalized = {
        ...inv,
        startDate: inv?.startDate instanceof Date ? inv.startDate : new Date(inv?.startDate),
        maturityDate: inv?.maturityDate instanceof Date ? inv.maturityDate : new Date(inv?.maturityDate),
        isActive: Boolean(inv?.isActive)
      };
      await store.add(normalized);
    }
    
    await tx.done;
  }
  
  if (data.sheetConfig && db.objectStoreNames.contains('sheetConfig')) {
    const tx = db.transaction('sheetConfig', 'readwrite');
    const store = tx.objectStore('sheetConfig');
    
    await store.clear();
    
    for (const config of data.sheetConfig) {
      const normalized = {
        ...config,
        tokenExpiry: config?.tokenExpiry instanceof Date ? config.tokenExpiry : new Date(config?.tokenExpiry),
        lastSync: config?.lastSync ? (config.lastSync instanceof Date ? config.lastSync : new Date(config.lastSync)) : null
      };
      await store.add(normalized);
    }
    
    await tx.done;
  }
  
  return true;
}

export async function clearStore(storeName: keyof ExpenseDB) {
  const db = await getDB();
  
  if (db.objectStoreNames.contains(storeName)) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    await store.clear();
    await tx.done;
    
    return true;
  }
  
  return false;
}

// Expense Services
export async function addExpense(expense: Omit<Expense, 'id'>) {
  const db = await getDB();
  return db.add('expenses', expense);
}

export async function updateExpense(expense: Expense) {
  const db = await getDB();
  return db.put('expenses', expense);
}

export async function deleteExpense(id: number) {
  const db = await getDB();
  return db.delete('expenses', id);
}

export async function getExpensesByMonth(date: Date) {
  const db = await getDB();
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const targetMonth = date.getMonth();
  const targetYear = date.getFullYear();

  const expenses = await db.getAllFromIndex('expenses', 'date');
  const result: Expense[] = [];

  for (const expense of expenses) {
    const expenseDate = new Date(expense.date);
    if (expense.frequency === 'one-time') {
      if (expenseDate >= start && expenseDate <= end) {
        result.push(expense);
      }
      continue;
    }

    // For recurring expenses, check if they should appear in this month and are within duration
    const monthDiff = (targetYear - expenseDate.getFullYear()) * 12 + (targetMonth - expenseDate.getMonth());

    // If duration is set, check if we're still within the payment period
    if (expense.duration && monthDiff >= expense.duration) {
      continue;
    }

    let shouldInclude = false;
    switch (expense.frequency) {
      case 'monthly':
        shouldInclude = monthDiff >= 0;
        break;
      case 'bi-monthly':
        shouldInclude = monthDiff >= 0 && monthDiff % 2 === 0;
        break;
      case 'quarterly':
        shouldInclude = monthDiff >= 0 && monthDiff % 3 === 0;
        break;
      case 'annual':
        shouldInclude = monthDiff >= 0 && monthDiff % 12 === 0;
        break;
      default:
        shouldInclude = false;
    }

    if (shouldInclude) {
      // For recurring expenses, create a copy with isPaid status and amount for this specific month
      const recurringExpense: Expense = { ...expense };

      // Check payment history for this specific month
      const paymentRecord = expense.paymentHistory?.find((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === targetMonth && recordDate.getFullYear() === targetYear;
      });

      // Set isPaid and amount based on the payment history for this specific month
      recurringExpense.isPaid = Boolean(paymentRecord?.isPaid);
      if (paymentRecord && typeof paymentRecord.amount === 'number') {
        recurringExpense.amount = paymentRecord.amount;
      } else {
        recurringExpense.amount = expense.amount;
      }

      result.push(recurringExpense);
    }
  }

  return result;
}

export async function getAllExpenses() {
  const db = await getDB();
  return db.getAll('expenses');
}

// Balance Services
export async function updateBalance(balance: Omit<Balance, 'id'>) {
  const db = await getDB();
  const currentBalance = await db.getAll('balance');
  
  if (currentBalance.length > 0) {
    return db.put('balance', { ...balance, id: currentBalance[0].id });
  } else {
    return db.add('balance', balance);
  }
}

export async function getCurrentBalance() {
  const db = await getDB();
  const balances = await db.getAll('balance');
  return balances[0] || null;
}

// Utility functions
export async function calculateMonthlyBalance(date: Date) {
  const expenses = await getExpensesByMonth(date);
  const currentBalance = await getCurrentBalance();
  
  if (!currentBalance) return null;

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBalance = currentBalance.amount + currentBalance.monthlyIncome - totalExpenses;
  
  return {
    totalExpenses,
    remainingBalance,
    monthlyIncome: currentBalance.monthlyIncome,
    currentBalance: currentBalance.amount
  };
}

export async function getUpcomingExpenses(months: number = 3) {
  const db = await getDB();
  const now = new Date();
  const futureDate = addMonths(now, months);
  
  const expenses = await db.getAllFromIndex('expenses', 'date');
  return expenses.filter(expense => {
    const nextPaymentDate = new Date(expense.nextPaymentDate || expense.date);
    return nextPaymentDate <= futureDate;
  });
}