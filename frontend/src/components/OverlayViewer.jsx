import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Layers, ChevronLeft, ChevronRight, Maximize2, Info, BarChart3 } from 'lucide-react';

const OverlayViewer = ({ t1Image, maskImage, onZoom, stats }) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [showRawMask, setShowRawMask] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('region1');
  const hoverRegion = null;

  const regions = [
    {
      id: 'region1',
      name: 'Commercial Area',
      summary: 'High-rise office and retail complex development.',
      buildingType: 'Residential',
      projectedBuild: '5–7 floors',
      estimatedCost: '$1.8M',
      growthPotential: 'High',
      developmentPhase: 'Planning',
      highlightStyle: { top: '8%', left: '10%', width: '28%', height: '22%' },
    },
    {
      id: 'region2',
      name: 'Tech Park Avenue',
      summary: 'Modern innovation hub with workspace.',
      buildingType: 'Retail / Office',
      projectedBuild: '3–5 floors',
      estimatedCost: '$2.3M',
      growthPotential: 'Moderate',
      developmentPhase: 'Design',
      highlightStyle: { top: '32%', left: '48%', width: '24%', height: '28%' },
    },
    {
      id: 'region3',
      name: 'Residential Complex',
      summary: 'Large-scale mixed housing and community hub.',
      buildingType: 'Apartment Complex',
      projectedBuild: '6–8 floors',
      estimatedCost: '$3.2M',
      growthPotential: 'Strong',
      developmentPhase: 'Construction',
      highlightStyle: { top: '52%', left: '20%', width: '32%', height: '26%' },
    },
  ];

  const activeRegion = regions.find((region) => region.id === (hoverRegion?.id || selectedRegion)) || regions[0];

  const handleSliderChange = (e) => setSliderPosition(parseInt(e.target.value));

  const handleRegionClick = (region) => {
    setSelectedRegion(region.id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5 }} className="w-full">
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40">
            <span className="text-sm font-semibold text-red-400 flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>Detected Building Changes</span>
            </span>
          </motion.div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Info className="w-3 h-3" />
            <span>Red areas indicate changes</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {stats?.buildingsDetected != null && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800/70">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300"><span className="font-semibold text-white">{stats.buildingsDetected}</span> Buildings</span>
            </div>
          )}
          {stats?.accuracyScore != null && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800/70">
              <span className="text-sm text-gray-300"><span className="font-semibold text-white">{stats.accuracyScore}%</span> Accuracy</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <ToggleButton active={showOverlay} onClick={() => setShowOverlay(!showOverlay)} icon={showOverlay ? Eye : EyeOff} label="Show Overlay" />
          <ToggleButton active={showRawMask} onClick={() => setShowRawMask(!showRawMask)} icon={Layers} label="Show Raw Mask" />
        </div>
      </div>

      <div className="flex gap-6 h-[540px]">
        <div className="flex-shrink-0 w-[60%]">
          <motion.div className="relative rounded-2xl overflow-hidden border-2 border-gray-700/50 bg-black" style={{ height: '500px' }} whileHover={{ scale: 1.005 }}>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={t1Image} alt="T1" className="max-w-full max-h-full object-contain" draggable={false} />
          </div>

          <AnimatePresence>
            {showOverlay && !showRawMask && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-auto flex items-center justify-center"
              >
                <img
                  src={maskImage}
                  alt="Mask"
                  className="max-w-full max-h-full object-contain"
                  style={{ filter: 'brightness(2) contrast(1.5)', mixBlendMode: 'screen' }}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-red-500/30 mix-blend-multiply pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showRawMask && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-auto flex items-center justify-center"
              >
                <img src={maskImage} alt="Raw Mask" className="max-w-full max-h-full object-contain" style={{ opacity: 0.9 }} draggable={false} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 overflow-hidden z-10" style={{ width: `${sliderPosition}%` }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ width: `${10000 / Math.max(sliderPosition, 1)}%` }}>
              <img src={t1Image} alt="Original" className="max-w-full max-h-full object-contain" draggable={false} />
            </div>
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gray-900/70 text-white text-sm font-medium z-30">Original T1</div>
          </div>

          <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none" style={{ left: `${sliderPosition}%` }} />

          <motion.div className="absolute top-0 bottom-0 z-30 cursor-ew-resize" style={{ left: `calc(${sliderPosition}% - 20px)`, width: '40px' }} onMouseEnter={() => setIsDragging(true)} onMouseLeave={() => setIsDragging(false)}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <motion.div className="w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center" animate={{ boxShadow: isDragging ? '0 0 30px rgba(255,255,255,0.9)' : '0 4px 20px rgba(0,0,0,0.3)' }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <ChevronLeft className="w-4 h-4 text-gray-700" />
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </motion.div>
            </div>
          </motion.div>

          <input type="range" min="0" max="100" value={sliderPosition} onChange={handleSliderChange} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40" />

          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onZoom(); }} className="absolute bottom-4 right-4 p-3 rounded-full bg-gray-900/70 text-white hover:bg-gray-800/90 z-50">
            <Maximize2 className="w-5 h-5" />
          </motion.button>

          <div className="absolute bottom-4 left-4 flex items-center space-x-4 z-50">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-900/70">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-xs text-white">Building Changes</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-900/70">
              <div className="w-3 h-3 rounded bg-gray-500" />
              <span className="text-xs text-white">No Change</span>
            </div>
          </div>
        </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: '540px' }}>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Region Details</h3>
                  <p className="text-sm text-gray-400">Select a region to highlight it on the overlay.</p>
                </div>
                <div className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">Active</div>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl bg-white/5 p-4">
                  <h4 className="text-lg font-semibold text-white">{activeRegion.name}</h4>
                  <p className="mt-2 text-sm text-gray-300">{activeRegion.summary}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatRow label="Building" value={activeRegion.buildingType} />
                    <StatRow label="Cost" value={activeRegion.estimatedCost} />
                    <StatRow label="Growth" value={activeRegion.growthPotential} />
                    <StatRow label="Phase" value={activeRegion.developmentPhase} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-xl shadow-black/10">
              <h4 className="text-lg font-semibold text-white mb-4">Regions</h4>
              <div className="space-y-3">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => handleRegionClick(region)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedRegion === region.id ? 'border-cyan-400 bg-cyan-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{region.name}</span>
                      <span className="text-xs text-gray-400">{region.projectedBuild}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{region.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center space-x-4">
        <span className="text-sm text-gray-500">Original</span>
        <div className="flex-1 max-w-md h-2 bg-gray-700 rounded-full relative">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full" style={{ width: `${sliderPosition}%` }} />
          <div className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-600" style={{ left: `calc(${sliderPosition}% - 8px)`, transform: 'translateY(-50%)' }} />
        </div>
        <span className="text-sm text-gray-500">{sliderPosition}%</span>
      </div>
    </motion.div>
  );
};

const ToggleButton = ({ active, onClick, icon: Icon, label }) => (
  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </motion.button>
);

const StatRow = ({ label, value }) => (
  <div className="rounded-3xl bg-slate-900/80 p-3">
    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{label}</div>
    <div className="mt-1 text-sm font-semibold text-white">{value}</div>
  </div>
);

export default OverlayViewer;
