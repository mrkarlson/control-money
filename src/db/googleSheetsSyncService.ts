import { GoogleSheetsConfig, Expense } from './config';
import { getGoogleSheetsConfig, saveGoogleSheetsConfig, refreshAccessToken } from './googleSheetsService';
import { getCurrentBalance, updateBalance, getExpensesByMonth } from './repositoryAdapter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Estructura para los datos de sincronización
interface MonthlyData {
  month: string; // Formato: 'YYYY-MM'
  balance: {
    amount: number;
    monthlyIncome: number;
    projectedAmount?: number;
    realAmount?: number;
  };
  expenses: {
    totalPaid: number;
    totalPending: number;
  };
}

interface SyncData {
  months: MonthlyData[];
  lastSync: Date;
}

/**
 * Exporta los datos de la aplicación a Google Sheets
 */
export async function exportToGoogleSheets(): Promise<{
  currentMonth: MonthlyData;
  lastSync: Date;
}> {
  // Obtener la configuración de Google Sheets
  const config = await getGoogleSheetsConfig();
  if (!config) {
    throw new Error('No se encontró la configuración de Google Sheets');
  }

  // Verificar si el token ha expirado y renovarlo si es necesario
  if (new Date() >= new Date(config.tokenExpiry)) {
    await refreshAccessToken(config);
  }

  // Obtener los datos actuales de la aplicación
  const appData = await getAppData();
  
  // Exportar datos a Google Sheets
  await exportDataToSheet(appData, config);
  
  // Actualizar la fecha de última sincronización
  await updateLastSyncDate(config);
  
  // Obtener los datos del mes actual
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthData = appData.months.find(m => m.month === currentMonth) || {
    month: currentMonth,
    balance: { amount: 0, monthlyIncome: 0 },
    expenses: { totalPaid: 0, totalPending: 0 }
  };
  
  return {
    currentMonth: currentMonthData,
    lastSync: new Date()
  };
}

/**
 * Importa los datos desde Google Sheets a la aplicación
 */
export async function importFromGoogleSheets(): Promise<{
  currentMonth: MonthlyData;
  lastSync: Date;
}> {
  // Obtener la configuración de Google Sheets
  const config = await getGoogleSheetsConfig();
  if (!config) {
    throw new Error('No se encontró la configuración de Google Sheets');
  }

  // Verificar si el token ha expirado y renovarlo si es necesario
  if (new Date() >= new Date(config.tokenExpiry)) {
    await refreshAccessToken(config);
  }

  // Importar datos desde Google Sheets
  const updatedData = await importDataFromSheet(config);
  
  // Actualizar la base de datos local con los datos importados
  await updateLocalData(updatedData);
  
  // Actualizar la fecha de última sincronización
  await updateLastSyncDate(config);
  
  // Obtener los datos del mes actual
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthData = updatedData.months.find(m => m.month === currentMonth) || {
    month: currentMonth,
    balance: { amount: 0, monthlyIncome: 0 },
    expenses: { totalPaid: 0, totalPending: 0 }
  };
  
  return {
    currentMonth: currentMonthData,
    lastSync: new Date()
  };
}

/**
 * Obtiene los datos actuales de la aplicación para sincronizar
 */
async function getAppData(): Promise<SyncData> {
  // Obtener el balance actual
  const balance = await getCurrentBalance();
  
  if (!balance) {
    throw new Error('No se encontró información de balance');
  }
  
  // Obtener datos del mes actual y los próximos 6 meses
  const today = new Date();
  const monthlyData: MonthlyData[] = [];
  
  // Generar datos para el mes actual y los próximos 6 meses
  for (let i = 0; i <= 6; i++) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthKey = format(targetMonth, 'yyyy-MM');
    
    // Obtener gastos del mes usando la función que maneja correctamente los gastos recurrentes
    const monthExpenses: Expense[] = await getExpensesByMonth(targetMonth);
    
    // Calcular totales para el mes usando los valores ya transformados por getExpensesByMonth
    const totalPaid = monthExpenses
      .filter(expense => expense.isPaid)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const totalPending = monthExpenses
      .filter(expense => !expense.isPaid)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    // Usar el balance actual para cada mes
    const monthBalance = {
      amount: balance.amount,
      monthlyIncome: balance.monthlyIncome
    };

    monthlyData.push({
      month: monthKey,
      balance: monthBalance,
      expenses: {
        totalPaid,
        totalPending
      }
    });
  }
  
  return {
    months: monthlyData,
    lastSync: new Date()
  };
}

/**
 * Exporta los datos de la aplicación a Google Sheets
 */
async function exportDataToSheet(data: SyncData, config: GoogleSheetsConfig): Promise<void> {
  try {
    // Construir la URL de la API
    const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    // Ajustamos el rango para asegurar que no exceda el límite de filas
    const sheetRange = `${config.sheetName}!A1:H50`;
    const url = `${baseUrl}/${config.spreadsheetId}/values/${sheetRange}?valueInputOption=USER_ENTERED`;

    // Preparar los datos para exportar de manera más compacta
    const values: Array<Array<string>> = [
      ['Control Money - Sincronización por Meses', '', '', '', '', '', '', ''],
      ['Fecha de sincronización:', format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: es }), '', '', '', '', '', '']
    ];

    // Agregar encabezados de columnas
    values.push(['Mes', 'Total Gastos', 'Pagados', 'Pendientes', 'Balance Actual', 'Balance Real', 'Balance Proyectado', '']);

    // Agregar datos de cada mes de forma más compacta
    data.months.forEach(monthData => {
      const monthLabel = format(new Date(monthData.month + '-01'), 'MMMM yyyy', { locale: es });
      const totalGastos = monthData.expenses.totalPaid + monthData.expenses.totalPending;
      const balanceReal = monthData.balance.amount - monthData.expenses.totalPending;
      const balanceProyectado = monthData.balance.monthlyIncome - monthData.expenses.totalPending;
      
      values.push([
        monthLabel,
        `${totalGastos.toFixed(2)} €`,
        `${monthData.expenses.totalPaid.toFixed(2)} €`,
        `${monthData.expenses.totalPending.toFixed(2)} €`,
        `${monthData.balance.amount.toFixed(2)} €`,
        `${balanceReal.toFixed(2)} €`,
        `${balanceProyectado.toFixed(2)} €`,
        ''
      ]);
    });


    // Realizar la petición a la API
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
        majorDimension: 'ROWS'
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al exportar datos: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error al exportar datos a Google Sheets:', error);
    throw error;
  }
}

/**
 * Importa datos desde Google Sheets a la aplicación
 */
async function importDataFromSheet(config: GoogleSheetsConfig): Promise<SyncData> {
  try {
    // Construir la URL de la API
    const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const sheetRange = `${config.sheetName}!A1:F50`; // Rango ampliado para el nuevo formato
    const url = `${baseUrl}/${config.spreadsheetId}/values/${sheetRange}`;

    // Realizar la petición a la API
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al importar datos: ${response.statusText}`);
    }

    const data = await response.json();
    const values = data.values || [];

    // Procesar los datos de la hoja
    const monthlyData: MonthlyData[] = [];
    let currentMonth: string | null = null;
    let currentMonthData: MonthlyData | null = null;

    // Saltar las primeras 3 filas (encabezado y fecha de sincronización)
    for (let i = 3; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length === 0) continue;

      // Detectar el encabezado del mes (ejemplo: "abril 2025")
      if (row[0] && !row[0].includes(':')) {
        try {
          // Intentar parsear el mes en formato "Mes Año"
          const parts = row[0].split(' ');
          if (parts.length === 2) {
            const monthNames: Record<string, number> = {
              'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
              'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
            };
            const month: number = monthNames[parts[0].toLowerCase()];
            const year: number = parseInt(parts[1]);
            if (month !== undefined && !isNaN(month) && !isNaN(year)) {
              const monthDate = new Date(year, month, 1);
              currentMonth = format(monthDate, 'yyyy-MM');
              currentMonthData = {
                month: currentMonth,
                balance: { amount: 0, monthlyIncome: 0 },
                expenses: { totalPaid: 0, totalPending: 0 }
              };
              monthlyData.push(currentMonthData);
            }
          }
        } catch (e) {
          console.warn('No se pudo parsear la fecha:', row[0]);
        }
      }

      // Procesar datos si estamos en un mes válido
      if (currentMonthData) {
        if (row[0]?.includes('Total Gastos:')) {
          // Procesar gastos pagados
          const paidAmount = parseFloat(row[4]?.replace('€', '').trim()) || 0;
          currentMonthData.expenses.totalPaid = paidAmount;
        } else if (row[0] === '') {
          // Procesar gastos pendientes
          const pendingAmount = parseFloat(row[4]?.replace('€', '').trim()) || 0;
          if (!isNaN(pendingAmount)) {
            currentMonthData.expenses.totalPending = pendingAmount;
          }
        } else if (row[0]?.includes('Balance Final:')) {
          // Procesar balance
          const balanceAmount = parseFloat(row[1]?.replace('€', '').trim()) || 0;
          currentMonthData.balance.amount = balanceAmount;
        }
      }
    }

    return {
      months: monthlyData,
      lastSync: new Date()
    };
  } catch (error) {
    console.error('Error al importar datos desde Google Sheets:', error);
    throw error;
  }
}

/**
 * Actualiza los datos locales con la información importada de Google Sheets
 */
async function updateLocalData(data: SyncData): Promise<void> {
  try {
    // Verificar si hay datos del mes actual para actualizar el balance
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentMonthData = data.months.find(m => m.month === currentMonth);
    
    if (currentMonthData) {
      // Actualizar el balance con los datos del mes actual
      const currentBalance = await getCurrentBalance();
      
      if (currentBalance) {
        // updateBalance espera Omit<Balance, 'id'>; excluimos 'id' explícitamente
        const { id: _id, ...rest } = currentBalance;
        await updateBalance({
          ...rest,
          amount: currentMonthData.balance.amount,
          monthlyIncome: currentMonthData.balance.monthlyIncome,
          date: new Date()
        });
      }
    } else {
      console.log('No se encontraron datos del mes actual para actualizar el balance');
    }
    
    // Nota: No actualizamos los gastos individuales, solo el balance
    // ya que la sincronización es a nivel de totales, no de gastos específicos
  } catch (error) {
    console.error('Error al actualizar datos locales:', error);
    throw error;
  }
}

/**
 * Actualiza la fecha de última sincronización en la configuración
 */
async function updateLastSyncDate(config: GoogleSheetsConfig): Promise<void> {
  try {
    await saveGoogleSheetsConfig({
      ...config,
      lastSync: new Date()
    });
  } catch (error) {
    console.error('Error al actualizar fecha de sincronización:', error);
    throw error;
  }
}
