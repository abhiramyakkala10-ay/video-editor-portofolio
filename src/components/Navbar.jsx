import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogoDoubleClick = () => {
    navigate('/studio-admin');
  };

  return (
    <nav className="glass-nav">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link 
            to="/" 
            onDoubleClick={handleLogoDoubleClick}
            style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', userSelect: 'none' }}
          >
            Abhiram Yakkala.
          </Link>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', gap: '24px', fontSize: '14px', fontWeight: 500 }}
        >
          <a href="#work" style={{ color: 'var(--text-secondary)' }}>Work</a>
          <a href="#experience" style={{ color: 'var(--text-secondary)' }}>Experience</a>
          <a href="#skills" style={{ color: 'var(--text-secondary)' }}>Skills</a>
        </motion.div>
      </div>
    </nav>
  );
};

export default Navbar;
