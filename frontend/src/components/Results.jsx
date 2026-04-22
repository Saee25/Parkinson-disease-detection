import React from 'react';
import { Activity, RefreshCcw, CheckCircle2, TrendingDown, Stethoscope, Download } from 'lucide-react';
import { useTestContext } from '../context/TestContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const severityBand = (score) => {
  if (score == null || Number.isNaN(score)) return { label: 'N/A', hint: '' };
  if (score < 20) return { label: 'Lower range', hint: 'Typical of milder motor burden on this scale (informational only).' };
  if (score < 40) return { label: 'Mid range', hint: 'Moderate motor burden on this scale (informational only).' };
  return { label: 'Higher range', hint: 'Higher motor burden on this scale (informational only).' };
};

const Results = ({ setActiveView }) => {
  const { results, resetTests } = useTestContext();

  if (!results) return null;

  // Calculate metrics first so they are available to all functions
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

  const handleRestart = () => {
    resetTests();
    setActiveView('dashboard');
  };

  const downloadReport = () => {
    console.log("Generating clinical report PDF...");
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Clinical Screening Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text("Parkinson's Disease Detection System (v1.0-ML)", 14, 35);
      
      // Horizontal Line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, 40, pageWidth - 14, 40);

      // Diagnostic Summary Section
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("1. Diagnostic Summary", 14, 50);
      
      const overallStatus = results.voice.status || results.visual_ensemble.status;
      doc.setFontSize(11);
      doc.setTextColor(overallStatus ? 185 : 22, overallStatus ? 28 : 101, overallStatus ? 28 : 52); // Red or Green
      const statusText = overallStatus 
          ? "RESULT: Positive Screening - Patterns suggestive of Parkinson's detected."
          : "RESULT: Negative Screening - No significant Parkinsonian markers detected.";
      doc.text(statusText, 14, 58);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      const wrapComposite = doc.splitTextToSize(composite, pageWidth - 28);
      doc.text(wrapComposite, 14, 65);

      // Results Table
      const tableData = [
        ["Voice Analysis", results.voice.prediction, `${(results.voice.parkinson_probability * 100).toFixed(1)}%`, "RF Classifier"],
        ["Spiral Drawing", results.spiral.prediction, `${(results.spiral.probability * 100).toFixed(1)}%`, "ResNet18 CNN"],
        ["Wave Drawing", results.wave.prediction, `${(results.wave.probability * 100).toFixed(1)}%`, "ResNet18 CNN"],
        ["Visual Ensemble", results.visual_ensemble.prediction, `${(results.visual_ensemble.probability * 100).toFixed(1)}%`, "Soft Voting"]
      ];

      autoTable(doc, {
        startY: 75,
        head: [["Modality", "Clinical Verdict", "Confidence", "Model"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: 14, right: 14 }
      });

      let currentY = doc.lastAutoTable.finalY + 15;

      // Severity Section
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Motor Severity (UPDRS)", 14, currentY);
      
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`Predicted UPDRS Score: ${results.severity.score} / 108`, 14, currentY + 8);
      doc.text(`Estimated Range: ${sev.label} (±${results.severity.margin_of_error} margin)`, 14, currentY + 14);
      
      // UPDRS Legend Table
      autoTable(doc, {
        startY: currentY + 20,
        head: [["Score Range", "Classification", "Typical Description"]],
        body: [
          ["0 - 10", "Minimal", "Normal or very early pre-clinical signs."],
          ["11 - 30", "Mild", "Early stage Parkinson's, mild motor symptoms."],
          ["31 - 50", "Moderate", "Established disease with noticeable tremors/slowness."],
          ["50+", "Severe", "Advanced stage with significant motor burden."]
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
        margin: { left: 14, right: 100 }
      });

      currentY = doc.lastAutoTable.finalY + 15;

      // Heatmaps Section
      if (results.spiral.heatmap || results.wave.heatmap) {
        if (currentY > 180) {
            doc.addPage();
            currentY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("3. Explainable AI: Visual Evidence", 14, currentY);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Grad-CAM analysis highlights the specific features (tremors, pressure changes) detected by the CNN.", 14, currentY + 6);
        
        currentY += 15;

        if (results.spiral.heatmap) {
            try {
              doc.addImage(results.spiral.heatmap, 'PNG', 14, currentY, 80, 80);
              doc.setFontSize(10);
              doc.setTextColor(71, 85, 105);
              doc.text("Spiral Heatmap Analysis", 14, currentY + 85);
            } catch (e) { 
              console.error("Spiral heatmap PDF error:", e);
              doc.text("[Spiral Heatmap Load Error]", 14, currentY + 40);
            }
        }
        
        if (results.wave.heatmap) {
            try {
              doc.addImage(results.wave.heatmap, 'PNG', 110, currentY, 80, 80);
              doc.setFontSize(10);
              doc.setTextColor(71, 85, 105);
              doc.text("Wave Heatmap Analysis", 110, currentY + 85);
            } catch (e) { 
              console.error("Wave heatmap PDF error:", e);
              doc.text("[Wave Heatmap Load Error]", 110, currentY + 40);
            }
        }
      }

      // Disclaimer Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text("CONFIDENTIAL MEDICAL SCREENING DATA - FOR CLINICAL REFERENCE ONLY", 14, 285);
          doc.text("This screening is powered by AI and should not replace professional neurological consultation.", 14, 290);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, 290);
      }

      console.log("PDF generated, triggering download...");
      doc.save(`PD_Clinical_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Critical PDF Generation Error:", err);
      alert("Failed to generate PDF. Please check the console for details.");
    }
  };

  // Results are already processed above

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

      {/* Grad-CAM Interpretability Section */}
      {(results.spiral.heatmap || results.wave.heatmap) && (
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Explainable AI (Interpretability Maps)</h2>
              <p className="text-sm text-slate-500">Grad-CAM heatmaps highlight the specific zones where the neural network detected Parkinsonian tremors.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {results.spiral.heatmap && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-700 font-bold mb-4 flex items-center justify-between">
                  Spiral Heatmap
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">GRAD-CAM LAYER 4</span>
                </h3>
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group">
                  <img 
                    src={results.spiral.heatmap} 
                    alt="Spiral Heatmap" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs">Red zones indicate higher "Parkinsonian" feature density detected by the model.</p>
                  </div>
                </div>
              </div>
            )}

            {results.wave.heatmap && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-700 font-bold mb-4 flex items-center justify-between">
                  Wave Heatmap
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">GRAD-CAM LAYER 4</span>
                </h3>
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group">
                  <img 
                    src={results.wave.heatmap} 
                    alt="Wave Heatmap" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs">Red zones highlight the irregularities in the wave rhythm that influenced the AI.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col items-center mb-12">
        <p className="mt-3 text-xs text-slate-500 text-center max-w-2xl leading-relaxed">
          This tool is for education and demonstration only. It is not a medical device and must not replace clinical
          diagnosis or treatment decisions.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
         <button 
           onClick={downloadReport}
           className="flex items-center px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium shadow-lg shadow-blue-200 transition-all focus:ring-4 focus:ring-blue-100"
         >
           <Download className="w-5 h-5 mr-3" />
           Download Clinical Report
         </button>

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
