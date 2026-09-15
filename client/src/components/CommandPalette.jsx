import { useEffect, useMemo, useRef } from 'react';

export default function CommandPalette({ open, query, setQuery, items, onSelect, onClose }) {
  const inputRef = useRef(null);
  useEffect(() => { if (!open) return; inputRef.current?.focus(); const esc = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [open, onClose]);
  const results = useMemo(() => { const q = query.trim().toLowerCase(); return q ? items.filter((item) => `${item.label} ${item.section || ''}`.toLowerCase().includes(q)) : items.slice(0, 10); }, [items, query]);
  if (!open) return null;
  return <><button className="command-backdrop" type="button" aria-label="Close search" onClick={onClose} /><section className="command-palette" role="dialog" aria-modal="true" aria-label="EduNex global search"><div className="command-search-row"><span>⌕</span><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search EduNex features..." aria-label="Search EduNex" /><kbd>ESC</kbd></div><div className="command-results">{results.length ? results.map((item) => <button type="button" className="command-result" key={item.to} onClick={() => onSelect(item)}><span className="command-result-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.section || 'Feature'}</small></span><b>↗</b></button>) : <div className="command-empty">No features found for “{query}”.</div>}</div><div className="command-footer"><span>Global search</span><span><kbd>↑↓</kbd> browse <kbd>Enter</kbd> open</span></div></section></>;
}
