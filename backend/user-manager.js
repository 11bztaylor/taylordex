#!/usr/bin/env node

const { query } = require('./src/database/connection');
const authService = require('./src/auth/authService');
const logger = require('./src/utils/logger');

class UserManager {
  
  async listUsers() {
    try {
      const users = await authService.getAllUsers();
      console.log('\n👥 Users in System:');
      console.log('==================');
      
      for (const user of users) {
        console.log(`\n🧑 ${user.username} (ID: ${user.id})`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🎭 Role: ${user.role}`);
        console.log(`   ✅ Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`   🕐 Created: ${user.created_at?.toISOString()?.split('T')[0] || 'Unknown'}`);
        console.log(`   🕐 Last Login: ${user.last_login?.toISOString()?.split('T')[0] || 'Never'}`);
        
        // Get permissions summary
        const perms = await this.getUserPermissionsSummary(user.id);
        console.log(`   🏷️  Tag Permissions: ${perms.tagPermissions.length}`);
        console.log(`   📦 Resource Permissions: ${perms.resourcePermissions.length}`);
      }
      
      console.log(`\nTotal Users: ${users.length}\n`);
    } catch (error) {
      console.error('❌ Error listing users:', error.message);
      logger.error('User manager: Error listing users', { error: error.message }, 'user-management');
    }
  }

  async createUser(username, email, password, role = 'user') {
    try {
      console.log(`\n🔨 Creating user: ${username}`);
      
      const newUser = await authService.createUser({
        username,
        email,
        password,
        role
      });

      // Grant default permissions
      await this.grantDefaultPermissions(newUser.id, role);

      console.log(`✅ User created successfully!`);
      console.log(`   👤 Username: ${newUser.username}`);
      console.log(`   📧 Email: ${newUser.email}`);
      console.log(`   🎭 Role: ${newUser.role}`);
      console.log(`   🆔 ID: ${newUser.id}`);
      
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      logger.error('User manager: Error creating user', { error: error.message, username }, 'user-management');
    }
  }

  async deleteUser(identifier) {
    try {
      // Find user by username or ID
      const user = await this.findUser(identifier);
      if (!user) {
        console.log('❌ User not found');
        return;
      }

      const deletedUser = await authService.deleteUser(user.id);
      console.log(`✅ User "${deletedUser.username}" deleted successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
      logger.error('User manager: Error deleting user', { error: error.message, identifier }, 'user-management');
    }
  }

  async showUserPermissions(identifier) {
    try {
      const user = await this.findUser(identifier);
      if (!user) {
        console.log('❌ User not found');
        return;
      }

      console.log(`\n🔐 Permissions for ${user.username}:`);
      console.log('=====================================');
      
      const perms = await this.getUserPermissionsSummary(user.id);

      // Show tag-based permissions
      if (perms.tagPermissions.length > 0) {
        console.log('\n🏷️  Tag-Based Permissions:');
        perms.tagPermissions.forEach(perm => {
          const permList = Object.entries(perm.permissions)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)
            .join(', ');
          console.log(`   ${perm.tag_key}:${perm.tag_value} → ${permList}`);
        });
      }

      // Show resource-specific permissions
      if (perms.resourcePermissions.length > 0) {
        console.log('\n📦 Resource-Specific Permissions:');
        perms.resourcePermissions.forEach(perm => {
          const permList = Object.entries(perm.permissions)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)
            .join(', ');
          console.log(`   ${perm.resource_name} (${perm.resource_type}) → ${permList}`);
        });
      }

      if (perms.tagPermissions.length === 0 && perms.resourcePermissions.length === 0) {
        console.log('\n⚠️  No explicit permissions found. Using role-based defaults.');
      }

      console.log('\n');
      
    } catch (error) {
      console.error('❌ Error showing user permissions:', error.message);
      logger.error('User manager: Error showing user permissions', { error: error.message, identifier }, 'user-management');
    }
  }

  async grantTagPermission(identifier, tagKey, tagValue, permissions) {
    try {
      const user = await this.findUser(identifier);
      if (!user) {
        console.log('❌ User not found');
        return;
      }

      const adminUser = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const grantedBy = adminUser.rows[0]?.id || user.id;

      await query(`
        INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, tag_key, tag_value) 
        DO UPDATE SET 
          permissions = EXCLUDED.permissions,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [user.id, tagKey, tagValue, JSON.stringify(permissions), grantedBy]);

      console.log(`✅ Granted ${tagKey}:${tagValue} permissions to ${user.username}`);
      console.log(`   Permissions: ${Object.entries(permissions).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Error granting tag permission:', error.message);
      logger.error('User manager: Error granting tag permission', { error: error.message, identifier, tagKey, tagValue }, 'user-management');
    }
  }

  async grantResourcePermission(identifier, resourceName, permissions) {
    try {
      const user = await this.findUser(identifier);
      if (!user) {
        console.log('❌ User not found');
        return;
      }

      // Find resource by name
      const resourceResult = await query('SELECT id, name, type FROM resources WHERE name ILIKE $1 LIMIT 1', [`%${resourceName}%`]);
      if (resourceResult.rows.length === 0) {
        console.log('❌ Resource not found');
        return;
      }

      const resource = resourceResult.rows[0];
      const adminUser = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const grantedBy = adminUser.rows[0]?.id || user.id;

      await query(`
        INSERT INTO resource_permissions (user_id, resource_id, permissions, granted_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, resource_id)
        DO UPDATE SET 
          permissions = EXCLUDED.permissions,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [user.id, resource.id, JSON.stringify(permissions), grantedBy]);

      console.log(`✅ Granted permissions to ${user.username} for resource "${resource.name}"`);
      console.log(`   Permissions: ${Object.entries(permissions).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Error granting resource permission:', error.message);
      logger.error('User manager: Error granting resource permission', { error: error.message, identifier, resourceName }, 'user-management');
    }
  }

  async listTemplates() {
    try {
      const result = await query('SELECT * FROM role_templates ORDER BY is_system DESC, name ASC');
      
      console.log('\n📋 Permission Templates:');
      console.log('========================');
      
      result.rows.forEach(template => {
        console.log(`\n🎭 ${template.name} ${template.is_system ? '(System)' : '(Custom)'}`);
        console.log(`   📝 ${template.description}`);
        console.log(`   🎯 Resource Type: ${template.resource_type || 'All'}`);
        
        const permList = Object.entries(template.permissions)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
          .join(', ');
        console.log(`   🔐 Permissions: ${permList}`);
      });
      
      console.log('\n');
      
    } catch (error) {
      console.error('❌ Error listing templates:', error.message);
      logger.error('User manager: Error listing templates', { error: error.message }, 'user-management');
    }
  }

  async applyTemplate(identifier, templateName, resourceType = null) {
    try {
      const user = await this.findUser(identifier);
      if (!user) {
        console.log('❌ User not found');
        return;
      }

      const templateResult = await query('SELECT * FROM role_templates WHERE name ILIKE $1 LIMIT 1', [`%${templateName}%`]);
      if (templateResult.rows.length === 0) {
        console.log('❌ Template not found');
        return;
      }

      const template = templateResult.rows[0];
      const adminUser = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const grantedBy = adminUser.rows[0]?.id || user.id;
      
      const targetResourceType = template.resource_type || resourceType || 'service';

      await query(`
        INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
        VALUES ($1, 'resource_type', $2, $3, $4)
        ON CONFLICT (user_id, tag_key, tag_value)
        DO UPDATE SET 
          permissions = EXCLUDED.permissions,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [user.id, targetResourceType, JSON.stringify(template.permissions), grantedBy]);

      console.log(`✅ Applied template "${template.name}" to ${user.username}`);
      console.log(`   Resource Type: ${targetResourceType}`);
      console.log(`   Permissions: ${Object.entries(template.permissions).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Error applying template:', error.message);
      logger.error('User manager: Error applying template', { error: error.message, identifier, templateName, resourceType }, 'user-management');
    }
  }

  async showHelp() {
    console.log(`
🔧 TaylorDx User Management Tool
==============================

Usage: node user-manager.js <command> [options]

Commands:
  list                           - List all users
  create <user> <email> <pass>   - Create new user (default role: user)
  create <user> <email> <pass> <role> - Create new user with specific role
  delete <user>                  - Delete user (by username or ID)  
  permissions <user>             - Show user permissions
  grant-tag <user> <key> <val> <perms> - Grant tag-based permissions
  grant-resource <user> <name> <perms> - Grant resource permissions
  templates                      - List permission templates
  apply <user> <template> [type] - Apply permission template
  help                          - Show this help

Roles: admin, user, readonly

Permission Format (JSON): '{"read":true,"write":false,"control":true,"admin":false}'

Examples:
  node user-manager.js list
  node user-manager.js create john john@example.com mypass123
  node user-manager.js create jane jane@example.com secret admin
  node user-manager.js permissions john
  node user-manager.js grant-tag john resource_type media '{"read":true,"write":true}'
  node user-manager.js grant-resource john "Home Assistant" '{"read":true,"control":true}'
  node user-manager.js templates
  node user-manager.js apply john MediaAdmin

Quick Setup Examples:
  # Give user full access to all media services
  node user-manager.js grant-tag john category media '{"read":true,"write":true,"control":true}'
  
  # Give user read-only access to infrastructure
  node user-manager.js grant-tag john category infrastructure '{"read":true}'
  
  # Give user control over specific service
  node user-manager.js grant-resource john Plex '{"read":true,"write":true,"control":true}'
`);
  }

  // Helper methods

  async findUser(identifier) {
    try {
      // Try to find by ID first
      if (!isNaN(identifier)) {
        return await authService.findUserById(parseInt(identifier));
      }
      
      // Try to find by username
      return await authService.findUserByUsername(identifier);
    } catch (error) {
      return null;
    }
  }

  async getUserPermissionsSummary(userId) {
    try {
      const tagPermsResult = await query(`
        SELECT tag_key, tag_value, permissions, granted_at, granted_by
        FROM tag_permissions 
        WHERE user_id = $1
        ORDER BY tag_key, tag_value
      `, [userId]);

      const resourcePermsResult = await query(`
        SELECT rp.resource_id, rp.permissions, rp.granted_at, rp.granted_by,
               r.name as resource_name, r.type as resource_type
        FROM resource_permissions rp
        JOIN resources r ON rp.resource_id = r.id
        WHERE rp.user_id = $1
        ORDER BY r.name
      `, [userId]);

      return {
        tagPermissions: tagPermsResult.rows,
        resourcePermissions: resourcePermsResult.rows
      };
    } catch (error) {
      return { tagPermissions: [], resourcePermissions: [] };
    }
  }

  async grantDefaultPermissions(userId, role) {
    try {
      let permissions;
      
      switch (role) {
        case 'admin':
          permissions = { read: true, write: true, control: true, admin: true };
          break;
        case 'user':
          permissions = { read: true, write: true, control: true, admin: false };
          break;
        case 'readonly':
          permissions = { read: true, write: false, control: false, admin: false };
          break;
        default:
          permissions = { read: true, write: false, control: false, admin: false };
      }

      const adminUser = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const grantedBy = adminUser.rows[0]?.id || userId;

      await query(`
        INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
        VALUES ($1, 'resource_type', 'service', $2, $3)
        ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING
      `, [userId, JSON.stringify(permissions), grantedBy]);
      
    } catch (error) {
      console.error('Warning: Could not grant default permissions:', error.message);
      logger.warn('User manager: Could not grant default permissions', { error: error.message, userId, role }, 'user-management');
    }
  }
}

async function main() {
  const manager = new UserManager();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        await manager.listUsers();
        break;

      case 'create':
        if (args.length < 3) {
          console.log('❌ Usage: create <username> <password> [email] [role]');
          console.log('   Email is optional, use empty string "" to skip');
          process.exit(1);
        }
        const username = args[1];
        const password = args[2];
        const email = args[3] && args[3] !== '' ? args[3] : null;
        const role = args[4] || 'user';
        await manager.createUser(username, email, password, role);
        break;

      case 'delete':
        if (args.length < 2) {
          console.log('❌ Usage: delete <username_or_id>');
          process.exit(1);
        }
        await manager.deleteUser(args[1]);
        break;

      case 'permissions':
        if (args.length < 2) {
          console.log('❌ Usage: permissions <username_or_id>');
          process.exit(1);
        }
        await manager.showUserPermissions(args[1]);
        break;

      case 'grant-tag':
        if (args.length < 5) {
          console.log('❌ Usage: grant-tag <user> <tag_key> <tag_value> <permissions_json>');
          process.exit(1);
        }
        const tagPermissions = JSON.parse(args[4]);
        await manager.grantTagPermission(args[1], args[2], args[3], tagPermissions);
        break;

      case 'grant-resource':
        if (args.length < 4) {
          console.log('❌ Usage: grant-resource <user> <resource_name> <permissions_json>');
          process.exit(1);
        }
        const resourcePermissions = JSON.parse(args[3]);
        await manager.grantResourcePermission(args[1], args[2], resourcePermissions);
        break;

      case 'templates':
        await manager.listTemplates();
        break;

      case 'apply':
        if (args.length < 3) {
          console.log('❌ Usage: apply <user> <template_name> [resource_type]');
          process.exit(1);
        }
        await manager.applyTemplate(args[1], args[2], args[3]);
        break;

      case 'help':
      default:
        await manager.showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    logger.error('User manager: Command failed', { error: error.message, command: args[0], args }, 'user-management');
    process.exit(1);
  }

  process.exit(0);
}

main();