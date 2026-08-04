import React from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <section className="hero container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <h1 style={{ background: 'linear-gradient(90deg, #1d1d1f, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Shaping moments into stories.
        </h1>
        <p>
          Video Editor. Motion Graphics. Storyteller.
        </p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <a href="#work">
            <button>View My Work</button>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
