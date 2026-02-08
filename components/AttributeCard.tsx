
import React from 'react';
import { Attribute } from '../types';

interface Props {
  attr: Attribute;
  onRoll: (name: string, bonus: number) => void;
  isEditing: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onRacialChange: (val: number) => void;
  xpCost: number;
  canAfford: boolean;
}

export const calculateMod = (val: number) => {
  // Removido o limite fixo de 10 para permitir progressão infinita
  if (val < 0) return 0;
  return Math.floor(val / 10);
};

export const AttributeCard: React.FC<Props> = ({ attr, onRoll, isEditing, onUpgrade, onDowngrade, onRacialChange, xpCost, canAfford }) => {
  // O modificador é calculado sobre a SOMA do valor base + bônus inicial (racial)
  const totalValue = attr.value + attr.racialBonus;
  const mod = calculateMod(totalValue);
  const totalMod = mod + attr.bonusFromItems;

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-between attribute-card transition-all relative group overflow-hidden border-amber-500/10 hover:border-amber-500/40">
      <div className="absolute top-1 right-1 text-[8px] font-bold text-amber-500/20">ATRIBUTO</div>
      <div className="text-3xl mb-1 grayscale group-hover:grayscale-0 transition-all">{attr.icon}</div>
      <div className="text-[10px] uppercase font-bold text-amber-500/80">{attr.name}</div>
      
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-cinzel font-bold text-white">{totalValue}</span>
          {attr.racialBonus !== 0 && (
            <span className="text-[10px] text-green-400">+{attr.racialBonus}</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">Base: {attr.value}</div>
      </div>

      <div className="mt-1 text-2xl font-medieval text-amber-400">
        +{totalMod}
      </div>

      {isEditing ? (
        <div className="w-full space-y-2 mt-2">
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-slate-500 uppercase">Bônus Inicial</span>
            <input 
              type="number"
              value={attr.racialBonus}
              onChange={(e) => onRacialChange(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 text-center text-xs rounded border border-slate-700 text-green-400 py-1"
            />
          </div>
          <div className="flex gap-1 w-full">
            <button 
              onClick={(e) => { e.stopPropagation(); onDowngrade(); }}
              disabled={attr.value <= 0}
              className={`w-8 text-[10px] font-bold rounded transition-colors ${attr.value > 0 ? 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/50' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
              title="Reverter ponto"
            >
              -
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
              disabled={!canAfford}
              className={`flex-1 text-[10px] font-bold py-2 rounded transition-colors ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              UP (+1 BASE) <br/> <span className="text-[8px]">{xpCost} XP</span>
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="mt-2 w-full text-center text-[8px] text-slate-500 uppercase tracking-tighter cursor-pointer hover:text-amber-400"
          onClick={() => onRoll(attr.name, totalMod)}
        >
          Clique p/ Rolar
        </div>
      )}
    </div>
  );
};
