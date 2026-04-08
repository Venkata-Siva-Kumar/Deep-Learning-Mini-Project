import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon } from 'lucide-react';

const UploadCard = ({ title, subtitle, onFileSelect, file, onRemove, side }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tif', '.tiff'],
    },
    multiple: false,
  });

  const isLeft = side === 'left';

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -100 : 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.6,
        delay: isLeft ? 0.2 : 0.4,
        ease: 'easeOut',
      }}
      className="relative"
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl glass-morphism
          transition-all duration-300 ease-out
          ${isDragActive ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : ''}
          ${file ? 'border-green-400/50' : 'border-white/20'}
        `}
      >
        {/* Animated background gradient on drag */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"
            />
          )}
        </AnimatePresence>

        {/* Card header */}
        <div className="relative z-10 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">{subtitle}</p>
            </div>
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${file ? 'bg-green-500/20' : 'bg-blue-500/20'}
              `}
            >
              <ImageIcon
                className={`w-5 h-5 ${file ? 'text-green-400' : 'text-blue-400'}`}
              />
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="relative z-10 p-6">
          {!file ? (
            <motion.div
              {...getRootProps()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative border-2 border-dashed rounded-xl p-8 cursor-pointer
                transition-all duration-300
                ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-white/5'
                }
              `}
            >
              <input {...getInputProps()} />
              
              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: isDragActive
                    ? '0 0 30px rgba(59, 130, 246, 0.5)'
                    : '0 0 0px rgba(59, 130, 246, 0)',
                }}
                transition={{ duration: 0.3 }}
              />

              <div className="flex flex-col items-center space-y-4">
                <motion.div
                  animate={{
                    y: isDragActive ? [0, -5, 0] : 0,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isDragActive ? Infinity : 0,
                  }}
                >
                  <Upload
                    className={`
                      w-12 h-12 transition-colors duration-300
                      ${isDragActive ? 'text-blue-400' : 'text-gray-500'}
                    `}
                  />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    <span className="text-blue-400 font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, TIFF (max 50MB)
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-w-16 aspect-h-9">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                
                {/* Overlay with file info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                {/* Remove button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onRemove}
                  className="absolute top-2 right-2 p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Status indicator */}
        <div className="relative z-10 px-6 pb-4">
          <div className="flex items-center space-x-2">
            <motion.div
              className={`w-2 h-2 rounded-full ${file ? 'bg-green-400' : 'bg-gray-500'}`}
              animate={file ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={`text-xs ${file ? 'text-green-400' : 'text-gray-500'}`}>
              {file ? 'Ready for analysis' : 'Waiting for upload'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UploadCard;
