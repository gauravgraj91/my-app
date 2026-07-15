import React from 'react';

const MeterBar = ({ segments = [], total = 0, height = 10, style, ...props }) => {
  const sum = segments.reduce((s, seg) => s + Math.max(seg.value || 0, 0), 0);
  const denom = Math.max(total, sum);
  return (
    <div
      {...props}
      style={{
        height,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--secondary)',
        overflow: 'hidden',
        display: 'flex',
        ...style
      }}
    >
      {denom > 0 && segments.map((seg, i) => (
        <span
          key={i}
          style={{
            width: `${(Math.max(seg.value || 0, 0) / denom) * 100}%`,
            background: seg.color,
            borderRadius: 'var(--radius-pill)'
          }}
        />
      ))}
    </div>
  );
};

export default MeterBar;
