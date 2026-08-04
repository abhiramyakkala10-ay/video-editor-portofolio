import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AdminUpload from './pages/AdminUpload';
import { supabase } from './supabaseClient';

function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch videos from Supabase
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <Router>
      <Navbar />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
          Loading your portfolio...
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Home videos={videos} />} />
          <Route path="/studio-admin" element={<AdminUpload onVideoAdded={fetchVideos} />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
