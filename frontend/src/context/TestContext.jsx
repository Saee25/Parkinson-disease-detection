import React, { createContext, useContext, useState } from 'react';

const TestContext = createContext();

export const useTestContext = () => useContext(TestContext);

export const TestProvider = ({ children }) => {
  const [completedTests, setCompletedTests] = useState({
    spiral: false,
    voice: false
  });

  const [testData, setTestData] = useState({
    spiralData: null,
    voiceBlob: null
  });

  const [results, setResults] = useState(null);

  const saveTestResult = (testType, data) => {
    setTestData(prev => ({ ...prev, [testType === 'spiral' ? 'spiralData' : 'voiceBlob']: data }));
    setCompletedTests(prev => ({ ...prev, [testType]: true }));
  };

  const resetTests = () => {
    setCompletedTests({ spiral: false, voice: false });
    setTestData({ spiralData: null, voiceBlob: null });
    setResults(null);
  };

  const generateFormData = () => {
    const formData = new FormData();
    if (testData.spiralData) {
        formData.append('spiralData', JSON.stringify(testData.spiralData));
    }
    if (testData.voiceBlob) {
        formData.append('voiceBlob', testData.voiceBlob, 'phonation_test.webm');
    }
    return formData;
  };

  return (
    <TestContext.Provider value={{ completedTests, testData, results, setResults, saveTestResult, resetTests, generateFormData }}>
      {children}
    </TestContext.Provider>
  );
};
