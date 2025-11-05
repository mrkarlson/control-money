import { Client } from '@libsql/client';
import { 
  DatabaseRepository, 
  ExpenseRepository, 
  BalanceRepository, 
  SavingsRepository, 
  InvestmentRepository, 
  GoogleSheetsRepository,
  DatabaseOperations 
} from './interfaces';
import { 
  Expense, 
  Balance, 
  SavingsGoal, 
  Investment, 
  GoogleSheetsConfig,
  PaymentRecord
} from '../config';
import { 
  dateToString, 
  stringToDate, 
  booleanToNumber, 
  numberToBoolean 
} from '../tursoConfig';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

class TursoExpenseRepository implements ExpenseRepository {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const result = await this.client.execute({
      sql: `INSERT INTO expenses (amount, category, description, date, frequency, next_payment_date, is_paid, payment_history, duration) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        expense.amount,
        expense.category,
        expense.description,
        dateToString(expense.date),
        expense.frequency,
        expense.nextPaymentDate ? dateToString(expense.nextPaymentDate) : null,
        booleanToNumber(expense.isPaid),
        expense.paymentHistory ? JSON.stringify(expense.paymentHistory) : null,
        expense.duration || null
      ]
    });

    return this.mapRowToExpense(result.rows[0]);
  }

  async update(expense: Expense): Promise<Expense> {
    await this.client.execute({
      sql: `UPDATE expenses SET amount = ?, category = ?, description = ?, date = ?, frequency = ?, 
            next_payment_date = ?, is_paid = ?, payment_history = ?, duration = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        expense.amount,
        expense.category,
        expense.description,
        dateToString(expense.date),
        expense.frequency,
        expense.nextPaymentDate ? dateToString(expense.nextPaymentDate) : null,
        booleanToNumber(expense.isPaid),
        expense.paymentHistory ? JSON.stringify(expense.paymentHistory) : null,
        expense.duration || null,
        expense.id!
      ]
    });

    return expense;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.client.execute({
        sql: 'DELETE FROM expenses WHERE id = ?',
        args: [id]
      });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Expense | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM expenses WHERE id = ?',
      args: [id]
    });

    return result.rows[0] ? this.mapRowToExpense(result.rows[0]) : undefined;
  }

  async findAll(): Promise<Expense[]> {
    const result = await this.client.execute('SELECT * FROM expenses ORDER BY date DESC');
    return result.rows.map(row => this.mapRowToExpense(row));
  }

  async findByMonth(date: Date): Promise<Expense[]> {
    // Replicar la lógica de IndexedDB para soportar gastos recurrentes
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    // Obtener todos los gastos y filtrar/derivar según frecuencia
    const allResult = await this.client.execute('SELECT * FROM expenses ORDER BY date DESC');
    const allExpenses = allResult.rows.map(row => this.mapRowToExpense(row));

    const monthExpenses: Expense[] = [];

    for (const expense of allExpenses) {
      const expenseDate = new Date(expense.date);

      if (expense.frequency === 'one-time') {
        if (expenseDate >= start && expenseDate <= end) {
          monthExpenses.push(expense);
        }
        continue;
      }

      // Para gastos recurrentes, verificar si deben aparecer en este mes y si están dentro de la duración
      const monthDiff = (targetYear - expenseDate.getFullYear()) * 12 + (targetMonth - expenseDate.getMonth());

      // Si hay duración, comprobar que seguimos dentro del periodo
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
        const recurringExpense = { ...expense };

        // Ajustar isPaid y amount según paymentHistory para este mes específico
        const paymentRecord = expense.paymentHistory?.find((record: any) => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() === targetMonth && recordDate.getFullYear() === targetYear;
        });

        recurringExpense.isPaid = paymentRecord?.isPaid || false;
        recurringExpense.amount = paymentRecord?.amount || expense.amount;

        monthExpenses.push(recurringExpense);
      }
    }

    return monthExpenses;
  }

  async findByCategory(category: string): Promise<Expense[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM expenses WHERE category = ? ORDER BY date DESC',
      args: [category]
    });

    return result.rows.map(row => this.mapRowToExpense(row));
  }

  async findByFrequency(frequency: Expense['frequency']): Promise<Expense[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM expenses WHERE frequency = ? ORDER BY date DESC',
      args: [frequency]
    });

    return result.rows.map(row => this.mapRowToExpense(row));
  }

  async findByPaidStatus(isPaid: boolean): Promise<Expense[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM expenses WHERE is_paid = ? ORDER BY date DESC',
      args: [booleanToNumber(isPaid)]
    });

    return result.rows.map(row => this.mapRowToExpense(row));
  }

  async getUpcoming(months: number = 3): Promise<Expense[]> {
    const endDate = addMonths(new Date(), months);

    const result = await this.client.execute({
      sql: `SELECT * FROM expenses 
            WHERE frequency != 'one-time' 
            AND (next_payment_date IS NULL OR next_payment_date <= ?) 
            ORDER BY next_payment_date ASC`,
      args: [dateToString(endDate)]
    });

    return result.rows.map(row => this.mapRowToExpense(row));
  }

  private mapRowToExpense(row: any): Expense {
    return {
      id: row.id as number,
      amount: row.amount as number,
      category: row.category as string,
      description: row.description as string,
      date: stringToDate(row.date as string),
      frequency: row.frequency as Expense['frequency'],
      nextPaymentDate: row.next_payment_date ? stringToDate(row.next_payment_date as string) : undefined,
      isPaid: numberToBoolean(row.is_paid as number),
      paymentHistory: row.payment_history ? JSON.parse(row.payment_history as string) as PaymentRecord[] : undefined,
      duration: row.duration as number || undefined
    };
  }
}

class TursoBalanceRepository implements BalanceRepository {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(balance: Omit<Balance, 'id'>): Promise<Balance> {
    const result = await this.client.execute({
      sql: `INSERT INTO balance (amount, monthly_income, date, projected_amount, real_amount) 
            VALUES (?, ?, ?, ?, ?) RETURNING *`,
      args: [
        balance.amount,
        balance.monthlyIncome,
        dateToString(balance.date),
        balance.projectedAmount || null,
        balance.realAmount || null
      ]
    });

    return this.mapRowToBalance(result.rows[0]);
  }

  async update(balance: Balance): Promise<Balance> {
    await this.client.execute({
      sql: `UPDATE balance SET amount = ?, monthly_income = ?, date = ?, projected_amount = ?, 
            real_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [
        balance.amount,
        balance.monthlyIncome,
        dateToString(balance.date),
        balance.projectedAmount || null,
        balance.realAmount || null,
        balance.id!
      ]
    });

    return balance;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.client.execute({
        sql: 'DELETE FROM balance WHERE id = ?',
        args: [id]
      });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Balance | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM balance WHERE id = ?',
      args: [id]
    });

    return result.rows[0] ? this.mapRowToBalance(result.rows[0]) : undefined;
  }

  async findAll(): Promise<Balance[]> {
    const result = await this.client.execute('SELECT * FROM balance ORDER BY date DESC');
    return result.rows.map(row => this.mapRowToBalance(row));
  }

  async getCurrent(): Promise<Balance | undefined> {
    const result = await this.client.execute('SELECT * FROM balance ORDER BY date DESC LIMIT 1');
    return result.rows[0] ? this.mapRowToBalance(result.rows[0]) : undefined;
  }

  async findByMonth(date: Date): Promise<Balance | undefined> {
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    const result = await this.client.execute({
      sql: 'SELECT * FROM balance WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT 1',
      args: [dateToString(startDate), dateToString(endDate)]
    });

    return result.rows[0] ? this.mapRowToBalance(result.rows[0]) : undefined;
  }

  async calculateMonthlyBalance(date: Date): Promise<number> {
    const balance = await this.findByMonth(date);
    return balance?.amount || 0;
  }

  private mapRowToBalance(row: any): Balance {
    return {
      id: row.id as number,
      amount: row.amount as number,
      monthlyIncome: row.monthly_income as number,
      date: stringToDate(row.date as string),
      projectedAmount: row.projected_amount as number || undefined,
      realAmount: row.real_amount as number || undefined
    };
  }
}

class TursoSavingsRepository implements SavingsRepository {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
    const result = await this.client.execute({
      sql: `INSERT INTO savings_goals (name, description, target_amount, current_amount, monthly_contribution, start_date, target_date, completed) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        goal.name,
        goal.description,
        goal.targetAmount,
        goal.currentAmount,
        goal.monthlyContribution,
        dateToString(goal.startDate),
        goal.targetDate ? dateToString(goal.targetDate) : null,
        booleanToNumber(goal.completed)
      ]
    });

    return this.mapRowToSavingsGoal(result.rows[0]);
  }

  async update(goal: SavingsGoal): Promise<SavingsGoal> {
    await this.client.execute({
      sql: `UPDATE savings_goals SET name = ?, description = ?, target_amount = ?, current_amount = ?, 
            monthly_contribution = ?, start_date = ?, target_date = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        goal.name,
        goal.description,
        goal.targetAmount,
        goal.currentAmount,
        goal.monthlyContribution,
        dateToString(goal.startDate),
        goal.targetDate ? dateToString(goal.targetDate) : null,
        booleanToNumber(goal.completed),
        goal.id!
      ]
    });

    return goal;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.client.execute({
        sql: 'DELETE FROM savings_goals WHERE id = ?',
        args: [id]
      });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<SavingsGoal | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM savings_goals WHERE id = ?',
      args: [id]
    });

    return result.rows[0] ? this.mapRowToSavingsGoal(result.rows[0]) : undefined;
  }

  async findAll(): Promise<SavingsGoal[]> {
    const result = await this.client.execute('SELECT * FROM savings_goals ORDER BY start_date DESC');
    return result.rows.map(row => this.mapRowToSavingsGoal(row));
  }

  async findByStatus(completed: boolean): Promise<SavingsGoal[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM savings_goals WHERE completed = ? ORDER BY start_date DESC',
      args: [booleanToNumber(completed)]
    });

    return result.rows.map(row => this.mapRowToSavingsGoal(row));
  }

  async updateAmount(id: number, amount: number): Promise<SavingsGoal> {
    await this.client.execute({
      sql: 'UPDATE savings_goals SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [amount, id]
    });

    const updated = await this.findById(id);
    return updated!;
  }

  private mapRowToSavingsGoal(row: any): SavingsGoal {
    return {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string,
      targetAmount: row.target_amount as number,
      currentAmount: row.current_amount as number,
      monthlyContribution: row.monthly_contribution as number,
      startDate: stringToDate(row.start_date as string),
      targetDate: row.target_date ? stringToDate(row.target_date as string) : undefined,
      completed: numberToBoolean(row.completed as number)
    };
  }
}

class TursoInvestmentRepository implements InvestmentRepository {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(investment: Omit<Investment, 'id'>): Promise<Investment> {
    const result = await this.client.execute({
      sql: `INSERT INTO investments (name, type, initial_amount, current_amount, annual_rate, start_date, term_months, maturity_date, compounding_frequency, is_active, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        investment.name,
        investment.type,
        investment.initialAmount,
        investment.currentAmount,
        investment.annualRate,
        dateToString(investment.startDate),
        investment.termMonths,
        dateToString(investment.maturityDate),
        investment.compoundingFrequency,
        booleanToNumber(investment.isActive),
        investment.notes || null
      ]
    });

    return this.mapRowToInvestment(result.rows[0]);
  }

  async update(investment: Investment): Promise<Investment> {
    await this.client.execute({
      sql: `UPDATE investments SET name = ?, type = ?, initial_amount = ?, current_amount = ?, annual_rate = ?, 
            start_date = ?, term_months = ?, maturity_date = ?, compounding_frequency = ?, is_active = ?, notes = ?, 
            updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [
        investment.name,
        investment.type,
        investment.initialAmount,
        investment.currentAmount,
        investment.annualRate,
        dateToString(investment.startDate),
        investment.termMonths,
        dateToString(investment.maturityDate),
        investment.compoundingFrequency,
        booleanToNumber(investment.isActive),
        investment.notes || null,
        investment.id!
      ]
    });

    return investment;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.client.execute({
        sql: 'DELETE FROM investments WHERE id = ?',
        args: [id]
      });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Investment | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM investments WHERE id = ?',
      args: [id]
    });

    return result.rows[0] ? this.mapRowToInvestment(result.rows[0]) : undefined;
  }

  async findAll(): Promise<Investment[]> {
    const result = await this.client.execute('SELECT * FROM investments ORDER BY start_date DESC');
    return result.rows.map(row => this.mapRowToInvestment(row));
  }

  async findByType(type: Investment['type']): Promise<Investment[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM investments WHERE type = ? ORDER BY start_date DESC',
      args: [type]
    });

    return result.rows.map(row => this.mapRowToInvestment(row));
  }

  async findActive(): Promise<Investment[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM investments WHERE is_active = 1 ORDER BY start_date DESC',
      args: []
    });

    return result.rows.map(row => this.mapRowToInvestment(row));
  }

  async updateCurrentValue(id: number): Promise<Investment> {
    // Aquí implementarías la lógica de cálculo del valor actual
    // Por simplicidad, mantenemos el valor actual
    const investment = await this.findById(id);
    return investment!;
  }

  async updateAllCurrentValues(): Promise<void> {
    // Implementar lógica para actualizar todos los valores actuales
    const investments = await this.findActive();
    for (const investment of investments) {
      await this.updateCurrentValue(investment.id!);
    }
  }

  private mapRowToInvestment(row: any): Investment {
    return {
      id: row.id as number,
      name: row.name as string,
      type: row.type as Investment['type'],
      initialAmount: row.initial_amount as number,
      currentAmount: row.current_amount as number,
      annualRate: row.annual_rate as number,
      startDate: stringToDate(row.start_date as string),
      termMonths: row.term_months as number,
      maturityDate: stringToDate(row.maturity_date as string),
      compoundingFrequency: row.compounding_frequency as Investment['compoundingFrequency'],
      isActive: numberToBoolean(row.is_active as number),
      notes: row.notes as string || undefined
    };
  }
}

class TursoGoogleSheetsRepository implements GoogleSheetsRepository {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(config: Omit<GoogleSheetsConfig, 'id'>): Promise<GoogleSheetsConfig> {
    const result = await this.client.execute({
      sql: `INSERT INTO google_sheets_config (client_id, client_secret, access_token, refresh_token, token_expiry, spreadsheet_id, sheet_name, last_sync) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        config.clientId,
        config.clientSecret,
        config.accessToken,
        config.refreshToken,
        dateToString(config.tokenExpiry),
        config.spreadsheetId,
        config.sheetName,
        config.lastSync ? dateToString(config.lastSync) : null
      ]
    });

    return this.mapRowToGoogleSheetsConfig(result.rows[0]);
  }

  async update(config: GoogleSheetsConfig): Promise<GoogleSheetsConfig> {
    await this.client.execute({
      sql: `UPDATE google_sheets_config SET client_id = ?, client_secret = ?, access_token = ?, refresh_token = ?, 
            token_expiry = ?, spreadsheet_id = ?, sheet_name = ?, last_sync = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        config.clientId,
        config.clientSecret,
        config.accessToken,
        config.refreshToken,
        dateToString(config.tokenExpiry),
        config.spreadsheetId,
        config.sheetName,
        config.lastSync ? dateToString(config.lastSync) : null,
        config.id!
      ]
    });

    return config;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.client.execute({
        sql: 'DELETE FROM google_sheets_config WHERE id = ?',
        args: [id]
      });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<GoogleSheetsConfig | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM google_sheets_config WHERE id = ?',
      args: [id]
    });

    return result.rows[0] ? this.mapRowToGoogleSheetsConfig(result.rows[0]) : undefined;
  }

  async findAll(): Promise<GoogleSheetsConfig[]> {
    const result = await this.client.execute('SELECT * FROM google_sheets_config ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToGoogleSheetsConfig(row));
  }

  async findByLastSync(): Promise<GoogleSheetsConfig[]> {
    const result = await this.client.execute('SELECT * FROM google_sheets_config ORDER BY last_sync DESC');
    return result.rows.map(row => this.mapRowToGoogleSheetsConfig(row));
  }

  async updateTokens(id: number, accessToken: string, refreshToken: string, expiry: Date): Promise<GoogleSheetsConfig> {
    await this.client.execute({
      sql: 'UPDATE google_sheets_config SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [accessToken, refreshToken, dateToString(expiry), id]
    });

    const updated = await this.findById(id);
    return updated!;
  }

  private mapRowToGoogleSheetsConfig(row: any): GoogleSheetsConfig {
    return {
      id: row.id as number,
      clientId: row.client_id as string,
      clientSecret: row.client_secret as string,
      accessToken: row.access_token as string,
      refreshToken: row.refresh_token as string,
      tokenExpiry: stringToDate(row.token_expiry as string),
      spreadsheetId: row.spreadsheet_id as string,
      sheetName: row.sheet_name as string,
      lastSync: row.last_sync ? stringToDate(row.last_sync as string) : null
    };
  }
}

class TursoDatabaseOperations implements DatabaseOperations {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async exportData(): Promise<Record<string, any[]>> {
    const data: Record<string, any[]> = {};

    // Exportar expenses
    const expensesResult = await this.client.execute('SELECT * FROM expenses');
    data.expenses = expensesResult.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      category: row.category,
      description: row.description,
      date: stringToDate(row.date as string),
      frequency: row.frequency,
      nextPaymentDate: row.next_payment_date ? stringToDate(row.next_payment_date as string) : undefined,
      isPaid: numberToBoolean(row.is_paid as number),
      paymentHistory: row.payment_history ? JSON.parse(row.payment_history as string) : undefined,
      duration: row.duration || undefined
    }));

    // Exportar balance
    const balanceResult = await this.client.execute('SELECT * FROM balance');
    data.balance = balanceResult.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      monthlyIncome: row.monthly_income,
      date: stringToDate(row.date as string),
      projectedAmount: row.projected_amount || undefined,
      realAmount: row.real_amount || undefined
    }));

    // Exportar savings
    const savingsResult = await this.client.execute('SELECT * FROM savings_goals');
    data.savings = savingsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      targetAmount: row.target_amount,
      currentAmount: row.current_amount,
      monthlyContribution: row.monthly_contribution,
      startDate: stringToDate(row.start_date as string),
      targetDate: row.target_date ? stringToDate(row.target_date as string) : undefined,
      completed: numberToBoolean(row.completed as number)
    }));

    // Exportar investments
    const investmentsResult = await this.client.execute('SELECT * FROM investments');
    data.investments = investmentsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      initialAmount: row.initial_amount,
      currentAmount: row.current_amount,
      annualRate: row.annual_rate,
      startDate: stringToDate(row.start_date as string),
      termMonths: row.term_months,
      maturityDate: stringToDate(row.maturity_date as string),
      compoundingFrequency: row.compounding_frequency,
      isActive: numberToBoolean(row.is_active as number),
      notes: row.notes || undefined
    }));

    // Exportar Google Sheets config
    const sheetsResult = await this.client.execute('SELECT * FROM google_sheets_config');
    data.sheetConfig = sheetsResult.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: stringToDate(row.token_expiry as string),
      spreadsheetId: row.spreadsheet_id,
      sheetName: row.sheet_name,
      lastSync: row.last_sync ? stringToDate(row.last_sync as string) : null
    }));

    return data;
  }

  async importData(data: Record<string, any[]>): Promise<void> {
    // Limpiar tablas existentes
    await this.clearAll();

    // Importar expenses
    if (data.expenses) {
      for (const expense of data.expenses) {
        await this.client.execute({
          sql: `INSERT INTO expenses (amount, category, description, date, frequency, next_payment_date, is_paid, payment_history, duration) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            expense.amount,
            expense.category,
            expense.description,
            dateToString(expense.date),
            expense.frequency,
            expense.nextPaymentDate ? dateToString(expense.nextPaymentDate) : null,
            booleanToNumber(expense.isPaid),
            expense.paymentHistory ? JSON.stringify(expense.paymentHistory) : null,
            expense.duration || null
          ]
        });
      }
    }

    // Importar balance
    if (data.balance) {
      for (const balance of data.balance) {
        await this.client.execute({
          sql: `INSERT INTO balance (amount, monthly_income, date, projected_amount, real_amount) 
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            balance.amount,
            balance.monthlyIncome,
            dateToString(balance.date),
            balance.projectedAmount || null,
            balance.realAmount || null
          ]
        });
      }
    }

    // Importar savings
    if (data.savings) {
      for (const saving of data.savings) {
        await this.client.execute({
          sql: `INSERT INTO savings_goals (name, description, target_amount, current_amount, monthly_contribution, start_date, target_date, completed) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            saving.name,
            saving.description,
            saving.targetAmount,
            saving.currentAmount,
            saving.monthlyContribution,
            dateToString(saving.startDate),
            saving.targetDate ? dateToString(saving.targetDate) : null,
            booleanToNumber(saving.completed)
          ]
        });
      }
    }

    // Importar investments
    if (data.investments) {
      for (const investment of data.investments) {
        await this.client.execute({
          sql: `INSERT INTO investments (name, type, initial_amount, current_amount, annual_rate, start_date, term_months, maturity_date, compounding_frequency, is_active, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            investment.name,
            investment.type,
            investment.initialAmount,
            investment.currentAmount,
            investment.annualRate,
            dateToString(investment.startDate),
            investment.termMonths,
            dateToString(investment.maturityDate),
            investment.compoundingFrequency,
            booleanToNumber(investment.isActive),
            investment.notes || null
          ]
        });
      }
    }

    // Importar Google Sheets config
    if (data.sheetConfig) {
      for (const config of data.sheetConfig) {
        await this.client.execute({
          sql: `INSERT INTO google_sheets_config (client_id, client_secret, access_token, refresh_token, token_expiry, spreadsheet_id, sheet_name, last_sync) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            config.clientId,
            config.clientSecret,
            config.accessToken,
            config.refreshToken,
            dateToString(config.tokenExpiry),
            config.spreadsheetId,
            config.sheetName,
            config.lastSync ? dateToString(config.lastSync) : null
          ]
        });
      }
    }
  }

  async clearAll(): Promise<void> {
    await this.client.execute('DELETE FROM expenses');
    await this.client.execute('DELETE FROM balance');
    await this.client.execute('DELETE FROM savings_goals');
    await this.client.execute('DELETE FROM investments');
    await this.client.execute('DELETE FROM google_sheets_config');
  }

  async backup(): Promise<string> {
    const data = await this.exportData();
    return JSON.stringify(data, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    }, 2);
  }

  async restore(backupData: string): Promise<void> {
    const data = JSON.parse(backupData, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
    await this.importData(data);
  }
}

export class TursoRepository implements DatabaseRepository {
  public expenses: ExpenseRepository;
  public balance: BalanceRepository;
  public savings: SavingsRepository;
  public investments: InvestmentRepository;
  public googleSheets: GoogleSheetsRepository;
  public operations: DatabaseOperations;

  constructor(client: Client) {
    this.expenses = new TursoExpenseRepository(client);
    this.balance = new TursoBalanceRepository(client);
    this.savings = new TursoSavingsRepository(client);
    this.investments = new TursoInvestmentRepository(client);
    this.googleSheets = new TursoGoogleSheetsRepository(client);
    this.operations = new TursoDatabaseOperations(client);
  }

  async exportData(): Promise<Record<string, any[]>> {
    return this.operations.exportData();
  }

  async importData(data: Record<string, any[]>): Promise<void> {
    return this.operations.importData(data);
  }

  async clearAll(): Promise<void> {
    return this.operations.clearAll();
  }

  async backup(): Promise<string> {
    return this.operations.backup();
  }

  async restore(backupData: string): Promise<void> {
    return this.operations.restore(backupData);
  }
}