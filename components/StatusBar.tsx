
import React from 'react';

interface Props {
  label: string;
  current: number;
  max: number;
  color: string;
  onUpdate: (val: number) => void;
  onMaxUpdate?: (val: number) => void;
  icon: string;
  isEditing?: boolean;
}

export const StatusBar: React.FC<Props> = ({ label, current, max, color, onUpdate, onMaxUpdate, icon, isEditing }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          {icon} {label}
        </span>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button 
              onClick={() => onUpdate(current - 1)} 
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white text-xs"
            >-</button>
          )}
          
          <div className="flex items-center font-cinzel font-bold text-sm">
            <input 
               type="number"
               value={current}
               onChange={(e) => onUpdate(parseInt(e.target.value) || 0)}
               className={`w-12 bg-transparent text-right outline-none ${isEditing ? 'border-b border-amber-500/50' : ''}`}
               readOnly={!isEditing && false} // Actually we want manual edit too
            />
            <span className="mx-1">/</span>
            {isEditing ? (
              <input 
                type="number"
                value={max}
                onChange={(e) => onMaxUpdate?.(parseInt(e.target.value) || 1)}
                className="w-12 bg-transparent text-left border-b border-amber-500/50 outline-none"
              />
            ) : (
              <span className="w-12">{max}</span>
            )}
          </div>

          {!isEditing && (
            <button 
              onClick={() => onUpdate(current + 1)} 
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white text-xs"
            >+</button>
          )}
        </div>
      </div>
      <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
        <div 
          className={`h-full transition-all duration-300 ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
