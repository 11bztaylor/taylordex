import React from 'react';

const ProgressBar = ({ 
  value, 
  max = 100, 
  label = '', 
  showPercentage = true,
  color = 'blue',
  size = 'normal',
  animated = false 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    // Auto color based on percentage
    auto: percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
  };

  const sizeClasses = {
    small: 'h-2',
    normal: 'h-3',
    large: 'h-4'
  };

  const bgClasses = {
    blue: 'bg-blue-900/30',
    green: 'bg-green-900/30',
    yellow: 'bg-yellow-900/30',
    red: 'bg-red-900/30',
    purple: 'bg-purple-900/30',
    orange: 'bg-orange-900/30',
    auto: 'bg-gray-700/30'
  };

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-gray-400">{label}</span>}
          {showPercentage && (
            <span className="text-white font-medium">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      
      <div className={`w-full ${bgClasses[color]} rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
          style={{ width: `${percentage}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;