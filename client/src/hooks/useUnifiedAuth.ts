// Unified authentication hook - now using Firebase Authentication for both development and production
import { useAuth } from "@/providers/AuthProvider";

export function useUnifiedAuth() {
  // Use Firebase Authentication for both development and production
  // This ensures consistent authentication behavior across all environments
  return useAuth();
}