import React, { createContext, useContext, useState } from 'react';

const TestContext = createContext();

export const useTestContext = () => useContext(TestContext);

export const TestProvider = ({ children }) => {
  const [completedTests, setCompletedTests] = useState({
    spiral: false,
    wave: false,
    voice: false
  });

  const [testData, setTestData] = useState({
    spiralData: null,
    waveData: null,
    spiralFile: null,
    waveFile: null,
    voiceBlob: null
  });

  const [results, setResults] = useState(null);

  const saveTestResult = (testType, data) => {
    // Determine the correct key based on testType
    let dataKey;
    if (testType === 'spiral') dataKey = 'spiralData';
    else if (testType === 'wave') dataKey = 'waveData';
    else if (testType === 'spiralFile') dataKey = 'spiralFile';
    else if (testType === 'waveFile') dataKey = 'waveFile';
    else dataKey = 'voiceBlob';

    setTestData(prev => ({ ...prev, [dataKey]: data }));
    
    // Mark as completed based on the general category
    const completionKey = (testType === 'spiral' || testType === 'spiralFile') ? 'spiral' :
                        (testType === 'wave' || testType === 'waveFile') ? 'wave' : 'voice';
    setCompletedTests(prev => ({ ...prev, [completionKey]: true }));
  };

  const resetTests = () => {
    setCompletedTests({ spiral: false, wave: false, voice: false });
    setTestData({ spiralData: null, waveData: null, spiralFile: null, waveFile: null, voiceBlob: null });
    setResults(null);
  };

  const generateFormData = () => {
    const formData = new FormData();
    
    // Voice is mandatory
    if (testData.voiceBlob) {
        formData.append('voiceBlob', testData.voiceBlob, 'phonation_test.webm');
    }

    // Spiral: Can be digital or physical
    if (testData.spiralFile) {
        formData.append('spiralFile', testData.spiralFile);
    } else if (testData.spiralData) {
        formData.append('spiralData', JSON.stringify(testData.spiralData));
    }

    // Wave: Can be digital or physical
    if (testData.waveFile) {
        formData.append('waveFile', testData.waveFile);
    } else if (testData.waveData) {
        formData.append('waveData', JSON.stringify(testData.waveData));
    }

    return formData;
  };

  return (
    <TestContext.Provider value={{ completedTests, testData, results, setResults, saveTestResult, resetTests, generateFormData }}>
      {children}
    </TestContext.Provider>
  );
};
