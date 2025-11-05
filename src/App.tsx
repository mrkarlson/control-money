import './App.css'
import { useState, useEffect } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { initDB } from './db/config'
import BalanceForm from './components/BalanceForm'
import DatabaseIndicator from './components/DatabaseIndicator'
import LogoMark from './components/LogoMark'

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved as 'light' | 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Mejorar el manejo de errores al inicializar la base de datos
    initDB().catch(error => {
      console.error('Error al inicializar la base de datos:', error);
      // Podríamos mostrar un mensaje al usuario aquí si es necesario
    });
  }, []);

  // Sincroniza la clase 'dark' en <html> y persiste la preferencia
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const muiTheme = createTheme({
    palette: {
      mode: theme,
    },
  });

/*   const handleExpenseAdded = () => {
    setIsExpenseFormOpen(false);
    const event = new Event('expenseAdded');
    document.dispatchEvent(event);
  }; */

  const isCurrentPath = (path: string) => {
    return location.pathname === `/${path}`;
  };

  const navigateTo = (path: string) => {
    navigate(`/${path}`);
  };

  /* const renderMainContent = () => {
    return viewMode === 'monthly' ? (
      <Expenses
        currentMonth={currentMonth}
        onExpenseDeleted={() => {
          const event = new Event('expenseAdded');
          document.dispatchEvent(event);
        }}
        onMonthChange={setCurrentMonth}
      />
    ) : (
      <AnnualOverview />
    );
  }; */

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white dark:bg-gray-800 w-80 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Ocultar lateral"
                  title="Ocultar lateral"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <LogoMark size={28} />
                  <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Control Money</h1>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Alternar tema"
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? (
                  // Icono de sol
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05L4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414" />
                    <circle cx="12" cy="12" r="4" strokeWidth="2" />
                  </svg>
                ) : (
                  // Icono de luna
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <BalanceForm />
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Secciones</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigateTo('expenses')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('expenses') ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Gastos
                  </button>
                  <button
                    onClick={() => navigateTo('investments')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('investments') ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Inversiones
                  </button>
                  <button
                    onClick={() => navigateTo('savings')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('savings') ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Ahorros
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Indicador de tipo de BD en el pie del lateral */}
              <div className="flex items-center justify-between">
                <DatabaseIndicator />
              </div>

              <button
                onClick={() => navigateTo('configuration')}
                className={`w-full flex items-center justify-start px-4 py-2 rounded-lg transition-colors ${isCurrentPath('configuration') ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {/* Toggle sidebar button */}
            {!drawerOpen && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="fixed left-4 top-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <Outlet />
          </div>
        </main>
      </div>

      </div>
    </ThemeProvider>
  );
}

export default App;
