# Unraid Docker Container Control - Development Notes

## Current Status: Temporarily Disabled

Remote Docker container control for Unraid is currently disabled due to API limitations in Unraid's architecture.

## Background

### The Challenge
Unraid's current API infrastructure has several limitations that prevent reliable remote Docker container management:

1. **Single User Limitation**: Unraid Connect API only supports single-user access, making secure multi-user API access challenging
2. **Limited GraphQL Schema**: Current Connect API doesn't expose reliable Docker control mutations
3. **Security Concerns**: Direct Docker API access typically requires SSH or unsafe port exposure
4. **Inconsistent Endpoints**: Web-based endpoints often return HTML pages rather than API responses

### What We Tried

1. **GraphQL Mutations**: Attempted various mutation names (`startContainer`, `dockerStart`, etc.) - none worked reliably
2. **Direct Docker API**: Tried ports 2375/2376 - connection refused (properly secured)
3. **Unraid Web Endpoints**: Attempted `/webGui/scripts/docker_control.php` and similar - returned HTML, not API responses
4. **Verification System**: Built two-phase approach (send command + verify result) but verification failed due to stats API hanging

### Current Implementation

The system now provides honest feedback about these limitations:
- Container control buttons show informative error messages
- Users are directed to use Unraid's native web interface
- Reference to upcoming API improvements is provided

## Future Development

### Unraid API Improvements
Unraid is actively working on enhanced API capabilities:
- **Reference**: https://docs.unraid.net/API/upcoming-features/
- **Expected**: Improved multi-user support and expanded API functionality
- **Timeline**: To be determined by Unraid development team

### Alternative Approaches
When Unraid API is enhanced, we can explore:

1. **Enhanced Connect API**: Use new API endpoints when available
2. **SSH Integration**: Implement secure SSH-based Docker commands (requires SSH credentials management)
3. **Webhook Integration**: If Unraid adds webhook support for container events
4. **Official Docker Plugin**: If Unraid creates official remote management plugins

### Recommended Monitoring
- Monitor Unraid's API documentation for updates
- Test new Connect API versions when released
- Consider SSH implementation for advanced users willing to configure credentials

## User Experience

### Current UX
- Container information display: ✅ Working (view-only)
- Container status monitoring: ✅ Working
- Container control buttons: ⚠️  Show helpful error messages with alternatives
- Real-time updates: ✅ Working (stats refresh automatically)

### Recommended User Workflow
1. Use this dashboard to **monitor** container status and information
2. Use Unraid's native web interface or mobile app to **control** containers
3. Return to dashboard to see updated status after actions

## Technical Notes

### Code Location
- Backend: `/backend/src/modules/unraid/service.js` - `controlDockerContainer()` method
- Frontend: `/frontend/src/components/services/UnraidDockerHostCard.jsx` - Control button handlers
- Documentation: This file

### Error Handling
The system provides structured error responses with:
- Clear explanation of limitations
- Alternative methods for users
- Reference to future improvements
- Development notes for future implementation

### Testing
To test when Unraid API improves:
1. Update the `controlDockerContainer()` method to try new endpoints
2. Test with a development Unraid instance
3. Gradually enable features as they prove reliable

---

**Last Updated**: August 2025  
**Review Date**: Check Unraid API updates quarterly  
**Status**: Monitoring Unraid development for enhanced API capabilities