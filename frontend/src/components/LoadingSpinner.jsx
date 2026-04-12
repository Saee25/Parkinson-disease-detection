import React from 'react';
import { Activity } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="relative">
         {/* Pulsing background rings */}
         <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75 h-24 w-24 left-1/2 top-1/2 -ml-12 -mt-12" />
         
         <div className="relative bg-white p-6 rounded-full shadow-lg border border-slate-100 z-10 flex items-center justify-center animate-pulse">
            <Activity className="w-12 h-12 text-blue-600" />
         </div>
      </div>
      
      <h2 className="mt-8 text-2xl font-bold text-slate-900">Processing Analysis...</h2>
      <p className="mt-2 text-slate-500 max-w-sm text-center">
         Our AI models are evaluating the spiral coordinates and vocal phonation features. Please wait.
      </p>
    </div>
  );
};

export default LoadingSpinner;
