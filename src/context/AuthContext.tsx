import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, type ApiError } from '../api/client';
import { logger } from '../utils/logger';

type UserProfile = {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente';
  fechaRegistro: string;
};

type AdminProfile = {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin';
  fechaRegistro: string;
};

type UserSession = {
  type: 'user';
  profile: UserProfile;
  token: string;
};

type AdminSession = {
  type: 'admin';
  profile: AdminProfile;
  token: string;
};

type Session = UserSession | AdminSession;

type AuthContextValue = {
  session: Session | null;
  isInitializing: boolean;
  login: (credentials: { email: string; password: string }) => Promise<'cliente' | 'admin'>;
  loginUser: (credentials: { email: string; password: string }) => Promise<void>;
  registerUser: (payload: { email: string; password: string; nombre: string }) => Promise<void>;
  loginAdmin: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

type AuthResponse<TProfile> = {
  user?: TProfile;
  admin?: TProfile;
  token: string;
};

const USER_STORAGE_KEY = 'lasextaapp:userSession';
const ADMIN_STORAGE_KEY = 'lasextaapp:adminSession';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

function readStoredSession(): Session | null {
  try {
    const adminRaw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw) as AdminSession;
      if (parsed?.token && parsed?.profile) {
        return { ...parsed, type: 'admin' };
      }
    }
  } catch {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  }

  try {
    const userRaw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (userRaw) {
      const parsed = JSON.parse(userRaw) as UserSession;
      if (parsed?.token && parsed?.profile) {
        return { ...parsed, type: 'user' };
      }
    }
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }

  return null;
}

function persistSession(session: Session | null) {
  if (session === null) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    return;
  }

  if (session.type === 'user') {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null;
    return readStoredSession();
  });
  const [isInitializing, setIsInitializing] = useState(true);

  const loadProfile = useCallback(
    async (storedSession: Session | null) => {
      logger.log('[AuthProvider] loadProfile iniciado', { hasSession: storedSession !== null });
      
      if (storedSession === null) {
        logger.log('[AuthProvider] No hay sesión guardada, inicializando sin sesión');
        setIsInitializing(false);
        return;
      }

      try {
        logger.log('[AuthProvider] Verificando sesión...', { type: storedSession.type });
        
        // Timeout de 3 segundos para evitar que se quede colgado
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            logger.warn('[AuthProvider] Timeout al verificar sesión');
            reject(new Error('Timeout al verificar sesión'));
          }, 3000);
        });

        const fetchPromise = storedSession.type === 'admin'
          ? apiFetch<{ admin: AdminProfile }>('/admin/me', {
              authToken: storedSession.token,
            })
          : apiFetch<{ user: UserProfile }>('/auth/me', {
              authToken: storedSession.token,
            });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        logger.log('[AuthProvider] Sesión verificada exitosamente');

        if (storedSession.type === 'admin') {
          const newSession: AdminSession = {
            type: 'admin',
            token: storedSession.token,
            profile: (response as { admin: AdminProfile }).admin,
          };
          setSession(newSession);
          persistSession(newSession);
        } else {
          const newSession: UserSession = {
            type: 'user',
            token: storedSession.token,
            profile: (response as { user: UserProfile }).user,
          };
          setSession(newSession);
          persistSession(newSession);
        }
      } catch (error) {
        // Si hay error de red o timeout, limpiar sesión y continuar
        if (isApiError(error)) {
          if (error.status === 401 || error.status === 404) {
            setSession(null);
            persistSession(null);
          } else {
            // Otro error de API - limpiar sesión
            logger.warn('[AuthProvider] Error al verificar sesión:', error);
            setSession(null);
            persistSession(null);
          }
        } else {
          // Error de red, timeout, o error desconocido - limpiar sesión para permitir login
          logger.warn('[AuthProvider] No se pudo verificar la sesión (backend no disponible?):', error);
          setSession(null);
          persistSession(null);
        }
      } finally {
        setIsInitializing(false);
      }
    },
    []
  );

  useEffect(() => {
    logger.log('[AuthProvider] useEffect ejecutado');
    
    if (typeof window === 'undefined') {
      logger.log('[AuthProvider] No hay window, inicializando sin sesión');
      setIsInitializing(false);
      return;
    }

    logger.log('[AuthProvider] Cargando perfil...');
    void loadProfile(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSessionUpdate = useCallback((newSession: Session) => {
    setSession(newSession);
    persistSession(newSession);
  }, []);

  const loginUser = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const response = await apiFetch<AuthResponse<UserProfile>>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!response.user) {
        throw new Error('Respuesta inválida del servidor.');
      }

      const newSession: UserSession = {
        type: 'user',
        profile: response.user,
        token: response.token,
      };
      handleSessionUpdate(newSession);
    },
    [handleSessionUpdate]
  );

  const registerUser = useCallback(
    async ({ email, password, nombre }: { email: string; password: string; nombre: string }) => {
      const response = await apiFetch<AuthResponse<UserProfile>>('/auth/register', {
        method: 'POST',
        body: { email, password, nombre },
      });

      if (!response.user) {
        throw new Error('Respuesta inválida del servidor.');
      }

      const newSession: UserSession = {
        type: 'user',
        profile: response.user,
        token: response.token,
      };
      handleSessionUpdate(newSession);
    },
    [handleSessionUpdate]
  );

  const loginAdmin = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const response = await apiFetch<AuthResponse<AdminProfile>>('/admin/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!response.admin) {
        throw new Error('Respuesta inválida del servidor.');
      }

      const newSession: AdminSession = {
        type: 'admin',
        profile: response.admin,
        token: response.token,
      };
      handleSessionUpdate(newSession);
    },
    [handleSessionUpdate]
  );

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        await loginUser({ email, password });
        return 'cliente';
      } catch (userError) {
        if (isApiError(userError) && (userError.status === 401 || userError.status === 404)) {
          try {
            await loginAdmin({ email, password });
            return 'admin';
          } catch (adminError: unknown) {
            if (isApiError(adminError)) {
              throw new Error(adminError.message ?? 'Credenciales incorrectas.');
            }
            throw adminError;
          }
        }

        throw userError;
      }
    },
    [loginAdmin, loginUser]
  );

  const logout = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isInitializing,
      login,
      loginUser,
      registerUser,
      loginAdmin,
      logout,
      refreshProfile,
    }),
    [isInitializing, loginAdmin, loginUser, logout, refreshProfile, registerUser, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
}

export { AuthProvider };


