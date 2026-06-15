import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers } from '../api';

interface User {
  id: number;
  username: string;
  fullName: string;
  avatar: string;
  bio: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (id: number) => void;
  logout: () => void;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      const savedId = localStorage.getItem('offlinegram_user_id');
      if (savedId) {
        const found = data.find((u: User) => u.id === parseInt(savedId));
        if (found) setUser(found);
      } else if (data.length > 0) {
        // default login first user (admin)
        login(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const login = (id: number) => {
    const found = users.find(u => u.id === id);
    if (found) {
      setUser(found);
      localStorage.setItem('offlinegram_user_id', id.toString());
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('offlinegram_user_id');
  };

  return (
    <AuthContext.Provider value={{ user, users, login, logout, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
