import React from 'react';
import HeroSection from '../components/HeroSection';
import VideoGrid from '../components/VideoGrid';
import Experience from '../components/Experience';

const Home = ({ videos }) => {
  return (
    <main>
      <HeroSection />
      <VideoGrid videos={videos} />
      <Experience />
      
      <footer style={{ textAlign: 'center', padding: '40px 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px' }}>
        <p>&copy; {new Date().getFullYear()} Abhiram Yakkala. All rights reserved.</p>
        <p style={{ marginTop: '8px' }}>Designed for storytelling.</p>
      </footer>
    </main>
  );
};

export default Home;
