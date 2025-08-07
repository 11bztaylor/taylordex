#!/bin/bash
# TaylorDex File Permission and Cleanup Script

echo "🔧 Fixing file permissions and cleaning up redundant files..."

# Fix ownership of Aiderp directory and files
echo "📝 Fixing ownership of Aiderp files..."
sudo chown -R zach:zach /home/zach/projects/Aiderp/

# Remove redundant files
echo "🗑️  Removing redundant documentation files..."
cd /home/zach/projects/Aiderp/docs/

if [ -f "AI_Communication_Protocol_Guide.md" ]; then
    echo "   Removing AI_Communication_Protocol_Guide.md (duplicate)"
    rm AI_Communication_Protocol_Guide.md
fi

if [ -f "Project_Documentation_For_AI_Handoff.md" ]; then
    echo "   Removing Project_Documentation_For_AI_Handoff.md (consolidated/redundant)"  
    rm Project_Documentation_For_AI_Handoff.md
fi

# Fix permissions on all remaining files
echo "🔐 Setting proper file permissions..."
find /home/zach/projects/Aiderp -type f -name "*.md" -exec chmod 644 {} \;
find /home/zach/projects/Aiderp -type d -exec chmod 755 {} \;

# Fix ownership on all project files
echo "👤 Ensuring zach owns all project files..."
sudo chown -R zach:zach /home/zach/projects/docker-dashboard/
sudo chown -R zach:zach /home/zach/projects/Aiderp/

echo "✅ Cleanup complete!"
echo ""
echo "📊 Remaining files in /home/zach/projects/Aiderp/docs/:"
ls -la /home/zach/projects/Aiderp/docs/
echo ""
echo "🎯 Files removed:"
echo "   - AI_Communication_Protocol_Guide.md (was duplicate of AI_COMMUNICATION_PROTOCOL.md)"
echo "   - Project_Documentation_For_AI_Handoff.md (was massive consolidated file, now redundant)"
echo ""
echo "📚 Core framework files are now in /home/zach/projects/Aiderp/:"
echo "   - BREAKING_CHANGES_ANALYSIS.md"
echo "   - SYSTEM_ARCHITECTURE_CURRENT.md" 
echo "   - FEATURE_PLANNING_FRAMEWORK.md"
echo "   - DEVELOPMENT_WORKFLOW_TESTING.md"
echo "   - PROJECT_ROADMAP_MILESTONES.md"
echo "   - PROJECT_MANAGEMENT_MASTER.md"
echo "   - STRUCTURAL_OVERHAUL_PLAN.md"
echo "   - CRITICAL_CODE_FIXES.md"
echo "   - QUICK_ACTION_GUIDE.md"
echo ""
echo "⚙️  Technology decisions documented in:"
echo "   - /home/zach/projects/docker-dashboard/docs/STABILIZATION_STRATEGY.md"
echo "   - /home/zach/projects/docker-dashboard/docs/TECHNOLOGY_DECISIONS.md"