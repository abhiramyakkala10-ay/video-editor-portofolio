import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Image as ImageIcon, Film, CheckCircle, Trash2, Plus, ArrowLeft, AlertTriangle } from 'lucide-react';
import * as tus from 'tus-js-client';
import { supabase } from '../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFileSelect(f);
  }, [onFileSelect]);
  return (
    <div
      onClick={() => !disabled && !file && inputRef.current?.click()}
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
      onDragOver={handleDragOver} onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? 'var(--accent-color)' : file ? '#34c759' : 'var(--border-color)'}`,
        borderRadius: '16px', padding: '28px 20px', textAlign: 'center',
        cursor: disabled || file ? 'default' : 'pointer', transition: 'all 0.3s ease',
        backgroundColor: isDragging ? 'rgba(0,102,204,0.05)' : file ? 'rgba(52,199,89,0.05)' : 'transparent',
      }}
    >
      <input ref={inputRef} type="file" accept={accept}
        onChange={(e) => { const f = e.target.files[0]; if (f) onFileSelect(f); }} style={{ display: 'none' }} />
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', opacity: 0.6 }}>Supports MP4, MOV, AVI, MKV, WebM — any size</p>
        </>
      )}
    </div>
  );
};

const uploadWithTus = (file, bucket, onProgress, onSuccess, onError) => {
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
  let startTime = Date.now();
  const upload = new tus.Upload(file, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: { authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'x-upsert': 'false' },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: { bucketName: bucket, objectName: fileName, contentType: file.type || 'video/mp4', cacheControl: '3600' },
    chunkSize: 6 * 1024 * 1024,
    onError: (err) => onError(err.message || 'Upload failed'),
    onProgress: (bytesUploaded, bytesTotal) => {
      const pct = (bytesUploaded / bytesTotal) * 100;
      const elapsed = (Date.now() - startTime) / 1000 || 1;
      const speed = bytesUploaded / elapsed;
      const remaining = speed > 0 ? (bytesTotal - bytesUploaded) / speed : null;
      startTime = Date.now();
      onProgress({ percentage: pct, speed: formatBytes(speed), timeLeft: formatTime(remaining) });
    },
    onSuccess: () => {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
      onSuccess(publicUrl);
    },
  });
  upload.findPreviousUploads().then((prev) => {
    if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
    upload.start();
  });
  return upload;
};

// ─── MANAGE VIEW ─────────────────────────────────────────────────────────────
const ManageVideos = ({ onAddNew }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    setVideos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleDelete = async (video) => {
    setDeletingId(video.id);
    try {
      // Delete from DB
      const { error } = await supabase.from('videos').delete().eq('id', video.id);
      if (error) throw error;
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading your videos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 600 }}>Your Videos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{videos.length} video{videos.length !== 1 ? 's' : ''} in portfolio</p>
        </div>
        <button onClick={onAddNew} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--accent-color)', padding: '10px 18px' }}>
          <Plus size={16} /> Add New
        </button>
      </div>

      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '16px' }}>
          <Film size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>No videos yet. Click "Add New" to upload your first work!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {videos.map((video) => (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bento-card"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              {/* Thumbnail preview */}
              <div style={{ width: '80px', height: '52px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1a1a2e' }}>
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Film size={20} color="rgba(255,255,255,0.2)" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</div>
                {video.description && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.description}</div>
                )}
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                  Added {new Date(video.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => setConfirmDelete(video)}
                disabled={deletingId === video.id}
                style={{ backgroundColor: 'transparent', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', flexShrink: 0 }}
              >
                <Trash2 size={14} />
                {deletingId === video.id ? 'Deleting...' : 'Delete'}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bento-card"
              style={{ padding: '32px', maxWidth: '380px', width: '100%', textAlign: 'center' }}
            >
              <AlertTriangle size={36} color="#ff3b30" style={{ marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>Delete this video?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                "<strong>{confirmDelete.title}</strong>" will be permanently removed from your portfolio.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, backgroundColor: '#ff3b30' }}>
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── UPLOAD VIEW ──────────────────────────────────────────────────────────────
const UploadVideo = ({ onBack, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoUpload, setVideoUpload] = useState({ percentage: 0, status: 'idle' });
  const [thumbUpload, setThumbUpload] = useState({ percentage: 0, status: 'idle' });

  const doUpload = () => {
    if (!title || !videoFile) { alert('Please provide a title and a video file.'); return; }
    setUploading(true);
    let videoUrl = null, thumbnailUrl = null, videoDone = false, thumbDone = !thumbnailFile;

    const tryFinish = async () => {
      if (!videoDone || !thumbDone) return;
      try {
        const { error } = await supabase.from('videos').insert([{ title, description, video_url: videoUrl, thumbnail_url: thumbnailUrl }]);
        if (error) throw error;
        onSuccess();
      } catch (err) {
        alert('Database save failed: ' + err.message);
        setUploading(false);
      }
    };

    setVideoUpload({ percentage: 0, status: 'uploading' });
    uploadWithTus(videoFile, 'videos',
      (p) => setVideoUpload({ ...p, status: 'uploading' }),
      (url) => { videoUrl = url; videoDone = true; setVideoUpload({ percentage: 100, status: 'done' }); tryFinish(); },
      (err) => { alert('Video upload failed: ' + err); setUploading(false); }
    );

    if (thumbnailFile) {
      setThumbUpload({ percentage: 0, status: 'uploading' });
      uploadWithTus(thumbnailFile, 'thumbnails',
        (p) => setThumbUpload({ ...p, status: 'uploading' }),
        (url) => { thumbnailUrl = url; thumbDone = true; setThumbUpload({ percentage: 100, status: 'done' }); tryFinish(); },
        (err) => { alert('Thumbnail upload failed: ' + err); }
      );
    }
  };

  return (
    <div>
      <button onClick={onBack} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '0', marginBottom: '24px', fontSize: '14px', cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back to Videos
      </button>

      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '24px' }}>Upload New Work</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Project Title *</label>
            <input type="text" className="form-control" placeholder="e.g. Cinematic Travel Vlog" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Description</label>
            <textarea className="form-control" rows="2" placeholder="Describe the edit, techniques, software used..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} />
          </div>
        </div>

        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontWeight: 600 }}>Video File * <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '13px' }}>— any size, any format</span></p>
          <DropZone label="Drop your video here" icon={Film} accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.ts,.mxf" onFileSelect={setVideoFile} file={videoFile} disabled={uploading} />
          {uploading && videoFile && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Uploading video...</span>
                <span style={{ fontWeight: 500 }}>{videoUpload.status === 'done' ? '✓ Done' : `${Math.round(videoUpload.percentage)}%`}</span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${videoUpload.percentage}%`, backgroundColor: videoUpload.status === 'done' ? '#34c759' : 'var(--accent-color)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
              {videoUpload.speed && videoUpload.status !== 'done' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{videoUpload.speed}/s</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>~{videoUpload.timeLeft} remaining</span>
                </div>
              )}
            </div>
          )}

          <p style={{ fontWeight: 600, marginTop: '8px' }}>Thumbnail <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '13px' }}>(optional)</span></p>
          <DropZone label="Drop your thumbnail here" icon={ImageIcon} accept="image/*,.jpg,.jpeg,.png,.webp" onFileSelect={setThumbnailFile} file={thumbnailFile} disabled={uploading} />
          {uploading && thumbnailFile && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Uploading thumbnail...</span>
                <span style={{ fontWeight: 500 }}>{thumbUpload.status === 'done' ? '✓ Done' : `${Math.round(thumbUpload.percentage)}%`}</span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${thumbUpload.percentage}%`, backgroundColor: thumbUpload.status === 'done' ? '#34c759' : 'var(--accent-color)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}
        </div>

        <button onClick={doUpload} style={{ backgroundColor: 'var(--accent-color)', opacity: uploading ? 0.5 : 1 }} disabled={uploading}>
          {uploading ? 'Uploading — keep this tab open...' : 'Publish to Portfolio'}
        </button>
        {uploading && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>⚡ Uploading in 6MB chunks — do not close this tab</p>}
      </div>
    </div>
  );
};

// ─── MAIN ADMIN PAGE ──────────────────────────────────────────────────────────
const AdminUpload = ({ onVideoAdded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState('manage'); // 'manage' | 'upload'
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'abhiram2026') setIsAuthenticated(true);
    else alert('Incorrect password');
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bento-card"
          style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '50%' }}>
              <Lock size={32} color="var(--accent-color)" />
            </div>
          </div>
          <h2 style={{ marginBottom: '8px' }}>Studio Access</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Enter your password to manage your portfolio.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input type="password" className="form-control" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} style={{ textAlign: 'center' }} />
            </div>
            <button type="submit" style={{ width: '100%', marginTop: '10px' }}>Unlock Studio</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '80px', maxWidth: '680px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Studio</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage your portfolio videos</p>
        </div>
        <button onClick={() => navigate('/')} style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '8px 16px', fontSize: '13px' }}>
          ← Back to Site
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'manage' ? (
          <motion.div key="manage" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <ManageVideos onAddNew={() => setView('upload')} />
          </motion.div>
        ) : (
          <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <UploadVideo
              onBack={() => setView('manage')}
              onSuccess={() => { onVideoAdded(); setView('manage'); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUpload;
