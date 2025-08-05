import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const StatsCard = ({ 
  title, 
  value, 
  unit = '', 
  icon: Icon, 
  trend = null, 
  trendValue = null,
  color = 'blue',
  size = 'normal' 
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const bgColorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20'
  };

  const textColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400'
  };

  const sizeClasses = {
    small: 'p-3',
    normal: 'p-4',
    large: 'p-6'
  };

  const valueSizeClasses = {
    small: 'text-xl',
    normal: 'text-2xl',
    large: 'text-3xl'
  };

  return (
    <div className={`${bgColorClasses[color]} border rounded-lg ${sizeClasses[size]} transition-all hover:border-opacity-40`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {Icon && (
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClasses[color]} p-1.5 flex items-center justify-center`}>
                <Icon className="w-full h-full text-white" />
              </div>
            )}
            <p className="text-gray-400 text-sm">{title}</p>
          </div>
          
          <div className="flex items-baseline space-x-1">
            <span className={`${valueSizeClasses[size]} font-bold text-white`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-gray-400 text-sm">{unit}</span>}
          </div>

          {trend !== null && (
            <div className="flex items-center space-x-1 mt-2">
              {trend > 0 ? (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">
                    {trendValue || `+${trend}%`}
                  </span>
                </>
              ) : trend < 0 ? (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-xs">
                    {trendValue || `${trend}%`}
                  </span>
                </>
              ) : (
                <span className="text-gray-400 text-xs">No change</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;