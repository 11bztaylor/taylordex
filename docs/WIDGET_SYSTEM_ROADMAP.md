# TaylorDex Widget System Roadmap

## Vision: Customizable Dashboard Widgets

Transform the Status Overview tab into a fully customizable dashboard where users can create, configure, and arrange widgets to monitor exactly what they need.

## Current State vs. Vision

### Current Status Dashboard
```
┌─── Fixed Layout ────────────────────────────────┐
│ System Health: 75%  │  Total Media: 3,188       │
│ Active Now: 11      │  Storage: 61.24 TB        │
└─────────────────────────────────────────────────┘
│                                                 │
│ [Fixed Service Status Grid]                     │
│ [Fixed Activity Feed]                           │
└─────────────────────────────────────────────────┘
```

### Vision: Widget-Based Dashboard
```
┌─── Drag & Drop Layout ──────────────────────────┐
│ ┌─ System Health ─┐  ┌─ Media Collection ────┐  │
│ │ ● Radarr        │  │ Movies: 3,059         │  │
│ │ ● Sonarr        │  │ Series: 129           │  │
│ │ ○ Plex (off)    │  │ Missing: 4,320        │  │
│ │ Health: 75%     │  └───────────────────────┘  │
│ └─────────────────┘                             │
│                                                 │
│ ┌─ Active Downloads ──────┐ ┌─ Storage Stats ─┐  │
│ │ Movie.2024.1080p [67%]  │ │ Array: 67% full │  │
│ │ Series.S01E05 [23%]     │ │ Free: 45.2 TB   │  │
│ │ ETA: 15 min             │ │ Used: 61.3 TB   │  │
│ └─────────────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Phase 1: Research & Architecture

### Industry Best Practices Study

#### Home Assistant Dashboard
- **Lovelace UI**: YAML-based card configuration
- **Card Types**: Entities, glance, picture, markdown, gauge
- **Layout**: Grid-based with automatic sizing
- **Customization**: Themes, custom cards, conditional display

#### Grafana Dashboards
- **Panel Types**: Graph, stat, table, heatmap, logs
- **Data Sources**: Multiple metric sources
- **Variables**: Dynamic filtering and templating
- **Layouts**: Responsive grid system

#### Netdata Dashboard
- **Real-time**: Live updating charts
- **Drill-down**: Click to get more detail
- **Customizable**: Drag to rearrange, hide/show charts
- **Performance**: Efficient real-time updates

#### Heimdall Dashboard
- **Application Cards**: Simple service launcher
- **Custom Backgrounds**: Theming support
- **Drag & Drop**: Easy rearrangement
- **Categories**: Organized service grouping

### TaylorDex Widget Architecture

```typescript
interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetConfig;
  refreshInterval: number;
  enabled: boolean;
}

type WidgetType = 
  | 'system-health'
  | 'media-collection'
  | 'download-queue'
  | 'storage-stats'
  | 'service-status'
  | 'activity-feed'
  | 'recent-additions'
  | 'streaming-activity'
  | 'system-resources'
  | 'disk-health'
  | 'indexer-stats'
  | 'custom-metric';

interface WidgetConfig {
  services?: string[];      // Selected service IDs
  metrics?: string[];       // Which metrics to display
  chartType?: 'line' | 'bar' | 'gauge' | 'stat';
  timeRange?: '1h' | '24h' | '7d' | '30d';
  threshold?: { warning: number; critical: number };
  customization?: {
    color?: string;
    icon?: string;
    showTitle?: boolean;
  };
}
```

## Phase 2: Core Widget Types

### 1. System Health Widget
**Purpose**: Monitor overall system status
**Configuration**:
- Select which services to include
- Health threshold settings
- Display format (percentage, count, list)

```tsx
<SystemHealthWidget 
  services={['radarr', 'sonarr', 'plex']}
  displayFormat="percentage"
  title="Media Services Health"
/>
```

### 2. Media Collection Widget
**Purpose**: Show media library statistics
**Configuration**:
- Service selection (Radarr, Sonarr, Plex)
- Metrics (total, missing, quality breakdown)
- Display style (cards, list, chart)

### 3. Download Queue Widget
**Purpose**: Monitor active downloads
**Configuration**:
- Service filters
- Queue limit (show top N)
- Progress bar style
- ETA display

### 4. Storage Statistics Widget
**Purpose**: Disk usage and array health
**Configuration**:
- Service data sources
- Chart type (gauge, bar, pie)
- Warning thresholds
- Units (TB, GB, percentage)

### 5. Activity Feed Widget
**Purpose**: Recent system activity
**Configuration**:
- Event types (downloads, additions, streams)
- Time range
- Item limit
- Service filters

### 6. Streaming Activity Widget (Plex)
**Purpose**: Current and recent Plex streams
**Configuration**:
- Show active/recent
- User privacy settings
- Bandwidth display

### 7. Service Status Grid
**Purpose**: Quick service overview
**Configuration**:
- Service selection
- Layout (grid, list)
- Status indicators
- Key metrics per service

### 8. System Resources Widget (Unraid)
**Purpose**: CPU, RAM, disk temperature
**Configuration**:
- Resource types
- Chart types
- Time ranges
- Alert thresholds

## Phase 3: Widget Framework

### Frontend Architecture

```tsx
// Widget Container System
const DashboardGrid = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <GridLayout
      layout={widgets.map(w => w.position)}
      onLayoutChange={handleLayoutChange}
      isResizable={isEditing}
      isDraggable={isEditing}
    >
      {widgets.map(widget => (
        <WidgetContainer key={widget.id} widget={widget}>
          <WidgetRenderer widget={widget} />
        </WidgetContainer>
      ))}
    </GridLayout>
  );
};

// Generic Widget Renderer
const WidgetRenderer = ({ widget }: { widget: Widget }) => {
  const WidgetComponent = WIDGET_TYPES[widget.type];
  return <WidgetComponent config={widget.config} />;
};
```

### Backend API Extensions

```javascript
// Widget Management Endpoints
app.get('/api/dashboard/widgets', getUserWidgets);
app.post('/api/dashboard/widgets', createWidget);
app.put('/api/dashboard/widgets/:id', updateWidget);
app.delete('/api/dashboard/widgets/:id', deleteWidget);
app.post('/api/dashboard/layout', saveLayout);

// Widget Data Endpoints
app.get('/api/widgets/:type/data', getWidgetData);
app.post('/api/widgets/custom/:id/data', getCustomWidgetData);
```

### Database Schema

```sql
CREATE TABLE dashboard_widgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER, -- Future: multi-user support
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  config JSONB NOT NULL,
  refresh_interval INTEGER DEFAULT 30,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE widget_presets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  widgets JSONB NOT NULL, -- Array of widget configs
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Phase 4: User Experience Features

### 1. Widget Configuration Modal
```tsx
const WidgetConfigModal = ({ widget, onSave }) => {
  return (
    <Modal>
      <h2>Configure {widget.title}</h2>
      
      {/* Service Selection */}
      <ServiceSelector 
        services={availableServices}
        selected={widget.config.services}
        onChange={handleServiceChange}
      />
      
      {/* Metric Selection */}
      <MetricSelector 
        type={widget.type}
        selected={widget.config.metrics}
        onChange={handleMetricChange}
      />
      
      {/* Display Options */}
      <DisplayOptions 
        type={widget.type}
        config={widget.config}
        onChange={handleConfigChange}
      />
    </Modal>
  );
};
```

### 2. Drag & Drop Interface
- **Edit Mode Toggle**: Switch between view and edit mode
- **Resize Handles**: Drag corners to resize widgets
- **Grid Snapping**: Automatic alignment
- **Widget Palette**: Drag new widgets from sidebar

### 3. Preset Management
- **Default Layouts**: Starter configurations
- **Save/Load**: Custom layout presets
- **Export/Import**: Share configurations
- **Templates**: Common dashboard patterns

### 4. Real-time Updates
- **WebSocket Integration**: Live data updates
- **Selective Refresh**: Only update changed widgets
- **Background Updates**: Continue updating when not visible

## Phase 5: Advanced Features

### 1. Custom Widgets
Allow users to create custom widgets with:
- **API Endpoint Selection**: Choose data source
- **Metric Calculation**: Custom formulas
- **Visualization Options**: Chart types and styling

### 2. Conditional Display
- **Service-based**: Show widget only when service is online
- **Threshold-based**: Display alerts when values exceed limits
- **Time-based**: Different layouts for different times

### 3. Interactive Elements
- **Click Actions**: Drill-down to detailed views
- **Service Controls**: Start/stop/restart from widgets
- **Quick Actions**: Common tasks (refresh, search)

### 4. Mobile Optimization
- **Responsive Layouts**: Automatic mobile layout
- **Touch Gestures**: Swipe, pinch, tap interactions
- **Simplified Views**: Key metrics only on small screens

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Research existing widget frameworks
- [ ] Design widget architecture
- [ ] Create database schema
- [ ] Build basic grid layout system

### Phase 2: Core Widgets (Week 3-4)
- [ ] Implement 4 essential widget types
- [ ] Create widget configuration system
- [ ] Add drag & drop functionality
- [ ] Build edit mode interface

### Phase 3: Polish & UX (Week 5)
- [ ] Add preset management
- [ ] Implement real-time updates
- [ ] Create mobile layouts
- [ ] Add import/export features

### Phase 4: Advanced Features (Week 6+)
- [ ] Custom widget builder
- [ ] Conditional display logic
- [ ] Interactive elements
- [ ] Performance optimization

## Technical Dependencies

### Frontend Libraries
```json
{
  "react-grid-layout": "^1.3.4",     // Drag & drop grid
  "recharts": "^2.8.0",              // Charts and graphs
  "react-hook-form": "^7.47.0",      // Form management
  "zustand": "^4.4.4",               // State management
  "framer-motion": "^10.16.4"        // Animations
}
```

### Backend Enhancements
- Widget data aggregation service
- Real-time WebSocket server
- Widget template engine
- Performance monitoring

## Success Metrics

1. **User Engagement**: Time spent on dashboard
2. **Customization Adoption**: % users who create custom layouts
3. **Performance**: Page load time < 2s, widget refresh < 500ms
4. **Mobile Usage**: Mobile dashboard sessions
5. **Widget Popularity**: Most used widget types

## Inspiration Sources

### Home Assistant Lovelace
- **Strengths**: Powerful customization, large community
- **Apply**: YAML-like configuration system
- **Adapt**: Simpler UI for media server focus

### Grafana Panels
- **Strengths**: Professional dashboards, great performance
- **Apply**: Panel configuration patterns
- **Adapt**: Simplified for non-technical users

### Netdata Real-time
- **Strengths**: Live updates, responsive design
- **Apply**: Real-time data streaming
- **Adapt**: Focus on media metrics vs system metrics

### Heimdall Simplicity
- **Strengths**: Easy to use, beautiful interface
- **Apply**: Drag & drop simplicity
- **Adapt**: More data-rich widgets vs simple launchers

---

**Next Steps**: 
1. Research react-grid-layout integration
2. Design widget configuration schema
3. Create proof-of-concept with 2 widget types
4. User feedback on widget priorities