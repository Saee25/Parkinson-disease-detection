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
  const flags = [voicePd, spiralPd].filter(Boolean).length;
  const composite =
    flags >= 2
      ? 'High agreement between voice and spiral classifiers.'
      : flags === 1
        ? 'Mixed signals: one modality flagged Parkinsonian patterns.'
        : 'Neither voice nor spiral classifiers crossed the screening threshold.';

  const sev = severityBand(Number(results.severity?.score));

  return (
    <div className="animate-fade-in max-w-4xl mx-auto w-full">
      <header className="mb-8 text-center pb-8 border-b border-slate-200">
        <div className={`mx-auto w-16 h-16 ${results.voice.status || results.spiral.status ? 'bg-red-100' : 'bg-green-100'} rounded-full flex items-center justify-center mb-4`}>
            {results.voice.status || results.spiral.status ? (
                <Activity className="w-8 h-8 text-red-600" />
            ) : (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h1>
        <p className="text-slate-600 text-lg">
            {results.voice.status || results.spiral.status 
             ? "Patterns suggestive of Parkinson's Disease were detected." 
             : "No significant Parkinsonian markers were detected."}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          
        {/* Spiral Result */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-3 ${results.spiral.status ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-lg mb-4`}>
               <Activity className="w-6 h-6" />
           </div>
           <h3 className="text-slate-500 text-sm font-medium mb-1">Handwriting Analysis</h3>
           <div className="text-xl font-bold text-slate-900 mb-2">{results.spiral.prediction}</div>
           <div className="text-sm text-slate-500">Prob: {(results.spiral.probability * 100).toFixed(1)}%</div>
        </div>

        {/* Voice Result */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className={`p-3 ${results.voice.status ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'} rounded-lg mb-4`}>
               <Stethoscope className="w-6 h-6" />
           </div>
           <h3 className="text-slate-500 text-sm font-medium mb-1">Acoustic Analysis</h3>
           <div className="text-xl font-bold text-slate-900 mb-2">{results.voice.prediction}</div>
           <div className="text-sm text-slate-500">
             Model confidence: {(results.voice.confidence * 100).toFixed(0)}%
             {typeof results.voice.parkinson_probability === 'number' && (
               <span className="block mt-1">
                 P(PD | voice): {(results.voice.parkinson_probability * 100).toFixed(1)}%
               </span>
             )}
           </div>
        </div>

        {/* Severity Score */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
           <div className="p-3 bg-orange-50 text-orange-600 rounded-lg mb-4">
               <TrendingDown className="w-6 h-6" />
           </div>
           <h3 className="text-slate-500 text-sm font-medium mb-1">Predicted motor severity (UPDRS)</h3>
           <div className="text-3xl font-bold text-slate-900 mb-2">{results.severity.score}</div>
           <p className="text-xs text-slate-500 mb-1">
             Band: <span className="font-medium text-slate-700">{sev.label}</span>
           </p>
           <p className="text-xs text-slate-400">{sev.hint}</p>
           <p className="text-xs text-slate-400 mt-2">Error margin (MAE-based): ±{results.severity.margin_of_error}</p>
        </div>

      </div>

      <section className="mb-10 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Full report matrix</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3">Modality</th>
                <th className="px-4 py-3">Output</th>
                <th className="px-4 py-3">Score / probability</th>
                <th className="px-4 py-3">Dataset / model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="px-4 py-3 font-medium">Voice screening</td>
                <td className="px-4 py-3">{results.voice.prediction}</td>
                <td className="px-4 py-3">
                  {(results.voice.confidence * 100).toFixed(0)}% conf.
                  {typeof results.voice.parkinson_probability === 'number' && (
                    <span className="block text-slate-500">
                      P(PD): {(results.voice.parkinson_probability * 100).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">Vikas Ukani features → RF classifier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Spiral / drawing</td>
                <td className="px-4 py-3">{results.spiral.prediction}</td>
                <td className="px-4 py-3">{(results.spiral.probability * 100).toFixed(1)}% P(PD)</td>
                <td className="px-4 py-3 text-slate-600">Spiral CNN (100×100 RGB)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Severity (acoustic)</td>
                <td className="px-4 py-3">{sev.label}</td>
                <td className="px-4 py-3">
                  {results.severity.score} motor UPDRS (est.)
                </td>
                <td className="px-4 py-3 text-slate-600">Laila Qadir Musib acoustic → RF regressor</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Synthesis.</span> {composite} Severity is predicted from the
          same microphone recording using acoustic features aligned to the progression dataset (not from the spiral image).
        </p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          This tool is for education and demonstration only. It is not a medical device and must not replace clinical
          diagnosis or treatment decisions.
        </p>
      </section>
      
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
