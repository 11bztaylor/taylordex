# 🧠 PM BRAIN TRANSFER - CRITICAL!

## THIS IS HOW THE PM REMEMBERS!!!

### The PM (me) has NO MEMORY between sessions!
These documents ARE my brain. Without them uploaded to the next session, I know NOTHING!

## MANDATORY UPLOAD CHECKLIST
When starting ANY new session, you MUST upload these files:

### Core Brain Files (ALWAYS UPLOAD):
1. ✅ `docs/PM_BRAIN_TRANSFER.md` (THIS FILE!)
2. ✅ `docs/ULTIMATE_AI_REQUIREMENTS.md` - How you work
3. ✅ `docs/CURRENT_STATE.md` - What's built/broken
4. ✅ `docs/TECHNICAL_CONTEXT.md` - All paths/structure

### Situational Files (UPLOAD AS NEEDED):
- For UI work: `docs/DESIGN_SYSTEM.md`
- For backend: `docs/RADARR_BACKEND_INTEGRATION.md`
- For new services: `docs/homelab/MASTER_INVENTORY.md`

## THE PROCESS - NEVER SKIP!

1. **END of session**: PM writes updates to local files
2. **You run**: `git add` and `git commit` and `git push`
3. **NEXT session**: You UPLOAD these files to new AI
4. **New AI/PM**: Has all the memory/context!

## WHAT HAPPENS IF YOU FORGET?
- AI won't know about `cat >` requirement
- AI won't know about your quirks
- AI will ask stupid questions
- You'll repeat explanations
- Progress will be LOST!

## Session Close MUST Include:
"📎 **FILES TO UPLOAD NEXT SESSION:**
- docs/PM_BRAIN_TRANSFER.md
- docs/ULTIMATE_AI_REQUIREMENTS.md  
- docs/CURRENT_STATE.md
- docs/TECHNICAL_CONTEXT.md
- [Any other relevant files]"

## Remember: NO UPLOAD = NO MEMORY!

## Latest Session Updates (August 4, 2025)

### New Service Modules:
- backend/src/modules/lidarr/ - Music service
- backend/src/modules/plex/ - Media server  
- backend/src/modules/prowlarr/ - Indexer manager

### Critical Learning:
- ALWAYS create routes.js or backend crashes!
- Test each service before committing
- Never use sudo for git operations

### Documentation Created:
- ADDING_NEW_SERVICES.md - Complete integration guide
- Backend template now has full instructions

## Latest Session Updates (August 4, 2025 - Evening)

### Logo Integration:
- Added custom TDX_Night.png and TDX_Day.png (1.4MB each)
- Updated Header to show logo + gradient text (green→yellow)
- Logo optimization needed (currently 1024x1024)

### Files Modified:
- frontend/src/components/layout/Header.jsx
- frontend/public/TDX_Night.png (new)
- frontend/public/TDX_Day.png (new)

### Next Priority:
- Optimize logos (resize to ~120px)
- Add theme switching
- Continue service integrations

## Latest Session Updates (August 4, 2025 - Evening Session #2)

### Major Achievement: Enhanced Data Collection System
- Built comprehensive data collection for all 4 services
- Status Dashboard now has 3 views: Overview, Activity, Performance
- Fixed Radarr queue parsing (was showing "Unknown" titles)
- All services collecting 10x more useful data

### Technical Implementation:
- Each service module enhanced with parallel API calls
- Modular DataCollector utility created
- Graceful error handling throughout
- 30-second auto-refresh on all data

### What Works:
- Radarr: Full queue details, recent additions, quality breakdown
- Sonarr: Basic enhanced stats (needs queue fix)
- Plex: Would show streams/bandwidth (needs token)
- Prowlarr: Full indexer performance metrics

### Next Session Priority:
- Fix Sonarr queue title parsing (showing undefined)
- Add Sonarr calendar/schedule features
- Get Plex working with proper token
- Implement comprehensive status API endpoint

### Files Modified This Session:
- backend/src/modules/*/service.js (all services)
- frontend/src/components/status/StatusTab.jsx
- backend/src/utils/dataCollector.js (new)
- docs/DRAG_AND_DROP_DASHBOARD_CUSTOM_PLAN.md (new)
