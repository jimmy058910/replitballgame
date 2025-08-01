// Unified authentication hook that works in both development and production
import { useAuth } from "@/providers/AuthProvider";
import { useDevAuth } from "@/providers/DevAuthProvider";

export function useUnifiedAuth() {
  const isDevelopment = import.meta.env.DEV;
  
  // Use development auth in dev mode, Firebase auth in production
  const auth = isDevelopment ? useDevAuth() : useAuth();
  
  return auth;
}