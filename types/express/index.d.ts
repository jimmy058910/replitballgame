// Express module augmentation for proper TypeScript support in all environments
declare namespace Express {
  export interface User {
    claims: any; // Firebase DecodedIdToken claims or auth profile
    uid?: string; // Firebase UID (when using Firebase auth)
    email?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }
}
