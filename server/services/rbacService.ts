import { db } from "../db";
import { logInfo, ErrorCreators, asyncHandler } from "./errorService";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * Role-Based Access Control Service
 * Replaces hardcoded admin checks with proper role management
 */

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator', 
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // User permissions
  CREATE_TEAM = 'create_team',
  MANAGE_OWN_TEAM = 'manage_own_team',
  TRADE_PLAYERS = 'trade_players',
  
  // Moderator permissions
  VIEW_ALL_TEAMS = 'view_all_teams',
  MODERATE_CHAT = 'moderate_chat',
  MANAGE_TOURNAMENTS = 'manage_tournaments',
  
  // Admin permissions
  MANAGE_LEAGUES = 'manage_leagues',
  MANAGE_SEASONS = 'manage_seasons',
  VIEW_FINANCES = 'view_finances',
  GRANT_CREDITS = 'grant_credits',
  STOP_MATCHES = 'stop_matches',
  
  // Super Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  SYSTEM_ADMINISTRATION = 'system_administration',
  DATABASE_ACCESS = 'database_access'
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.CREATE_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.TRADE_PLAYERS
  ],
  [UserRole.MODERATOR]: [
    Permission.CREATE_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.TRADE_PLAYERS,
    Permission.VIEW_ALL_TEAMS,
    Permission.MODERATE_CHAT,
    Permission.MANAGE_TOURNAMENTS
  ],
  [UserRole.ADMIN]: [
    Permission.CREATE_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.TRADE_PLAYERS,
    Permission.VIEW_ALL_TEAMS,
    Permission.MODERATE_CHAT,
    Permission.MANAGE_TOURNAMENTS,
    Permission.MANAGE_LEAGUES,
    Permission.MANAGE_SEASONS,
    Permission.VIEW_FINANCES,
    Permission.GRANT_CREDITS,
    Permission.STOP_MATCHES
  ],
  [UserRole.SUPER_ADMIN]: [
    ...Object.values(Permission)
  ]
};

export class RBACService {
  
  /**
   * Get user's role from database
   */
  static async getUserRole(userId: string): Promise<UserRole> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: { role: true }
      });
      
      return (user?.role as UserRole) || UserRole.USER;
    } catch (error) {
      logInfo("Failed to fetch user role, defaulting to USER", { userId, error: error.message });
      return UserRole.USER;
    }
  }
  
  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return rolePermissions.includes(permission);
  }
  
  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return permissions.some(permission => rolePermissions.includes(permission));
  }
  
  /**
   * Check if user has admin-level access
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  }
  
  /**
   * Check if user has super admin access
   */
  static async isSuperAdmin(userId: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    return userRole === UserRole.SUPER_ADMIN;
  }
  
  /**
   * Assign role to user (super admin only)
   */
  static async assignRole(adminUserId: string, targetUserId: string, role: UserRole): Promise<void> {
    // Verify admin has permission
    if (!(await this.hasPermission(adminUserId, Permission.MANAGE_ROLES))) {
      throw ErrorCreators.forbidden("Insufficient permissions to manage roles");
    }
    
    // Update user role
    await db.update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, targetUserId));
      
    logInfo("User role updated", { 
      adminUserId, 
      targetUserId, 
      newRole: role 
    });
  }
  
  /**
   * Get all permissions for a role
   */
  static getPermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
  
  /**
   * Middleware factory for protecting routes with specific permissions
   */
  static requirePermission(permission: Permission) {
    return asyncHandler(async (req: any, res: any, next: any) => {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        throw ErrorCreators.authentication("Authentication required");
      }
      
      const hasPermission = await this.hasPermission(userId, permission);
      
      if (!hasPermission) {
        throw ErrorCreators.forbidden(`Permission required: ${permission}`);
      }
      
      next();
    });
  }
  
  /**
   * Middleware factory for admin-only routes
   */
  static requireAdmin() {
    return asyncHandler(async (req: any, res: any, next: any) => {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        throw ErrorCreators.authentication("Authentication required");
      }
      
      const isAdmin = await this.isAdmin(userId);
      
      if (!isAdmin) {
        throw ErrorCreators.forbidden("Admin access required");
      }
      
      next();
    });
  }
  
  /**
   * Middleware factory for super admin-only routes
   */
  static requireSuperAdmin() {
    return asyncHandler(async (req: any, res: any, next: any) => {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        throw ErrorCreators.authentication("Authentication required");
      }
      
      const isSuperAdmin = await this.isSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        throw ErrorCreators.forbidden("Super admin access required");
      }
      
      next();
    });
  }
  
  /**
   * Initialize default roles for existing users
   */
  static async initializeDefaultRoles(): Promise<void> {
    try {
      // Get users without roles
      const usersWithoutRoles = await db.query.users.findMany({
        where: (users, { isNull }) => isNull(users.role),
        columns: { id: true, email: true }
      });
      
      // Set default role for users without roles
      for (const user of usersWithoutRoles) {
        await db.update(schema.users)
          .set({ role: UserRole.USER })
          .where(eq(schema.users.id, user.id));
      }
      
      logInfo("Initialized default roles", { 
        usersUpdated: usersWithoutRoles.length 
      });
      
    } catch (error) {
      logInfo("Failed to initialize default roles", { error: error.message });
    }
  }
  
  /**
   * Promote specific users to admin (one-time setup)
   */
  static async promoteToAdmin(userEmail: string): Promise<void> {
    try {
      // Use Drizzle ORM with eq operator for proper parameter binding
      const result = await db
        .update(schema.users)
        .set({ role: 'admin' })
        .where(eq(schema.users.email, userEmail))
        .returning({ id: schema.users.id, email: schema.users.email });
        
      if (result.length > 0) {
        logInfo("User promoted to admin", { 
          userId: result[0].id, 
          email: result[0].email 
        });
      } else {
        logInfo("User not found for admin promotion", { email: userEmail });
      }
      
    } catch (error) {
      logInfo("Failed to promote user to admin", { 
        email: userEmail, 
        error: (error as Error).message 
      });
    }
  }
}

// Initialize the RBAC system on startup
RBACService.initializeDefaultRoles();