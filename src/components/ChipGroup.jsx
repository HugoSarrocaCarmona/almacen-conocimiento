// Grupo de opciones táctiles. Con `multiple`, value es un array.
export default function ChipGroup({ label, options, value, onChange, multiple = false, allLabel, name }) {
  const isOn = (v) => (multiple ? value.includes(v) : value === v);
  const toggle = (v) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(v);
  };
  return (
    <div className="chips" role="group" aria-label={label} data-name={name}>
      {allLabel !== undefined && (
        <button
          type="button"
          className={`chip${(multiple ? value.length === 0 : !value) ? ' is-on' : ''}`}
          aria-pressed={multiple ? value.length === 0 : !value}
          onClick={() => onChange(multiple ? [] : '')}
        >
          {allLabel}
        </button>
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip${isOn(o.value) ? ' is-on' : ''}`}
          aria-pressed={isOn(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
