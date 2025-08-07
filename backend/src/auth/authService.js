const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required for security');
    }
    if (this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 256 bits (32 characters) for security');
    }
    this.saltRounds = 12; // Industry standard for bcrypt
    this.defaultSessionTimeout = '7d';
  }

  // Password hashing using bcrypt (industry standard)
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // JWT Token management
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    };

    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.defaultSessionTimeout,
      issuer: 'taylordx-dashboard',
      audience: 'taylordx-users'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'taylordx-dashboard',
        audience: 'taylordx-users'
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // User management
  async createUser(userData) {
    logger.debug('createUser called', { userData: { ...userData, password: userData.password ? '[REDACTED]' : null } }, 'auth');
    const { username, email, password, role = 'user', ssoProvider = null, ssoSubject = null } = userData;
    
    logger.debug('Extracted user data for creation', { username, emailProvided: !!email, role, ssoProvider, ssoSubject }, 'auth');
    
    // Hash password if provided (local account)
    let passwordHash = null;
    if (password) {
      logger.debug('Hashing password for local user', {}, 'auth');
      passwordHash = await this.hashPassword(password);
      logger.debug('Password hashed successfully', {}, 'auth');
    } else {
      logger.info('No password provided - creating SSO user', { ssoProvider }, 'auth');
    }

    logger.debug('Inserting user into database', { username, role }, 'auth');
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, sso_provider, sso_subject, must_change_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash, role, ssoProvider, ssoSubject, userData.mustChangePassword || false]
    );

    const newUser = result.rows[0];
    logger.info('User created successfully', { userId: newUser.id, username: newUser.username, role: newUser.role }, 'auth');
    return newUser;
  }

  async findUserByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    return result.rows[0];
  }

  async findUserById(id) {
    const result = await query(
      'SELECT id, username, email, role, created_at, last_login, must_change_password, sso_provider FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  }

  async findUserBySSO(provider, subject) {
    const result = await query(
      'SELECT * FROM users WHERE sso_provider = $1 AND sso_subject = $2 AND is_active = true',
      [provider, subject]
    );
    return result.rows[0];
  }

  // Authentication
  async authenticateLocal(username, password) {
    const user = await this.findUserByUsername(username);
    
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return user;
  }

  async authenticateSSO(provider, userData) {
    const { subject, username, email, attributes } = userData;
    
    // Try to find existing SSO user
    let user = await this.findUserBySSO(provider, subject);
    
    if (!user) {
      // Check if auto-creation is enabled
      const autoCreate = await this.getAuthSetting('sso_auto_create_users');
      if (autoCreate !== 'true') {
        throw new Error('User not found and auto-creation disabled');
      }

      // Auto-create user
      const defaultRole = await this.getAuthSetting('sso_default_role');
      user = await this.createUser({
        username: username || `sso_${subject}`,
        email: email,
        role: defaultRole || 'user',
        ssoProvider: provider,
        ssoSubject: subject
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return user;
  }

  // User management operations
  async getAllUsers() {
    const result = await query(
      'SELECT id, username, email, role, created_at, last_login, is_active, sso_provider FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async updateUser(id, updates) {
    const allowedFields = ['email', 'role', 'is_active'];
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING id, username, email, role, is_active`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (user.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, user.rows[0].password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHash = await this.hashPassword(newPassword);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, userId]
    );

    return true;
  }

  async deleteUser(id) {
    // Don't delete the last admin
    const adminCount = await query(
      'SELECT COUNT(*) FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );

    const userToDelete = await query('SELECT role FROM users WHERE id = $1', [id]);
    
    if (userToDelete.rows[0]?.role === 'admin' && parseInt(adminCount.rows[0].count) <= 1) {
      throw new Error('Cannot delete the last admin user');
    }

    const result = await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING username',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  // Settings management
  async getAuthSetting(key) {
    const result = await query('SELECT value FROM auth_settings WHERE key = $1', [key]);
    return result.rows[0]?.value;
  }

  async updateAuthSetting(key, value) {
    await query(
      'INSERT INTO auth_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
      [key, value]
    );
    return true;
  }

  async getAllAuthSettings() {
    const result = await query('SELECT key, value FROM auth_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  // First-run setup
  async isFirstRun() {
    const result = await query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count) === 0;
  }

  async createFirstAdminUser() {
    if (!(await this.isFirstRun())) {
      throw new Error('Admin user already exists');
    }

    logger.info('First run detected - creating default admin user', {}, 'auth');
    logger.warn('Creating default admin with temporary password - MUST CHANGE ON FIRST LOGIN', {}, 'auth');

    const admin = await this.createUser({
      username: 'admin',
      email: 'admin@localhost',
      password: 'admin',
      role: 'admin',
      mustChangePassword: true
    });

    logger.info('Default admin user created successfully', { userId: admin.id, username: admin.username }, 'auth');
    return admin;
  }

  // Role checking utilities
  hasRole(user, role) {
    return user.role === role;
  }

  async hasPermission(user, permission, resourceType = null, resourceId = null) {
    try {
      // Admin role always has all permissions
      if (user.role === 'admin') {
        return true;
      }

      // Check tag-based permissions for resource type
      if (resourceType) {
        const tagResult = await query(`
          SELECT permissions FROM tag_permissions 
          WHERE user_id = $1 AND tag_key = 'resource_type' AND tag_value = $2
        `, [user.id, resourceType]);

        if (tagResult.rows.length > 0) {
          const perms = tagResult.rows[0].permissions;
          if (perms[permission]) {
            return true;
          }
        }
      }

      // Check resource-specific permissions
      if (resourceId) {
        const resourceResult = await query(`
          SELECT permissions FROM resource_permissions 
          WHERE user_id = $1 AND resource_id = $2
        `, [user.id, resourceId]);

        if (resourceResult.rows.length > 0) {
          const perms = resourceResult.rows[0].permissions;
          if (perms[permission]) {
            return true;
          }
        }
      }

      // Fallback to role-based permissions
      const rolePermissions = {
        admin: ['read', 'write', 'control', 'admin'],
        user: ['read', 'write', 'control'],
        readonly: ['read']
      };

      return rolePermissions[user.role]?.includes(permission) || false;
    } catch (error) {
      logger.error('Permission check error', { error: error.message, userId: user?.id, permission, resourceType, resourceId }, 'auth');
      return false;
    }
  }

  async canAccessService(user, serviceType = 'service') {
    return await this.hasPermission(user, 'read', serviceType);
  }

  async canControlDocker(user) {
    return await this.hasPermission(user, 'control', 'docker');
  }

  // New method to check if user can manage specific resource
  async canManageResource(user, resourceType, action = 'write') {
    return await this.hasPermission(user, action, resourceType);
  }

  // Check if user has admin access to a resource type
  async canAdminResource(user, resourceType) {
    return await this.hasPermission(user, 'admin', resourceType);
  }
}

module.exports = new AuthService();