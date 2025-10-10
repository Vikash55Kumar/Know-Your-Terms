import type { User } from "firebase/auth";
import api from "../utils/baseApi";

interface RegisterData {
  email: string;
  displayName: string;
  region: string;
  role?: 'USER';
  language?: string;
}

export const authService = {
  async register(data: RegisterData): Promise<User> {
    const response = await api.post('/users/register', data);
    return response.data.data; 
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/user-profile');
    return response.data.data;
  },

  // Token management for agent services
  async getToken(): Promise<string | null> {
    return localStorage.getItem('idToken');
  },
};