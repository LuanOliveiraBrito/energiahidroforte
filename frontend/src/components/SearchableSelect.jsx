import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';

/**
 * Select com campo de busca integrado.
 * Props:
 *  - options: [{ value, label }]
 *  - value: valor selecionado (string/number)
 *  - onChange: (value) => void
 *  - placeholder: texto quando nada selecionado
 *  - disabled: boolean
 *  - noOptionsText: texto quando não há opções
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  noOptionsText = 'Nenhuma opção disponível',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Label do item selecionado
  const selectedOption = options.find((o) => String(o.value) === String(value));

  // Filtro
  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
        setHighlightIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll no item highlighted
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  function handleToggle() {
    if (disabled) return;
    if (!open) {
      setOpen(true);
      setSearch('');
      setHighlightIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
      setSearch('');
      setHighlightIdx(-1);
    }
  }

  function handleSelect(opt) {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
    setHighlightIdx(-1);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setSearch('');
  }

  function handleKeyDown(e) {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && filtered[highlightIdx]) {
        handleSelect(filtered[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
      setHighlightIdx(-1);
    }
  }

  return (
    <div className={`searchable-select ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      {/* Trigger */}
      <div className="ss-trigger" onClick={handleToggle}>
        <span className={`ss-value ${!selectedOption ? 'ss-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="ss-icons">
          {selectedOption && !disabled && (
            <FiX size={14} className="ss-clear" onClick={handleClear} />
          )}
          <FiChevronDown size={14} className={`ss-arrow ${open ? 'ss-arrow-open' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <FiSearch size={14} className="ss-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="ss-search-input"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <span className="ss-search-count">{filtered.length}</span>
            )}
          </div>
          <ul className="ss-options" ref={listRef}>
            {filtered.length === 0 ? (
              <li className="ss-no-options">{noOptionsText}</li>
            ) : (
              filtered.map((opt, idx) => (
                <li
                  key={opt.value}
                  className={`ss-option ${String(opt.value) === String(value) ? 'ss-selected' : ''} ${idx === highlightIdx ? 'ss-highlighted' : ''}`}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
