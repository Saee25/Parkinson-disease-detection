import React from 'react';
import TestCard from './TestCard';
import { useTestContext } from '../context/TestContext';
import { ShieldCheck } from 'lucide-react';
import { API_BASE } from '../config';

const Dashboard = ({ setActiveView }) => {
  const { completedTests, generateFormData, setResults } = useTestContext();

  const handleStartTest = (testName) => {
    if (testName === 'Spiral Drawing Test') {
      setActiveView('spiral');
    } else if (testName === 'Voice Analysis Test') {
      setActiveView('voice');
    }
  };

  const allComplete = completedTests.spiral && completedTests.voice;

  const handleSubmit = async () => {
     setActiveView('loading');

     try {
       const formData = generateFormData();
       const response = await fetch(`${API_BASE}/analyze/full`, {
         method: 'POST',
         body: formData,
       });

       if (!response.ok) {
         let detail = response.statusText;
         try {
           const errBody = await response.json();
           if (errBody?.detail) {
             detail =
               typeof errBody.detail === 'string'
                 ? errBody.detail
                 : JSON.stringify(errBody.detail);
           }
         } catch {
           /* ignore non-JSON error bodies */
         }
         throw new Error(
           response.status === 503
             ? `Models not loaded (503). Train models with train_models.py or check backend logs. ${detail}`
             : `Analysis failed (${response.status}): ${detail}`
         );
       }

       const data = await response.json();
       setResults(data.results);
       setActiveView('results');
     } catch (error) {
       console.error('Analysis Error:', error);
       const msg =
         error instanceof TypeError
           ? `Cannot reach the API at ${API_BASE}. From the project folder, run .\\start-backend.ps1 (or: .\\venv\\Scripts\\Activate.ps1 then python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000)`
           : error?.message ||
             'Error communicating with the diagnostic engine.';
       alert(msg);
       setActiveView('dashboard');
     }
  };

  return (
    <div className="animate-fade-in relative pb-24 lg:pb-0">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 mt-4 lg:mt-0">Welcome Builder</h1>
        <p className="text-slate-600 text-lg">Select an assessment below to begin a new evaluation.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <TestCard 
          title="Spiral Drawing Test"
          description="Evaluate fine motor control and tremor severity by tracing a standard spiral pattern."
          iconName="PenTool"
          onClick={() => handleStartTest('Spiral Drawing Test')}
          isCompleted={completedTests.spiral}
        />
        <TestCard 
          title="Voice Analysis Test"
          description="Assess vocal characteristics such as phonation and articulation through guided voice prompts."
          iconName="Mic"
          onClick={() => handleStartTest('Voice Analysis Test')}
          isCompleted={completedTests.voice}
        />
      </div>

      {allComplete && (
        <div className="mt-12 bg-white p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between animate-fade-in z-20 relative">
           <div className="flex items-start md:items-center mb-6 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 shrink-0">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-slate-900">All Assessments Complete</h3>
                  <p className="text-slate-600 max-w-md text-sm md:text-base">Your data is ready to be analyzed by the Parkinson's diagnostic engine.</p>
              </div>
           </div>
           
           <button 
             onClick={handleSubmit}
             className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition-all focus:ring-4 focus:ring-blue-300 active:scale-95"
           >
              Submit Full Analysis
           </button>
        </div>
      )}

      <section className={`bg-blue-50 border border-blue-100 rounded-2xl p-6 md:p-8 ${allComplete ? 'mt-8' : 'mt-12'}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-3">Notice about accessibility</h2>
        <p className="text-blue-800 leading-relaxed">
          This dashboard is designed considering the WCAG guidelines to ensure compatibility with assistive technologies. 
          The large interaction areas and high contrast options are meant to ease navigation for users with motor impairments.
        </p>
      </section>
    </div>
  );
};

export default Dashboard;
