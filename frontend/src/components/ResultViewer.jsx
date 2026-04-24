import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, Download, Layers, Eye, ChevronLeft, GitCompare } from 'lucide-react';
import OverlayViewer from './OverlayViewer';
import { API_BASE_URL } from '../config';

const ResultViewer = ({ result, onClose }) => {
  const [activeView, setActiveView] = useState('all');
  const [zoomedImage, setZoomedImage] = useState(null);

  // Demo data - replace with actual API response
  const images = {
    t1: result?.t1Image || '/api/placeholder/400/320',
    t2: result?.t2Image || '/api/placeholder/400/320',
    mask: result?.changeMask || '/api/placeholder/400/320',
  };

  const viewOptions = [
    { id: 'all', label: 'All Views', icon: Layers },
    { id: 'overlay', label: 'Overlay View', icon: GitCompare },
    { id: 't1', label: 'T1 Image', icon: Eye },
    { id: 't2', label: 'T2 Image', icon: Eye },
    { id: 'mask', label: 'Change Mask', icon: Eye },
    { id: 'compare', label: 'Compare', icon: ChevronLeft },
  ];

  const handleDownload = async () => {
    if (result?.downloadUrl) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `building-change-analysis-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      // Create a zip file or download individual files
      const response = await fetch(`${API_BASE_URL}/download-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          t1Image: images.t1,
          t2Image: images.t2,
          maskImage: images.mask,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `building-change-analysis-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed');
        // Fallback: download current view as image
        downloadCurrentView();
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: download current view as image
      downloadCurrentView();
    }
  };

  const downloadCurrentView = () => {
    // Fallback: download the current active view as image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Find the current image being displayed
    let currentImageSrc = images.t1; // default
    if (activeView === 't2') currentImageSrc = images.t2;
    else if (activeView === 'mask') currentImageSrc = images.mask;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `building-change-${activeView}-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    };
    img.src = currentImageSrc;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-lg border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
              <p className="text-sm text-gray-400">Change detection completed successfully</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* View toggle buttons */}
              <div className="hidden md:flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
                {viewOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView(option.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${
                        activeView === option.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <option.icon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Download button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </motion.button>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Results content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeView === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* T1 Image */}
              <ResultCard
                title="T1 Satellite Image"
                subtitle="Baseline temporal data"
                image={images.t1}
                color="blue"
                onZoom={() => setZoomedImage(images.t1)}
              />

              {/* T2 Image */}
              <ResultCard
                title="T2 Satellite Image"
                subtitle="Current temporal data"
                image={images.t2}
                color="purple"
                onZoom={() => setZoomedImage(images.t2)}
              />

              {/* Change Mask */}
              <ResultCard
                title="Change Mask"
                subtitle="Detected building changes"
                image={images.mask}
                color="green"
                onZoom={() => setZoomedImage(images.mask)}
                isHighlighted
              />
            </motion.div>
          )}

          {activeView === 't1' && (
            <SingleView
              key="t1"
              image={images.t1}
              title="T1 Satellite Image"
              color="blue"
              onZoom={() => setZoomedImage(images.t1)}
            />
          )}

          {activeView === 't2' && (
            <SingleView
              key="t2"
              image={images.t2}
              title="T2 Satellite Image"
              color="purple"
              onZoom={() => setZoomedImage(images.t2)}
            />
          )}

          {activeView === 'mask' && (
            <SingleView
              key="mask"
              image={images.mask}
              title="Change Detection Mask"
              color="green"
              onZoom={() => setZoomedImage(images.mask)}
            />
          )}

          {activeView === 'overlay' && (
            <OverlayView
              key="overlay"
              t1Image={images.t1}
              maskImage={images.mask}
              stats={result?.stats}
              onZoom={() => setZoomedImage(images.t1)}
            />
          )}

          {activeView === 'compare' && (
            <CompareView
              key="compare"
              t1Image={images.t1}
              t2Image={images.t2}
            />
          )}
        </AnimatePresence>

        {/* Stats section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center"
        >
          <StatCard label="Buildings Detected" value={result?.stats?.buildingsDetected ?? '-'} color="blue" />
          <StatCard label="Accuracy score" value={`${result?.stats?.accuracyScore ?? '-'}%`} color="purple" />
          <StatCard label="Processing Time" value={`${result?.stats?.processingTime ?? '-'}s`} color="pink" />
        </motion.div>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={zoomedImage}
              alt="Zoomed view"
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Result Card Component
const ResultCard = ({ title, subtitle, image, color, onZoom, isHighlighted }) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/5 border-green-500/30',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className={`
        relative rounded-2xl overflow-hidden
        bg-gradient-to-br ${colorClasses[color]}
        border-2 ${isHighlighted ? 'ring-2 ring-green-400/50' : ''}
        transition-all duration-300
      `}
    >
      <div className="p-4 border-b border-white/10 bg-white/5">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
      <div className="relative group" style={{ minHeight: '200px' }}>
        <img
          src={image}
          alt={title}
          className="w-full h-auto max-h-[300px] object-contain bg-black/30"
        />
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          onClick={onZoom}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70"
        >
          <ZoomIn className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// Single View Component
const SingleView = ({ image, title, color, onZoom }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="max-w-4xl mx-auto"
  >
    <div className={`rounded-2xl overflow-hidden border-2 border-${color}-500/30`}>
      <div className="p-4 bg-gray-800/50 border-b border-white/10">
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="relative group">
        <div className="w-full flex items-center justify-center bg-black/30" style={{ minHeight: '400px' }}>
          <img src={image} alt={title} className="max-w-full max-h-[70vh] object-contain" />
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={onZoom}
          className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <ZoomIn className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  </motion.div>
);

// Overlay View Component
const OverlayView = ({ t1Image, maskImage, onZoom, stats }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="max-w-5xl mx-auto"
  >
    <OverlayViewer t1Image={t1Image} maskImage={maskImage} onZoom={onZoom} stats={stats} />
  </motion.div>
);

// Compare View Component
const CompareView = ({ t1Image, t2Image }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30">
        <div className="p-4 bg-gray-800/50 border-b border-white/10">
          <h3 className="font-semibold text-white">Before / After Comparison</h3>
        </div>
        <div className="grid grid-cols-2 gap-0 bg-black/30">
          {/* T1 Image (Before) */}
          <div className="flex items-center justify-center p-2">
            <div className="w-full flex flex-col items-center">
              <img
                src={t1Image}
                alt="Before"
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
          </div>

          {/* T2 Image (After) */}
          <div className="flex items-center justify-center p-2 border-l border-white/10">
            <div className="w-full flex flex-col items-center">
              <img
                src={t2Image}
                alt="After"
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
          </div>
        </div>
        
        {/* Labels */}
        <div className="grid grid-cols-2 gap-0 bg-gray-800/50 border-t border-white/10">
          <div className="p-4 border-r border-white/10 text-center">
            <span className="text-blue-400 font-medium">T1 (Before)</span>
          </div>
          <div className="p-4 text-center">
            <span className="text-purple-400 font-medium">T2 (After)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    pink: 'text-pink-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="p-4 rounded-xl glass-morphism border border-white/10"
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </motion.div>
  );
};

export default ResultViewer;
