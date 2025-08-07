/**
 * TEMPORARY TEST ROUTES - REMOVE IN PRODUCTION
 * These routes are for testing purposes only
 */
const express = require('express');
const router = express.Router();
const authService = require('./authService');
const logger = require('../utils/logger');

// TEMPORARY: Create test user for debugging
router.post('/create-test-user', async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Add extra security check
  if (!req.headers['x-debug-key'] || req.headers['x-debug-key'] !== 'dev-only-2024') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const username = 'testadmin';
    const password = 'testpass123';
    const email = 'test@test.com';
    const role = 'admin';

    // Check if user already exists
    const existingUser = await authService.findUserByUsername(username);
    if (existingUser) {
      // Return token for existing user instead
      const token = authService.generateToken(existingUser);
      return res.json({
        success: true,
        message: 'Test user already exists',
        token,
        user: { id: existingUser.id, username: existingUser.username, role: existingUser.role }
      });
    }

    // Create user
    const user = await authService.createUser({ username, email, password, role });
    const token = authService.generateToken(user);

    logger.info(`Test user created: ${username}`, { userId: user.id }, 'auth');

    res.json({
      success: true,
      message: 'Test user created successfully',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    logger.error('Failed to create test user', { error: error.message }, 'auth');
    res.status(500).json({
      success: false,
      error: 'Failed to create test user'
    });
  }
});

module.exports = router;