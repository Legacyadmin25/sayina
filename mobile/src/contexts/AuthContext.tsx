import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/User';
import api from '../services/api';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from secure storage on app startup
    const loadUserAndToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          const userDataString = await SecureStore.getItemAsync('userData');
          const userData = userDataString ? JSON.parse(userDataString) : null;
          
          setToken(storedToken);
          setUser(userData);
          
          // Validate token on startup
          await validateToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndToken();
  }, []);

  const validateToken = async (currentToken: string) => {
    try {
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      
      // Make a request to validate the token
      await api.get('/api/v1/users/me');
      return true;
    } catch (error) {
      // If token validation fails, sign out
      await signOut();
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await api.post('/api/v1/auth/login', {
        email,
        password,
      });

      const { user: userData, token: newToken } = response.data;
      
      // Save user data and token to secure storage
      await SecureStore.setItemAsync('userToken', newToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setUser(userData);
      setToken(newToken);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    
    try {
      // Clear token from API headers
      delete api.defaults.headers.common['Authorization'];
      
      // Clear secure storage
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.post('/api/v1/auth/refresh-token');
      
      const { token: newToken } = response.data;
      
      // Save new token to secure storage
      await SecureStore.setItemAsync('userToken', newToken);
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      await signOut();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        signIn,
        signOut,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
