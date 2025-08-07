const authService = require('./authService');
const logger = require('../utils/logger');

class AuthController {
  // User registration (if enabled)
  async register(req, res) {
    try {
      const allowRegistration = await authService.getAuthSetting('allow_registration');
      if (allowRegistration !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'Registration is disabled',
          code: 'REGISTRATION_DISABLED'
        });
      }

      const { username, email, password, role = 'user' } = req.body;

      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Only admins can create admin users
      if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Only admins can create admin users',
          code: 'ADMIN_REQUIRED'
        });
      }

      // Check if user already exists
      const existingUser = await authService.findUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists',
          code: 'USERNAME_EXISTS'
        });
      }

      // Create user
      const user = await authService.createUser({ username, email, password, role });
      
      // Generate token
      const token = authService.generateToken(user);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message, username: req.body.username }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }

  // User login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Authenticate user
      const user = await authService.authenticateLocal(username, password);
      
      // Generate token
      const token = authService.generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          mustChangePassword: user.must_change_password
        },
        token
      });
    } catch (error) {
      logger.error('Login error', { error: error.message, username: req.body.username }, 'auth');
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }

  // Get current user info
  async me(req, res) {
    try {
      const user = req.user;
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.last_login,
          mustChangePassword: user.must_change_password,
          ssoProvider: user.sso_provider
        }
      });
    } catch (error) {
      logger.error('Get user info error', { error: error.message, userId: req.user?.id }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to get user info',
        code: 'USER_INFO_ERROR'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
          code: 'MISSING_PASSWORDS'
        });
      }

      if (newPassword.length < 12) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 12 characters',
          code: 'PASSWORD_TOO_SHORT'
        });
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error', { error: error.message, userId: req.user?.id }, 'auth');
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'INCORRECT_CURRENT_PASSWORD'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  }

  // First-run setup
  async setup(req, res) {
    try {
      const isFirstRun = await authService.isFirstRun();
      if (!isFirstRun) {
        return res.status(409).json({
          success: false,
          error: 'Setup already completed',
          code: 'SETUP_ALREADY_COMPLETED'
        });
      }

      const { username = 'admin', email, password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for setup',
          code: 'SETUP_PASSWORD_REQUIRED'
        });
      }

      // Create first admin user
      const admin = await authService.createUser({
        username,
        email: email || 'admin@localhost',
        password,
        role: 'admin'
      });

      // Generate token
      const token = authService.generateToken(admin);

      res.status(201).json({
        success: true,
        message: 'Setup completed successfully',
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        token
      });
    } catch (error) {
      logger.error('First-run setup error', { error: error.message }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Setup failed',
        code: 'SETUP_ERROR'
      });
    }
  }

  // Check if setup is required
  async checkSetup(req, res) {
    try {
      const isFirstRun = await authService.isFirstRun();
      const authEnabled = await authService.getAuthSetting('auth_enabled');
      
      res.json({
        success: true,
        setupRequired: isFirstRun,
        authEnabled: authEnabled === 'true'
      });
    } catch (error) {
      logger.error('Check setup status error', { error: error.message }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to check setup status',
        code: 'SETUP_CHECK_ERROR'
      });
    }
  }

  // Logout (client-side token invalidation for now)
  async logout(req, res) {
    // For JWT, logout is typically handled client-side by removing the token
    // For server-side token blacklisting, we'd maintain a blacklist in Redis
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Admin: Get all users
  async getAllUsers(req, res) {
    try {
      const users = await authService.getAllUsers();
      res.json({
        success: true,
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          ssoProvider: user.sso_provider
        }))
      });
    } catch (error) {
      logger.error('Get all users error', { error: error.message, adminUser: req.user?.username }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to get users',
        code: 'GET_USERS_ERROR'
      });
    }
  }

  // Admin: Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await authService.updateUser(id, updates);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      logger.error('Update user error', { error: error.message, targetUserId: req.params.id, adminUser: req.user?.username }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        code: 'UPDATE_USER_ERROR'
      });
    }
  }

  // Admin: Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const deletedUser = await authService.deleteUser(id);
      
      res.json({
        success: true,
        message: `User "${deletedUser.username}" deactivated successfully`
      });
    } catch (error) {
      logger.error('Delete user error', { error: error.message, targetUserId: req.params.id, adminUser: req.user?.username }, 'auth');
      
      if (error.message === 'Cannot delete the last admin user') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user',
          code: 'LAST_ADMIN_ERROR'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        code: 'DELETE_USER_ERROR'
      });
    }
  }

  // Admin: Get auth settings
  async getAuthSettings(req, res) {
    try {
      const settings = await authService.getAllAuthSettings();
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Get auth settings error', { error: error.message, adminUser: req.user?.username }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to get auth settings',
        code: 'GET_SETTINGS_ERROR'
      });
    }
  }

  // Admin: Update auth settings
  async updateAuthSettings(req, res) {
    try {
      const settings = req.body;
      
      for (const [key, value] of Object.entries(settings)) {
        await authService.updateAuthSetting(key, value);
      }
      
      res.json({
        success: true,
        message: 'Auth settings updated successfully'
      });
    } catch (error) {
      logger.error('Update auth settings error', { error: error.message, adminUser: req.user?.username }, 'auth');
      res.status(500).json({
        success: false,
        error: 'Failed to update auth settings',
        code: 'UPDATE_SETTINGS_ERROR'
      });
    }
  }
}

module.exports = new AuthController();