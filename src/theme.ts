import { createTheme, responsiveFontSizes } from '@mui/material/styles';

export function getTheme(mode: 'light' | 'dark') {
  let theme = createTheme({
    palette: {
      mode,
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    typography: {
      fontFamily:
        'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      h1: {
        fontSize: 'clamp(1.75rem, 1.5rem + 1.2vw, 2.5rem)',
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: 'clamp(1.5rem, 1.35rem + 0.9vw, 2.125rem)',
        fontWeight: 700,
        lineHeight: 1.25,
      },
      h3: {
        fontSize: 'clamp(1.35rem, 1.25rem + 0.6vw, 1.75rem)',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: 'clamp(1.2rem, 1.1rem + 0.5vw, 1.5rem)',
        fontWeight: 600,
        lineHeight: 1.35,
      },
      h5: {
        fontSize: 'clamp(1.05rem, 1rem + 0.4vw, 1.25rem)',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: 'clamp(0.95rem, 0.9rem + 0.3vw, 1.125rem)',
        fontWeight: 600,
        lineHeight: 1.45,
      },
      body1: {
        fontSize: 'clamp(0.95rem, 0.9rem + 0.2vw, 1rem)',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: 'clamp(0.9rem, 0.85rem + 0.15vw, 0.95rem)',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
}