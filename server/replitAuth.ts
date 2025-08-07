import * as client from "openid-client";
import passport from "passport";
import type { AuthenticateCallback } from "passport";
// Import from the correct path based on TypeScript resolution
import { Strategy } from "openid-client/build/passport";

import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage"; // Assuming this now points to your Prisma-based userStorage

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // Should be false as Prisma handles table creation
    ttl: sessionTtl,
    tableName: "Session", // Corrected to match Prisma model
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Call storage.users.upsertUser which now expects PrismaUpsertUserData
  // Ensure the field name matches what userStorage.upsertUser expects for Replit user ID
  await storage.users.upsertUser({
    userId: claims["sub"], // Corrected: 'userId' instead of 'id'
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: AuthenticateCallback
  ) => {
    const user = {}; // This will be populated on req.user by passport
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, { ...user, claims: tokens.claims() });
  };

  // Register strategies for all domains including localhost for development
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Add localhost for development mode
  if (process.env.NODE_ENV === 'development') {
    domains.push('localhost');
  }
  
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: domain === 'localhost' 
          ? `http://localhost:5000/api/callback`
          : `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // In development, always redirect to the frontend login page since Replit Auth won't work on localhost
    if (process.env.NODE_ENV === 'development') {
      return res.redirect('/?login=requested');
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // In development, redirect to home since we're using mock auth
    if (process.env.NODE_ENV === 'development') {
      return res.redirect('/');
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    // In development, simply clear session and redirect
    if (process.env.NODE_ENV === 'development') {
      req.logout(() => {
        res.redirect('/');
      });
      return;
    }
    
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Development bypass - always allow in development
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      claims: {
        sub: "44010914",
        email: "jimmy058910@gmail.com",
        first_name: "Jimmy",
        last_name: "Moceri"
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};