import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Loader2, CheckCircle, Sparkles } from 'lucide-react';

const DetectButton = ({ onClick, disabled, isLoading, loadingStep }) => {
  const loadingMessages = [
    'Analyzing Temporal Changes...',
    'Running SCASN Model...',
    'Generating Change Mask...',
  ];

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          relative overflow-hidden rounded-2xl px-12 py-5
          font-bold text-lg tracking-wide
          transition-all duration-300
          ${
            disabled && !isLoading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'cursor-pointer'
          }
          ${
            !disabled && !isLoading
              ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]'
              : ''
          }
          ${isLoading ? 'bg-gray-800 cursor-wait' : ''}
        `}
        whileHover={!disabled && !isLoading ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.95 } : {}}
        animate={
          !disabled && !isLoading
            ? {
                boxShadow: [
                  '0 0 20px rgba(59, 130, 246, 0.3)',
                  '0 0 40px rgba(59, 130, 246, 0.6)',
                  '0 0 20px rgba(59, 130, 246, 0.3)',
                ],
              }
            : {}
        }
        transition={
          !disabled && !isLoading
            ? {
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }
            : {}
        }
      >
        {/* Animated gradient background */}
        {!disabled && !isLoading && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              backgroundSize: '200% 200%',
            }}
          />
        )}

        {/* Button content */}
        <div className="relative z-10 flex items-center space-x-3">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center space-x-3"
              >
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-white">
                  {loadingMessages[loadingStep] || 'Processing...'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center space-x-3"
              >
                <Scan className="w-6 h-6" />
                <span>Detect Changes</span>
                <Sparkles className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress indicator dots */}
        {isLoading && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i <= loadingStep ? 'bg-blue-400' : 'bg-gray-600'
                }`}
                initial={false}
                animate={{
                  scale: i === loadingStep ? 1.3 : 1,
                  opacity: i <= loadingStep ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        )}
      </motion.button>

      {/* Status text */}
      <AnimatePresence>
        {disabled && !isLoading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 text-sm text-gray-500"
          >
            Upload both images to start detection
          </motion.p>
        )}
      </AnimatePresence>

      {/* Success indicator */}
      <AnimatePresence>
        {!disabled && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Ready to analyze</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DetectButton;
