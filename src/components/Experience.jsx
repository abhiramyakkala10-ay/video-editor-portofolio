import React from 'react';
import { motion } from 'framer-motion';
import { experienceData, skillsData } from '../data';

const Experience = () => {
  return (
    <div style={{ backgroundColor: 'var(--card-bg)', padding: '100px 0', borderTop: '1px solid var(--border-color)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px' }}>
        
        {/* Experience Section */}
        <div id="experience">
          <h2 className="section-title" style={{ textAlign: 'left', marginTop: 0 }}>Experience.</h2>
          <ul className="experience-list">
            {experienceData.map((exp, idx) => (
              <motion.li 
                key={idx} 
                className="experience-item"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="experience-title">{exp.title}</div>
                <div className="experience-meta">{exp.company} • {exp.date}</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{exp.description}</p>
                <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '15px' }}>
                  {exp.achievements.map((ach, i) => (
                    <li key={i} style={{ marginBottom: '8px' }}>{ach}</li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Skills Section */}
        <div id="skills">
          <h2 className="section-title" style={{ textAlign: 'left', marginTop: 0 }}>Skills & Tools.</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {Object.entries(skillsData).map(([category, skills], idx) => (
              <motion.div 
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{category}</h3>
                <div className="pill-container">
                  {skills.map(skill => (
                    <span key={skill} className="pill">{skill}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Experience;
