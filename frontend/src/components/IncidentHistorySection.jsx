import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Download, Database, AlertCircle, Eye, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function IncidentHistorySection({ incidents, onRefresh, onSeedDemoData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter and search logic
  const filteredIncidents = useMemo(() => {
    let result = Array.isArray(incidents) ? [...incidents] : [];

    // Filter by risk level
    if (selectedRisk !== 'ALL') {
      result = result.filter(item => item.risk_level?.toUpperCase() === selectedRisk);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(item => {
        const passId = String(item.passenger_id || '').toLowerCase();
        const train = String(item.train_state || '').toLowerCase();
        const reason = String(item.reason || '').toLowerCase();
        return passId.includes(q) || train.includes(q) || reason.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'id' || sortField === 'passenger_id' || sortField === 'danger_duration') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '');
        valB = String(valB || '');
      }

      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    return result;
  }, [incidents, selectedRisk, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(start, start + itemsPerPage);
  }, [filteredIncidents, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredIncidents.length) return;
    const headers = ['ID', 'Timestamp', 'Passenger_ID', 'Train_State', 'Duration_Seconds', 'Risk_Level', 'Reason', 'Status'];
    const rows = filteredIncidents.map(i => [
      i.id,
      i.timestamp,
      i.passenger_id,
      i.train_state,
      i.danger_duration,
      i.risk_level,
      `"${(i.reason || '').replace(/"/g, '""')}"`,
      i.status || 'OPEN'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `railguard_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">
              PLATFORM SAFETY INCIDENT LOGS
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Querying SQLite database &bull; {filteredIncidents.length} recorded events matching filter
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, train, reason..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-52 placeholder-slate-500"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
              <button
                key={risk}
                onClick={() => {
                  setSelectedRisk(risk);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${selectedRisk === risk ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {risk}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredIncidents.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Incident Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs text-left text-slate-300">
          <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1"># ID <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('timestamp')}>
                <div className="flex items-center gap-1">Timestamp <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('passenger_id')}>
                <div className="flex items-center gap-1">Passenger <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('train_state')}>
                <div className="flex items-center gap-1">Train Movement <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('danger_duration')}>
                <div className="flex items-center gap-1">Zone Duration <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('risk_level')}>
                <div className="flex items-center gap-1">Threat Level <ArrowUpDown size={12} /></div>
              </th>
              <th className="px-4 py-3">Safety Violation Reason</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {paginatedItems.map((inc) => {
              let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              if (inc.risk_level === 'CRITICAL') {
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              } else if (inc.risk_level === 'HIGH') {
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              } else if (inc.risk_level === 'MEDIUM') {
                badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
              }

              return (
                <tr
                  key={inc.id || Math.random()}
                  onClick={() => setSelectedIncident(inc)}
                  className="hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <td className="px-4 py-3 font-mono font-bold text-cyan-400">#{inc.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {inc.timestamp ? new Date(inc.timestamp).toLocaleString() : 'Recent'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    Pass #{inc.passenger_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${inc.train_state === 'APPROACHING' ? 'text-amber-400' : 'text-blue-400'}`}>
                      {inc.train_state || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={Number(inc.danger_duration) >= 3 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {Number(inc.danger_duration || 0).toFixed(1)}s
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                      {inc.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={inc.reason}>
                    {inc.reason || 'Safety line crossing detected'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                      title="Inspect incident record"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-12 text-center text-slate-400 italic">
                  <AlertCircle size={28} className="mx-auto mb-2 text-slate-500" />
                  <p className="font-semibold text-slate-300">No incident logs found matching criteria</p>
                  <p className="text-[11px] text-slate-500 mt-1">Start monitoring to detect violations or seed sample data for testing.</p>
                  <button
                    onClick={onSeedDemoData}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 text-xs font-semibold transition"
                  >
                    Seed Sample Incident Logs
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredIncidents.length)} of {filteredIncidents.length} logs
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
            >
              Prev
            </button>
            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-rose-400" size={20} />
                <h3 className="font-bold text-white text-base">
                  Incident Detail #{selectedIncident.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Passenger ID</span>
                  <p className="font-bold text-slate-200 text-sm mt-0.5">#{selectedIncident.passenger_id}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Train Movement</span>
                  <p className="font-bold text-amber-400 text-sm mt-0.5">{selectedIncident.train_state}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Zone Duration</span>
                  <p className="font-bold text-rose-400 text-sm mt-0.5">{Number(selectedIncident.danger_duration || 0).toFixed(1)} seconds</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px]">Threat Level</span>
                  <p className="font-bold text-slate-200 text-sm mt-0.5">{selectedIncident.risk_level}</p>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Violation Narrative</span>
                <p className="text-slate-200 mt-1">{selectedIncident.reason}</p>
              </div>

              <div className="text-slate-400 flex justify-between pt-2">
                <span>Timestamp: <strong className="text-slate-300">{selectedIncident.timestamp}</strong></span>
                <span>Camera: <strong className="text-slate-300">CAM #{selectedIncident.camera_id || 1}</strong></span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
