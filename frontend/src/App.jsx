import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ShieldAlert, RefreshCw, Activity, AlertOctagon } from 'lucide-react';

import HeaderNav from './components/HeaderNav';
import SummaryCards from './components/SummaryCards';
import CardDetailModal from './components/CardDetailModal';
import LiveMonitoringSection from './components/LiveMonitoringSection';
import IncidentHistorySection from './components/IncidentHistorySection';

// Dynamic API & WebSocket URLs based on environment or current browser window location
const getBackendBaseUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If running on Vercel, default to the canonical Render backend
    if (window.location.hostname.endsWith('.vercel.app')) {
      return 'https://railguard-ai-backend.onrender.com';
    }
    // Local development mode: if served from Vite port 5173, point to backend on 8000
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return window.location.origin;
  }
  return '';
};

const BACKEND_URL = getBackendBaseUrl();
const API_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
const WS_BASE = BACKEND_URL
  ? BACKEND_URL.replace(/^http/, 'ws')
  : (typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host : '');
const WS_URL = WS_BASE ? `${WS_BASE}/ws/monitor` : '';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <ShieldAlert size={64} className="text-rose-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold mb-2">RailGuard UI Error Encountered</h1>
          <p className="text-slate-400 max-w-md mb-6 text-xs">{this.state.error?.message || "An unexpected error occurred in dashboard component rendering."}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 rounded-xl font-semibold hover:bg-blue-500 transition shadow-lg"
          >
            Reload Safety Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedModal, setSelectedModal] = useState(null);
  const [status, setStatus] = useState({ is_monitoring: false });
  const [telemetry, setTelemetry] = useState({
    train_state: 'STOPPED',
    safe_count: 0,
    danger_count: 0,
    passengers: {},
    alerts: []
  });
  const [frame, setFrame] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [analytics, setAnalytics] = useState({ total_incidents: 0, critical_alerts: 0, high_alerts: 0, medium_alerts: 0, low_alerts: 0 });
  const [availableVideos, setAvailableVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState('demo.mp4');
  const [connectionMode, setConnectionMode] = useState('idle');
  const [backendConnected, setBackendConnected] = useState(false);
  const wsRef = useRef(null);

  // Initial and periodic data fetch
  const fetchAllData = useCallback(async () => {
    try {
      const [resStatus, resIncidents, resAnalytics, resVids] = await Promise.allSettled([
        axios.get(`${API_URL}/status`),
        axios.get(`${API_URL}/incidents?limit=100`),
        axios.get(`${API_URL}/analytics`),
        axios.get(`${API_URL}/videos`),
      ]);

      let isConnected = false;
      if (
        resStatus.status === 'fulfilled' &&
        resStatus.value?.data &&
        typeof resStatus.value.data === 'object' &&
        'is_monitoring' in resStatus.value.data
      ) {
        setStatus(resStatus.value.data);
        isConnected = true;
      }
      if (resIncidents.status === 'fulfilled' && Array.isArray(resIncidents.value?.data)) {
        setIncidents(resIncidents.value.data);
      }
      if (
        resAnalytics.status === 'fulfilled' &&
        resAnalytics.value?.data &&
        typeof resAnalytics.value.data === 'object' &&
        'total_incidents' in resAnalytics.value.data
      ) {
        setAnalytics(resAnalytics.value.data);
      }
      if (
        resVids.status === 'fulfilled' &&
        resVids.value?.data &&
        typeof resVids.value.data === 'object' &&
        'videos' in resVids.value.data
      ) {
        setAvailableVideos(resVids.value.data.videos || []);
        if (resVids.value.data.current_video) {
          setCurrentVideo(resVids.value.data.current_video);
        }
      }
      setBackendConnected(isConnected);
    } catch (e) {
      setBackendConnected(false);
      console.warn("Telemetry polling error:", e);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3500);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Frame polling fallback: if WebSocket doesn't connect, poll /api/monitor/frame
  useEffect(() => {
    let framePoll;
    if (status.is_monitoring && connectionMode !== 'websocket') {
      framePoll = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/monitor/frame`);
          if (res.data) {
            if (res.data.telemetry) setTelemetry(res.data.telemetry);
            if (res.data.frame) setFrame(res.data.frame);
          }
        } catch (e) {
          // ignore transient poll errors
        }
      }, 100);
    }
    return () => {
      if (framePoll) clearInterval(framePoll);
    };
  }, [status.is_monitoring, connectionMode]);

  // WebSocket lifecycle
  useEffect(() => {
    if (status.is_monitoring) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
      setConnectionMode('idle');
      setFrame(null);
    }
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [status.is_monitoring]);

  const connectWebSocket = () => {
    try {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionMode('websocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.frame) setFrame(data.frame);
        } catch (err) {
          console.error("Frame parse error", err);
        }
      };

      ws.onerror = (error) => {
        console.warn("WebSocket error, falling back to HTTP streaming:", error);
        setConnectionMode('http-fallback');
      };

      ws.onclose = () => {
        if (status.is_monitoring) {
          setConnectionMode('http-fallback');
        }
      };
    } catch (err) {
      console.warn("WebSocket initialization failed, using HTTP stream fallback:", err);
      setConnectionMode('http-fallback');
    }
  };

  const toggleMonitoring = async () => {
    try {
      if (status.is_monitoring) {
        await axios.post(`${API_URL}/monitor/stop`);
      } else {
        await axios.post(`${API_URL}/monitor/start`);
      }
      const res = await axios.get(`${API_URL}/status`);
      if (res.data) setStatus(res.data);
    } catch (error) {
      alert("Error toggling safety monitoring. Please verify the RailGuard AI backend service is online.");
    }
  };

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/video/upload`, formData);
      alert(res.data?.message || 'Video uploaded successfully! Click Start Monitoring to begin processing.');
      fetchAllData();
    } catch (error) {
      console.error("Upload error", error);
      alert('Video upload failed. Please try a valid MP4 file.');
    }
  };

  const selectVideo = async (filename) => {
    try {
      await axios.post(`${API_URL}/video/select`, { filename });
      setCurrentVideo(filename);
      fetchAllData();
    } catch (error) {
      console.error("Video selection error", error);
    }
  };

  const seedDemoData = async () => {
    try {
      const res = await axios.post(`${API_URL}/incidents/seed`);
      alert(res.data?.message || 'Sample safety incidents seeded into database!');
      fetchAllData();
    } catch (error) {
      console.error("Seed error", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-[1600px] mx-auto">
        {/* Header & Navigation Tabs */}
        <HeaderNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          status={status}
          telemetry={telemetry}
          backendConnected={backendConnected}
        />

        {/* 1. TOP DASHBOARD: Six Interactive Summary Cards */}
        <SummaryCards
          telemetry={telemetry}
          analytics={analytics}
          status={status}
          onOpenModal={(cardId) => setSelectedModal(cardId)}
        />

        {/* 2. Interactive Card Detail Modal when any card is clicked */}
        <CardDetailModal
          modalType={selectedModal}
          onClose={() => setSelectedModal(null)}
          telemetry={telemetry}
          analytics={analytics}
          incidents={incidents}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setSelectedModal(null);
          }}
        />

        {/* 3. Section Content based on activeTab */}
        {activeTab === 'overview' && (
          <div>
            {/* Live Camera Monitoring Area */}
            <LiveMonitoringSection
              status={status}
              telemetry={telemetry}
              frame={frame}
              connectionMode={connectionMode}
              availableVideos={availableVideos}
              currentVideo={currentVideo}
              onToggleMonitoring={toggleMonitoring}
              onUploadVideo={uploadVideo}
              onSelectVideo={selectVideo}
              onSeedDemoData={seedDemoData}
            />

            {/* Recent Incident Logs */}
            <IncidentHistorySection
              incidents={incidents.slice(0, 5)}
              onRefresh={fetchAllData}
              onSeedDemoData={seedDemoData}
            />
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div>
            <LiveMonitoringSection
              status={status}
              telemetry={telemetry}
              frame={frame}
              connectionMode={connectionMode}
              availableVideos={availableVideos}
              currentVideo={currentVideo}
              onToggleMonitoring={toggleMonitoring}
              onUploadVideo={uploadVideo}
              onSelectVideo={selectVideo}
              onSeedDemoData={seedDemoData}
            />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div>
            <IncidentHistorySection
              incidents={incidents}
              onRefresh={fetchAllData}
              onSeedDemoData={seedDemoData}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-900 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <span>RailGuard AI &bull; Intelligent Railway Platform Safety Monitoring System</span>
          <span className="font-mono">OpenCV &bull; YOLOv8 &bull; BoT-SORT &bull; Starlette &bull; React 19</span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
