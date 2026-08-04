import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Upload, Image as ImageIcon } from 'lucide-react';

const AdminUpload = ({ onAddVideo }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'abhiram2026') { // Simple mock password
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    
    if (!title || !videoUrl || !thumbnailUrl) {
      alert("Please fill all required fields");
      return;
    }

    const newVideo = {
      id: Date.now(),
      title,
      description,
      videoUrl,
      thumbnail: thumbnailUrl
    };

    onAddVideo(newVideo);
    
    // Reset form and go back
    alert("Video successfully added to portfolio!");
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', paddingTop: '60px' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bento-card" 
          style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '50%' }}>
              <Lock size={32} color="var(--accent-color)" />
            </div>
          </div>
          <h2 style={{ marginBottom: '8px' }}>Studio Access</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Enter your password to upload new work.</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input 
                type="password" 
                className="form-control" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ textAlign: 'center' }}
              />
            </div>
            <button type="submit" style={{ width: '100%', marginTop: '10px' }}>Unlock</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '60px', maxWidth: '600px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 style={{ marginBottom: '8px', fontSize: '32px' }}>Upload New Work</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Add a new video edit to your portfolio showcase.</p>
        
        <form onSubmit={handleUpload} className="bento-card" style={{ padding: '40px' }}>
          
          <div className="form-group">
            <label>Project Title *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Cinematic Travel Vlog" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="form-control" 
              rows="3" 
              placeholder="Briefly describe the edit, software used, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Video File URL *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://..." 
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                <Upload size={16} /> File
              </button>
            </div>
            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Provide a direct link to the video (e.g. mp4) or upload a mock file.</small>
          </div>

          <div className="form-group">
            <label>Thumbnail Image URL *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://..." 
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
              <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                <ImageIcon size={16} /> File
              </button>
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
            <button type="submit" style={{ flex: 1, backgroundColor: 'var(--accent-color)' }}>Publish Video</button>
            <button type="button" style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => navigate('/')}>Cancel</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminUpload;
