// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as express from 'express';

declare global {
  namespace Express {
    export interface User {
      claims: any; // Using 'any' temporarily as openid-client UserClaims was problematic
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}
