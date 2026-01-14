import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './SharedBackground.css';

interface SharedBackgroundProps {
  children: React.ReactNode;
}

const SharedBackground: React.FC<SharedBackgroundProps> = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPage, setCurrentPage] = useState('');

  useEffect(() => {
    // Activar transición cuando cambia la ruta
    setIsTransitioning(true);
    
    // Desactivar transición después de un tiempo
    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentPage(location.pathname);
    }, 600); // Duración de la animación de desenfoque

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const getPageClass = () => {
    const path = location.pathname;
    if (path.includes('/eventos')) return 'page-eventos';
    if (path.includes('/mis-tickets')) return 'page-mis-tickets';
    if (path.includes('/beneficios')) return 'page-beneficios';
    if (path.includes('/puntos')) return 'page-puntos';
    if (path.includes('/perfil')) return 'page-perfil';
    return 'page-default';
  };

  return (
    <div className={`shared-background ${getPageClass()} ${isTransitioning ? 'transitioning' : ''}`}>
      {/* Capa de fondo principal con la imagen background.png */}
      <div className="background-layer main-background">
        <div className="background-image"></div>
        <div className="background-overlay"></div>
      </div>

      {/* Capa de transición para el efecto de desenfoque */}
      <div className={`transition-overlay ${isTransitioning ? 'active' : ''}`}></div>

      {/* Contenido de la aplicación */}
      <div className="app-content">
        {children}
      </div>
    </div>
  );
};

export default SharedBackground;

