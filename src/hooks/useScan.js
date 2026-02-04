import { useState, useCallback, useRef, useEffect } from 'react';
import * as api from '../services/defenderApi';

const SCAN_PATHS = [
  'C:\\Users\\Downloads\\',
  'C:\\Users\\Documents\\',
  'C:\\Users\\Desktop\\',
  'C:\\Users\\AppData\\Local\\',
  'C:\\Users\\AppData\\Roaming\\',
  'C:\\Windows\\System32\\',
  'C:\\Windows\\SysWOW64\\',
  'C:\\Program Files\\',
  'C:\\Program Files (x86)\\',
  'C:\\Windows\\Temp\\',
];

export function useScan({ onComplete, onError } = {}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState(null);
  const [progress, setProgress] = useState({
    currentFile: '',
    filesScanned: 0
  });
  const [result, setResult] = useState(null);
  
  const intervalRef = useRef(null);

  const clearProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const simulateProgress = useCallback((interval = 200, increment = 50) => {
    let fileCount = 0;
    intervalRef.current = setInterval(() => {
      const randomPath = SCAN_PATHS[Math.floor(Math.random() * SCAN_PATHS.length)];
      const randomFile = `${randomPath}arquivo_${Math.floor(Math.random() * 10000)}.dll`;
      fileCount += Math.floor(Math.random() * increment) + 10;
      setProgress({
        currentFile: randomFile,
        filesScanned: fileCount
      });
    }, interval);
    
    return () => fileCount;
  }, []);

  const startScan = useCallback(async (type, customPath = null) => {
    try {
      setIsScanning(true);
      setScanType(type);
      setResult(null);
      setProgress({ currentFile: 'Iniciando scan...', filesScanned: 0 });

      // Configura simulação de progresso
      const intervals = { quick: 200, full: 300, custom: 250 };
      const increments = { quick: 50, full: 100, custom: 75 };
      simulateProgress(intervals[type] || 200, increments[type] || 50);

      // Executa scan apropriado
      let scanResult;
      switch (type) {
        case 'quick':
          scanResult = await api.quickScan();
          break;
        case 'full':
          scanResult = await api.fullScan();
          break;
        case 'custom':
          if (!customPath) {
            const folder = await api.selectFolder();
            if (!folder) {
              throw new Error('Nenhuma pasta selecionada');
            }
            customPath = folder;
          }
          scanResult = await api.customScan(customPath);
          break;
        default:
          throw new Error('Tipo de scan inválido');
      }

      clearProgress();
      setProgress(prev => ({ ...prev, currentFile: 'Scan concluído!' }));
      setResult(scanResult);
      onComplete?.(scanResult, type);
      
      return scanResult;
    } catch (error) {
      clearProgress();
      setIsScanning(false);
      setScanType(null);
      
      if (String(error).toLowerCase().includes('em andamento')) {
        onError?.({ type: 'scan_in_progress', error, retryFn: () => startScan(type, customPath) });
      } else {
        onError?.({ type: 'error', error });
      }
      
      throw error;
    } finally {
      setIsScanning(false);
    }
  }, [simulateProgress, clearProgress, onComplete, onError]);

  const cancelScan = useCallback(async () => {
    try {
      await api.cancelScan();
      clearProgress();
      setIsScanning(false);
      setScanType(null);
      setProgress({ currentFile: '', filesScanned: 0 });
    } catch (error) {
      console.error('Erro ao cancelar scan:', error);
      throw error;
    }
  }, [clearProgress]);

  const getSummary = useCallback(async (type) => {
    return api.getLastScanSummary(type);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => clearProgress();
  }, [clearProgress]);

  return {
    isScanning,
    scanType,
    progress,
    result,
    startScan,
    cancelScan,
    getSummary
  };
}

export default useScan;
