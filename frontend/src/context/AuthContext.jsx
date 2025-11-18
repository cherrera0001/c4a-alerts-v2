import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    const storedUser = authService.getUser();

    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      
      authService
        .getProfile()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem("c4a_user", JSON.stringify(userData));
        })
        .catch(() => {
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user || { email, id: response.userId });
    setIsAuthenticated(true);
    return response;
  };

  const register = async (email, password, name) => {
    const response = await authService.register(email, password, name);
    setUser(response.user || { email, name, id: response.userId });
    setIsAuthenticated(true);
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("c4a_user", JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

