import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Dispute, Event } from '../types';
import { AlertTriangle, ArrowLeft, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

const DISPUTE_TYPES = [
  { value: 'cancellation', label: 'Cancellation Issue' },
  { value: 'no_show', label: 'No Show' },
  { value: 'quality', label: 'Service Quality' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'overtime', label: 'Overtime Dispute' },
  { value: 'other', label: 'Other' },
];

export default function DisputesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEventId = searchParams.get('eventId');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [showForm, setShowForm] = useState(!!prefillEventId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const [formData, setFormData] = useState({
    event_id: prefillEventId || '',
    dispute_type: '',
    description: '',
  });

  useEffect(() => {
    loadDisputes();
    if (user?.role === 'customer') {
      api.get<Event[]>('/api/events').then(setEvents).catch(() => {});
    } else if (user?.role === 'worker') {
      // Workers can't access /api/events — derive events from their shifts
      api.get<Array<{ event_id: string; event_name?: string }>>('/api/workers/shifts').then(shifts => {
        const seen = new Set<string>();
        const workerEvents: Event[] = [];
        for (const s of shifts) {
          if (s.event_id && !seen.has(s.event_id)) {
            seen.add(s.event_id);
            workerEvents.push({ id: s.event_id, name: s.event_name || s.event_id } as Event);
          }
        }
        setEvents(workerEvents);
      }).catch(() => {});
    }
  }, []);

  const loadDisputes = async () => {
    try {
      const data = await api.get<Dispute[]>('/api/disputes');
      setDisputes(data);
    } catch {
      // no disputes
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.event_id || !formData.dispute_type || !formData.description) return;
    setSubmitting(true);
    try {
      await api.post('/api/disputes', formData);
      setShowForm(false);
      setFormData({ event_id: '', dispute_type: '', description: '' });
      loadDisputes();
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={16} className="text-amber-500" />;
      case 'under_review': return <AlertTriangle size={16} className="text-blue-500" />;
      case 'resolved': return <CheckCircle size={16} className="text-green-500" />;
      case 'dismissed': return <XCircle size={16} className="text-gray-400" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 mb-4">File a Dispute</h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Event</label>
            <select
              value={formData.event_id}
              onChange={(e) => setFormData(prev => ({ ...prev, event_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select event...</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Dispute Type</label>
            <select
              value={formData.dispute_type}
              onChange={(e) => setFormData(prev => ({ ...prev, dispute_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select type...</option>
              {DISPUTE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the issue in detail..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !formData.event_id || !formData.dispute_type || !formData.description}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Disputes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
        >
          <Plus size={16} /> File Dispute
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No disputes filed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => (
            <div key={d.id} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {statusIcon(d.status)}
                  <span className="text-sm font-medium capitalize">{d.dispute_type.replace('_', ' ')}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  d.status === 'open' ? 'bg-amber-100 text-amber-700' :
                  d.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                  d.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {d.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{d.description}</p>
              {d.resolution && (
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Resolution</p>
                  <p className="text-sm text-gray-700">{d.resolution}</p>
                  {d.refund_amount && d.refund_amount > 0 && (
                    <p className="text-xs text-green-600 mt-1">Refund: ${d.refund_amount.toFixed(2)}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Filed {new Date(d.created_at).toLocaleDateString()}
                {d.filed_by_name && ` by ${d.filed_by_name}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
