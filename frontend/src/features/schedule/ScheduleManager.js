import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/features/schedule/ScheduleManager.tsx
// Zarządzanie harmonogramami termostatu
import { useState, useEffect } from 'react';
import { FiClock, FiPlus, FiEdit3, FiTrash2, FiSave, FiX, FiCopy, FiSettings, FiRefreshCw, FiCheck, FiThermometer } from 'react-icons/fi';
import { scheduleEntryAPI, scheduleTemplateAPI, scheduleUtils } from './api';
export default function ScheduleManager({ thermostatId, thermostatName, token }) {
    const [activeTab, setActiveTab] = useState('entries');
    const [entries, setEntries] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    // Modal states
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    // Form states
    const [entryForm, setEntryForm] = useState({
        weekday: 0,
        weekdays: [],
        start: '08:00',
        end: '22:00',
        target_temp_c: 21.0,
        template_id: null,
    });
    const [templateForm, setTemplateForm] = useState({
        name: '',
        description: '',
        is_active: true,
    });
    const [bulkForm, setBulkForm] = useState({
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
        }
        catch (err) {
            setError('Błąd ładowania harmonogramu: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadTemplates = async () => {
        try {
            const result = await scheduleTemplateAPI.list(thermostatId, token);
            setTemplates(result);
        }
        catch (err) {
            setError('Błąd ładowania szablonów: ' + err.message);
        }
    };
    useEffect(() => {
        loadEntries();
        loadTemplates();
    }, [thermostatId, selectedTemplate]);
    // Message handlers
    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };
    const showError = (msg) => {
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
            // Sprawdź nakładanie się wpisów czasowych
            const overlapCheck = scheduleUtils.checkTimeOverlap(entries, entryForm, editingEntry?.id);
            if (overlapCheck.hasOverlap && overlapCheck.conflictingEntry) {
                const conflictDay = scheduleUtils.getWeekdayName(overlapCheck.conflictingEntry.weekday);
                showError(`Nakładanie się z istniejącym wpisem w ${conflictDay} (${overlapCheck.conflictingEntry.start} - ${overlapCheck.conflictingEntry.end})`);
                return;
            }
            if (editingEntry) {
                // Edycja pojedynczego wpisu
                await scheduleEntryAPI.update(thermostatId, editingEntry.id, entryForm, token);
                showSuccess('Wpis zaktualizowany');
            }
            else {
                // Tworzenie nowego wpisu - używamy bulk API jeśli wybrano wiele dni
                const weekdays = entryForm.weekdays && entryForm.weekdays.length > 0
                    ? entryForm.weekdays
                    : [entryForm.weekday];
                if (weekdays.length > 1) {
                    // Wiele dni - użyj bulk API
                    const bulkData = {
                        weekdays,
                        start: entryForm.start,
                        end: entryForm.end,
                        target_temp_c: entryForm.target_temp_c,
                        template_id: entryForm.template_id,
                    };
                    await scheduleEntryAPI.createBulk(thermostatId, bulkData, token);
                    showSuccess(`Dodano ${weekdays.length} wpisów`);
                }
                else {
                    // Jeden dzień - zwykłe API
                    await scheduleEntryAPI.create(thermostatId, { ...entryForm, weekday: weekdays[0] }, token);
                    showSuccess('Wpis dodany');
                }
            }
            setShowEntryModal(false);
            setEditingEntry(null);
            loadEntries();
        }
        catch (err) {
            showError('Błąd zapisu: ' + err.message);
        }
    };
    const handleDeleteEntry = async (entry) => {
        if (!confirm(`Usunąć wpis ${scheduleUtils.getWeekdayName(entry.weekday)} ${entry.start}-${entry.end}?`))
            return;
        try {
            await scheduleEntryAPI.delete(thermostatId, entry.id, token);
            showSuccess('Wpis usunięty');
            loadEntries();
        }
        catch (err) {
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
        }
        catch (err) {
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
            }
            else {
                await scheduleTemplateAPI.create(thermostatId, templateForm, token);
                showSuccess('Szablon utworzony');
            }
            setShowTemplateModal(false);
            setEditingTemplate(null);
            loadTemplates();
        }
        catch (err) {
            showError('Błąd zapisu szablonu: ' + err.message);
        }
    };
    const handleDeleteTemplate = async (template) => {
        const message = template.entries_count > 0
            ? `Usunąć szablon "${template.name}" wraz z ${template.entries_count} wpisami?`
            : `Usunąć szablon "${template.name}"?`;
        if (!confirm(message))
            return;
        try {
            await scheduleTemplateAPI.delete(thermostatId, template.id, true, token);
            showSuccess('Szablon usunięty');
            loadTemplates();
            loadEntries(); // Odśwież wpisy
            if (selectedTemplate === template.id) {
                setSelectedTemplate(null);
            }
        }
        catch (err) {
            showError('Błąd usuwania szablonu: ' + err.message);
        }
    };
    // Modal openers
    const openAddEntry = () => {
        // Znajdź ostatnio utworzony szablon (najwyższe ID)
        const lastTemplate = templates.length > 0
            ? templates.reduce((prev, current) => (prev.id > current.id ? prev : current))
            : null;
        setEntryForm({
            weekday: 0,
            weekdays: [],
            start: '08:00',
            end: '22:00',
            target_temp_c: 21.0,
            template_id: selectedTemplate || lastTemplate?.id || null,
        });
        setEditingEntry(null);
        setShowEntryModal(true);
    };
    const openEditEntry = (entry) => {
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
    const openEditTemplate = (template) => {
        setTemplateForm({
            name: template.name,
            description: template.description || '',
            is_active: template.is_active,
        });
        setEditingTemplate(template);
        setShowTemplateModal(true);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800", children: "Harmonogram termostatu" }), _jsx("p", { className: "text-gray-600", children: thermostatName })] }), _jsxs("button", { onClick: () => { loadEntries(); loadTemplates(); }, className: "btn-secondary flex items-center gap-2", disabled: loading, children: [_jsx(FiRefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), _jsx("span", { children: "Od\u015Bwie\u017C" })] })] }), error && (_jsx("div", { className: "p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in", children: error })), success && (_jsx("div", { className: "p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FiCheck, { className: "w-4 h-4" }), _jsx("span", { children: success })] }) })), _jsxs("div", { className: "flex space-x-1 bg-gray-100 p-1 rounded-lg", children: [_jsxs("button", { onClick: () => setActiveTab('entries'), className: `flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'entries'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}`, children: [_jsx(FiClock, { className: "w-4 h-4 inline mr-2" }), "Wpisy harmonogramu"] }), _jsxs("button", { onClick: () => setActiveTab('templates'), className: `flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'templates'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}`, children: [_jsx(FiSettings, { className: "w-4 h-4 inline mr-2" }), "Szablony"] })] }), activeTab === 'entries' ? (_jsx(EntriesTab, { entries: entries, templates: templates, selectedTemplate: selectedTemplate, loading: loading, onSelectTemplate: setSelectedTemplate, onAddEntry: openAddEntry, onAddBulk: openAddBulk, onEditEntry: openEditEntry, onDeleteEntry: handleDeleteEntry })) : (_jsx(TemplatesTab, { templates: templates, onAddTemplate: openAddTemplate, onEditTemplate: openEditTemplate, onDeleteTemplate: handleDeleteTemplate })), showEntryModal && (_jsx(EntryModal, { form: entryForm, templates: templates, editing: !!editingEntry, onSave: handleSaveEntry, onCancel: () => setShowEntryModal(false), onChange: setEntryForm })), showBulkModal && (_jsx(BulkModal, { form: bulkForm, templates: templates, onSave: handleSaveBulk, onCancel: () => setShowBulkModal(false), onChange: setBulkForm })), showTemplateModal && (_jsx(TemplateModal, { form: templateForm, editing: !!editingTemplate, onSave: handleSaveTemplate, onCancel: () => setShowTemplateModal(false), onChange: setTemplateForm }))] }));
}
// Subcomponents
function EntriesTab({ entries, templates, selectedTemplate, loading, onSelectTemplate, onAddEntry, onAddBulk, onEditEntry, onDeleteEntry }) {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "Filtruj po szablonie:" }), _jsxs("select", { value: selectedTemplate || '', onChange: (e) => onSelectTemplate(e.target.value ? Number(e.target.value) : null), className: "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500", children: [_jsx("option", { value: "", children: "Wszystkie wpisy" }), templates.map(template => (_jsxs("option", { value: template.id, children: [template.name, " (", template.entries_count, ")"] }, template.id)))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: onAddEntry, className: "btn-primary flex items-center gap-2", children: [_jsx(FiPlus, { className: "w-4 h-4" }), _jsx("span", { children: "Dodaj wpis" })] }), _jsxs("button", { onClick: onAddBulk, className: "btn-secondary flex items-center gap-2", children: [_jsx(FiCopy, { className: "w-4 h-4" }), _jsx("span", { children: "Dodaj masowo" })] })] })] }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx("div", { className: "w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" }) })) : entries.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(FiClock, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-700 mb-2", children: "Brak wpis\u00F3w harmonogramu" }), _jsx("p", { className: "text-gray-500 mb-4", children: selectedTemplate ? 'Ten szablon nie ma jeszcze żadnych wpisów.' : 'Dodaj pierwszy wpis harmonogramu.' }), _jsxs("button", { onClick: onAddEntry, className: "btn-primary", children: [_jsx(FiPlus, { className: "w-4 h-4 inline mr-2" }), "Dodaj wpis"] })] })) : (_jsx("div", { className: "grid gap-4", children: Array.from({ length: 7 }, (_, weekday) => {
                    const dayEntries = entries.filter(e => e.weekday === weekday);
                    if (dayEntries.length === 0)
                        return null;
                    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-3 border-b", children: _jsx("h4", { className: "font-medium text-primary-900", children: scheduleUtils.getWeekdayName(weekday) }) }), _jsx("div", { className: "divide-y divide-gray-100", children: dayEntries.map(entry => (_jsx("div", { className: "px-6 py-4 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(FiClock, { className: "w-4 h-4" }), _jsxs("span", { className: "font-mono text-sm", children: [entry.start, " - ", entry.end] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FiThermometer, { className: "w-4 h-4 text-orange-500" }), _jsx("span", { className: "font-semibold text-orange-700", children: scheduleUtils.formatTemp(entry.target_temp_c) })] }), entry.template_id && (_jsx("div", { className: "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full", children: templates.find(t => t.id === entry.template_id)?.name || 'Szablon' }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => onEditEntry(entry), className: "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", children: _jsx(FiEdit3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => onDeleteEntry(entry), className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", children: _jsx(FiTrash2, { className: "w-4 h-4" }) })] })] }) }, entry.id))) })] }, weekday));
                }) }))] }));
}
function TemplatesTab({ templates, onAddTemplate, onEditTemplate, onDeleteTemplate }) {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-800", children: "Szablony harmonogram\u00F3w" }), _jsx("p", { className: "text-gray-600 text-sm", children: "Zarz\u0105dzaj szablonami do szybkiego tworzenia harmonogram\u00F3w" })] }), _jsxs("button", { onClick: onAddTemplate, className: "btn-primary flex items-center gap-2", children: [_jsx(FiPlus, { className: "w-4 h-4" }), _jsx("span", { children: "Nowy szablon" })] })] }), templates.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(FiSettings, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-700 mb-2", children: "Brak szablon\u00F3w" }), _jsx("p", { className: "text-gray-500 mb-4", children: "Stw\u00F3rz sw\u00F3j pierwszy szablon harmonogramu." }), _jsxs("button", { onClick: onAddTemplate, className: "btn-primary", children: [_jsx(FiPlus, { className: "w-4 h-4 inline mr-2" }), "Nowy szablon"] })] })) : (_jsx("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: templates.map(template => (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-semibold text-gray-800 mb-1", children: template.name }), template.description && (_jsx("p", { className: "text-gray-600 text-sm mb-2", children: template.description })), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-500", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(FiClock, { className: "w-3 h-3" }), template.entries_count, " wpis\u00F3w"] }), _jsx("span", { className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${template.is_active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'}`, children: template.is_active ? 'Aktywny' : 'Nieaktywny' })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => onEditTemplate(template), className: "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", children: _jsx(FiEdit3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => onDeleteTemplate(template), className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", children: _jsx(FiTrash2, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "text-xs text-gray-400 border-t pt-3", children: ["Utworzony: ", new Date(template.created_at).toLocaleDateString('pl-PL')] })] }, template.id))) }))] }));
}
function EntryModal({ form, templates, editing, onSave, onCancel, onChange }) {
    const toggleWeekday = (day) => {
        const weekdays = form.weekdays || [];
        const newWeekdays = weekdays.includes(day)
            ? weekdays.filter(d => d !== day)
            : [...weekdays, day].sort();
        onChange({ ...form, weekdays: newWeekdays });
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-xl max-w-md w-full p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: editing ? 'Edytuj wpis' : 'Dodaj wpis' }), _jsx("button", { onClick: onCancel, className: "p-2 text-gray-400 hover:text-gray-600 rounded-lg", children: _jsx(FiX, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: editing ? 'Dzień tygodnia' : 'Dni tygodnia' }), editing ? (
                                // Edycja - pojedynczy wybór
                                _jsx("select", { value: form.weekday, onChange: (e) => onChange({ ...form, weekday: Number(e.target.value) }), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500", children: scheduleUtils.weekdayNames.map((name, index) => (_jsx("option", { value: index, children: name }, index))) })) : (
                                // Dodawanie - wielokrotny wybór
                                _jsx("div", { className: "grid grid-cols-2 gap-2", children: scheduleUtils.weekdayNames.map((name, index) => (_jsxs("label", { className: `flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${(form.weekdays || []).includes(index)
                                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: [_jsx("input", { type: "checkbox", checked: (form.weekdays || []).includes(index), onChange: () => toggleWeekday(index), className: "w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500" }), _jsx("span", { className: "text-sm font-medium", children: name })] }, index))) }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Godzina rozpocz\u0119cia" }), _jsx("input", { type: "time", value: form.start, onChange: (e) => onChange({ ...form, start: e.target.value }), step: "900", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Godzina zako\u0144czenia" }), _jsx("input", { type: "time", value: form.end, onChange: (e) => onChange({ ...form, end: e.target.value }), step: "900", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Temperatura zadana (\u00B0C)" }), _jsx("input", { type: "number", min: "10", max: "30", step: "0.5", value: form.target_temp_c, onChange: (e) => onChange({ ...form, target_temp_c: Number(e.target.value) }), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Szablon (opcjonalne)" }), _jsxs("select", { value: form.template_id || '', onChange: (e) => onChange({ ...form, template_id: e.target.value ? Number(e.target.value) : null }), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500", children: [_jsx("option", { value: "", children: "Bez szablonu" }), templates.filter(t => t.is_active).map(template => (_jsx("option", { value: template.id, children: template.name }, template.id)))] })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onCancel, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors", children: "Anuluj" }), _jsxs("button", { onClick: onSave, className: "flex-1 btn-primary", children: [_jsx(FiSave, { className: "w-4 h-4 inline mr-2" }), editing ? 'Zapisz' : 'Dodaj'] })] })] }) }));
}
function BulkModal({ form, templates, onSave, onCancel, onChange }) {
    const toggleWeekday = (weekday) => {
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
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-xl max-w-lg w-full p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Dodaj wpisy masowo" }), _jsx("button", { onClick: onCancel, className: "p-2 text-gray-400 hover:text-gray-600 rounded-lg", children: _jsx(FiX, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Wybierz dni tygodnia" }), _jsxs("div", { className: "flex gap-2 mb-3", children: [_jsx("button", { type: "button", onClick: selectWorkdays, className: "text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors", children: "Dni robocze" }), _jsx("button", { type: "button", onClick: selectWeekends, className: "text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors", children: "Weekendy" }), _jsx("button", { type: "button", onClick: selectAll, className: "text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors", children: "Wszystkie" }), _jsx("button", { type: "button", onClick: clearAll, className: "text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors", children: "Wyczy\u015B\u0107" })] }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: scheduleUtils.weekdayNames.map((name, index) => (_jsxs("label", { className: "flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.weekdays.includes(index), onChange: () => toggleWeekday(index), className: "rounded text-primary-600 focus:ring-primary-500" }), _jsx("span", { className: "text-sm", children: name })] }, index))) }), form.weekdays.length > 0 && (_jsxs("div", { className: "mt-2 text-sm text-gray-600", children: ["Wybrane: ", scheduleUtils.weekdaysToText(form.weekdays)] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Godzina rozpocz\u0119cia" }), _jsx("input", { type: "time", value: form.start, onChange: (e) => onChange({ ...form, start: e.target.value }), step: "900", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Godzina zako\u0144czenia" }), _jsx("input", { type: "time", value: form.end, onChange: (e) => onChange({ ...form, end: e.target.value }), step: "900", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Temperatura zadana (\u00B0C)" }), _jsx("input", { type: "number", min: "10", max: "30", step: "0.5", value: form.target_temp_c, onChange: (e) => onChange({ ...form, target_temp_c: Number(e.target.value) }), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Szablon (opcjonalne)" }), _jsxs("select", { value: form.template_id || '', onChange: (e) => onChange({ ...form, template_id: e.target.value ? Number(e.target.value) : null }), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500", children: [_jsx("option", { value: "", children: "Bez szablonu" }), templates.filter(t => t.is_active).map(template => (_jsx("option", { value: template.id, children: template.name }, template.id)))] })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onCancel, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors", children: "Anuluj" }), _jsxs("button", { onClick: onSave, disabled: form.weekdays.length === 0, className: "flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(FiSave, { className: "w-4 h-4 inline mr-2" }), "Dodaj ", form.weekdays.length, " wpis\u00F3w"] })] })] }) }));
}
function TemplateModal({ form, editing, onSave, onCancel, onChange }) {
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-xl max-w-md w-full p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: editing ? 'Edytuj szablon' : 'Nowy szablon' }), _jsx("button", { onClick: onCancel, className: "p-2 text-gray-400 hover:text-gray-600 rounded-lg", children: _jsx(FiX, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nazwa szablonu *" }), _jsx("input", { type: "text", value: form.name, onChange: (e) => onChange({ ...form, name: e.target.value }), placeholder: "np. Dni robocze, Weekend, Wakacje...", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Opis (opcjonalny)" }), _jsx("textarea", { value: form.description || '', onChange: (e) => onChange({ ...form, description: e.target.value }), placeholder: "Opisz szablon harmonogramu...", rows: 3, className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" })] }), _jsxs("div", { children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: form.is_active, onChange: (e) => onChange({ ...form, is_active: e.target.checked }), className: "rounded text-primary-600 focus:ring-primary-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Szablon aktywny" })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Tylko aktywne szablony s\u0105 widoczne przy dodawaniu wpis\u00F3w" })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onCancel, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors", children: "Anuluj" }), _jsxs("button", { onClick: onSave, disabled: !form.name.trim(), className: "flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(FiSave, { className: "w-4 h-4 inline mr-2" }), editing ? 'Zapisz' : 'Utwórz'] })] })] }) }));
}
