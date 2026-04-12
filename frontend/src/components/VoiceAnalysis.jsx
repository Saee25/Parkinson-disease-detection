import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, ChevronLeft, Play, Download, Save } from 'lucide-react';
import { useTestContext } from '../context/TestContext';

const VoiceAnalysis = ({ onBack }) => {
  const { saveTestResult } = useTestContext();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentBlob, setCurrentBlob] = useState(null);
  
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const REQUIRED_DURATION = 10; // seconds

  const startRecording = async () => {
    try {
      setAudioUrl(null);
      setCurrentBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setting up Web Audio API for visualization
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 2048;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Setting up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setCurrentBlob(audioBlob);
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const diff = (Date.now() - startTime) / 1000;
        setRecordingTime(diff);
        
        if (diff >= REQUIRED_DURATION) {
          stopRecording(); // Auto stop at 10 seconds
        }
      }, 100);

      // Visualize function
      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        animationFrameRef.current = requestAnimationFrame(draw);

        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#f8fafc'; // slate-50 background to match Medical Minimalist
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2563eb'; // blue-600
        ctx.beginPath();

        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      };

      draw();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for this test.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    clearInterval(timerIntervalRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    
    setIsRecording(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  const progressPercentage = Math.min((recordingTime / REQUIRED_DURATION) * 100, 100);

  const handleSave = () => {
    if (currentBlob) {
        saveTestResult('voice', currentBlob);
        onBack();
    }
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
        <h2 className="text-2xl font-bold text-slate-900">Voice Analysis Test</h2>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 w-full mb-6">
          <p className="text-slate-600 mb-8 text-center text-lg">
              Take a deep breath and say <strong className="text-blue-600">"Ahhhh"</strong> at a comfortable pitch and volume for at least 10 seconds.
          </p>

          {/* Oscilloscope Canvas */}
          <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden mb-6 h-48 relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-full block"
                aria-label="Audio waveform visualizer"
              />
              
              {!isRecording && !audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
                      Waveform will appear here
                  </div>
              )}
          </div>

          {/* Progress Bar & Timer */}
          <div className="w-full mb-8">
              <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                  <span>Duration</span>
                  <span className={`${recordingTime >= REQUIRED_DURATION ? 'text-green-600' : 'text-slate-600'}`}>
                      {recordingTime.toFixed(1)}s / {REQUIRED_DURATION}s
                  </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                      className={`h-full transition-all duration-100 ease-linear ${recordingTime >= REQUIRED_DURATION ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${progressPercentage}%` }}
                  />
              </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center flex-col items-center gap-4">
              {isRecording ? (
                  <button 
                    onClick={stopRecording}
                    className="flex items-center justify-center w-20 h-20 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 animate-pulse"
                    aria-label="Stop Recording"
                  >
                     <Square className="w-8 h-8 fill-current" />
                  </button>
              ) : (
                  <button 
                    onClick={startRecording}
                    className="flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105"
                    aria-label="Start Recording"
                  >
                     <Mic className="w-8 h-8" />
                  </button>
              )}
              
              <span className="text-slate-500 font-medium">
                  {isRecording ? 'Recording in progress...' : 'Tap Mic to Start'}
              </span>
          </div>

          {/* Audio Playback / Export */}
          {audioUrl && !isRecording && (
              <div className="mt-8 p-6 border border-green-200 bg-green-50 rounded-xl animate-fade-in flex flex-col items-center">
                  <span className="text-green-800 font-semibold mb-4 text-center">Recording Captured Successfully</span>
                  <audio controls src={audioUrl} className="w-full mb-6 outline-none" />
                  
                  <div className="flex gap-4 w-full justify-center">
                    <a 
                        href={audioUrl} 
                        download="phonation_test.webm"
                        className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors shadow-sm focus:ring-4 focus:ring-blue-100"
                    >
                        <Download className="w-4 h-4 mr-2" /> Download
                    </a>
                    <button 
                        onClick={handleSave}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm focus:ring-4 focus:ring-blue-300"
                    >
                        <Save className="w-4 h-4 mr-2" /> Save & Return
                    </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default VoiceAnalysis;
