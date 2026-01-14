/**
 * Sistema de logging condicional para producción
 * En producción, los logs se desactivan automáticamente
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Los errores siempre se muestran, pero en producción sin stack traces sensibles
    if (isDevelopment) {
      console.error(...args);
    } else {
      // En producción, solo loguear mensajes de error sin información sensible
      const safeArgs = args.map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 0);
          } catch {
            return '[Object]';
          }
        }
        return String(arg);
      });
      console.error(...safeArgs);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

