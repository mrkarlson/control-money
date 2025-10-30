import { Expense, Balance, getDB, initDB, ExpenseDB } from './config';
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
      await store.add(expense);
    }
    
    await tx.done;
  }
  
  if (data.balance && db.objectStoreNames.contains('balance')) {
    const tx = db.transaction('balance', 'readwrite');
    const store = tx.objectStore('balance');
    
    await store.clear();
    
    for (const balance of data.balance) {
      await store.add(balance);
    }
    
    await tx.done;
  }
  
  if (data.sheetConfig && db.objectStoreNames.contains('sheetConfig')) {
    const tx = db.transaction('sheetConfig', 'readwrite');
    const store = tx.objectStore('sheetConfig');
    
    await store.clear();
    
    for (const config of data.sheetConfig) {
      await store.add(config);
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
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    if (expense.frequency === 'one-time') {
      return expenseDate >= start && expenseDate <= end;
    }

    // For recurring expenses, check if they should appear in this month and are within duration
    const monthDiff = (targetYear - expenseDate.getFullYear()) * 12 + (targetMonth - expenseDate.getMonth());
    
    // If duration is set, check if we're still within the payment period
    if (expense.duration && monthDiff >= expense.duration) {
      return false;
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
        return false;
    }

    if (shouldInclude) {
      // For recurring expenses, create a copy with isPaid status and amount for this specific month
      const recurringExpense = { ...expense };
      
      // Check payment history for this specific month
      const paymentRecord = expense.paymentHistory?.find((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === targetMonth && recordDate.getFullYear() === targetYear;
      });
      
      // Set isPaid and amount based on the payment history for this specific month
      recurringExpense.isPaid = paymentRecord?.isPaid || false;
      recurringExpense.amount = paymentRecord?.amount || expense.amount;
      
      // Return the recurring expense with the correct isPaid status and amount for this month
      return recurringExpense;
    }
    
    return false;
  });
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