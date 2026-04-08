import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { WorkerProfile as WorkerProfileType, IDVerification, Availability } from '../../types';
import {
  User, Shield, Clock, Star, Save,
  CheckCircle, XCircle, AlertTriangle, Plus, Trash2,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ROLES = ['server', 'bartender', 'cleaner'];

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WorkerProfileType | null>(null);
  const [verification, setVerification] = useState<IDVerification | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'verification' | 'availability'>('profile');
  const [message, setMessage] = useState('');

  // Profile form
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [rolesInterested, setRolesInterested] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [languages, setLanguages] = useState('');
  const [maxDistance, setMaxDistance] = useState(20);
  const [acceptingJobs, setAcceptingJobs] = useState(true);
  // V1: Enhanced profile fields
  const [skillsTags, setSkillsTags] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  // Verification form
  const [idFront, setIdFront] = useState('');
  const [idBack, setIdBack] = useState('');
  const [selfie, setSelfie] = useState('');

  // Availability form
  const [newAvailDay, setNewAvailDay] = useState(0);
  const [newAvailStart, setNewAvailStart] = useState('09:00');
  const [newAvailEnd, setNewAvailEnd] = useState('17:00');

  useEffect(() => {
    Promise.all([
      api.get<WorkerProfileType>('/api/workers/profile/me').catch(() => null),
      api.get<IDVerification | null>('/api/workers/verification').catch(() => null),
      api.get<Availability[]>('/api/workers/availability').catch(() => []),
    ]).then(([p, v, a]) => {
      if (p) {
        setProfile(p);
        setBio(p.bio || '');
        setCity(p.city || '');
        setDob(p.date_of_birth || '');
        setRolesInterested(p.roles_interested ? p.roles_interested.split(',') : []);
        setExperienceLevel(p.experience_level);
        setLanguages(p.languages || '');
        setMaxDistance(p.max_travel_distance_km);
        setAcceptingJobs(p.is_accepting_jobs);
        setSkillsTags(p.skills_tags ? p.skills_tags.split(',').filter(Boolean) : []);
        setCertifications(p.certifications ? p.certifications.split(',').filter(Boolean) : []);
      }
      setVerification(v);
      setAvailabilities(a);
    }).finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await api.put<WorkerProfileType>('/api/workers/profile', {
        bio,
        city,
        date_of_birth: dob,
        roles_interested: rolesInterested.join(','),
        experience_level: experienceLevel,
        languages,
        max_travel_distance_km: maxDistance,
        is_accepting_jobs: acceptingJobs,
        skills_tags: skillsTags.join(','),
        certifications: certifications.join(','),
      });
      setProfile(updated);
      setMessage('Profile saved!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async () => {
    setSaving(true);
    setMessage('');
    try {
      const v = await api.post<IDVerification>('/api/workers/verification', {
        government_id_front_url: idFront || 'https://placeholder.com/id-front.jpg',
        government_id_back_url: idBack || 'https://placeholder.com/id-back.jpg',
        selfie_url: selfie || 'https://placeholder.com/selfie.jpg',
      });
      setVerification(v);
      setMessage('Verification submitted!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  const addAvailability = async () => {
    try {
      const a = await api.post<Availability>('/api/workers/availability', {
        day_of_week: newAvailDay,
        start_time: newAvailStart,
        end_time: newAvailEnd,
      });
      setAvailabilities([...availabilities, a]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      await api.delete(`/api/workers/availability/${id}`);
      setAvailabilities(availabilities.filter(a => a.id !== id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('fail') || message.includes('error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'profile' as const, icon: User, label: 'Profile' },
          { key: 'verification' as const, icon: Shield, label: 'Verify' },
          { key: 'availability' as const, icon: Clock, label: 'Availability' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <User size={28} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{user?.full_name}</h2>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star size={14} className="text-yellow-500" />
                  {profile?.average_rating?.toFixed(1) || 'No ratings'}
                  <span className="text-gray-400 ml-1">({profile?.total_reviews || 0} reviews)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                rows={3}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roles Interested</label>
              <div className="flex gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRolesInterested(prev =>
                        prev.includes(role)
                          ? prev.filter(r => r !== role)
                          : [...prev, role]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                      rolesInterested.includes(role)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'experienced'].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExperienceLevel(level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                      experienceLevel === level
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* V1: Skills Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <div className="flex flex-wrap gap-2">
                {['tray_service', 'buffet_management', 'kids_events', 'weddings', 'corporate', 'cocktail_mixing', 'fine_dining'].map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSkillsTags(prev =>
                      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                    )}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      skillsTags.includes(skill) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {skill.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* V1: Certifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
              <div className="flex flex-wrap gap-2">
                {['food_handling', 'alcohol_service', 'first_aid', 'hygiene_safety'].map(cert => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => setCertifications(prev =>
                      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
                    )}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      certifications.includes(cert) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cert.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
              <input
                type="text"
                value={languages}
                onChange={e => setLanguages(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="English, Spanish, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Travel Distance: {maxDistance} km
              </label>
              <input
                type="range"
                min={5}
                max={50}
                value={maxDistance}
                onChange={e => setMaxDistance(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Accepting Jobs</span>
              <button
                type="button"
                onClick={() => setAcceptingJobs(!acceptingJobs)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  acceptingJobs ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  acceptingJobs ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Verification Tab */}
      {tab === 'verification' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield size={18} className="text-indigo-500" />
              ID Verification
            </h3>

            {verification ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  verification.status === 'approved' ? 'bg-green-50' :
                  verification.status === 'rejected' ? 'bg-red-50' :
                  'bg-yellow-50'
                }`}>
                  {verification.status === 'approved' ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : verification.status === 'rejected' ? (
                    <XCircle size={20} className="text-red-500" />
                  ) : (
                    <AlertTriangle size={20} className="text-yellow-500" />
                  )}
                  <span className="font-medium capitalize">{verification.status}</span>
                </div>
                {verification.admin_notes && (
                  <p className="text-sm text-gray-500">Notes: {verification.admin_notes}</p>
                )}
                {verification.status === 'rejected' && (
                  <p className="text-sm text-gray-500">You can resubmit your documents below.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">
                Submit your government ID and selfie to get verified.
              </p>
            )}

            {(!verification || verification.status === 'rejected') && (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Government ID (Front)</label>
                  <input
                    type="text"
                    value={idFront}
                    onChange={e => setIdFront(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="URL or upload ID front"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Government ID (Back)</label>
                  <input
                    type="text"
                    value={idBack}
                    onChange={e => setIdBack(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="URL or upload ID back"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selfie</label>
                  <input
                    type="text"
                    value={selfie}
                    onChange={e => setSelfie(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="URL or upload selfie"
                  />
                </div>
                <button
                  onClick={submitVerification}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Submit Verification'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Availability Tab */}
      {tab === 'availability' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Recurring Availability
            </h3>

            {availabilities.length > 0 && (
              <div className="space-y-2 mb-4">
                {availabilities.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">
                        {a.day_of_week !== null && a.day_of_week !== undefined ? DAYS[a.day_of_week] : a.specific_date}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {a.start_time} - {a.end_time}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAvailability(a.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium text-gray-700">Add Availability</p>
              <select
                value={newAvailDay}
                onChange={e => setNewAvailDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                {DAYS.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={newAvailStart}
                  onChange={e => setNewAvailStart(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
                <input
                  type="time"
                  value={newAvailEnd}
                  onChange={e => setNewAvailEnd(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              <button
                onClick={addAvailability}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
