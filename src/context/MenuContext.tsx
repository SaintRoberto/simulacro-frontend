import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface MenuItem {
  id: number;
  nombre: string;
  ruta: string;
  icono?: string;
  orden?: number;
  padre_id?: number;
}

interface MenuContextValue {
  menuItems: MenuItem[] | null;
  setMenuItems: (items: MenuItem[] | null) => void;
  getMenuIdByRoute: (route: string) => number | undefined;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[] | null>(null);

  const getMenuIdByRoute = (route: string): number | undefined => {
    if (!menuItems || menuItems.length === 0) return undefined;
    
    // Normalizar la ruta (eliminar barras finales y espacios)
    const normalizedRoute = route.trim().replace(/\/+$/, '') || '/';
    
    // Filtrar items con ruta válida
    const itemsWithRoute = menuItems.filter(item => item.ruta && item.ruta.trim() !== '');
    
    if (itemsWithRoute.length === 0) return undefined;
    
    // Primero buscar coincidencia exacta
    const exactMatch = itemsWithRoute.find(item => {
      const normalizedItemRoute = item.ruta.trim().replace(/\/+$/, '') || '/';
      return normalizedItemRoute === normalizedRoute;
    });
    
    if (exactMatch) return exactMatch.id;
    
    // Si no hay coincidencia exacta, buscar la ruta más larga que sea prefijo
    // Ordenar por longitud de ruta (más larga primero) para encontrar la coincidencia más específica
    const sortedItems = [...itemsWithRoute].sort((a, b) => b.ruta.length - a.ruta.length);
    
    const prefixMatch = sortedItems.find(item => {
      const normalizedItemRoute = item.ruta.trim().replace(/\/+$/, '') || '/';
      // Verificar que la ruta del menú sea un prefijo de la ruta actual
      // y que el siguiente carácter sea '/' o el final de la cadena
      if (normalizedRoute.startsWith(normalizedItemRoute)) {
        const nextChar = normalizedRoute[normalizedItemRoute.length];
        return !nextChar || nextChar === '/';
      }
      return false;
    });
    
    return prefixMatch?.id;
  };

  const value: MenuContextValue = {
    menuItems,
    setMenuItems,
    getMenuIdByRoute,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
};

