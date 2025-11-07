import React, { useEffect, useState } from 'react';
import {
  SwipeableDrawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
// Removed unused icons for actions we no longer show
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import { useNavigate } from 'react-router-dom';
import DatabaseIndicator from './DatabaseIndicator';
import BalanceForm from './BalanceForm';

interface MoreMenuSheetProps {
  open: boolean;
  onClose: () => void;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({ open, onClose, currentTheme, onToggleTheme }) => {
  const navigate = useNavigate();
  const [dbType, setDbType] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('active_db_type');
    setDbType(t);
  }, [open]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          pb: 'calc(16px + env(safe-area-inset-bottom))'
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Más</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Toggle de tema con el mismo icono que en desktop */}
            <IconButton 
              aria-label="Alternar tema"
              title={currentTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={onToggleTheme}
            >
              {currentTheme === 'dark' ? (
                // Icono de sol (mismo SVG que en desktop)
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05L4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414" />
                  <circle cx="12" cy="12" r="4" strokeWidth="2" />
                </svg>
              ) : (
                // Icono de luna (mismo SVG que en desktop)
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              )}
            </IconButton>
            <IconButton aria-label="Cerrar" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Base de datos activa:</Typography>
          {dbType && (
            <Chip
              size="small"
              label={dbType === 'turso' ? 'Nube (Turso)' : 'Local (IndexedDB)'}
              icon={dbType === 'turso' ? <CloudIcon /> : <StorageIcon />}
              color={dbType === 'turso' ? 'primary' : 'default'}
              variant={dbType === 'turso' ? 'filled' : 'outlined'}
            />
          )}
        </Box>

        <DatabaseIndicator />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Balance</Typography>
        <Box sx={{ mb: 2 }}>
          {/* Usamos el formulario existente para visualizar/editar balance e ingreso mensual */}
          <BalanceForm />
        </Box>

        <Divider sx={{ my: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/configuration')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Configuración" secondary="Conexión BD, Google Sheets" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </SwipeableDrawer>
  );
};

export default MoreMenuSheet;