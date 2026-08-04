import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Image as ImageIcon, Film, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import * as tus from 'tus-js-client';
import { supabase } from '../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Format bytes to human readable size
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format seconds to human readable time
const formatTime = (seconds) => {
  if (!seconds || !isFinite(seconds)) return 'calculating...';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const DropZone = ({ label, icon: Icon, accept, onFileSelect, file, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onFileSelect(droppedFile);
  }, [onFileSelect]);

  return (
    <div
      onClick={() => !disabled && !file && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? 'var(--accent-color)' : file ? '#34c759' : 'var(--border-color)'}`,
        borderRadius: '16px',
        padding: '28px 20px',
        textAlign: 'center',
        cursor: disabled || file ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: isDragging ? 'rgba(0,102,204,0.05)' : file ? 'rgba(52,199,89,0.05)' : 'transparent',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => { const f = e.target.files[0]; if (f) onFileSelect(f); }}
        style={{ display: 'none' }}
      />
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#34c759' }}>
          <CheckCircle size={20} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{file.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{formatBytes(file.size)}</div>
          </div>
        </div>
      ) : (
        <>
          <Icon size={28} color="var(--text-secondary)" style={{ marginBottom: '10px' }} />
          <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '15px' }}>{label}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Drag & drop from Finder or click to browse</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '6px', opacity: 0.6 }}>Supports MP4, MOV, AVI, MKV, WebM — any size</p>
        </>
      )}
    </div>
  );
};

const UploadProgress = ({ label, progress, speed, timeLeft, status, error, onRetry }) => (
  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {error ? (
          <button onClick={onRetry} style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '20px' }}>
            <RefreshCw size={12} /> Retry
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {status === 'done' ? '✓ Done' : `${Math.round(progress)}%`}
          </span>
        )}
      </div>
    </div>

    <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        backgroundColor: error ? '#ff3b30' : status === 'done' ? '#34c759' : 'var(--accent-color)',
        borderRadius: '2px',
        transition: 'width 0.4s ease'
      }} />
    </div>

    {!error && status !== 'done' && (speed || timeLeft) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {speed && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{speed}/s</span>}
        {timeLeft && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>~{timeLeft} remaining</span>}
      </div>
    )}
    {error && <p style={{ fontSize: '12px', color: '#ff3b30', marginTop: '6px' }}>{error}</p>}
  </div>
);

// TUS chunked upload — handles files of ANY size (GB+)
const uploadWithTus = (file, bucket, onProgress, onSuccess, onError) => {
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
  let startTime = Date.now();
  let lastLoaded = 0;

  const upload = new tus.Upload(file, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-upsert': 'false',
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: bucket,
      objectName: fileName,
      contentType: file.type || 'video/mp4',
      cacheControl: '3600',
    },
    chunkSize: 6 * 1024 * 1024, // 6MB chunks
    onError: (error) => {
      console.error('TUS upload error:', error);
      onError(error.message || 'Upload failed');
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      const percentage = (bytesUploaded / bytesTotal) * 100;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = (bytesUploaded - lastLoaded) / (elapsed || 1);
      const remaining = speed > 0 ? (bytesTotal - bytesUploaded) / speed : null;

      lastLoaded = bytesUploaded;
      startTime = Date.now();

      onProgress({
        percentage,
        speed: formatBytes(speed),
        timeLeft: formatTime(remaining),
      });
    },
    onSuccess: () => {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
      onSuccess(publicUrl);
    },
  });

  upload.findPreviousUploads().then((previousUploads) => {
    if (previousUploads.length > 0) {
      upload.resumeFromPreviousUpload(previousUploads[0]);
    }
    upload.start();
  });

  return upload;
};

const AdminUpload = ({ onVideoAdded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [videoUpload, setVideoUpload] = useState({ percentage: 0, speed: '', timeLeft: '', status: 'idle', error: null });
  const [thumbUpload, setThumbUpload] = useState({ percentage: 0, speed: '', timeLeft: '', status: 'idle', error: null });

  const videoUploadRef = useRef(null);
  const thumbUploadRef = useRef(null);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'abhiram2026') setIsAuthenticated(true);
    else alert('Incorrect password');
  };

  const doUpload = () => {
    if (!title || !videoFile) {
      alert('Please provide a title and a video file.');
      return;
    }

    setUploading(true);
    let videoUrl = null;
    let thumbnailUrl = null;
    let videosDone = false;
    let thumbDone = !thumbnailFile; // If no thumbnail, count as done

    const tryFinish = async () => {
      if (!videosDone || !thumbDone) return;
      try {
        const { error } = await supabase
          .from('videos')
          .insert([{ title, description, video_url: videoUrl, thumbnail_url: thumbnailUrl }]);
        if (error) throw error;
        alert('Video successfully published to your portfolio!');
        onVideoAdded();
        navigate('/');
      } catch (err) {
        alert('Database save failed: ' + err.message);
        setUploading(false);
      }
    };

    // Upload video
    setVideoUpload({ percentage: 0, speed: '', timeLeft: '', status: 'uploading', error: null });
    videoUploadRef.current = uploadWithTus(
      videoFile,
      'videos',
      (progress) => setVideoUpload({ ...progress, status: 'uploading', error: null }),
      (url) => {
        videoUrl = url;
        videosDone = true;
        setVideoUpload((prev) => ({ ...prev, percentage: 100, status: 'done', error: null }));
        tryFinish();
      },
      (err) => {
        setVideoUpload((prev) => ({ ...prev, status: 'error', error: err }));
        setUploading(false);
      }
    );

    // Upload thumbnail if present
    if (thumbnailFile) {
      setThumbUpload({ percentage: 0, speed: '', timeLeft: '', status: 'uploading', error: null });
      thumbUploadRef.current = uploadWithTus(
        thumbnailFile,
        'thumbnails',
        (progress) => setThumbUpload({ ...progress, status: 'uploading', error: null }),
        (url) => {
          thumbnailUrl = url;
          thumbDone = true;
          setThumbUpload((prev) => ({ ...prev, percentage: 100, status: 'done', error: null }));
          tryFinish();
        },
        (err) => {
          setThumbUpload((prev) => ({ ...prev, status: 'error', error: err }));
        }
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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
          Large files are split into 6MB chunks and uploaded reliably. If it disconnects, it auto-resumes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <p style={{ fontWeight: 600 }}>Video File * <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '13px' }}>— any size, any format</span></p>
            <DropZone
              label="Drop your video here"
              icon={Film}
              accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.mpeg,.ogv,.m4v,.ts,.mxf"
              onFileSelect={setVideoFile}
              file={videoFile}
              disabled={uploading}
            />

            {uploading && videoFile && (
              <UploadProgress
                label={`Uploading: ${videoFile.name}`}
                progress={videoUpload.percentage}
                speed={videoUpload.speed}
                timeLeft={videoUpload.timeLeft}
                status={videoUpload.status}
                error={videoUpload.error}
                onRetry={doUpload}
              />
            )}

            <p style={{ fontWeight: 600, marginTop: '8px' }}>
              Thumbnail <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '13px' }}>(optional)</span>
            </p>
            <DropZone
              label="Drop your thumbnail here"
              icon={ImageIcon}
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onFileSelect={setThumbnailFile}
              file={thumbnailFile}
              disabled={uploading}
            />

            {uploading && thumbnailFile && (
              <UploadProgress
                label={`Uploading: ${thumbnailFile.name}`}
                progress={thumbUpload.percentage}
                speed={thumbUpload.speed}
                timeLeft={thumbUpload.timeLeft}
                status={thumbUpload.status}
                error={thumbUpload.error}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={doUpload}
              style={{ flex: 1, backgroundColor: 'var(--accent-color)', opacity: uploading ? 0.5 : 1 }}
              disabled={uploading}
            >
              {uploading ? 'Uploading — keep this tab open...' : 'Publish to Portfolio'}
            </button>
            <button
              style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              onClick={() => navigate('/')}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>

          {uploading && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              ⚡ Uploading in 6MB chunks — do not close this tab
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminUpload;
