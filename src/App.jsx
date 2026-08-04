import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AdminUpload from './pages/AdminUpload';

function App() {
  // Mocking videos state to be shared across Home and Admin
  const [videos, setVideos] = useState([
    {
      id: 1,
      title: "Cinematic Reel 2026",
      description: "A compilation of my best cinematic edits and color grading work.",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // placeholder
      thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=2070&auto=format&fit=crop"
    }
  ]);

  const addVideo = (newVideo) => {
    setVideos([newVideo, ...videos]);
  };

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home videos={videos} />} />
        <Route path="/studio-admin" element={<AdminUpload onAddVideo={addVideo} />} />
      </Routes>
    </Router>
  );
}

export default App;
