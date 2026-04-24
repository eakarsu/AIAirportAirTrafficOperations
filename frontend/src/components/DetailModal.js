import React from 'react';

function DetailModal({ title, item, fields, onClose, onEdit, onDelete }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {fields.map(field => (
              <div key={field.key} className="detail-item">
                <label>{field.label}</label>
                <span>
                  {field.render
                    ? field.render(item[field.key], item)
                    : (item[field.key] != null ? String(item[field.key]) : 'N/A')}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-edit" onClick={() => onEdit(item)}>
            <i className="fas fa-edit"></i> Edit
          </button>
          <button className="btn-delete" onClick={() => onDelete(item.id)}>
            <i className="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DetailModal;
