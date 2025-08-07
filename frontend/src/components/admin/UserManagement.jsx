import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadUsers();
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      setError('Error deleting user');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'readonly': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-300">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-300">Manage users and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-medium text-white">Users ({users.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/20 divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">{user.username}</div>
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPermissionsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Permissions
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={user.role === 'admin'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadUsers();
            setShowCreateModal(false);
          }}
          token={token}
        />
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            loadUsers();
          }}
          token={token}
        />
      )}
    </div>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        console.error('User creation error:', data);
        let errorMsg = 'Failed to create user';
        
        if (data.error) {
          errorMsg = data.error;
        }
        if (data.details) {
          errorMsg += ` (${data.details})`;
        }
        if (data.code) {
          errorMsg += ` [${data.code}]`;
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Network error creating user:', err);
      setError('Network error: Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Create New User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="user@example.com (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="readonly">Read Only</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800 bg-gray-900"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Permissions Modal Component
const PermissionsModal = ({ user, onClose, onSuccess, token }) => {
  const [permissions, setPermissions] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    loadUserData();
  }, [user.id]);

  const loadUserData = async () => {
    try {
      const [permsRes, templatesRes, resourcesRes] = await Promise.all([
        fetch(`/api/users/${user.id}/permissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users/permission-templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/resources', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setPermissions(permsData.data);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data);
      }

      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData.data);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId, resourceType = '') => {
    try {
      const response = await fetch(`/api/users/${user.id}/apply-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId, resourceType })
      });

      if (response.ok) {
        loadUserData();
        onSuccess();
      }
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const formatPermissions = (perms) => {
    return Object.entries(perms)
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading permissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-white">Permissions for {user.username}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'current' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Current Permissions
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'templates' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Apply Templates
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'custom' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Custom Permissions
            </button>
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'current' && (
            <div className="space-y-6">
              {/* Tag Permissions */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Tag-Based Permissions</h4>
                {permissions?.tagPermissions?.length > 0 ? (
                  <div className="space-y-2">
                    {permissions.tagPermissions.map((perm, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{perm.tag_key}:</span>
                          <span className="text-blue-600">{perm.tag_value}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatPermissions(perm.permissions)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No tag-based permissions assigned</p>
                )}
              </div>

              {/* Resource Permissions */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Resource-Specific Permissions</h4>
                {permissions?.resourcePermissions?.length > 0 ? (
                  <div className="space-y-2">
                    {permissions.resourcePermissions.map((perm, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{perm.resource_name}</span>
                          <span className="text-sm text-gray-500 ml-2">({perm.resource_type})</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatPermissions(perm.permissions)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No resource-specific permissions assigned</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Apply permission templates to quickly grant common access patterns
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">{template.name}</h5>
                      {template.is_system && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Type: {template.resource_type || 'All'} | 
                      Permissions: {formatPermissions(template.permissions)}
                    </p>
                    <button
                      onClick={() => applyTemplate(template.id, template.resource_type)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700"
                    >
                      Apply Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              <CustomPermissionManager user={user} token={token} onUpdate={loadUserData} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Permission Manager Component
const CustomPermissionManager = ({ user, token, onUpdate }) => {
  const [newPermission, setNewPermission] = useState({
    type: 'tag', // 'tag' or 'resource'
    tagKey: 'resource_type',
    tagValue: 'service',
    permissions: {
      read: false,
      write: false,
      control: false,
      admin: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resourceTypes = [
    'service', 'docker', 'media', 'infrastructure', 
    'security', 'backup', 'monitoring', 'network'
  ];

  const handlePermissionChange = (permission, value) => {
    setNewPermission(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const grantPermission = async () => {
    if (!newPermission.tagValue || Object.values(newPermission.permissions).every(p => !p)) {
      setError('Please select a resource type and at least one permission');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}/permissions/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tagKey: newPermission.tagKey,
          tagValue: newPermission.tagValue,
          permissions: newPermission.permissions
        })
      });

      if (response.ok) {
        onUpdate();
        // Reset form
        setNewPermission({
          type: 'tag',
          tagKey: 'resource_type',
          tagValue: 'service',
          permissions: {
            read: false,
            write: false,
            control: false,
            admin: false
          }
        });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to grant permission');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const removePermission = async (tagKey, tagValue) => {
    try {
      const response = await fetch(`/api/users/${user.id}/permissions?type=tag&tagKey=${tagKey}&tagValue=${tagValue}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error removing permission:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Grant New Permission</h4>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              value={newPermission.tagValue}
              onChange={(e) => setNewPermission(prev => ({ ...prev, tagValue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="space-y-2">
              {Object.entries(newPermission.permissions).map(([perm, value]) => (
                <label key={perm} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handlePermissionChange(perm, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={grantPermission}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Granting...' : 'Grant Permission'}
        </button>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Current Permissions</h4>
        <div className="space-y-2">
          {user.permissions?.tagPermissions?.map((perm, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{perm.tag_key}:</span>
                <span className="text-blue-600 ml-1">{perm.tag_value}</span>
                <div className="text-sm text-gray-600 mt-1">
                  {Object.entries(perm.permissions)
                    .filter(([_, value]) => value)
                    .map(([key, _]) => key)
                    .join(', ')}
                </div>
              </div>
              <button
                onClick={() => removePermission(perm.tag_key, perm.tag_value)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          )) || (
            <p className="text-gray-500">No custom permissions set</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;