import React from 'react';

const SimpleLineChart = ({ data, title, color = 'green', height = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`h-${height}px flex items-center justify-center text-gray-500`}>
        <p>No data available</p>
      </div>
    );
  }

  // Calculate min/max for scaling
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;
  
  // Create SVG path
  const width = 100;
  const chartHeight = height - 40; // Leave space for labels
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartHeight - ((d.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    green: 'text-green-400 stroke-green-400 fill-green-400',
    blue: 'text-blue-400 stroke-blue-400 fill-blue-400',
    yellow: 'text-yellow-400 stroke-yellow-400 fill-yellow-400',
    red: 'text-red-400 stroke-red-400 fill-red-400',
    purple: 'text-purple-400 stroke-purple-400 fill-purple-400'
  };

  const selectedColor = colorClasses[color] || colorClasses.green;

  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium text-gray-300">{title}</h4>}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => {
            const y = (percent / 100) * chartHeight;
            return (
              <line
                key={percent}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                className="stroke-gray-700"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            );
          })}
          
          {/* Line chart */}
          <polyline
            points={points}
            fill="none"
            className={selectedColor}
            strokeWidth="2"
          />
          
          {/* Area under line */}
          <polygon
            points={`0,${chartHeight} ${points} ${width},${chartHeight}`}
            className={selectedColor}
            fillOpacity="0.1"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = chartHeight - ((d.value - minValue) / range) * chartHeight;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                className={selectedColor}
              />
            );
          })}
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8 w-8">
          <span>{maxValue.toFixed(0)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(0)}</span>
          <span>{minValue.toFixed(0)}</span>
        </div>
        
        {/* Current value */}
        {data.length > 0 && (
          <div className="absolute top-2 right-2 text-sm">
            <span className={selectedColor}>{data[data.length - 1].value.toFixed(1)}</span>
            <span className="text-gray-500 text-xs ml-1">{data[data.length - 1].unit || ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleLineChart;