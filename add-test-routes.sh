#!/bin/bash
cd /home/zach/projects/docker-dashboard

# Add test routes to radarr routes.js
echo '
// Import test routes
const testRoutes = require("./testEndpoints");

// Mount test routes
router.use("/", testRoutes);
' >> backend/src/modules/radarr/routes.js

echo "Test routes added!"
docker-compose restart backend
