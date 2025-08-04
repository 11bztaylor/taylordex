# ULTIMATE AI Requirements - MUST READ FIRST!

## CRITICAL: How Zach Works

### FILE CREATION - ALWAYS USE cat >
# WRONG: Just showing code
# const example = "code";

# RIGHT: Using cat > so Zach can copy/paste
# cat > filename.js << 'EOF'
# const example = "code";
# EOF

### Zach's Specific Requirements
1. ALWAYS use cat > for file creation - He copy/pastes commands
2. Full paths in ALL commands - "I am terrible with remembering folder paths"
3. Commit often with descriptive messages - After EVERY working feature
4. Add debug logging - For anything that might need troubleshooting
5. Visual progress indicators - He's a visual learner
6. No walls of text - Break into actionable steps

### What Annoys Zach
- Asking about Docker experience (he has 50+ containers)
- Not using full paths
- Forgetting to make commands copy/paste ready
- Too many questions before action
- Not committing frequently

### Session Pattern
1. Start: cd /home/zach/projects/docker-dashboard && pwd
2. During: Show progress, commit often
3. End: Update CURRENT_STATE.md, list what to upload/save

### Technical Preferences
- Node.js (not Python)
- Modular architecture (if one breaks, others work)
- See it working ASAP, polish later
- Git for everything

### Communication Style
- Action over discussion
- Show don't tell
- If stuck, say why immediately
- Visual dashboards/progress bars

## Project Specifics

### TaylorDex Architecture
- Frontend: React + Tailwind (NVIDIA-green theme)
- Backend: Express + PostgreSQL
- Each service is isolated module
- Beautiful UI already built

### Current Backend Pattern
// Stats endpoint pattern (from ServiceCard work)
app.get('/api/:serviceType/:serviceId/stats', async (req, res) => {
  // Fetch from Radarr/Sonarr API
  // Return standardized stats
});

### Debug Requirements
- Add console.log for troubleshooting
- Error handling with clear messages
- Loading states in UI
- Connection test endpoints

## HANDOFF CHECKLIST
Before ending ANY session:
1. All changes committed to Git
2. CURRENT_STATE.md updated
3. List files user needs to save/upload
4. Clear next steps documented
5. Any new discoveries added to MASTER_INVENTORY.md

## CRITICAL: How PM Memory Works
1. These docs ARE the PM's brain - Without them, PM knows nothing
2. You MUST upload docs to each new session
3. Always commit docs before ending session
4. Check PM_BRAIN_TRANSFER.md for upload checklist

## Session Closeout REQUIREMENTS
EVERY session MUST end with:

### 1. Update Status Docs
# Update current state
cat > docs/CURRENT_STATE.md << 'INNEREOF'
[Updated content]
INNEREOF
git add docs/CURRENT_STATE.md
git commit -m "Update current state"

### 2. Provide Upload List
FILES TO UPLOAD NEXT SESSION:
- docs/PM_BRAIN_TRANSFER.md (CRITICAL!)
- docs/ULTIMATE_AI_REQUIREMENTS.md
- docs/CURRENT_STATE.md
- docs/TECHNICAL_CONTEXT.md
- [Other relevant docs]

### 3. Save Confirmation
Ask: "Did you save/commit all the docs? Ready for next session?"

## THE GOLDEN RULE
If it's not in a doc and uploaded, it DOESN'T EXIST for the next PM!
