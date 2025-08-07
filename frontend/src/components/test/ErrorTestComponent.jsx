import React, { useState } from 'react';

const ErrorTestComponent = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will cause an error to test our error boundaries
    throw new Error('Test error for error boundary validation');
  }

  return (
    <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
      <h3 className="text-red-400 font-semibold mb-2">Error Boundary Test</h3>
      <p className="text-gray-300 text-sm mb-3">
        This component can trigger an error to test our error boundaries.
      </p>
      <button
        onClick={() => setShouldError(true)}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
      >
        Trigger Test Error
      </button>
    </div>
  );
};

export default ErrorTestComponent;