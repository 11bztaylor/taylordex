# TaylorDex Design System

## Theme: NVIDIA-Inspired Dark

### Color Palette
/* Primary - NVIDIA Green */
--primary: #4ade80 (green-400)
--primary-glow: #76B900
--primary-hover: #22c55e (green-500)

/* Backgrounds */
--bg-main: #030712 (gray-950)
--bg-card: rgba(17, 24, 39, 0.5) (gray-900/50)
--bg-hover: rgba(17, 24, 39, 0.8)

/* Borders */
--border-default: #1f2937 (gray-800)
--border-hover: rgba(34, 197, 94, 0.5) (green-500/50)

/* Status Colors */
--status-online: #4ade80 (green-400)
--status-offline: #ef4444 (red-500)
--status-warning: #f59e0b (amber-500)

### Component Patterns

#### Cards
className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 
          border border-gray-800 hover:border-green-900/50 
          transition-all duration-300 hover:shadow-lg 
          hover:shadow-green-500/10"

#### Buttons
// Primary Action
className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg"

// Ghost Button
className="text-gray-400 hover:text-green-400 transition-colors"

#### Status Indicators
// Online
className="w-2 h-2 bg-green-400 rounded-full animate-pulse"

// Offline  
className="w-2 h-2 bg-red-500 rounded-full"

### Typography
- Headers: text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent
- Subheaders: text-xl text-gray-300
- Body: text-gray-400
- Small: text-sm text-gray-500

### Spacing
- Page padding: p-8
- Card padding: p-6
- Grid gaps: gap-6
- Inline spacing: space-x-4 or space-y-4

### Effects
- Glassmorphism: backdrop-blur-sm bg-opacity-50
- Glow: shadow-lg shadow-green-500/20
- Transitions: transition-all duration-300
