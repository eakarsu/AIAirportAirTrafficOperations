import React, { useState, useEffect } from 'react';

function FormModal({ title, fields, initialData, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (initialData) {
      const data = { ...initialData };
      // Format datetime fields for input
      fields.forEach(f => {
        if (f.type === 'datetime-local' && data[f.key]) {
          data[f.key] = new Date(data[f.key]).toISOString().slice(0, 16);
        }
      });
      setFormData(data);
    } else {
      const defaults = {};
      fields.forEach(f => { defaults[f.key] = f.defaultValue || ''; });
      setFormData(defaults);
    }
  }, [initialData, fields]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="modal-body">
            <div className="form-row">
              {fields.map(field => (
                <div key={field.key} className={`form-group ${field.fullWidth ? 'full-width' : ''}`}>
                  <label>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      required={field.required}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      required={field.required}
                      step={field.step}
                      min={field.min}
                      max={field.max}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">
              <i className="fas fa-check"></i> {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormModal;
