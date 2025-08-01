// Development authentication bypass
// This connects frontend directly to the working backend authentication

export class DevAuthService {
  private static isLoggedIn = false;
  private static user: any = null;

  static async loginDevelopmentUser() {
    if (this.isLoggedIn) {
      return this.user;
    }

    try {
      console.log('🔧 DEV: Logging in development user...');
      
      // Call the backend development login endpoint
      const response = await fetch('/api/auth/dev-login', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔧 DEV: Login successful:', result);
        
        this.isLoggedIn = true;
        this.user = result.user;
        
        return this.user;
      } else {
        console.error('🔧 DEV: Login failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('🔧 DEV: Login error:', error);
      return null;
    }
  }

  static async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.authenticated && result.user) {
          this.isLoggedIn = true;
          this.user = result.user;
          return result.user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('🔧 DEV: Auth check failed:', error);
      return null;
    }
  }

  static getUser() {
    return this.user;
  }

  static isAuthenticated() {
    return this.isLoggedIn;
  }

  static logout() {
    this.isLoggedIn = false;
    this.user = null;
  }
}