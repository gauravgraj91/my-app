import React from 'react';

const Office = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px 0' }}>Office Tasks</h1>
      <div style={{ 
        background: '#fff', 
        borderRadius: 12, 
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', 
        padding: 48, 
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Office Tasks Coming Soon!</div>
        <div style={{ fontSize: 14 }}>
          This section will contain office-specific task management features.
          <br />
          For now, you can use the Tasks section to manage all your tasks.
        </div>
      </div>
    </div>
  );
};

export default Office;