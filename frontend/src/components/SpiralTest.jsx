import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2, Activity, ChevronLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { useTestContext } from '../context/TestContext';

const SpiralTest = ({ onBack }) => {
  const { saveTestResult } = useTestContext();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Traces for digital drawing
  const [traces, setTraces] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Physical photo state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [inputType, setInputType] = useState('digital'); // 'digital' or 'physical'

  const canvasSize = 500;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;

  const drawTemplate = (ctx) => {
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const a = 0;
    const b = 12;
    const maxTheta = 6 * Math.PI;

    for (let theta = 0; theta <= maxTheta; theta += 0.05) {
      const r = a + b * theta;
      const x = centerX + r * Math.cos(theta);
      const y = centerY + r * Math.sin(theta);
      if (theta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawTraces = (ctx, allStrokes, activeStroke) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const drawStroke = (stroke) => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    };
    allStrokes.forEach(drawStroke);
    if (activeStroke) drawStroke(activeStroke);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || inputType !== 'digital') return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTemplate(ctx);
    drawTraces(ctx, traces, currentStroke);
  };

  useEffect(() => {
    redraw();
  }, [traces, currentStroke, inputType]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      timestamp: Date.now()
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCoordinates(e);
    setCurrentStroke([point]);
  };

  const handleMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const point = getCoordinates(e);
    setCurrentStroke((prev) => [...prev, point]);
  };

  const handleEnd = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setTraces((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setInputType('physical');
    }
  };

  const handleAnalyze = () => {
    if (inputType === 'physical') {
        if (!selectedFile) {
            alert("Please upload a photo first.");
            return;
        }
        saveTestResult('spiralFile', selectedFile);
    } else {
        if (traces.length === 0 && currentStroke.length === 0) {
            alert("Please draw on the spiral before analyzing.");
            return;
        }
        const allStrokes = currentStroke.length > 0 ? [...traces, currentStroke] : traces;
        const finalData = {
          testType: 'Spiral Drawing',
          canvasBounds: { width: canvasSize, height: canvasSize },
          strokes: allStrokes
        };
        saveTestResult('spiral', finalData);
    }
    onBack();
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full max-w-2xl mx-auto">
      <div className="flex w-full items-center mb-4">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-blue-600 transition-colors mr-4">
            <ChevronLeft className="w-6 h-6" /> Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Spiral Drawing Test</h2>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 w-full mb-4">
          <div className="flex justify-center gap-4 mb-4">
              <button 
                onClick={() => setInputType('digital')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${inputType === 'digital' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                  Digital Canvas
              </button>
              <button 
                onClick={() => setInputType('physical')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${inputType === 'physical' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                  Physical Upload
              </button>
          </div>

          {inputType === 'digital' ? (
              <div className="flex flex-col items-center">
                  <p className="text-slate-600 mb-3 text-center text-sm sm:text-base">
                      Please carefully trace the faint gray spiral from the inside out.
                  </p>
                  <canvas
                    ref={canvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className="bg-slate-50 border-2 border-slate-200 rounded-xl cursor-crosshair touch-none mb-4 w-full max-w-[450px] aspect-square"
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    onTouchCancel={handleEnd}
                  />
                  <div className="flex gap-4">
                      <button onClick={() => setTraces([])} className="flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                        <Trash2 className="w-5 h-5 mr-2" /> Clear
                      </button>
                      <button onClick={() => setTraces(prev => prev.slice(0, -1))} disabled={traces.length === 0} className="flex items-center px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors disabled:opacity-50">
                        <RotateCcw className="w-5 h-5 mr-2" /> Undo
                      </button>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col items-center">
                  <p className="text-slate-600 mb-3 text-center text-sm sm:text-base">
                      Draw a standard Archimedean spiral on a clean white paper, snap a photo, and upload it here.
                  </p>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-full max-w-[450px] aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mb-4 overflow-hidden relative group"
                  >
                      {previewUrl ? (
                          <>
                            <img src={previewUrl} alt="Spiral Preview" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-medium flex items-center">
                                    <Upload className="w-5 h-5 mr-2" /> Change Photo
                                </span>
                            </div>
                          </>
                      ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                            <span className="text-slate-500 font-medium text-center px-6">Click to upload your spiral drawing photo</span>
                          </>
                      )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
              </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
              <button 
                onClick={handleAnalyze}
                className="flex items-center px-8 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold transition-all shadow-lg hover:shadow-xl transform active:scale-95"
              >
                <Activity className="w-5 h-5 mr-2" /> Save & Continue
              </button>
          </div>
      </div>
    </div>
  );
};

export default SpiralTest;
