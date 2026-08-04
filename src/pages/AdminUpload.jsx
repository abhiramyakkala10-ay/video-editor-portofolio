import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Upload, Image as ImageIcon, Film, X, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/mpeg', 'video/ogg', 'video/3gpp'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const DropZone = ({ label, icon: Icon, accept, onFileSelect, file, progress, isUploading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onFileSelect(droppedFile);
  }, [onFileSelect]);

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) onFileSelect(selectedFile);
  };

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? 'var(--accent-color)' : file ? '#34c759' : 'var(--border-color)'}`,
        borderRadius: '16px',
        padding: '32px 20px',
        textAlign: 'center',
        cursor: file ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: isDragging ? 'rgba(0,102,204,0.05)' : file ? 'rgba(52,199,89,0.05)' : 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {isUploading && progress < 100 ? (
        <div>
          <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>Uploading... {Math.round(progress)}%</div>
          <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent-color)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ) : file ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#34c759' }}>
          <CheckCircle size={20} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{file.name}</span>
        </div>
      ) : (
        <>
          <Icon size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Drag & drop from Finder or click to browse</p>
        </>
      )}
    </div>
  );
};

const AdminUpload = ({ onVideoAdded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbProgress, setThumbProgress] = useState(0);

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'abhiram2026') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const uploadFileToStorage = async (file, bucket, onProgress) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Simulate progress while Supabase uploads (SDK doesn't support progress natively)
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 15, 90);
      onProgress(fakeProgress);
    }, 300);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    clearInterval(progressInterval);
    onProgress(100);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!title || !videoFile || !thumbnailFile) {
      alert("Please provide a title, a video file, and a thumbnail image.");
      return;
    }

    if (!ACCEPTED_VIDEO_TYPES.includes(videoFile.type) && !videoFile.name.match(/\.(mp4|mov|avi|mkv|webm|mpeg|ogv|3gp)$/i)) {
      alert("Unsupported video format. Please use MP4, MOV, AVI, MKV, or WebM.");
      return;
    }

    try {
      setUploading(true);

      // Upload video and thumbnail in parallel
      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadFileToStorage(videoFile, 'videos', setVideoProgress),
        uploadFileToStorage(thumbnailFile, 'thumbnails', setThumbProgress),
      ]);

      const { error } = await supabase
        .from('videos')
        .insert([{ title, description, video_url: videoUrl, thumbnail_url: thumbnailUrl }]);

      if (error) throw error;

      alert("Video successfully published to your portfolio!");
      onVideoAdded();
      navigate('/');
    } catch (error) {
      alert("Upload failed: " + error.message);
      console.error(error);
    } finally {
      setUploading(false);
      setVideoProgress(0);
      setThumbProgress(0);
    }
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
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', maxWidth: '640px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ marginBottom: '8px', fontSize: '32px' }}>Upload New Work</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Drag your video from Finder or click to browse. Supports MP4, MOV, AVI, MKV, WebM and more.
        </p>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="bento-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Project Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Cinematic Travel Vlog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Describe the edit, techniques, software used..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>

          </div>

          <div className="bento-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Video File *</p>
            <DropZone
              label="Drop your video here"
              icon={Film}
              accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/mpeg,.mp4,.mov,.avi,.mkv,.webm,.mpeg,.ogv"
              onFileSelect={setVideoFile}
              file={videoFile}
              progress={videoProgress}
              isUploading={uploading}
            />

            <p style={{ fontWeight: 600, marginTop: '8px', marginBottom: '4px' }}>Thumbnail Image *</p>
            <DropZone
              label="Drop your thumbnail here"
              icon={ImageIcon}
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onFileSelect={setThumbnailFile}
              file={thumbnailFile}
              progress={thumbProgress}
              isUploading={uploading}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="submit"
              style={{ flex: 1, backgroundColor: 'var(--accent-color)', opacity: uploading ? 0.6 : 1 }}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Publish to Portfolio'}
            </button>
            <button
              type="button"
              style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              onClick={() => navigate('/')}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};

export default AdminUpload;
