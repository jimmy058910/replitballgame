// Express module augmentation using 2024 industry standards
// Force this file to be treated as a module
export {};

declare global {
  namespace Express {
    interface User {
      claims: any; // Firebase DecodedIdToken claims or auth profile
      uid?: string; // Firebase UID (when using Firebase auth)
      email?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }

    // Augment Request interface to include user and custom properties
    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}
