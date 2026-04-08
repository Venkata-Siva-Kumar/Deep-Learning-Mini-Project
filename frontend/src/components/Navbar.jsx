import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity } from 'lucide-react';

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass-morphism border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and App Name */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="relative">
              <Brain className="w-8 h-8 text-blue-400" />
              <motion.div
                className="absolute inset-0 w-8 h-8 bg-blue-400 rounded-full blur-xl opacity-50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Building Change Detection
              </h1>
              <p className="text-xs text-gray-400">Powered by SCASN Model</p>
            </div>
          </motion.div>

          {/* Status Badge */}
          <motion.div
            className="flex items-center space-x-2"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <motion.div
              className="flex items-center space-x-2 px-4 py-2 rounded-full glass-morphism border border-green-400/30"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm font-medium text-green-400">Model Ready</span>
              <Activity className="w-4 h-4 text-green-400" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
