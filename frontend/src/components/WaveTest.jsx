import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2, Activity, ChevronLeft } from 'lucide-react';
import { useTestContext } from '../context/TestContext';

const WaveTest = ({ onBack }) => {
  const { saveTestResult } = useTestContext();
  const canvasRef = useRef(null);
  const [traces, setTraces] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasSize = 500;
  const centerY = canvasSize / 2;

  const drawTemplate = (ctx) => {
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const amplitude = 120;
    const frequency = 0.05;
    const startX = 20;
    const endX = 480;

    for (let x = startX; x <= endX; x += 1) {
      const y = centerY + amplitude * Math.sin(frequency * (x - startX));
      if (x === startX) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawTraces = (ctx, allStrokes, activeStroke) => {
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (stroke) => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    };

    allStrokes.forEach(drawStroke);
    if (activeStroke) drawStroke(activeStroke);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTemplate(ctx);
    drawTraces(ctx, traces, currentStroke);
  };

  useEffect(() => {
    redraw();
  }, [traces, currentStroke]);

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

  const handleClear = () => {
    setTraces([]);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setTraces((prev) => prev.slice(0, -1));
  };

  const handleAnalyze = () => {
    if (traces.length === 0 && currentStroke.length === 0) {
        alert("Please draw on the wave before analyzing.");
        return;
    }
    const allStrokes = currentStroke.length > 0 ? [...traces, currentStroke] : traces;
    const finalData = {
      testType: 'Wave Drawing',
      canvasBounds: { width: canvasSize, height: canvasSize },
      targetTemplate: {
         type: 'SineWave',
         parameters: { amplitude: 120, frequency: 0.05, startX: 20, endX: 480 }
      },
      strokes: allStrokes
    };
    
    saveTestResult('wave', finalData);
    onBack();
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full max-w-2xl mx-auto">
      <div className="flex w-full items-center mb-6">
        <button 
           onClick={onBack}
           className="flex items-center text-slate-600 hover:text-blue-600 transition-colors mr-4"
        >
            <ChevronLeft className="w-6 h-6" /> Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Wave Drawing Test</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full mb-6">
          <p className="text-slate-600 mb-6 text-center">
              Please trace the sine wave from left to right as accurately as possible.
          </p>

          <div className="flex justify-center mb-6">
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                className="bg-slate-50 border-2 border-slate-200 rounded-xl cursor-crosshair touch-none"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onTouchCancel={handleEnd}
                aria-label="Wave drawing canvas"
              />
          </div>

          <div className="flex justify-between items-center w-full max-w-[500px] mx-auto gap-4">
              <div className="flex gap-3">
                  <button 
                    onClick={handleClear}
                    className="flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors focus:ring-4 focus:ring-red-200"
                  >
                    <Trash2 className="w-5 h-5 mr-2" /> Clear
                  </button>
                  <button 
                    onClick={handleUndo}
                    disabled={traces.length === 0}
                    className="flex items-center px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-slate-200"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" /> Undo
                  </button>
              </div>

              <button 
                onClick={handleAnalyze}
                className="flex items-center px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors shadow-sm focus:ring-4 focus:ring-blue-300"
              >
                <Activity className="w-5 h-5 mr-2" /> Analyze Wave
              </button>
          </div>
      </div>
    </div>
  );
};

export default WaveTest;
