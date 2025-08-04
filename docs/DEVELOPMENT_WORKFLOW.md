# Development Workflow

## Adding New Modules
1. Create module folder: backend/src/modules/[service-name]
2. Copy template structure from existing module
3. Update integration config
4. Test in isolation
5. Add to main dashboard

## Git Workflow
- Main branch for stable code
- Feature branches for new modules
- Commit often with clear messages

## Testing
- Each module tested independently
- Integration tests for full system
- Manual testing via Docker Compose

## Permission Issues

If you get "insufficient permission" errors with git:

1. Never use sudo for git operations
2. Fix ownership if needed:
   sudo chown -R zach:zach /home/zach/projects/docker-dashboard

3. Always work as your regular user (zach) for development
