// server/session.ts
import session from 'express-session';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreStore } from '@google-cloud/connect-firestore';

const sessionMiddleware = session({
  store: new FirestoreStore({
    dataset: new Firestore(),
    kind: 'express-sessions',
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-local-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
});

export default sessionMiddleware;
