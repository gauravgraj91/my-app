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
      {denom > 0 && segments.map((seg, i) => {
        const left = i === 0 ? 'var(--radius-pill)' : '0';
        const right = i === segments.length - 1 ? 'var(--radius-pill)' : '0';
        return (
          <span
            key={i}
            style={{
              width: `${(Math.max(seg.value || 0, 0) / denom) * 100}%`,
              background: seg.color,
              borderRadius: `${left} ${right} ${right} ${left}`
            }}
          />
        );
      })}
    </div>
  );
};

export default MeterBar;
