import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ModalShell, { MODAL_FIELD_CLASS } from './ui/ModalShell';

/* eslint-disable no-unused-vars */
interface IncidentModalProps {
    lap: number;
    onClose: () => void;
    onSave: (...args: [string]) => void;
}
/* eslint-enable no-unused-vars */

const IncidentModal: React.FC<IncidentModalProps> = ({ lap, onClose, onSave }) => {
    const [text, setText] = useState('');

    return (
        <ModalShell
            title={<span className="flex items-center gap-2"><AlertTriangle size={14} className="text-amber-300" /> Add Incident</span>}
            onClose={onClose}
            ariaLabel="Add incident"
            closeLabel="Close incident modal"
            size="lg"
            tone="default"
            layer="modal"
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button onClick={onClose} variant="ghost" size="sm">CANCEL</Button>
                    <Button onClick={() => onSave(text)} disabled={!text.trim()} variant="primary" size="sm">SAVE</Button>
                </div>
            }
        >
                <div className="space-y-3">
                    <Badge variant="warning">Lap {lap}</Badge>
                    <textarea
                        autoFocus
                        aria-label="Incident details"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        placeholder="Pit entry, yellow, penalty, traffic, setup issue..."
                        className={`${MODAL_FIELD_CLASS} resize-none py-2 text-sm text-slate-200`}
                    />
                </div>
        </ModalShell>
    );
};

export default IncidentModal;



