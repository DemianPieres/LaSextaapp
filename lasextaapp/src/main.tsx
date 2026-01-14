import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento root');
}

const root = createRoot(container);

// Manejo de errores global - solo en desarrollo
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    if (event.error) {
      console.error('Stack trace:', event.error.stack);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada sin manejar:', event.reason);
    event.preventDefault();
  });
} else {
  // En producción, solo prevenir que los errores rompan la app
  window.addEventListener('error', (event) => {
    event.preventDefault();
  });
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
  });
}

try {
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
} catch (error) {
  // Error crítico al renderizar - mostrar mensaje de error al usuario
  if (import.meta.env.DEV) {
    console.error('Error al renderizar la aplicación:', error);
  }
  container.innerHTML = `
    <div style="padding: 20px; color: white; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1 style="color: #ff4444;">Error al cargar la aplicación</h1>
      <p style="color: #ccc;">Por favor, recarga la página o contacta al soporte.</p>
      <pre style="background: #2a2a2a; padding: 15px; border-radius: 8px; overflow: auto; max-width: 90%; color: #ff6666;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}