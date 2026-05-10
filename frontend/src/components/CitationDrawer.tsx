import React from 'react';
import { X } from 'lucide-react';
import './CitationDrawer.css';

interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  source: any | null;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ isOpen, onClose, source }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer glass-panel">
        <div className="drawer-header">
          <h3>Source Reference</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        {source ? (
          <div className="drawer-content">
            <div className="source-meta">
              <span className="badge">Page {source.page}</span>
              <span className="badge">{source.chapter}</span>
              {source.section && source.section !== 'Main' && <span className="badge">{source.section}</span>}
            </div>
            
            <div className="source-text">
              <p>{source.content}</p>
            </div>
          </div>
        ) : (
          <div className="drawer-content">
            <p>Select a citation chip to view its source text.</p>
          </div>
        )}
      </div>
    </>
  );
};
