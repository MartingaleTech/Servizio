import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Users, Sparkles } from 'lucide-react';

const EVENT_TYPES = [
  'wedding', 'birthday', 'kids_party', 'funeral', 'corporate', 'house_party', 'other',
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    event_type: 'birthday',
    start_datetime: '',
    end_datetime: '',
    address: '',
    guest_count: 10,
    servers_needed: 1,
    bartenders_needed: 0,
    cleaners_needed: 0,
    dress_code: '',
    special_instructions: '',
  });

  const update = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const event = await api.post<Event>('/api/events', {
        ...form,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
      });
      navigate(`/customer/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Create Event</h1>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <Calendar size={18} />
            Event Details
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. John's Birthday Party"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('event_type', type)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border ${
                    form.event_type === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={e => update('start_datetime', e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input
                type="datetime-local"
                value={form.end_datetime}
                onChange={e => update('end_datetime', e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                required
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!form.name || !form.start_datetime || !form.end_datetime}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Location & Guests */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <MapPin size={18} />
            Location & Guests
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => update('address', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Enter event address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
            <input
              type="number"
              value={form.guest_count}
              onChange={e => update('guest_count', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              min={1}
            />
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!form.address}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 3: Services & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <Users size={18} />
            Services Needed
          </div>

          {[
            { key: 'servers_needed', label: 'Servers', rate: '$25/hr' },
            { key: 'bartenders_needed', label: 'Bartenders', rate: '$30/hr' },
            { key: 'cleaners_needed', label: 'Cleaners', rate: '$20/hr' },
          ].map(service => (
            <div key={service.key} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{service.label}</span>
                  <span className="text-sm text-gray-400 ml-2">{service.rate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update(service.key, Math.max(0, (form[service.key as keyof typeof form] as number) - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-semibold">
                    {form[service.key as keyof typeof form]}
                  </span>
                  <button
                    type="button"
                    onClick={() => update(service.key, (form[service.key as keyof typeof form] as number) + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dress Code (optional)</label>
            <input
              type="text"
              value={form.dress_code}
              onChange={e => update('dress_code', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. Black & White, Formal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
            <textarea
              value={form.special_instructions}
              onChange={e => update('special_instructions', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              rows={3}
              placeholder="Any special requirements..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (form.servers_needed + form.bartenders_needed + form.cleaners_needed === 0)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      )}
    </div>
  );
}
