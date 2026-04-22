import React from 'react';
import { Activity, RefreshCcw, CheckCircle2, TrendingDown, Stethoscope } from 'lucide-react';
import { useTestContext } from '../context/TestContext';

const severityBand = (score) => {
  if (score == null || Number.isNaN(score)) return { label: 'N/A', hint: '' };
  if (score < 20) return { label: 'Lower range', hint: 'Typical of milder motor burden on this scale (informational only).' };
  if (score < 40) return { label: 'Mid range', hint: 'Moderate motor burden on this scale (informational only).' };
  return { label: 'Higher range', hint: 'Higher motor burden on this scale (informational only).' };
};

const Results = ({ setActiveView }) => {
  const { results, resetTests } = useTestContext();

  const handleRestart = () => {
    resetTests();
    setActiveView('dashboard');
  };

  if (!results) return null;

  const voicePd = results.voice.status === 1;
  const spiralPd = results.spiral.status === 1;
  const wavePd = results.wave.status === 1;
  const ensemblePd = results.visual_ensemble.status === 1;

  const flags = [voicePd, ensemblePd].filter(Boolean).length;
  const composite =
    flags >= 2
      ? 'High agreement between voice and visual ensemble (spiral+wave) classifiers.'
      : flags === 1
        ? 'Mixed signals: one modality flagged Parkinsonian patterns.'
        : 'Neither voice nor visual classifiers crossed the screening threshold.';

  const sev = severityBand(Number(results.severity?.score));

  return (
    <div className="animate-fade-in max-w-5xl mx-auto w-full">
      <header className="mb-8 text-center pb-8 border-b border-slate-200">
        <div className={`mx-auto w-16 h-16 ${results.voice.status || results.visual_ensemble.status ? 'bg-red-100' : 'bg-green-100'} rounded-full flex items-center justify-center mb-4`}>
            {results.voice.status || results.visual_ensemble.status ? (
                <Activity className="w-8 h-8 text-red-600" />
            ) : (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h1>
        <p className="text-slate-600 text-lg">
            {results.voice.status || results.visual_ensemble.status 
             ? "Patterns suggestive of Parkinson's Disease were detected." 
             : "No significant Parkinsonian markers were detected."}
        </p>
      </header>

      {/* Primary Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Spiral Result */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-2 ${results.spiral.status ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-lg mb-3`}>
               <Activity className="w-5 h-5" />
           </div>
           <h3 className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wider">Spiral Test</h3>
           <div className="text-lg font-bold text-slate-900 mb-1">{results.spiral.prediction}</div>
           <div className="text-xs text-slate-500 font-medium">Prob: {(results.spiral.probability * 100).toFixed(1)}%</div>
        </div>

        {/* Wave Result */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-2 ${results.wave.status ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'} rounded-lg mb-3`}>
               <Activity className="w-5 h-5" />
           </div>
           <h3 className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wider">Wave Test</h3>
           <div className="text-lg font-bold text-slate-900 mb-1">{results.wave.prediction}</div>
           <div className="text-xs text-slate-500 font-medium">Prob: {(results.wave.probability * 100).toFixed(1)}%</div>
        </div>

        {/* Ensemble Result */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-2 ${results.visual_ensemble.status ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'} rounded-lg mb-3`}>
               <CheckCircle2 className="w-5 h-5" />
           </div>
           <h3 className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wider">Visual Ensemble</h3>
           <div className="text-lg font-bold text-slate-900 mb-1">{results.visual_ensemble.prediction}</div>
           <div className="text-xs text-slate-500 font-medium">Avg Prob: {(results.visual_ensemble.probability * 100).toFixed(1)}%</div>
        </div>

        {/* Voice Result */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-2 ${results.voice.status ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'} rounded-lg mb-3`}>
               <Stethoscope className="w-5 h-5" />
           </div>
           <h3 className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wider">Voice Analysis</h3>
           <div className="text-lg font-bold text-slate-900 mb-1">{results.voice.prediction}</div>
           <div className="text-xs text-slate-500 font-medium">P(PD): {(results.voice.parkinson_probability * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Severity & Synthesis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-start">
           <div className="p-3 bg-orange-50 text-orange-600 rounded-xl mb-4">
               <TrendingDown className="w-6 h-6" />
           </div>
           <h3 className="text-slate-500 text-sm font-semibold mb-1 uppercase tracking-wide">Predicted motor severity (UPDRS)</h3>
           <div className="text-4xl font-black text-slate-900 mb-2">{results.severity.score}</div>
           <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 mb-3">
             {sev.label}
           </div>
           <p className="text-sm text-slate-600 leading-snug">{sev.hint}</p>
           <p className="text-[10px] text-slate-400 mt-4 italic">Error margin: ±{results.severity.margin_of_error} points</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
           <h3 className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Diagnostic Summary</h3>
           <p className="text-xl md:text-2xl font-bold text-slate-900 leading-tight mb-6">
             {composite}
           </p>
           <div className="flex items-center text-slate-500 text-sm">
             <div className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
             This summary aggregates results from all modalities to provide a combined clinical perspective.
           </div>
        </div>
      </div>

      {/* Detailed Data Matrix */}
      <section className="mb-10 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Detailed analysis matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Modality</th>
                <th className="px-6 py-4">Clinical Verdict</th>
                <th className="px-6 py-4">Confidence / Prob.</th>
                <th className="px-6 py-4">Model Architecture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="px-6 py-4 font-bold text-slate-900">Voice Screening</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${results.voice.status ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {results.voice.prediction}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-medium">{(results.voice.parkinson_probability * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-slate-500">RF Classifier (Vikas Ukani features)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-slate-900">Spiral Drawing</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${results.spiral.status ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {results.spiral.prediction}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-medium">{(results.spiral.probability * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-slate-500">ResNet18 (224×224 RGB)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-slate-900">Wave Drawing</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${results.wave.status ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {results.wave.prediction}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-medium">{(results.wave.probability * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-slate-500">ResNet18 (224×224 RGB)</td>
              </tr>
              <tr className="bg-blue-50/50">
                <td className="px-6 py-4 font-bold text-blue-900">Visual Ensemble</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${results.visual_ensemble.status ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {results.visual_ensemble.prediction}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-blue-900">{(results.visual_ensemble.probability * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-slate-500 italic">Mean(Spiral, Wave)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col items-center mb-12">
        <p className="mt-3 text-xs text-slate-500 text-center max-w-2xl leading-relaxed">
          This tool is for education and demonstration only. It is not a medical device and must not replace clinical
          diagnosis or treatment decisions.
        </p>
      </div>
      
      <div className="flex justify-center">
         <button 
           onClick={handleRestart}
           className="flex items-center px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-slate-50 rounded-xl font-medium transition-all focus:ring-4 focus:ring-blue-100"
         >
           <RefreshCcw className="w-5 h-5 mr-3" />
           Start New Evaluation
         </button>
      </div>

    </div>
  );
};

export default Results;
