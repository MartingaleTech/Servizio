import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { PricingRule } from '../../types';
import { DollarSign, Save } from 'lucide-react';

export default function AdminPricing() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedRates, setEditedRates] = useState<Record<string, { hourly_rate: number; platform_fee_percent: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get<PricingRule[]>('/api/admin/pricing')
      .then(r => {
        setRules(r);
        const edits: Record<string, { hourly_rate: number; platform_fee_percent: number }> = {};
        r.forEach(rule => {
          edits[rule.role] = { hourly_rate: rule.hourly_rate, platform_fee_percent: rule.platform_fee_percent };
        });
        setEditedRates(edits);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveRule = async (role: string) => {
    setSaving(role);
    setMessage('');
    try {
      const updated = await api.put<PricingRule>(`/api/admin/pricing/${role}`, editedRates[role]);
      setRules(rules.map(r => r.role === role ? updated : r));
      setMessage(`${role} pricing updated!`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>

      {message && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{message}</div>
      )}

      {rules.map(rule => (
        <div key={rule.role} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
            <DollarSign size={18} className="text-indigo-500" />
            {rule.role}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={editedRates[rule.role]?.hourly_rate || 0}
              onChange={e => setEditedRates({
                ...editedRates,
                [rule.role]: { ...editedRates[rule.role], hourly_rate: parseFloat(e.target.value) || 0 },
              })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              min={0}
              step={0.5}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform Fee (%)
            </label>
            <input
              type="number"
              value={editedRates[rule.role]?.platform_fee_percent || 0}
              onChange={e => setEditedRates({
                ...editedRates,
                [rule.role]: { ...editedRates[rule.role], platform_fee_percent: parseFloat(e.target.value) || 0 },
              })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              min={0}
              max={50}
              step={0.5}
            />
          </div>

          <button
            onClick={() => saveRule(rule.role)}
            disabled={saving === rule.role}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Save size={14} />
            {saving === rule.role ? 'Saving...' : 'Save'}
          </button>
        </div>
      ))}
    </div>
  );
}
