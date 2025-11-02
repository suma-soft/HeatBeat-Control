// frontend/src/features/schedule/ScheduleManager.tsx
// Zarządzanie harmonogramami termostatu

import React, { useState, useEffect } from 'react';
import { 
  FiClock, 
  FiCalendar, 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiSave, 
  FiX, 
  FiCopy,
  FiSettings,
  FiRefreshCw,
  FiCheck,
  FiThermometer
} from 'react-icons/fi';
import { 
  ScheduleEntry, 
  ScheduleTemplate, 
  ScheduleEntryInput, 
  ScheduleTemplateInput,
  ScheduleBulkInput,
  scheduleEntryAPI, 
  scheduleTemplateAPI, 
  scheduleUtils 
} from './api';

type Props = {
  thermostatId: number;
  thermostatName: string;
  token?: string;
};

type TabType = 'entries' | 'templates';

export default function ScheduleManager({ thermostatId, thermostatName, token }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('entries');
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);

  // Form states
  const [entryForm, setEntryForm] = useState<ScheduleEntryInput>({
    weekday: 0,
    start: '08:00',
    end: '22:00',
    target_temp_c: 21.0,
    template_id: null,
  });

  const [templateForm, setTemplateForm] = useState<ScheduleTemplateInput>({
    name: '',
    description: '',
    is_active: true,
  });

  const [bulkForm, setBulkForm] = useState<ScheduleBulkInput>({
    weekdays: [],
    start: '08:00',
    end: '22:00',
    target_temp_c: 21.0,
    template_id: null,
  });

  // Load data
  const loadEntries = async () => {
    try {
      setLoading(true);
      const result = await scheduleEntryAPI.list(thermostatId, selectedTemplate || undefined, token);
      setEntries(scheduleUtils.sortEntries(result));
      setError(null);
    } catch (err: any) {
      setError('Błąd ładowania harmonogramu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await scheduleTemplateAPI.list(thermostatId, token);
      setTemplates(result);
    } catch (err: any) {
      setError('Błąd ładowania szablonów: ' + err.message);
    }
  };

  useEffect(() => {
    loadEntries();
    loadTemplates();
  }, [thermostatId, selectedTemplate]);

  // Message handlers
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // Entry handlers
  const handleSaveEntry = async () => {
    try {
      if (!scheduleUtils.isValidTimeRange(entryForm.start, entryForm.end)) {
        showError('Nieprawidłowy przedział czasowy');
        return;
      }

      if (editingEntry) {
        await scheduleEntryAPI.update(thermostatId, editingEntry.id, entryForm, token);
        showSuccess('Wpis zaktualizowany');
      } else {
        await scheduleEntryAPI.create(thermostatId, entryForm, token);
        showSuccess('Wpis dodany');
      }

      setShowEntryModal(false);
      setEditingEntry(null);
      loadEntries();
    } catch (err: any) {
      showError('Błąd zapisu: ' + err.message);
    }
  };

  const handleDeleteEntry = async (entry: ScheduleEntry) => {
    if (!confirm(`Usunąć wpis ${scheduleUtils.getWeekdayName(entry.weekday)} ${entry.start}-${entry.end}?`)) return;

    try {
      await scheduleEntryAPI.delete(thermostatId, entry.id, token);
      showSuccess('Wpis usunięty');
      loadEntries();
    } catch (err: any) {
      showError('Błąd usuwania: ' + err.message);
    }
  };

  const handleSaveBulk = async () => {
    try {
      if (bulkForm.weekdays.length === 0) {
        showError('Wybierz co najmniej jeden dzień');
        return;
      }

      if (!scheduleUtils.isValidTimeRange(bulkForm.start, bulkForm.end)) {
        showError('Nieprawidłowy przedział czasowy');
        return;
      }

      const result = await scheduleEntryAPI.createBulk(thermostatId, bulkForm, token);
      showSuccess(`Dodano ${result.created_count} wpisów`);
      setShowBulkModal(false);
      loadEntries();
    } catch (err: any) {
      showError('Błąd zapisu: ' + err.message);
    }
  };

  // Template handlers
  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.name.trim()) {
        showError('Podaj nazwę szablonu');
        return;
      }

      if (editingTemplate) {
        await scheduleTemplateAPI.update(thermostatId, editingTemplate.id, templateForm, token);
        showSuccess('Szablon zaktualizowany');
      } else {
        await scheduleTemplateAPI.create(thermostatId, templateForm, token);
        showSuccess('Szablon utworzony');
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      showError('Błąd zapisu szablonu: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (template: ScheduleTemplate) => {
    const message = template.entries_count > 0 
      ? `Usunąć szablon "${template.name}" wraz z ${template.entries_count} wpisami?`
      : `Usunąć szablon "${template.name}"?`;
    
    if (!confirm(message)) return;

    try {
      await scheduleTemplateAPI.delete(thermostatId, template.id, true, token);
      showSuccess('Szablon usunięty');
      loadTemplates();
      loadEntries(); // Odśwież wpisy
      if (selectedTemplate === template.id) {
        setSelectedTemplate(null);
      }
    } catch (err: any) {
      showError('Błąd usuwania szablonu: ' + err.message);
    }
  };

  // Modal openers
  const openAddEntry = () => {
    setEntryForm({
      weekday: 0,
      start: '08:00',
      end: '22:00',
      target_temp_c: 21.0,
      template_id: selectedTemplate,
    });
    setEditingEntry(null);
    setShowEntryModal(true);
  };

  const openEditEntry = (entry: ScheduleEntry) => {
    setEntryForm({
      weekday: entry.weekday,
      start: entry.start,
      end: entry.end,
      target_temp_c: entry.target_temp_c,
      template_id: entry.template_id,
    });
    setEditingEntry(entry);
    setShowEntryModal(true);
  };

  const openAddBulk = () => {
    setBulkForm({
      weekdays: [],
      start: '08:00',
      end: '22:00',
      target_temp_c: 21.0,
      template_id: selectedTemplate,
    });
    setShowBulkModal(true);
  };

  const openAddTemplate = () => {
    setTemplateForm({
      name: '',
      description: '',
      is_active: true,
    });
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (template: ScheduleTemplate) => {
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      is_active: template.is_active,
    });
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Harmonogram termostatu</h2>
          <p className="text-gray-600">{thermostatName}</p>
        </div>
        <button
          onClick={() => { loadEntries(); loadTemplates(); }}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Odśwież</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <FiCheck className="w-4 h-4" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('entries')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'entries'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiClock className="w-4 h-4 inline mr-2" />
          Wpisy harmonogramu
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'templates'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiSettings className="w-4 h-4 inline mr-2" />
          Szablony
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'entries' ? (
        <EntriesTab
          entries={entries}
          templates={templates}
          selectedTemplate={selectedTemplate}
          loading={loading}
          onSelectTemplate={setSelectedTemplate}
          onAddEntry={openAddEntry}
          onAddBulk={openAddBulk}
          onEditEntry={openEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      ) : (
        <TemplatesTab
          templates={templates}
          onAddTemplate={openAddTemplate}
          onEditTemplate={openEditTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      {/* Entry Modal */}
      {showEntryModal && (
        <EntryModal
          form={entryForm}
          templates={templates}
          editing={!!editingEntry}
          onSave={handleSaveEntry}
          onCancel={() => setShowEntryModal(false)}
          onChange={setEntryForm}
        />
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <BulkModal
          form={bulkForm}
          templates={templates}
          onSave={handleSaveBulk}
          onCancel={() => setShowBulkModal(false)}
          onChange={setBulkForm}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          form={templateForm}
          editing={!!editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setShowTemplateModal(false)}
          onChange={setTemplateForm}
        />
      )}
    </div>
  );
}

// Subcomponents
function EntriesTab({ 
  entries, 
  templates, 
  selectedTemplate, 
  loading, 
  onSelectTemplate, 
  onAddEntry, 
  onAddBulk, 
  onEditEntry, 
  onDeleteEntry 
}: {
  entries: ScheduleEntry[];
  templates: ScheduleTemplate[];
  selectedTemplate: number | null;
  loading: boolean;
  onSelectTemplate: (id: number | null) => void;
  onAddEntry: () => void;
  onAddBulk: () => void;
  onEditEntry: (entry: ScheduleEntry) => void;
  onDeleteEntry: (entry: ScheduleEntry) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filter and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filtruj po szablonie:</label>
          <select
            value={selectedTemplate || ''}
            onChange={(e) => onSelectTemplate(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Wszystkie wpisy</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.entries_count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAddEntry}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>Dodaj wpis</span>
          </button>
          <button
            onClick={onAddBulk}
            className="btn-secondary flex items-center gap-2"
          >
            <FiCopy className="w-4 h-4" />
            <span>Dodaj masowo</span>
          </button>
        </div>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <FiClock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Brak wpisów harmonogramu</h3>
          <p className="text-gray-500 mb-4">
            {selectedTemplate ? 'Ten szablon nie ma jeszcze żadnych wpisów.' : 'Dodaj pierwszy wpis harmonogramu.'}
          </p>
          <button onClick={onAddEntry} className="btn-primary">
            <FiPlus className="w-4 h-4 inline mr-2" />
            Dodaj wpis
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Group by weekday */}
          {Array.from({ length: 7 }, (_, weekday) => {
            const dayEntries = entries.filter(e => e.weekday === weekday);
            if (dayEntries.length === 0) return null;

            return (
              <div key={weekday} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-3 border-b">
                  <h4 className="font-medium text-primary-900">
                    {scheduleUtils.getWeekdayName(weekday)}
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {dayEntries.map(entry => (
                    <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FiClock className="w-4 h-4" />
                            <span className="font-mono text-sm">
                              {entry.start} - {entry.end}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiThermometer className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-orange-700">
                              {scheduleUtils.formatTemp(entry.target_temp_c)}
                            </span>
                          </div>
                          {entry.template_id && (
                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {templates.find(t => t.id === entry.template_id)?.name || 'Szablon'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditEntry(entry)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteEntry(entry)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ 
  templates, 
  onAddTemplate, 
  onEditTemplate, 
  onDeleteTemplate 
}: {
  templates: ScheduleTemplate[];
  onAddTemplate: () => void;
  onEditTemplate: (template: ScheduleTemplate) => void;
  onDeleteTemplate: (template: ScheduleTemplate) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-800">Szablony harmonogramów</h3>
          <p className="text-gray-600 text-sm">Zarządzaj szablonami do szybkiego tworzenia harmonogramów</p>
        </div>
        <button
          onClick={onAddTemplate}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nowy szablon</span>
        </button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <FiSettings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Brak szablonów</h3>
          <p className="text-gray-500 mb-4">
            Stwórz swój pierwszy szablon harmonogramu.
          </p>
          <button onClick={onAddTemplate} className="btn-primary">
            <FiPlus className="w-4 h-4 inline mr-2" />
            Nowy szablon
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 mb-1">{template.name}</h4>
                  {template.description && (
                    <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      {template.entries_count} wpisów
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      template.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditTemplate(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <FiEdit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 border-t pt-3">
                Utworzony: {new Date(template.created_at).toLocaleDateString('pl-PL')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryModal({ 
  form, 
  templates, 
  editing, 
  onSave, 
  onCancel, 
  onChange 
}: {
  form: ScheduleEntryInput;
  templates: ScheduleTemplate[];
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onChange: (form: ScheduleEntryInput) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {editing ? 'Edytuj wpis' : 'Dodaj wpis'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Dzień tygodnia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dzień tygodnia
            </label>
            <select
              value={form.weekday}
              onChange={(e) => onChange({ ...form, weekday: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {scheduleUtils.weekdayNames.map((name, index) => (
                <option key={index} value={index}>{name}</option>
              ))}
            </select>
          </div>

          {/* Godziny */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godzina rozpoczęcia
              </label>
              <input
                type="time"
                value={form.start}
                onChange={(e) => onChange({ ...form, start: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godzina zakończenia
              </label>
              <input
                type="time"
                value={form.end}
                onChange={(e) => onChange({ ...form, end: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Temperatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperatura zadana (°C)
            </label>
            <input
              type="number"
              min="10"
              max="30"
              step="0.5"
              value={form.target_temp_c}
              onChange={(e) => onChange({ ...form, target_temp_c: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Szablon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Szablon (opcjonalne)
            </label>
            <select
              value={form.template_id || ''}
              onChange={(e) => onChange({ ...form, template_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Bez szablonu</option>
              {templates.filter(t => t.is_active).map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onSave}
            className="flex-1 btn-primary"
          >
            <FiSave className="w-4 h-4 inline mr-2" />
            {editing ? 'Zapisz' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkModal({ 
  form, 
  templates, 
  onSave, 
  onCancel, 
  onChange 
}: {
  form: ScheduleBulkInput;
  templates: ScheduleTemplate[];
  onSave: () => void;
  onCancel: () => void;
  onChange: (form: ScheduleBulkInput) => void;
}) {
  const toggleWeekday = (weekday: number) => {
    const newWeekdays = form.weekdays.includes(weekday)
      ? form.weekdays.filter(d => d !== weekday)
      : [...form.weekdays, weekday].sort();
    onChange({ ...form, weekdays: newWeekdays });
  };

  const selectWorkdays = () => {
    onChange({ ...form, weekdays: [0, 1, 2, 3, 4] });
  };

  const selectWeekends = () => {
    onChange({ ...form, weekdays: [5, 6] });
  };

  const selectAll = () => {
    onChange({ ...form, weekdays: [0, 1, 2, 3, 4, 5, 6] });
  };

  const clearAll = () => {
    onChange({ ...form, weekdays: [] });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            Dodaj wpisy masowo
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Dni tygodnia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Wybierz dni tygodnia
            </label>
            
            {/* Quick selectors */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={selectWorkdays}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                Dni robocze
              </button>
              <button
                type="button"
                onClick={selectWeekends}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
              >
                Weekendy
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              >
                Wszystkie
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                Wyczyść
              </button>
            </div>
            
            {/* Weekday checkboxes */}
            <div className="grid grid-cols-2 gap-2">
              {scheduleUtils.weekdayNames.map((name, index) => (
                <label key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.weekdays.includes(index)}
                    onChange={() => toggleWeekday(index)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
            
            {form.weekdays.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Wybrane: {scheduleUtils.weekdaysToText(form.weekdays)}
              </div>
            )}
          </div>

          {/* Godziny */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godzina rozpoczęcia
              </label>
              <input
                type="time"
                value={form.start}
                onChange={(e) => onChange({ ...form, start: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godzina zakończenia
              </label>
              <input
                type="time"
                value={form.end}
                onChange={(e) => onChange({ ...form, end: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Temperatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperatura zadana (°C)
            </label>
            <input
              type="number"
              min="10"
              max="30"
              step="0.5"
              value={form.target_temp_c}
              onChange={(e) => onChange({ ...form, target_temp_c: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Szablon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Szablon (opcjonalne)
            </label>
            <select
              value={form.template_id || ''}
              onChange={(e) => onChange({ ...form, template_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Bez szablonu</option>
              {templates.filter(t => t.is_active).map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onSave}
            disabled={form.weekdays.length === 0}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4 inline mr-2" />
            Dodaj {form.weekdays.length} wpisów
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ 
  form, 
  editing, 
  onSave, 
  onCancel, 
  onChange 
}: {
  form: ScheduleTemplateInput;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onChange: (form: ScheduleTemplateInput) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {editing ? 'Edytuj szablon' : 'Nowy szablon'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nazwa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa szablonu *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder="np. Dni robocze, Weekend, Wakacje..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Opis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opis (opcjonalny)
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              placeholder="Opisz szablon harmonogramu..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Status aktywności */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Szablon aktywny
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Tylko aktywne szablony są widoczne przy dodawaniu wpisów
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onSave}
            disabled={!form.name.trim()}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4 inline mr-2" />
            {editing ? 'Zapisz' : 'Utwórz'}
          </button>
        </div>
      </div>
    </div>
  );
}