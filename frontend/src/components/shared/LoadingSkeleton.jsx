import React from 'react';

// Skeleton loader for better perceived performance
const LoadingSkeleton = ({ 
  variant = 'default',
  count = 1,
  className = '' 
}) => {
  const baseClasses = 'animate-pulse bg-gray-800/50 rounded';
  
  const variants = {
    default: 'h-4 w-full',
    title: 'h-6 w-3/4',
    card: 'h-48 w-full rounded-xl',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-lg',
    serviceCard: 'h-64 w-full rounded-xl'
  };

  const renderSkeleton = () => (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            {renderSkeleton()}
          </div>
        ))}
      </>
    );
  }

  return renderSkeleton();
};

// Service card skeleton for loading states
export const ServiceCardSkeleton = () => (
  <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <LoadingSkeleton variant="avatar" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-5 w-24" />
          <LoadingSkeleton className="h-3 w-16" />
        </div>
      </div>
      <LoadingSkeleton className="h-2 w-2 rounded-full" />
    </div>
    
    <div className="space-y-3 mb-4">
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-3/4" />
      <LoadingSkeleton className="h-4 w-5/6" />
    </div>
    
    <div className="flex justify-between items-center">
      <LoadingSkeleton className="h-3 w-32" />
      <LoadingSkeleton variant="button" className="w-20" />
    </div>
  </div>
);

// Status tab skeleton
export const StatusTabSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <LoadingSkeleton variant="title" className="w-48" />
      <LoadingSkeleton variant="button" />
    </div>
    
    {/* Stats grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <LoadingSkeleton className="h-8 w-20 mb-2" />
          <LoadingSkeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
    
    {/* Content skeleton */}
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <LoadingSkeleton variant="title" className="mb-4" />
      <div className="space-y-3">
        <LoadingSkeleton count={5} />
      </div>
    </div>
  </div>
);

export default LoadingSkeleton;