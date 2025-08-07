# PM Brain Transfer - Critical Session Context

**MUST UPLOAD TO EVERY NEW SESSION**

---

## 🧠 **ESSENTIAL CONTEXT FOR NEW AI**

### **Project Identity**
- **Name**: TaylorDex (Docker Dashboard)
- **Owner**: Zach (GitHub: 11bztaylor)
- **Location**: `/home/zach/projects/docker-dashboard`
- **Purpose**: Modular dashboard for 50+ containers

### **Current Session Results**
- **Date**: January 7, 2025
- **Focus**: Plex duplicate detection + safety improvements
- **Status**: ✅ COMPLETE - All features working, deletion disabled for safety

---

## 🔧 **CRITICAL TECHNICAL STATE**

### **Authentication Architecture**
```
✅ WORKING: JWT + RBAC system fully functional
✅ FIXED: ServiceRepository centralizes all service data access
✅ PATTERN: All API requests include Bearer tokens
✅ SECURITY: API keys properly stored and retrieved
```

### **Plex Duplicate Detection**
```
✅ WORKING: Background scanning every 24 hours at 3 AM
✅ CACHING: Results stored in database for instant display
✅ DETECTION: Multiple files + fuzzy matching (85% threshold)
❌ DISABLED: Deletion functionality (after data loss incident)
```

### **Service Integrations**
```
✅ Radarr/Sonarr: Full stats + configuration API
✅ Plex: Stats working, duplicates identification only
✅ qBittorrent: Fixed - use "username:password" in api_key
✅ Unraid: Docker container management working
✅ HomeAssistant: WebSocket real-time updates
```

---

## 📁 **MUST READ FILES**

Upload these FIRST in any new session:

1. **docs/ULTIMATE_AI_REQUIREMENTS.md** - Zach's specific work style
2. **docs/STANDARD_SESSION_RULES.md** - Session start/close patterns  
3. **docs/CURRENT_STATE.md** - What was just completed
4. **docs/TECHNICAL_CONTEXT.md** - Full technical stack details

---

## 🚨 **CRITICAL PATTERNS**

### **Zach's Work Style (NEVER FORGET)**
- Uses `cat >` for file creation (copy/paste ready)
- Needs full paths in ALL commands
- Visual learner - wants to see progress
- Commits after EVERY working feature
- No walls of text - actionable steps only

### **Code Patterns** 
- CommonJS in config files (`module.exports`)
- ServiceRepository for ALL database service queries
- JWT Bearer tokens in ALL authenticated requests
- No mock data generation anywhere in codebase
- qBittorrent uses "username:password" in api_key field

### **Session Pattern**
1. Start: `cd /home/zach/projects/docker-dashboard && pwd`
2. Work: Commit frequently with clear messages
3. Close: Update CURRENT_STATE.md, provide upload list

---

## 🔄 **RECENT CRITICAL DECISIONS**

### **Plex Deletion Disabled - January 7, 2025**
- **Problem**: Deletion removed ALL versions (lost Amazing Spider-Man)
- **Decision**: Disabled deletion entirely for safety
- **Current**: Identification-only mode
- **Future**: Need file-level operations, not Plex API

### **qBittorrent Authentication Fix**  
- **Problem**: Needed username/password, not API key
- **Solution**: Store as "username:password" in api_key field
- **Example**: api_key = "admin:adminpass"
- **Status**: ✅ WORKING

### **Background Scanning Implementation**
- **Feature**: Plex duplicates scan daily at 3 AM
- **Storage**: PostgreSQL tables cache results
- **Performance**: Instant display from cache
- **Detection**: Multiple files + fuzzy matching

---

## 🎯 **IMMEDIATE NEXT STEPS**

When you start the next session:

1. **Verify Services**: Check all services are running
2. **Test qBittorrent**: Confirm auth with username:password format
3. **Monitor Scheduler**: Verify 3 AM duplicate scans are running
4. **Safety First**: Keep Plex deletion disabled until safer method found

---

## 💾 **FILES TO UPLOAD NEXT SESSION**

**CRITICAL (Upload First):**
- docs/PM_BRAIN_TRANSFER.md (this file!)
- docs/ULTIMATE_AI_REQUIREMENTS.md
- docs/CURRENT_STATE.md  
- docs/TECHNICAL_CONTEXT.md

**Helpful Context:**
- docs/STANDARD_SESSION_RULES.md
- docs/DEVELOPMENT_WORKFLOW.md
- backend/src/modules/radarr/configService.js (new!)
- backend/src/modules/sonarr/configService.js (new!)

---

## 🏆 **SESSION SUCCESS SUMMARY**

- ✅ Plex duplicate detection with background scanning
- ✅ Database caching for performance
- ✅ Safety measures after data loss incident
- ✅ qBittorrent authentication fixed
- ✅ Radarr/Sonarr configuration APIs added
- ✅ UI cleaned up (removed confusing features)
- ✅ All changes committed to git

**Project is stable and safe for production use.**

---

## ⚠️ **WARNINGS & GOTCHAS**

1. **NEVER re-enable Plex deletion without complete redesign**
2. **qBittorrent needs "username:password" format in api_key**
3. **Background scheduler runs at 3 AM - check logs if issues**
4. **Some Plex servers don't have /duplicates endpoint**
5. **Always use ServiceRepository for database queries**
6. **🚨 GIT PUSH BLOCKED**: GitHub detects node_modules/ssh2 test key as secret
   - All changes are committed locally but NOT pushed to remote
   - Need to clean up node_modules from git history before pushing
   - Use: `git rm -r --cached backend/node_modules/` then commit and push

---

*Last Updated: January 7, 2025 - Session Close*