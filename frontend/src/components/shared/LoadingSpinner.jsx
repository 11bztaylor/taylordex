import React from 'react';

const LoadingSpinner = ({ 
  size = 'default', 
  message = 'Loading...', 
  fullScreen = false,
  inline = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    default: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} border-gray-700 border-t-green-400 rounded-full animate-spin`} />
  );

  if (inline) {
    return (
      <div className="inline-flex items-center space-x-2">
        {spinner}
        {message && <span className="text-gray-400 text-sm">{message}</span>}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-900/90 rounded-xl p-8 flex flex-col items-center space-y-4">
          {spinner}
          {message && <p className="text-gray-300">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      {spinner}
      {message && <p className="text-gray-400">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;