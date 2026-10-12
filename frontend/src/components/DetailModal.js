import React from 'react';
import Modal from './AIWorkspaceModal';
import './AIWorkspace.css';
export default function DetailModal({title,item,fields,onClose,onEdit,onDelete}){
 if(!item)return null;const draft=item.record_kind==='planning_draft';
 return <Modal title={title} onClose={onClose} footer={<><button type="button" className="btn-edit" disabled={!draft} onClick={()=>onEdit(item)}>Edit</button><button type="button" className="btn-delete" disabled={!draft} onClick={()=>onDelete(item.id)}>Delete</button><button type="button" className="btn-cancel" onClick={onClose}>Cancel</button></>}><p>{draft?'Planning draft: every value is a proposal or training assumption. No operational evidence, execution, authorization, custody, observation, prediction or completed maintenance is established.':'Retained source record: changes require its actual authorized operational workflow.'}</p><div className="detail-grid">{fields.map(field=><div key={field.key} className="detail-item"><label>{field.label}</label><span>{item[field.key]===null||item[field.key]===undefined?'Not provided':field.render?field.render(item[field.key],item):String(item[field.key])}</span></div>)}</div></Modal>;
}
