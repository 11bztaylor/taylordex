# User-Customizable Dashboard System
## Drag-and-Drop Interface with Resource-Based Widgets

### Overview

The unified resource architecture enables powerful user-customizable dashboards where users can drag-and-drop **resource-based widgets** to create personalized views. Each user sees only resources they have access to, with widgets that adapt to their permission levels.

## Dashboard Architecture

### 1. Widget-Based System
```
Dashboard = Collection of Widgets
Widget = Visual representation of Resource(s)
Resource = Any manageable entity (service, container, API, etc.)
```

### 2. Widget Types by Resource
```
Service Widgets:
├── Status Card (health, uptime, version)
├── Control Panel (start/stop/restart buttons)  
├── Stats Chart (CPU, memory, requests)
├── Quick Actions (custom API calls)
└── Live Feed (logs, events, notifications)

Container Widgets:
├── Container Status Grid
├── Resource Usage Charts
├── Port Mapping Display
├── Log Viewer
└── Docker Compose Stack View

VM Widgets:
├── VM Status Cards
├── Performance Metrics
├── Snapshot Management
├── Console Access
└── Resource Allocation Charts

API Widgets:
├── Response Time Charts
├── Status Code Distribution
├── Custom Data Displays
├── Webhook Event Log
└── Rate Limiting Status

Device Widgets:
├── Network Topology Map
├── Port Status Display
├── SNMP Metrics
├── Device Health Grid
└── Alert Summary
```

## Database Schema Extension

### Dashboard Configuration
```sql
-- User dashboard layouts
CREATE TABLE user_dashboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL, -- Grid layout configuration
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Dashboard widgets
CREATE TABLE dashboard_widgets (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER REFERENCES user_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(100) NOT NULL, -- 'resource-status', 'chart', 'control-panel', etc.
  widget_config JSONB NOT NULL,      -- Widget-specific configuration
  
  -- Grid position
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  grid_width INTEGER NOT NULL DEFAULT 1,
  grid_height INTEGER NOT NULL DEFAULT 1,
  
  -- Resource references
  resource_ids INTEGER[] DEFAULT '{}', -- Array of resource IDs this widget displays
  resource_tags JSONB DEFAULT '{}',    -- Tag-based resource selection
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget templates (pre-built widgets users can add)
CREATE TABLE widget_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  widget_type VARCHAR(100) NOT NULL,
  default_config JSONB NOT NULL,
  required_permissions JSONB DEFAULT '{}', -- What permissions needed to use
  resource_types VARCHAR(50)[], -- What resource types this widget supports
  preview_image VARCHAR(500),
  category VARCHAR(100) DEFAULT 'general', -- 'monitoring', 'control', 'media', etc.
  is_system BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id)
);

-- Dashboard themes
CREATE TABLE dashboard_themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  config JSONB NOT NULL, -- Colors, fonts, spacing, etc.
  is_system BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id)
);
```

### Widget Templates Examples
```sql
INSERT INTO widget_templates (name, description, widget_type, default_config, required_permissions, resource_types, category) VALUES
-- Service widgets
('Service Status Card', 'Shows service health, uptime, and basic info', 'service-status', 
  '{"showUptime": true, "showVersion": true, "showHealth": true, "refreshInterval": 30}',
  '{"read": true}', 
  ARRAY['service'], 'monitoring'),

('Service Control Panel', 'Start/stop/restart controls for services', 'service-control',
  '{"showLogs": true, "showStats": false, "confirmActions": true}',
  '{"control": true}',
  ARRAY['service'], 'control'),

-- Docker widgets  
('Container Grid', 'Grid view of container statuses', 'container-grid',
  '{"columns": 4, "showPorts": true, "showImages": false}',
  '{"read": true}',
  ARRAY['docker'], 'monitoring'),

('Docker Stats Chart', 'Real-time container resource usage', 'docker-stats',
  '{"metrics": ["cpu", "memory"], "timeRange": "1h", "refreshInterval": 15}',
  '{"read": true}',
  ARRAY['docker'], 'monitoring'),

-- VM widgets
('VM Status Grid', 'Virtual machine status overview', 'vm-grid',
  '{"showSpecs": true, "showSnapshots": false, "groupByHost": true}',
  '{"read": true}',
  ARRAY['vm'], 'monitoring'),

-- Custom widgets
('Quick Actions', 'Custom API call buttons', 'quick-actions',
  '{"buttons": [], "confirmDangerous": true, "showResults": true}',
  '{"control": true}',
  ARRAY['service', 'docker', 'vm', 'api'], 'control'),

('Resource Chart', 'Generic metrics chart for any resource', 'generic-chart',
  '{"chartType": "line", "metrics": [], "timeRange": "6h"}',
  '{"read": true}',
  ARRAY['service', 'docker', 'vm', 'device'], 'monitoring');
```

## Frontend Implementation

### 1. React Grid Layout with Resource Awareness
```javascript
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

const CustomizableDashboard = () => {
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Filter resources based on user permissions
  const accessibleResources = availableResources.filter(resource => 
    userPermissions.canAccess(resource.id, 'read')
  );

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    saveDashboardLayout(dashboardId, newLayout);
  };

  return (
    <div className="customizable-dashboard">
      <DashboardHeader 
        onEditModeToggle={setIsEditMode}
        onAddWidget={() => setShowWidgetLibrary(true)}
        onThemeChange={setTheme}
      />
      
      {isEditMode && (
        <WidgetToolbox 
          templates={widgetTemplates}
          resources={accessibleResources}
          onWidgetAdd={addWidget}
        />
      )}

      <GridLayout
        className="dashboard-grid"
        layout={layout}
        onLayoutChange={handleLayoutChange}
        cols={12}
        rowHeight={60}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
      >
        {widgets.map(widget => (
          <div key={widget.id} className="widget-container">
            <DynamicWidget 
              widget={widget}
              resources={getWidgetResources(widget)}
              permissions={userPermissions}
              editMode={isEditMode}
              onConfigChange={(config) => updateWidget(widget.id, config)}
              onRemove={() => removeWidget(widget.id)}
            />
          </div>
        ))}
      </GridLayout>

      {showWidgetLibrary && (
        <WidgetLibrary
          templates={widgetTemplates}
          resources={accessibleResources}
          onAddWidget={addWidgetFromTemplate}
          onClose={() => setShowWidgetLibrary(false)}
        />
      )}
    </div>
  );
};
```

### 2. Dynamic Widget System
```javascript
const DynamicWidget = ({ widget, resources, permissions, editMode }) => {
  const WidgetComponent = getWidgetComponent(widget.type);
  
  return (
    <div className={`widget widget-${widget.type}`}>
      {editMode && (
        <WidgetEditControls
          widget={widget}
          onConfigure={() => setShowConfig(true)}
          onRemove={onRemove}
        />
      )}
      
      <WidgetComponent
        config={widget.config}
        resources={resources}
        permissions={permissions}
      />
      
      {showConfig && (
        <WidgetConfigModal
          widget={widget}
          availableResources={resources}
          onSave={onConfigChange}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
};

// Widget components
const ServiceStatusWidget = ({ config, resources, permissions }) => {
  const [stats, setStats] = useState({});
  
  return (
    <div className="service-status-widget">
      <h3>{resources[0]?.name}</h3>
      <div className="status-indicators">
        <StatusBadge status={stats.health} />
        {config.showUptime && <Uptime value={stats.uptime} />}
        {config.showVersion && <Version value={stats.version} />}
      </div>
      
      {permissions.canAccess(resources[0]?.id, 'control') && (
        <QuickActions resource={resources[0]} />
      )}
    </div>
  );
};

const ContainerGridWidget = ({ config, resources, permissions }) => {
  const containers = resources.filter(r => r.type === 'docker');
  
  return (
    <div className="container-grid-widget">
      <div className={`container-grid cols-${config.columns}`}>
        {containers.map(container => (
          <ContainerCard
            key={container.id}
            container={container}
            showPorts={config.showPorts}
            showImages={config.showImages}
            canControl={permissions.canAccess(container.id, 'control')}
          />
        ))}
      </div>
    </div>
  );
};
```

### 3. Widget Library & Template System
```javascript
const WidgetLibrary = ({ templates, resources, onAddWidget }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResources, setSelectedResources] = useState([]);
  
  const filteredTemplates = templates.filter(template => {
    if (selectedCategory === 'all') return true;
    return template.category === selectedCategory;
  });

  const handleAddWidget = (template) => {
    const widget = {
      id: generateId(),
      type: template.widget_type,
      config: { ...template.default_config },
      resource_ids: selectedResources.map(r => r.id),
      grid_width: template.default_width || 2,
      grid_height: template.default_height || 2
    };
    
    onAddWidget(widget);
  };

  return (
    <div className="widget-library">
      <div className="library-sidebar">
        <h3>Widget Categories</h3>
        <CategoryList
          categories={getCategories(templates)}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        
        <h3>Available Resources</h3>
        <ResourceSelector
          resources={resources}
          selected={selectedResources}
          onSelectionChange={setSelectedResources}
          multiSelect={true}
        />
      </div>
      
      <div className="library-main">
        <div className="template-grid">
          {filteredTemplates.map(template => (
            <WidgetTemplate
              key={template.id}
              template={template}
              canUse={checkPermissions(template.required_permissions)}
              onAdd={() => handleAddWidget(template)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 4. Advanced Features

#### Resource Relationship Widgets
```javascript
// Show related resources automatically
const ServiceEcosystemWidget = ({ primaryResource }) => {
  // Automatically find related resources
  const relatedContainers = findResourcesByTag('service_name', primaryResource.name);
  const relatedAPIs = findResourcesByTag('depends_on', primaryResource.id);
  
  return (
    <div className="ecosystem-widget">
      <ServiceCard service={primaryResource} />
      <RelatedResources containers={relatedContainers} apis={relatedAPIs} />
    </div>
  );
};
```

#### Smart Widget Suggestions
```javascript
const WidgetSuggestions = ({ userResources, existingWidgets }) => {
  const suggestions = generateSmartSuggestions(userResources, existingWidgets);
  
  return (
    <div className="widget-suggestions">
      <h3>Suggested Widgets</h3>
      {suggestions.map(suggestion => (
        <SuggestionCard
          key={suggestion.id}
          title={suggestion.title}
          description={suggestion.description}
          resources={suggestion.resources}
          onAdd={() => addSuggestedWidget(suggestion)}
        />
      ))}
    </div>
  );
};

// Smart suggestions based on resources
function generateSmartSuggestions(resources, existingWidgets) {
  const suggestions = [];
  
  // If user has Docker resources but no container widgets
  const dockerResources = resources.filter(r => r.type === 'docker');
  if (dockerResources.length > 0 && !hasWidgetType(existingWidgets, 'container-grid')) {
    suggestions.push({
      title: 'Container Overview',
      description: `Monitor your ${dockerResources.length} Docker containers`,
      template: 'container-grid',
      resources: dockerResources
    });
  }
  
  // If user has Home Assistant but no automation widgets
  const haResources = resources.filter(r => r.subtype === 'homeassistant');
  if (haResources.length > 0 && !hasWidgetType(existingWidgets, 'automation-panel')) {
    suggestions.push({
      title: 'Home Automation Control',
      description: 'Quick access to your Home Assistant automations',
      template: 'automation-panel',
      resources: haResources
    });
  }
  
  return suggestions;
}
```

## Dashboard Themes & Customization

### Theme System
```javascript
const themes = {
  default: {
    colors: {
      primary: '#3B82F6',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1F2937'
    },
    spacing: { grid: 16, padding: 12 },
    borders: { radius: 8, width: 1 }
  },
  
  dark: {
    colors: {
      primary: '#60A5FA', 
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9'
    },
    spacing: { grid: 16, padding: 12 },
    borders: { radius: 8, width: 1 }
  },
  
  cyberpunk: {
    colors: {
      primary: '#00FF9F',
      background: '#0D0208',
      surface: '#1A0F1A',
      text: '#00FFFF'
    },
    spacing: { grid: 20, padding: 16 },
    borders: { radius: 2, width: 2 }
  }
};
```

## Benefits of This Approach

### 1. **Permission-Aware Widgets**
- Users only see widgets for resources they can access
- Widget functionality adapts to permission level
- Automatic filtering of sensitive information

### 2. **Resource-Centric Design**
- Widgets automatically understand resource types
- Smart suggestions based on available resources  
- Relationship discovery between resources

### 3. **Enterprise Features**
```
✅ Multi-tenant dashboard isolation
✅ Role-based widget library access
✅ Audit logging of dashboard changes
✅ Template sharing across teams
✅ Custom widget development framework
```

### 4. **Modern UX**
```
✅ Drag-and-drop interface (React Grid Layout)
✅ Real-time data updates via WebSocket
✅ Responsive design for mobile/tablet
✅ Theme system with custom CSS
✅ Widget marketplace concept
✅ Import/export dashboard configurations
```

This system gives you **homepage-style customization** but with **enterprise security** and **resource awareness**. Users can create personalized dashboards with exactly the resources they manage, with widgets that adapt to their permission levels.

Would you like me to implement this customizable dashboard system? I can start with the basic drag-and-drop framework and a few core widget types (service status, container grid, etc.).