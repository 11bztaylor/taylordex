# TaylorDex - Drag & Drop Dashboard Customization Plan

## Overview
Transform the Status Dashboard into a fully customizable, widget-based system where users can drag, drop, resize, and configure their own dashboard layouts.

## Core Concept
Instead of fixed tabs (Overview/Activity/Performance), users can create custom dashboards by selecting from a library of widgets and arranging them however they want.

## Technical Implementation

### 1. Required Dependencies
```bash
npm install react-grid-layout
# Provides drag/drop, resize, responsive grid system
```

### 2. Widget Architecture
```javascript
// Widget Registry - All available widgets
const widgetRegistry = {
  // System Widgets
  'system-health': { 
    component: SystemHealthWidget, 
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
    category: 'system',
    name: 'System Health',
    description: 'Overall service health percentage'
  },
  
  // Media Widgets
  'media-count': { 
    component: MediaCountWidget, 
    defaultSize: { w: 4, h: 2 },
    category: 'media',
    name: 'Media Library',
    refreshInterval: 300000 // 5 minutes
  },
  'recent-additions': { 
    component: RecentAdditionsWidget, 
    defaultSize: { w: 8, h: 3 },
    category: 'activity'
  },
  
  // Activity Widgets  
  'download-queue': { 
    component: DownloadQueueWidget, 
    defaultSize: { w: 6, h: 4 },
    category: 'activity',
    refreshInterval: 10000 // 10 seconds
  },
  'active-streams': { 
    component: ActiveStreamsWidget, 
    defaultSize: { w: 6, h: 3 },
    category: 'activity'
  },
  
  // Performance Widgets
  'indexer-performance': { 
    component: IndexerPerfWidget, 
    defaultSize: { w: 8, h: 4 },
    category: 'performance'
  },
  'storage-gauge': { 
    component: StorageGaugeWidget, 
    defaultSize: { w: 3, h: 3 },
    category: 'system'
  },
  
  // Service-Specific Widgets
  'radarr-calendar': { 
    component: RadarrCalendarWidget, 
    defaultSize: { w: 6, h: 4 },
    category: 'radarr',
    requiresService: 'radarr'
  },
  'sonarr-schedule': { 
    component: SonarrScheduleWidget, 
    defaultSize: { w: 6, h: 4 },
    category: 'sonarr'
  },
  'plex-now-playing': { 
    component: PlexNowPlayingWidget, 
    defaultSize: { w: 8, h: 3 },
    category: 'plex'
  }
};
```

### 3. Layout Storage Schema
```sql
-- User dashboard layouts
CREATE TABLE dashboard_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  layout JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example layout JSON structure
{
  "widgets": [
    {
      "i": "system-health-1",  // Unique instance ID
      "type": "system-health", // Widget type from registry
      "x": 0,
      "y": 0, 
      "w": 4,
      "h": 2,
      "settings": {
        "refreshRate": 30000,
        "showDetails": true
      }
    }
  ],
  "breakpoints": {
    "lg": 1200,
    "md": 996,
    "sm": 768
  }
}
```

### 4. Main Dashboard Component
```javascript
const CustomizableDashboard = () => {
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  
  return (
    <div>
      {/* Toolbar */}
      <DashboardToolbar 
        onEditToggle={() => setEditMode(!editMode)}
        onAddWidget={() => setShowWidgetLibrary(true)}
        onSaveLayout={saveLayout}
        onLoadLayout={loadLayout}
      />
      
      {/* Widget Library Sidebar */}
      {showWidgetLibrary && (
        <WidgetLibrary 
          onSelectWidget={addWidget}
          availableWidgets={widgetRegistry}
        />
      )}
      
      {/* Grid Layout */}
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={60}
        width={1200}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map(widget => (
          <div key={widget.i} className="widget-container">
            <WidgetWrapper 
              widget={widget}
              editMode={editMode}
              onRemove={() => removeWidget(widget.i)}
              onSettings={() => openWidgetSettings(widget.i)}
            />
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
};
```

### 5. Widget Wrapper Component
```javascript
const WidgetWrapper = ({ widget, editMode, onRemove, onSettings }) => {
  const WidgetComponent = widgetRegistry[widget.type].component;
  
  return (
    <div className="widget h-full relative">
      {editMode && (
        <div className="widget-controls absolute top-2 right-2 flex gap-1">
          <button onClick={onSettings} className="p-1 bg-gray-800 rounded">
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="p-1 bg-red-800 rounded">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <WidgetComponent {...widget.settings} />
    </div>
  );
};
```

### 6. Features to Implement

#### Phase 1: Core Functionality
- [ ] Basic drag and drop grid
- [ ] Add/remove widgets
- [ ] Save/load layouts
- [ ] Resize widgets
- [ ] Edit mode toggle

#### Phase 2: Enhanced Features  
- [ ] Widget settings modal
- [ ] Multiple saved layouts
- [ ] Import/export layouts
- [ ] Widget categories/filtering
- [ ] Search widget library
- [ ] Responsive breakpoints

#### Phase 3: Advanced Features
- [ ] Role-based default layouts
- [ ] Shared team layouts
- [ ] Widget marketplace (community widgets)
- [ ] Custom widget builder
- [ ] Dashboard templates
- [ ] Keyboard shortcuts
- [ ] Undo/redo support

### 7. Widget Examples

#### Simple Counter Widget
```javascript
const MediaCountWidget = ({ services }) => {
  const { movies, series } = useServiceStats(services);
  
  return (
    <div className="widget-content p-4">
      <h3 className="text-lg font-semibold mb-2">Media Library</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-2xl font-bold">{movies}</p>
          <p className="text-sm text-gray-400">Movies</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{series}</p>
          <p className="text-sm text-gray-400">Series</p>
        </div>
      </div>
    </div>
  );
};
```

#### Chart Widget
```javascript
const StorageChartWidget = ({ services, timeRange = '7d' }) => {
  const storageData = useStorageHistory(services, timeRange);
  
  return (
    <div className="widget-content p-4">
      <h3 className="text-lg font-semibold mb-2">Storage Trend</h3>
      <ResponsiveLineChart data={storageData} />
    </div>
  );
};
```

### 8. User Experience Flow

1. **First Time User**
   - Sees default dashboard layout
   - "Customize" button in corner
   - Guided tour option

2. **Edit Mode**
   - Unlock icon activates edit mode
   - Widgets show drag handles and controls
   - Widget library slides in from right
   - Grid lines appear for alignment

3. **Adding Widgets**
   - Browse by category or search
   - Preview widget before adding
   - Drag from library to dashboard
   - Auto-snap to grid

4. **Saving Layouts**
   - Name your layout
   - Set as default option
   - Share with team option
   - Export as JSON

### 9. Performance Optimizations

- **Lazy Loading**: Only load widget components when needed
- **Individual Refresh**: Each widget has its own update cycle
- **Virtualization**: For widget library with many options
- **Memoization**: Prevent unnecessary re-renders
- **Intersection Observer**: Only update visible widgets
- **Web Workers**: Heavy calculations off main thread

### 10. Accessibility

- Keyboard navigation for widget management
- ARIA labels for screen readers
- Focus management in edit mode
- Contrast requirements for widgets
- Alternative text for visual elements

---

## Implementation Priority

1. **MVP (Week 1-2)**
   - Basic grid layout
   - 5-6 core widgets
   - Save/load one layout
   - Simple edit mode

2. **Enhanced (Week 3-4)**
   - Widget settings
   - More widget types
   - Multiple layouts
   - Better UX

3. **Polish (Week 5+)**
   - Advanced features
   - Performance optimization
   - Testing & refinement
