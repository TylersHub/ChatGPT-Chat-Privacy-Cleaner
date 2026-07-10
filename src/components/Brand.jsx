import { Eraser, Shield } from 'lucide-react';

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="ClearSlate">
      <span className="brand__mark" aria-hidden="true">
        <Shield size={31} strokeWidth={1.8} />
        <Eraser className="brand__eraser" size={14} strokeWidth={2.2} />
      </span>
      {!compact && <span className="brand__name">ClearSlate</span>}
    </div>
  );
}

