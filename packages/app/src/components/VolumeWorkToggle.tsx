export function VolumeWorkToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text)' }}>
      <label style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ marginRight: '0.4rem' }}
        />
        Exclude volume work (sets &gt; 1)
      </label>
    </div>
  );
}
