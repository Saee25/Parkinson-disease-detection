import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SpiralTest from './components/SpiralTest';
import WaveTest from './components/WaveTest';
import VoiceAnalysis from './components/VoiceAnalysis';
import LoadingSpinner from './components/LoadingSpinner';
import Results from './components/Results';
import { TestProvider } from './context/TestContext';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <TestProvider>
      <Layout>
        {activeView === 'dashboard' && <Dashboard setActiveView={setActiveView} />}
        {activeView === 'spiral' && <SpiralTest onBack={() => setActiveView('dashboard')} />}
        {activeView === 'wave' && <WaveTest onBack={() => setActiveView('dashboard')} />}
        {activeView === 'voice' && <VoiceAnalysis onBack={() => setActiveView('dashboard')} />}
        {activeView === 'loading' && <LoadingSpinner />}
        {activeView === 'results' && <Results setActiveView={setActiveView} />}
      </Layout>
    </TestProvider>
  );
}

export default App;
