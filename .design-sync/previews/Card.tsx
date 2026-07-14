import { Card, Badge } from 'my-app';

// NOTE: Card spreads {...props} after style={cardStyle}, so passing a `style`
// prop replaces ALL card styling. Size with wrapper divs instead.
export const Default = () => (
  <div style={{ maxWidth: 360 }}>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sharma Traders</h3>
        <Badge variant="success">Paid</Badge>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-foreground)' }}>
        Last bill INV-2038 settled on 8 July. 14 bills this quarter, all cleared on time.
      </p>
    </Card>
  </div>
);

export const Shadows = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    {(['none', 'sm', 'default', 'lg'] as const).map((s) => (
      <div key={s} style={{ width: 150 }}>
        <Card shadow={s}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>shadow="{s}"</div>
        </Card>
      </div>
    ))}
  </div>
);

export const CompactPadding = () => (
  <div style={{ maxWidth: 280 }}>
    <Card padding={12}>
      <div style={{ fontSize: 13 }}>Compact card with padding={'{12}'}</div>
    </Card>
  </div>
);
