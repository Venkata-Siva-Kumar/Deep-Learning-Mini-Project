import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import UploadCard from './components/UploadCard';
import DetectButton from './components/DetectButton';
import ResultViewer from './components/ResultViewer';
import { Satellite, Layers, Zap, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from './config';

function App() {
  const [t1File, setT1File] = useState(null);
  const [t2File, setT2File] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  // Loading animation steps
  useEffect(() => {
    if (isLoading) {
      const steps = [0, 1, 2];
      let currentStep = 0;
      
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          setLoadingStep(currentStep);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoading]);

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

  const computeMaskStats = async (maskUrl) => {
    const img = await loadImage(maskUrl);
    const width = img.width;
    const height = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const whiteMask = new Uint8Array(width * height);
    let whitePixelCount = 0;

    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      const brightness = (r + g + b) / 3;
      const isWhite = a > 128 && brightness > 200;
      if (isWhite) {
        whiteMask[j] = 1;
        whitePixelCount += 1;
      }
    }

    const totalPixels = width * height;
    const changesFound = totalPixels > 0 ? Math.round((whitePixelCount / totalPixels) * 100) : 0;

    const visited = new Uint8Array(width * height);
    let buildingsDetected = 0;
    const stack = [];
    const neighborOffsets = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];

    for (let idx = 0; idx < whiteMask.length; idx += 1) {
      if (whiteMask[idx] !== 1 || visited[idx]) continue;
      let regionSize = 0;
      stack.push(idx);
      visited[idx] = 1;

      while (stack.length) {
        const current = stack.pop();
        regionSize += 1;

        const x = current % width;
        const y = Math.floor(current / width);

        for (const offset of neighborOffsets) {
          const neighbor = current + offset;
          if (neighbor < 0 || neighbor >= whiteMask.length) continue;
          const nx = neighbor % width;
          const ny = Math.floor(neighbor / width);
          if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1) continue;
          if (whiteMask[neighbor] === 1 && !visited[neighbor]) {
            visited[neighbor] = 1;
            stack.push(neighbor);
          }
        }
      }

      if (regionSize >= 16) {
        buildingsDetected += 1;
      }
    }

    const normalizedArea = whitePixelCount / Math.max(totalPixels, 1);
    const confidenceScore = whitePixelCount === 0
      ? 40
      : Math.min(100, Math.max(50, Math.round(80 - Math.abs(0.12 - normalizedArea) * 100 + Math.min(10, buildingsDetected))));

    return {
      buildingsDetected,
      changesFound,
      confidenceScore,
    };
  };

  const handleDetect = async () => {
    if (!t1File || !t2File) return;

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append('image_before', t1File);
      formData.append('image_after', t2File);

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const maskUrl = `${API_BASE_URL}/${data.mask}`;
      const fallbackStats = await computeMaskStats(maskUrl);

      // Calculate processing time
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);
      
      const backendStats = data.stats || {};
      const buildingsDetected = backendStats.buildingsDetected ?? fallbackStats.buildingsDetected;
      const changesFound = backendStats.changesFound ?? fallbackStats.changesFound;
      const confidenceScore = backendStats.confidenceScore ?? fallbackStats.confidenceScore;
      
      setResult({
        t1Image: `${API_BASE_URL}/${data.before_image}`,
        t2Image: `${API_BASE_URL}/${data.after_image}`,
        changeMask: maskUrl,
        stats: {
          buildingsDetected,
          changesFound,
          confidenceScore,
          processingTime,
        },
      });

      setShowResults(true);
    } catch (err) {
      console.error('Detection failed:', err);
      setError(err.message || 'Failed to process images. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Navbar */}
      <Navbar />

      {/* Main content */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">AI-Powered Satellite Analysis</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Building Change Detection
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Upload satellite imagery from two time periods and let our SCASN model 
              automatically detect and highlight building changes with high precision.
            </p>
          </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-8">
            <UploadCard
              title="T1 Image (Before)"
              subtitle="Upload earlier satellite image"
              onFileSelect={setT1File}
              file={t1File}
              onRemove={() => setT1File(null)}
              side="left"
            />
            <UploadCard
              title="T2 Image (After)"
              subtitle="Upload later satellite image"
              onFileSelect={setT2File}
              file={t2File}
              onRemove={() => setT2File(null)}
              side="right"
            />
          </div>

          {/* Detection button */}
          <div className="flex justify-center mb-12">
            <DetectButton
              onClick={handleDetect}
              disabled={!t1File || !t2File}
              isLoading={isLoading}
              loadingStep={loadingStep}
            />
          </div>

          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <InfoCard
              icon={Satellite}
              title="Satellite Imagery"
              description="Supports high-resolution GeoTIFF, JPEG, and PNG formats from any satellite source"
              color="blue"
            />
            <InfoCard
              icon={Layers}
              title="SCASN Model"
              description="State-of-the-art deep learning architecture for accurate change detection"
              color="purple"
            />
            <InfoCard
              icon={Zap}
              title="Fast Processing"
              description="Get results in seconds with our optimized GPU-accelerated inference pipeline"
              color="green"
            />
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            Powered by SCASN Deep Learning Model • Built for Research & Production Use
          </p>
        </div>
      </footer>

      {/* Results modal */}
      <AnimatePresence>
        {showResults && (
          <ResultViewer result={result} onClose={handleCloseResults} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Info Card Component
const InfoCard = ({ icon: Icon, title, description, color }) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-transparent border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-transparent border-purple-500/30 text-purple-400',
    green: 'from-green-500/20 to-transparent border-green-500/30 text-green-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className={`
        p-6 rounded-2xl border bg-gradient-to-br ${colorClasses[color]}
        transition-all duration-300
      `}
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className={`p-2 rounded-lg bg-white/10`}>
          <Icon className={`w-5 h-5`} />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </motion.div>
  );
};

export default App;
