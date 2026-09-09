import { createContext, useContext, useState } from 'react';
import { api, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const data = await api.login(email, password);

    setUser(data.user);
    localStorage.setItem('edunex_token', data.token);

    return data.user;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('edunex_token');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}