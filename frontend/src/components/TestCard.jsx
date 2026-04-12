import React from 'react';
import { PenTool, Mic, ArrowRight, CheckCircle2 } from 'lucide-react';

const icons = {
  PenTool: <PenTool className="w-8 h-8 text-blue-600 mb-4" />,
  Mic: <Mic className="w-8 h-8 text-blue-600 mb-4" />,
};

const TestCard = ({ title, description, iconName, onClick, isCompleted }) => {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start bg-white p-6 rounded-xl shadow-sm border transition-all text-left focus:outline-none focus:ring-4 focus:ring-blue-300 min-h-[44px] w-full relative overflow-hidden ${
        isCompleted ? 'border-green-300 hover:border-green-400' : 'border-slate-100 hover:shadow-md hover:border-blue-200'
      }`}
      aria-label={`Start ${title}`}
    >
      {/* Completion Indicator */}
      {isCompleted && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
      )}
      <div className="flex items-center justify-between w-full relative z-10">
        <div className="flex items-start">
            {icons[iconName]}
            {isCompleted && (
                <span className="ml-3 mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                </span>
            )}
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
           isCompleted ? 'bg-green-50 group-hover:bg-green-100' : 'bg-slate-50 group-hover:bg-blue-50'
        }`}>
          <ArrowRight className={`w-5 h-5 ${isCompleted ? 'text-green-500 group-hover:text-green-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-800 mb-2 relative z-10">{title}</h3>
      <p className="text-slate-600 relative z-10">{description}</p>
    </button>
  );
};

export default TestCard;
