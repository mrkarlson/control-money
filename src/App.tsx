import './App.css'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { initDB } from './db/config'
import BalanceForm from './components/BalanceForm'

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Mejorar el manejo de errores al inicializar la base de datos
    initDB().catch(error => {
      console.error('Error al inicializar la base de datos:', error);
      // Podríamos mostrar un mensaje al usuario aquí si es necesario
    });
  }, []);

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
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white w-80 border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-800">Control Money</h1>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <BalanceForm />
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Secciones</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigateTo('expenses')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('expenses') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    Gastos
                  </button>
                  <button
                    onClick={() => navigateTo('investments')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('investments') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    Inversiones
                  </button>
                  <button
                    onClick={() => navigateTo('savings')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${isCurrentPath('savings') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    Ahorros
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => navigateTo('configuration')}
                className={`w-full flex items-center justify-start px-4 py-2 rounded-lg transition-colors ${isCurrentPath('configuration') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            {/* Toggle sidebar button */}
            {!drawerOpen && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="fixed left-4 top-4 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}

export default App;
