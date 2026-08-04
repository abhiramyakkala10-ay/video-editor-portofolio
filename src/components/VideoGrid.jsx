import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';

const VideoGrid = ({ videos }) => {
  const [activeVideo, setActiveVideo] = useState(null);

  return (
    <div id="work" className="container" style={{ paddingBottom: '100px' }}>
      <h2 className="section-title">Selected Works.</h2>
      
      <div className="bento-grid">
        {videos.map((video, index) => (
          <motion.div 
            key={video.id}
            className="bento-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            onClick={() => setActiveVideo(video)}
            style={{ cursor: 'pointer' }}
          >
            <img src={video.thumbnail} alt={video.title} className="bento-image" />
            <div className="bento-content">
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{video.title}</h3>
              <p style={{ opacity: 0.8, fontSize: '14px', marginBottom: '16px', maxWidth: '80%' }}>{video.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                <Play size={16} fill="currentColor" /> Watch Video
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.9)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setActiveVideo(null)}
          >
            <button 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', padding: '12px' }}
              onClick={() => setActiveVideo(null)}
            >
              <X size={24} color="white" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '1000px', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden' }}
            >
              <video 
                src={activeVideo.videoUrl} 
                controls 
                autoPlay 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoGrid;
