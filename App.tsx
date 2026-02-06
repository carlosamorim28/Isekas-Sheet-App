
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_CHARACTER_DATA, RANK_BONUS, RANK_NAMES, OFFICIAL_SKILL_LIST } from './constants';
import { AttributeCard, calculateMod } from './components/AttributeCard';
import { StatusBar } from './components/StatusBar';
import { Attribute, Skill, Spell, Ability, Item, ProficiencyRank, ItemType, CharacterData, XpLog } from './types';

const STORAGE_KEY = 'rpg_sheet_characters_v1';
const INDEX_KEY = 'rpg_sheet_active_index_v1';

// Função auxiliar para criar uma cópia profunda dos dados iniciais
const createNewCharacterData = (name: string, folder: string): CharacterData => ({
  ...INITIAL_CHARACTER_DATA,
  id: crypto.randomUUID(),
  name,
  folder,
  attributes: INITIAL_CHARACTER_DATA.attributes.map(a => ({ ...a })),
  hp: { ...INITIAL_CHARACTER_DATA.hp },
  mp: { ...INITIAL_CHARACTER_DATA.mp },
  skills: [],
  inventory: [],
  spells: [],
  abilities: [],
  xpLog: []
});

// Tabelas de Custos de XP Atributos
const getAttrXPCostForNextPoint = (val: number) => {
  if (val < 20) return 1;
  if (val < 30) return 2;
  if (val < 40) return 3;
  if (val < 50) return 4;
  if (val < 60) return 5;
  if (val < 70) return 6;
  if (val < 80) return 7;
  if (val < 90) return 8;
  if (val < 100) return 9;
  return 10;
};

const calculateTotalAttrSpent = (val: number) => {
  let total = 0;
  for (let i = 0; i < val; i++) {
    total += getAttrXPCostForNextPoint(i);
  }
  return total;
};

// Tabelas de Custos Perícias
const calculateSkillUpgradeOnly = (rank: ProficiencyRank, isDiscounted: boolean = false) => {
  const costs: Record<ProficiencyRank, number> = {
    'E': 0, 'D': 10, 'C': 10 + 50, 'B': 10 + 50 + 200, 'A': 10 + 50 + 200 + 300, 'S': 10 + 50 + 200 + 300 + 500,
  };
  const total = costs[rank];
  return isDiscounted ? Math.floor(total * 0.5) : total;
};

// Tabelas de Custos Magias
const getEntryCost = (origin: 'learned' | 'created', rank?: ProficiencyRank, isDiscounted: boolean = false) => {
  if (!rank) return 0;
  const table: Record<ProficiencyRank, number> = {
    'E': 10, 'D': 20, 'C': 50, 'B': 100, 'A': 200, 'S': 500
  };
  const base = table[rank];
  let cost = origin === 'created' ? base * 2 : base;
  return isDiscounted ? Math.floor(cost * 0.5) : cost;
};

const App: React.FC = () => {
  const [characters, setCharacters] = useState<CharacterData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [createNewCharacterData("Ardrin Massafunda", "Geral")];
  });

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const saved = localStorage.getItem(INDEX_KEY);
    return saved ? parseInt(saved) : 0;
  });

  const [currentFolder, setCurrentFolder] = useState<string>("Geral");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem(INDEX_KEY, activeIndex.toString());
  }, [activeIndex]);
  
  const activeChar = characters[activeIndex] || characters[0] || INITIAL_CHARACTER_DATA;

  const folders = useMemo(() => {
    const uniqueFolders = new Set<string>();
    uniqueFolders.add("Geral");
    characters.forEach(c => {
      if (c.folder) uniqueFolders.add(c.folder);
    });
    if (currentFolder) uniqueFolders.add(currentFolder);
    return Array.from(uniqueFolders).sort((a, b) => a === "Geral" ? -1 : b === "Geral" ? 1 : a.localeCompare(b));
  }, [characters, currentFolder]);

  const filteredCharacters = useMemo(() => {
    return characters.filter(c => (c.folder || "Geral") === currentFolder);
  }, [characters, currentFolder]);

  const [isEditing, setIsEditing] = useState(false); 
  const [rollResult, setRollResult] = useState<{ name: string; roll: number | string; bonus: number; total: number | string; isDamage?: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [showSkillSelect, setShowSkillSelect] = useState(false);
  const [showSpellForm, setShowSpellForm] = useState(false);
  const [showAbilityForm, setShowAbilityForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  
  const [isSkillDiscounted, setIsSkillDiscounted] = useState(false);
  const [isSkillInitialDuringCreation, setIsSkillInitialDuringCreation] = useState(false);
  const [isSpellDiscounted, setIsSpellDiscounted] = useState(false);
  const [isSpellInitialDuringCreation, setIsSpellInitialDuringCreation] = useState(false);
  const [selectedInitialRank, setSelectedInitialRank] = useState<ProficiencyRank>('E');

  // Estados para nova perícia personalizada
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillAttr, setCustomSkillAttr] = useState("---");

  const updateActiveChar = (updated: CharacterData) => {
    const newChars = [...characters];
    newChars[activeIndex] = updated;
    setCharacters(newChars);
  };

  const xpSpent = useMemo(() => {
    const attrSpent = activeChar.attributes.reduce((acc, a) => acc + calculateTotalAttrSpent(a.value), 0);
    const skillSpent = activeChar.skills.reduce((acc, s) => {
      const currentCost = calculateSkillUpgradeOnly(s.rank, s.isDiscounted);
      const offset = s.initialRank ? calculateSkillUpgradeOnly(s.initialRank, s.isDiscounted) : 0;
      return acc + (currentCost - offset);
    }, 0);
    const spellSpent = activeChar.spells.reduce((acc, s) => {
      const currentCost = getEntryCost(s.origin, s.rank, s.isDiscounted);
      const offset = s.initialRank ? getEntryCost(s.origin, s.initialRank, s.isDiscounted) : 0;
      return acc + (currentCost - offset);
    }, 0);
    return attrSpent + skillSpent + spellSpent;
  }, [activeChar]);

  const availableXp = activeChar.totalXp - xpSpent;

  const getAttrMod = (name: string) => {
    if (!name || name === "---") return 0; // Perícias desvinculadas não somam atributo
    const attr = activeChar.attributes.find(a => a.name === name);
    const total = attr ? attr.value + attr.racialBonus : 0;
    return calculateMod(total);
  };

  const hpMax = useMemo(() => 20 + (5 * getAttrMod('Constituição')) + activeChar.hp.extraMax, [activeChar.attributes, activeChar.hp.extraMax]);
  const mpMax = useMemo(() => 200 + (20 * getAttrMod('Mana')) + activeChar.mp.extraMax, [activeChar.attributes, activeChar.mp.extraMax]);
  const dexBonus = useMemo(() => getAttrMod('Destreza'), [activeChar.attributes]);

  const armorBonus = useMemo(() => {
    return activeChar.inventory
      .filter(item => item.type === 'armor' && item.isEquipped)
      .reduce((acc, item) => acc + (item.defense || 0), 0);
  }, [activeChar.inventory]);

  const armorSkillBonus = useMemo(() => {
    const selectedSkill = activeChar.skills.find(s => s.name === activeChar.selectedArmorSkillName);
    return selectedSkill ? RANK_BONUS[selectedSkill.rank] : 0;
  }, [activeChar.skills, activeChar.selectedArmorSkillName]);

  const effectiveAc = activeChar.ac + armorBonus + armorSkillBonus + dexBonus;

  const availableArmorSkills = useMemo(() => {
    const armorSkillNames = ["Armaduras Leves", "Armaduras Médias", "Armaduras Pesadas", "Defesa sem Armadura", "Escudos"];
    return activeChar.skills.filter(s => armorSkillNames.includes(s.name));
  }, [activeChar.skills]);

  const handleUpgradeSkill = (idx: number) => {
    const skill = activeChar.skills[idx];
    const RANKS: ProficiencyRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
    const currentIdx = RANKS.indexOf(skill.rank);
    if (currentIdx < RANKS.length - 1) {
      const nextRank = RANKS[currentIdx + 1];
      const upgradeCost = calculateSkillUpgradeOnly(nextRank, skill.isDiscounted) - calculateSkillUpgradeOnly(skill.rank, skill.isDiscounted);
      
      if (availableXp >= upgradeCost) {
        const newSkills = [...activeChar.skills];
        newSkills[idx] = { ...skill, rank: nextRank };
        const newLog = { id: crypto.randomUUID(), timestamp: Date.now(), description: `Melhoria Perícia: ${skill.name} (${RANK_NAMES[skill.rank]} → ${RANK_NAMES[nextRank]})`, cost: upgradeCost };
        updateActiveChar({ ...activeChar, skills: newSkills, xpLog: [newLog, ...(activeChar.xpLog || [])] });
      }
    }
  };

  const handleRemoveSkill = (idx: number) => {
    const skill = activeChar.skills[idx];
    const currentSpent = calculateSkillUpgradeOnly(skill.rank, skill.isDiscounted);
    const offset = skill.initialRank ? calculateSkillUpgradeOnly(skill.initialRank, skill.isDiscounted) : 0;
    const refund = currentSpent - offset;

    const newSkills = activeChar.skills.filter((_, i) => i !== idx);
    const newLogs = refund > 0 ? [{ id: crypto.randomUUID(), timestamp: Date.now(), description: `Remoção de Perícia: ${skill.name} (Reembolso de ${refund} XP)`, cost: -refund }, ...(activeChar.xpLog || [])] : (activeChar.xpLog || []);
    
    updateActiveChar({ ...activeChar, skills: newSkills, xpLog: newLogs });
  };

  const handleSelectSkill = (skill: { name: string; attr: string }) => {
    if (!skill.name.trim()) return;
    const initialRank = isSkillInitialDuringCreation ? selectedInitialRank : undefined;
    const cost = calculateSkillUpgradeOnly(selectedInitialRank, isSkillDiscounted) - (initialRank ? calculateSkillUpgradeOnly(initialRank, isSkillDiscounted) : 0);
    const newSkill: Skill = { name: skill.name, rank: selectedInitialRank, initialRank, relatedAttribute: skill.attr, initialBonus: 0, isDiscounted: isSkillDiscounted };
    const newLogs = cost > 0 ? [{ id: crypto.randomUUID(), timestamp: Date.now(), description: `Aquisição Perícia: ${skill.name} (Rank ${selectedInitialRank})`, cost }, ...(activeChar.xpLog || [])] : (activeChar.xpLog || []);
    updateActiveChar({ ...activeChar, skills: [...activeChar.skills, newSkill], xpLog: newLogs });
    setShowSkillSelect(false);
  };

  const handleAddSpell = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rank = formData.get('rank') as ProficiencyRank;
    const origin = formData.get('origin') as 'learned' | 'created';
    const initialRank = isSpellInitialDuringCreation ? rank : undefined;
    const cost = getEntryCost(origin, rank, isSpellDiscounted) - (initialRank ? getEntryCost(origin, initialRank, isSpellDiscounted) : 0);
    const newSpell: Spell = { 
      name: formData.get('name') as string, 
      rank, 
      initialRank, 
      cost: formData.get('cost') as string, 
      description: formData.get('description') as string, 
      origin, 
      isDiscounted: isSpellDiscounted 
    };
    const newLogs = cost > 0 ? [{ id: crypto.randomUUID(), timestamp: Date.now(), description: `Aprendizado Magia (${origin === 'created' ? 'Criada' : 'Lida'}): ${newSpell.name} (Rank ${rank})`, cost }, ...(activeChar.xpLog || [])] : (activeChar.xpLog || []);
    updateActiveChar({ ...activeChar, spells: [...activeChar.spells, newSpell], xpLog: newLogs });
    setShowSpellForm(false);
  };

  const handleRemoveSpell = (idx: number) => {
    const spell = activeChar.spells[idx];
    const currentSpent = getEntryCost(spell.origin, spell.rank, spell.isDiscounted);
    const offset = spell.initialRank ? getEntryCost(spell.origin, spell.initialRank, spell.isDiscounted) : 0;
    const refund = currentSpent - offset;

    const newSpells = activeChar.spells.filter((_, i) => i !== idx);
    const newLogs = refund > 0 ? [{ id: crypto.randomUUID(), timestamp: Date.now(), description: `Magia Esquecida: ${spell.name} (Reembolso de ${refund} XP)`, cost: -refund }, ...(activeChar.xpLog || [])] : (activeChar.xpLog || []);
    
    updateActiveChar({ ...activeChar, spells: newSpells, xpLog: newLogs });
  };

  const handleAddAbility = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAbility: Ability = { name: formData.get('name') as string, description: formData.get('description') as string, origin: 'learned' };
    updateActiveChar({ ...activeChar, abilities: [...activeChar.abilities, newAbility] });
    setShowAbilityForm(false);
  };

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: Item = { id: crypto.randomUUID(), name: formData.get('name') as string, type: formData.get('type') as ItemType, damage: (formData.get('damage') as string) || undefined, defense: parseInt(formData.get('defense') as string) || 0, description: formData.get('description') as string, specialAbility: formData.get('specialAbility') as string, isEquipped: false };
    updateActiveChar({ ...activeChar, inventory: [...activeChar.inventory, newItem] });
    setShowItemForm(false);
  };

  const handleRoll = (name: string, bonus: number) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    setRollResult({ name, roll: d20, bonus, total: d20 + bonus });
    setTimeout(() => setRollResult(null), 5000);
  };

  const handleDamageRoll = (item: Item) => {
    if (!item.damage) return;
    const parts = item.damage.toLowerCase().replace(/\s/g, '').split('+');
    const dicePart = parts[0].split('d');
    const numDice = parseInt(dicePart[0]) || 1;
    const dieSize = parseInt(dicePart[1]) || 6;
    const staticBonus = parseInt(parts[1]) || 0;
    let totalRoll = 0;
    const rolls = [];
    for (let i = 0; i < numDice; i++) {
        const r = Math.floor(Math.random() * dieSize) + 1;
        rolls.push(r);
        totalRoll += r;
    }
    setRollResult({ name: `Dano: ${item.name}`, roll: rolls.join(' + '), bonus: staticBonus, total: totalRoll + staticBonus, isDamage: true });
    setTimeout(() => setRollResult(null), 5000);
  };

  const handleRenameFolder = (oldName: string) => {
    if (oldName === "Geral") return;
    const newName = prompt("Novo nome para a pasta:", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
      const updatedChars = characters.map(c => 
        (c.folder || "Geral") === oldName ? { ...c, folder: newName.trim() } : c
      );
      setCharacters(updatedChars);
      setCurrentFolder(newName.trim());
    }
  };

  const handleCreateFolder = () => {
    const name = prompt("Nome da nova pasta:");
    if (name && name.trim() !== "") {
      setCurrentFolder(name.trim());
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <nav className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 flex flex-col gap-3 shadow-lg">
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-4">
          
          {/* Linha das Pastas */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {folders.map(f => {
              const showRename = isEditing && f !== "Geral";
              return (
                <div key={f} className="flex items-center shrink-0 group h-9">
                  <button
                    onClick={() => setCurrentFolder(f)}
                    className={`flex items-center gap-2 px-4 h-full border text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap 
                      ${currentFolder === f ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'}
                      ${showRename ? 'rounded-l-lg border-r-0' : 'rounded-lg'}
                    `}
                  >
                    <span className="text-sm">📂</span> {f}
                  </button>
                  {showRename && (
                    <button 
                      onClick={() => handleRenameFolder(f)}
                      className={`px-3 h-full rounded-r-lg border border-l-0 text-[10px] transition-all
                        ${currentFolder === f ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-amber-400'}
                      `}
                      title="Renomear Pasta"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              );
            })}
            {isEditing && (
              <button 
                onClick={handleCreateFolder}
                className="px-4 h-9 shrink-0 rounded-lg border border-dashed border-slate-700 text-slate-600 text-[10px] font-bold hover:text-amber-500 hover:border-amber-500 whitespace-nowrap transition-all"
              >
                + NOVA PASTA
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Personagens na Pasta Ativa */}
            <div className="flex items-center gap-3 overflow-x-auto">
              {filteredCharacters.length > 0 ? filteredCharacters.map((char) => {
                const realIdx = characters.findIndex(c => c.id === char.id);
                return (
                  <button key={char.id} onClick={() => setActiveIndex(realIdx)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border whitespace-nowrap ${activeIndex === realIdx ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/40'}`}>
                    <img src={char.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${char.name || 'default'}`} className="w-5 h-5 rounded-full object-cover" alt="" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{char.name || "Aventureiro"}</span>
                  </button>
                );
              }) : (
                <span className="text-[10px] text-slate-600 italic px-2">Nenhum herói nesta pasta...</span>
              )}
              <button onClick={() => {
                const newChar = createNewCharacterData("Novo Aventureiro", currentFolder);
                const newChars = [...characters, newChar];
                setCharacters(newChars);
                setActiveIndex(newChars.length - 1);
              }} className="w-8 h-8 rounded-full bg-slate-800 border border-dashed border-slate-600 text-slate-500 flex items-center justify-center hover:text-amber-500 hover:border-amber-500 transition-all text-xl" title="Novo Personagem">+</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => { const data = JSON.stringify(characters, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'fichas.json'; a.click(); }} className="px-3 py-1.5 rounded bg-slate-800 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase hover:bg-slate-700">📤 Exportar</button>
              <button onClick={() => importInputRef.current?.click()} className="px-3 py-1.5 rounded bg-slate-800 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase hover:bg-slate-700">📥 Importar</button>
              <input type="file" ref={importInputRef} onChange={(e) => { 
                const file = e.target.files?.[0]; 
                if (file) { 
                  const reader = new FileReader(); 
                  reader.onload = (ev) => { 
                    try { 
                      const importedData = JSON.parse(ev.target?.result as string); 
                      const newOnes = (Array.isArray(importedData) ? importedData : [importedData]).map(c => ({
                        ...c,
                        id: crypto.randomUUID() // Garante ID único para evitar bugs de seleção e duplicidade
                      }));
                      setCharacters(prev => [...prev, ...newOnes]); 
                      alert(`${newOnes.length} personagem(ns) adicionado(s) com sucesso!`);
                    } catch (err) { 
                      alert("Erro ao importar: formato de arquivo inválido."); 
                    } 
                  }; 
                  reader.readAsText(file); 
                  // Limpa o input para permitir importar o mesmo arquivo novamente se desejado
                  e.target.value = '';
                } 
              }} className="hidden" accept=".json" />
            </div>
          </div>
        </div>
      </nav>

      <div className="px-4 md:px-8 max-w-6xl mx-auto">
        <header className="py-8 border-b border-amber-500/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div onClick={() => isEditing && fileInputRef.current?.click()} className={`w-24 h-24 rounded-full overflow-hidden border-4 border-amber-600/50 bg-slate-800 shadow-xl relative group ${isEditing ? 'cursor-pointer hover:border-amber-400' : ''}`}>
              <img src={activeChar.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${activeChar.name || 'default'}`} alt="Avatar" className="w-full h-full object-cover" />
              <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => updateActiveChar({ ...activeChar, avatar: reader.result as string }); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
              {isEditing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] font-bold text-white uppercase">Mudar Foto</span></div>}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input type="text" value={activeChar.name} onChange={e => updateActiveChar({...activeChar, name: e.target.value})} className="text-3xl font-cinzel font-bold text-amber-500 bg-transparent border-b border-amber-500/30 outline-none w-full" placeholder="Nome do Herói" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Mover para:</span>
                      <select 
                        value={activeChar.folder || "Geral"} 
                        onChange={e => updateActiveChar({...activeChar, folder: e.target.value})}
                        className="bg-slate-800 border border-slate-700 text-amber-500 text-[10px] px-2 py-1 rounded outline-none"
                      >
                        {folders.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-4xl font-cinzel font-bold text-amber-500 leading-none">{activeChar.name || "Sem Nome"}</h1>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">📁 {activeChar.folder || "Geral"}</span>
                  </>
                )}
              </div>
              <div className="bg-slate-800/90 px-4 py-2 rounded-xl border border-amber-500/10 inline-flex items-center gap-4 text-xs mt-2">
                <div className="flex flex-col"><span className="text-[7px] font-bold text-slate-500 uppercase">XP Total</span>{isEditing ? <input type="number" value={activeChar.totalXp} onChange={e => updateActiveChar({...activeChar, totalXp: parseInt(e.target.value) || 0})} className="w-20 bg-transparent text-amber-500 font-bold outline-none" /> : <span className="text-amber-500 font-bold">{activeChar.totalXp}</span>}</div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col"><span className="text-[7px] font-bold text-slate-500 uppercase">XP Disponível</span><span className={`font-bold ${availableXp >= 0 ? 'text-green-400' : 'text-red-500'}`}>{availableXp}</span></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all border-b-4 ${isEditing ? 'bg-green-600 border-green-800' : 'bg-amber-600 border-amber-800 active:translate-y-1 active:border-b-0'}`}>{isEditing ? '✓ SALVAR' : '⚔ EVOLUIR'}</button>
            {isEditing && (
              <button 
                onClick={() => {
                  if (confirm(`Excluir ${activeChar.name}? Esta ação é permanente.`)) {
                    const newChars = characters.filter((_, i) => i !== activeIndex);
                    setCharacters(newChars);
                    setActiveIndex(0);
                    setIsEditing(false);
                  }
                }}
                className="text-[9px] text-red-500 font-bold hover:underline self-center uppercase tracking-tighter"
              >
                Deletar Personagem
              </button>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* ATRIBUTOS */}
            <section>
              <h2 className="text-xl font-medieval text-amber-200 mb-4 flex items-center gap-2">𖤍 Atributos Rúnicos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {activeChar.attributes.map((attr, idx) => (
                  <AttributeCard 
                    key={idx} 
                    attr={attr} 
                    isEditing={isEditing} 
                    xpCost={getAttrXPCostForNextPoint(attr.value)} 
                    canAfford={availableXp >= getAttrXPCostForNextPoint(attr.value)} 
                    onUpgrade={() => {
                      const cost = getAttrXPCostForNextPoint(attr.value);
                      if (availableXp >= cost) {
                        const newAttributes = activeChar.attributes.map((a, i) => 
                          i === idx ? { ...a, value: a.value + 1 } : a
                        );
                        const log = { id: crypto.randomUUID(), timestamp: Date.now(), description: `Melhoria Atributo: ${attr.name} (${attr.value} → ${attr.value + 1})`, cost };
                        updateActiveChar({ ...activeChar, attributes: newAttributes, xpLog: [log, ...(activeChar.xpLog || [])] });
                      }
                    }}
                    onDowngrade={() => {
                      if (attr.value > 0) {
                        const refund = getAttrXPCostForNextPoint(attr.value - 1);
                        const newAttributes = activeChar.attributes.map((a, i) => 
                          i === idx ? { ...a, value: a.value - 1 } : a
                        );
                        const log = { 
                          id: crypto.randomUUID(), 
                          timestamp: Date.now(), 
                          description: `Reversão Atributo: ${attr.name} (${attr.value} → ${attr.value - 1}) (Reembolso de ${refund} XP)`, 
                          cost: -refund 
                        };
                        updateActiveChar({ ...activeChar, attributes: newAttributes, xpLog: [log, ...(activeChar.xpLog || [])] });
                      }
                    }}
                    onRacialChange={(val) => { 
                      const newAttributes = activeChar.attributes.map((a, i) => 
                        i === idx ? { ...a, racialBonus: val } : a
                      );
                      updateActiveChar({...activeChar, attributes: newAttributes}); 
                    }} 
                    onRoll={handleRoll} 
                  />
                ))}
              </div>
            </section>

            {/* PERÍCIAS */}
            <section className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/10 pb-2">
                <h2 className="text-xl font-medieval text-amber-200">⚜ Perícias</h2>
                {isEditing && (
                  <div className="flex gap-2">
                    <button onClick={() => setIsSkillDiscounted(!isSkillDiscounted)} className={`text-[8px] px-2 py-1 rounded font-bold border transition-colors ${isSkillDiscounted ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700'}`}>50% OFF</button>
                    <button onClick={() => setIsSkillInitialDuringCreation(!isSkillInitialDuringCreation)} className={`text-[8px] px-2 py-1 rounded font-bold border transition-colors ${isSkillInitialDuringCreation ? 'bg-green-600 border-green-400' : 'bg-slate-800 border-slate-700'}`}>INICIAL</button>
                    <button onClick={() => setShowSkillSelect(!showSkillSelect)} className="bg-amber-600 text-[10px] px-3 py-1 rounded font-bold transition-transform active:scale-95">+ ADICIONAR</button>
                  </div>
                )}
              </div>
              {showSkillSelect && isEditing && (
                <div className="mb-6 p-4 bg-slate-900/80 rounded-xl border border-amber-500/20 space-y-6 animate-in fade-in zoom-in-95">
                  <div className="space-y-4">
                    <div className="text-[10px] text-amber-500 uppercase font-bold tracking-widest border-l-2 border-amber-500 pl-2">Escolher Rank Inicial</div>
                    <div className="flex flex-wrap gap-2">
                      {(['E', 'D', 'C', 'B', 'A', 'S'] as ProficiencyRank[]).map(r => <button key={r} onClick={() => setSelectedInitialRank(r)} className={`px-3 py-1.5 rounded text-[9px] font-bold border transition-all ${selectedInitialRank === r ? 'bg-amber-600 border-amber-400' : 'bg-slate-800 border-slate-700'}`}>{r} - {RANK_NAMES[r]}</button>)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] text-amber-500 uppercase font-bold tracking-widest border-l-2 border-amber-500 pl-2">Perícias Oficiais</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {OFFICIAL_SKILL_LIST.map(skill => <button key={skill.name} onClick={() => handleSelectSkill(skill)} className="text-[10px] p-2 bg-slate-800 hover:bg-amber-600/20 text-left rounded border border-slate-700 transition-colors group"><div>{skill.name}</div><div className="text-[7px] text-slate-500 group-hover:text-amber-500/60">{skill.attr === "---" ? "Geral/Equipamento" : skill.attr}</div></button>)}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-amber-500/10">
                    <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest border-l-2 border-indigo-500 pl-2">Perícia Personalizada</div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder="Nome da Nova Perícia" 
                        className="flex-1 bg-slate-800 p-2.5 rounded text-[10px] border border-slate-700 outline-none focus:border-indigo-500 transition-colors"
                        value={customSkillName}
                        onChange={e => setCustomSkillName(e.target.value)}
                      />
                      <select 
                        className="bg-slate-800 p-2.5 rounded text-[10px] border border-slate-700 outline-none focus:border-indigo-500 transition-colors min-w-[150px]"
                        value={customSkillAttr}
                        onChange={e => setCustomSkillAttr(e.target.value)}
                      >
                        {activeChar.attributes.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                        <option value="---">--- (Geral/Equipamento)</option>
                      </select>
                      <button 
                        onClick={() => {
                          if (!customSkillName.trim()) return;
                          handleSelectSkill({ name: customSkillName, attr: customSkillAttr });
                          setCustomSkillName("");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-6 py-2 rounded font-bold transition-all active:scale-95"
                      >
                        CRIAR
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChar.skills.map((skill, idx) => (
                  <div key={idx} className="flex flex-col p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[7px] uppercase font-bold text-slate-500">
                          {skill.relatedAttribute === "---" ? "Equipamento" : skill.relatedAttribute}
                        </span>
                        <h4 className="text-slate-100 font-bold text-sm">{skill.name}</h4>
                      </div>
                      <div className="text-xs font-bold text-amber-500">+{RANK_BONUS[skill.rank] + getAttrMod(skill.relatedAttribute)}</div>
                    </div>
                    <div className="mt-auto pt-3 border-t border-slate-700/30 flex items-center justify-between">
                       <span className="text-amber-500 text-[8px] font-bold uppercase tracking-widest">{RANK_NAMES[skill.rank]}</span>
                       <div className="flex gap-2">
                         {isEditing ? (
                           <>
                             <button onClick={() => handleRemoveSkill(idx)} className="text-[9px] px-2 py-1 bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/50 rounded font-bold transition-colors">Remover</button>
                             <button onClick={() => handleUpgradeSkill(idx)} className="text-[9px] px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded font-bold transition-colors" disabled={skill.rank === 'S'}>UP</button>
                           </>
                         ) : (
                           <button onClick={() => handleRoll(skill.name, RANK_BONUS[skill.rank] + getAttrMod(skill.relatedAttribute))} className="text-[9px] font-bold text-slate-500 hover:text-amber-500 transition-colors">ROLAR</button>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* HABILIDADES */}
            <section className="glass-panel p-6 rounded-2xl border-amber-500/10">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/10 pb-2">
                <h2 className="text-xl font-medieval text-amber-200">⚔️ Habilidades</h2>
                {isEditing && <button onClick={() => setShowAbilityForm(!showAbilityForm)} className="bg-indigo-600 text-[10px] px-3 py-1 rounded font-bold transition-transform active:scale-95">+ NOVA</button>}
              </div>
              {showAbilityForm && (
                <form onSubmit={handleAddAbility} className="mb-8 p-6 bg-slate-900/50 rounded-xl border border-amber-500/20 space-y-4 animate-in slide-in-from-top-4">
                  <input name="name" placeholder="Nome da Habilidade" required className="w-full bg-slate-800 p-2 rounded text-xs border border-slate-700 outline-none focus:border-amber-500" />
                  <textarea name="description" placeholder="Descrição dos efeitos..." required className="w-full bg-slate-800 p-2 rounded text-xs h-24 border border-slate-700 outline-none focus:border-amber-500" />
                  <button type="submit" className="w-full bg-indigo-600 py-2 rounded font-bold text-xs hover:bg-indigo-500 transition-colors">ADICIONAR</button>
                </form>
              )}
              <div className="space-y-4">
                {activeChar.abilities.map((ab, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                    <h4 className="text-amber-200 font-bold font-cinzel text-base">{ab.name}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap">{ab.description}</p>
                    {isEditing && <button onClick={() => { const n = activeChar.abilities.filter((_, i) => i !== idx); updateActiveChar({...activeChar, abilities: n}); }} className="mt-2 text-[8px] text-red-500 uppercase font-bold hover:underline">Remover</button>}
                  </div>
                ))}
              </div>
            </section>

            {/* INVENTÁRIO */}
            <section className="glass-panel p-6 rounded-2xl border-amber-500/10">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/10 pb-2">
                <h2 className="text-xl font-medieval text-amber-200">🗡️ Inventário</h2>
                {isEditing && <button onClick={() => setShowItemForm(!showItemForm)} className="bg-indigo-600 text-[10px] px-3 py-1 rounded font-bold transition-transform active:scale-95">+ ITEM</button>}
              </div>
              {showItemForm && (
                <form onSubmit={handleAddItem} className="mb-8 p-6 bg-slate-900/50 rounded-xl border border-amber-500/20 space-y-4 animate-in slide-in-from-top-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input name="name" placeholder="Nome do Objeto" required className="bg-slate-800 p-2 rounded text-xs border border-slate-700 outline-none focus:border-amber-500" />
                    <select name="type" className="bg-slate-800 p-2 rounded text-xs border border-slate-700 outline-none focus:border-amber-500"><option value="weapon">Arma</option><option value="armor">Armadura</option><option value="utility">Utilitário</option></select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="damage" placeholder="Dano (ex: 1d8+2)" className="bg-slate-800 p-2 rounded text-xs border border-slate-700 outline-none focus:border-amber-500" />
                    <input name="defense" type="number" placeholder="Defesa" className="bg-slate-800 p-2 rounded text-xs border border-slate-700 outline-none focus:border-amber-500" />
                  </div>
                  <textarea name="description" placeholder="Descrição do item..." className="w-full bg-slate-800 p-2 rounded text-xs h-20 border border-slate-700 outline-none focus:border-amber-500" />
                  <button type="submit" className="w-full bg-green-600 py-2 rounded font-bold text-xs hover:bg-green-500 transition-colors uppercase">Forjar Item</button>
                </form>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChar.inventory.map((item) => (
                  <div key={item.id} className={`p-4 rounded-xl bg-slate-800/40 border transition-all ${item.isEquipped ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'border-slate-700/50'} flex flex-col group`}>
                    <div className="flex justify-between items-start mb-2">
                      <div><h4 className="text-amber-200 font-bold font-cinzel text-sm">{item.name}</h4></div>
                      <div className="flex gap-2">
                        {item.damage && <button onClick={() => handleDamageRoll(item)} className="bg-red-900/50 hover:bg-red-800 transition-colors text-[10px] px-2 py-1 rounded-full border border-red-700">⚔️ {item.damage}</button>}
                        <button onClick={() => { const n = activeChar.inventory.map(i => i.id === item.id ? { ...i, isEquipped: !i.isEquipped } : i); updateActiveChar({ ...activeChar, inventory: n }); }} className={`text-[8px] font-bold px-2 py-1 rounded transition-colors ${item.isEquipped ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}>{item.isEquipped ? 'EQUIPADO' : 'EQUIPAR'}</button>
                      </div>
                    </div>
                    {item.defense ? <div className="text-[9px] text-green-400 font-bold mb-1">🛡️ Defesa +{item.defense}</div> : null}
                    {item.description && <p className="text-[10px] text-slate-400 italic mt-1 leading-tight border-l-2 border-slate-600/30 pl-2 mb-2 line-clamp-3 group-hover:line-clamp-none transition-all whitespace-pre-wrap">{item.description}</p>}
                    {isEditing && <button onClick={() => { const n = activeChar.inventory.filter(i => i.id !== item.id); updateActiveChar({...activeChar, inventory: n}); }} className="mt-auto text-[8px] text-red-500 self-end font-bold uppercase hover:underline pt-2">Descartar</button>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
            {/* STATUS */}
            <section className="glass-panel p-6 rounded-2xl border-t-4 border-red-900/40">
              <h2 className="text-xl font-medieval text-amber-200 mb-6">❖ Status</h2>
              <StatusBar label="Vida" current={activeChar.hp.current} max={hpMax} color="bg-red-600" icon="❤️" onUpdate={v => updateActiveChar({...activeChar, hp: {...activeChar.hp, current: v}})} isEditing={isEditing} onMaxUpdate={v => updateActiveChar({...activeChar, hp: {...activeChar.hp, extraMax: v - 20 - (5 * getAttrMod('Constituição'))}})} />
              <StatusBar label="Mana" current={activeChar.mp.current} max={mpMax} color="bg-indigo-600" icon="✨" onUpdate={v => updateActiveChar({...activeChar, mp: {...activeChar.mp, current: v}})} isEditing={isEditing} onMaxUpdate={v => updateActiveChar({...activeChar, mp: {...activeChar.mp, extraMax: v - 200 - (20 * getAttrMod('Mana'))}})} />
              <div className="mt-8 bg-slate-950/80 p-5 rounded-2xl border border-amber-500/10 flex justify-between items-center">
                <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Defesa (CA)</span></div>
                <div className="text-4xl font-cinzel text-amber-500 font-bold">{effectiveAc}</div>
              </div>
              <div className="mt-4">
                <label className="text-[8px] text-slate-500 uppercase block mb-1 font-bold">Perícia de Defesa Ativa:</label>
                <select value={activeChar.selectedArmorSkillName || ""} onChange={(e) => updateActiveChar({...activeChar, selectedArmorSkillName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-[10px] p-2 rounded outline-none focus:border-amber-500 transition-colors">
                  <option value="">Nenhuma</option>
                  {availableArmorSkills.map(s => <option key={s.name} value={s.name}>{s.name} (+{RANK_BONUS[s.rank]})</option>)}
                </select>
              </div>
            </section>

            {/* HISTÓRICO */}
            <section className="glass-panel p-6 rounded-2xl border-amber-500/10 flex flex-col h-[400px]">
              <h2 className="text-xl font-medieval text-amber-200 mb-4 border-b border-amber-500/10 pb-2">📜 Histórico XP</h2>
              <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                {activeChar.xpLog && activeChar.xpLog.length > 0 ? activeChar.xpLog.map(log => (
                  <div key={log.id} className={`p-3 rounded-lg border transition-colors ${log.cost < 0 ? 'bg-green-950/20 border-green-500/20' : 'bg-slate-800/40 border-slate-700/50 hover:border-amber-500/20'}`}>
                    <div className="flex justify-between items-start text-[9px] mb-1">
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className={`font-black ${log.cost < 0 ? 'text-green-400' : 'text-amber-500'}`}>{log.cost < 0 ? `+${Math.abs(log.cost)}` : `-${log.cost}`} XP</span>
                    </div>
                    <p className={`text-[11px] leading-tight ${log.cost < 0 ? 'text-green-300' : 'text-slate-300'}`}>{log.description}</p>
                  </div>
                )) : <div className="text-[10px] text-slate-600 italic text-center py-10">Nenhum gasto registrado...</div>}
              </div>
            </section>

            {/* GRIMÓRIO */}
            <section className="glass-panel p-6 rounded-2xl border-indigo-500/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medieval text-indigo-300">۞ Grimório</h2>
                {isEditing && (
                  <div className="flex gap-2">
                    <button onClick={() => setIsSpellDiscounted(!isSpellDiscounted)} className={`text-[8px] px-2 py-1 rounded font-bold border transition-colors ${isSpellDiscounted ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700'}`}>50% OFF</button>
                    <button onClick={() => setShowSpellForm(!showSpellForm)} className="text-[10px] px-2 py-1 bg-indigo-600 rounded font-bold transition-transform active:scale-95">+ NOVA</button>
                  </div>
                )}
              </div>
              {showSpellForm && (
                <form onSubmit={handleAddSpell} className="mb-4 p-4 bg-indigo-950/20 rounded-xl border border-indigo-500/20 space-y-3 animate-in fade-in slide-in-from-top-4">
                   <input name="name" placeholder="Nome da Magia" required className="w-full bg-slate-800 p-2 rounded text-[10px] border border-slate-700" />
                   <div className="grid grid-cols-2 gap-2">
                     <input name="cost" placeholder="Custo PM" required className="bg-slate-800 p-2 rounded text-[10px] border border-slate-700" />
                     <select name="rank" className="bg-slate-800 p-2 rounded text-[10px] border border-slate-700">{(['E', 'D', 'C', 'B', 'A', 'S'] as ProficiencyRank[]).map(r => <option key={r} value={r}>{r} - {RANK_NAMES[r]}</option>)}</select>
                   </div>
                   <select name="origin" className="w-full bg-slate-800 p-2 rounded text-[10px] border border-slate-700"><option value="learned">Aprendida (Normal)</option><option value="created">Criada (Custo x2)</option></select>
                   <textarea name="description" placeholder="Descrição da Magia..." required className="w-full bg-slate-800 p-2 rounded text-[10px] h-16 border border-slate-700" />
                   <div className="flex items-center gap-2"><input type="checkbox" checked={isSpellInitialDuringCreation} onChange={e => setIsSpellInitialDuringCreation(e.target.checked)} className="rounded text-indigo-600" /><label className="text-[10px] text-indigo-300">Incial (Grátis)?</label></div>
                   <button type="submit" className="w-full bg-indigo-600 py-1.5 rounded font-bold text-[10px] hover:bg-indigo-500">ADICIONAR</button>
                </form>
              )}
              <div className="space-y-3">
                {activeChar.spells.map((spell, idx) => (
                  <div key={idx} className={`bg-indigo-950/20 p-3 rounded-xl border transition-all ${spell.initialRank ? 'border-green-500/30' : 'border-indigo-500/10'} hover:border-indigo-400/30`}>
                    <div className="flex justify-between items-center">
                      <div><h4 className="text-indigo-300 font-bold text-xs">{spell.name} {spell.isDiscounted ? '(Desc.)' : ''}</h4><span className="text-[8px] text-indigo-500 font-bold">{spell.cost}</span></div>
                      <span className="text-[8px] bg-indigo-900/40 px-2 py-1 rounded font-bold border border-indigo-700/50">RK {spell.rank}</span>
                    </div>
                    {spell.description && <p className="text-[9px] text-slate-400 mt-1 italic leading-tight border-l-2 border-indigo-500/20 pl-2 whitespace-pre-wrap">"{spell.description}"</p>}
                    {isEditing && <button onClick={() => handleRemoveSpell(idx)} className="text-[7px] text-red-500 mt-2 font-bold uppercase hover:underline">Esquecer</button>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        {rollResult && (
          <div className="fixed bottom-10 inset-x-0 flex justify-center z-50 animate-in fade-in slide-in-from-bottom-8">
            <div className={`glass-panel px-12 py-6 rounded-3xl border-2 shadow-2xl ${rollResult.isDamage ? 'border-red-600 bg-red-950/20' : 'border-amber-500 bg-slate-900/90'}`}>
              <div className="text-center"><div className="text-[10px] uppercase font-bold text-amber-500 mb-1 tracking-tighter">{rollResult.name}</div><div className="text-6xl font-medieval text-white drop-shadow-md">{rollResult.total}</div></div>
              <div className="text-[12px] text-slate-400 border-l border-slate-800 pl-10 space-y-2 flex flex-col justify-center"><div>Dado: {rollResult.roll}</div><div>Bônus: +{rollResult.bonus}</div></div>
            </div>
          </div>
        )}
        <button onClick={() => handleRoll("Sorte do Destino", 0)} className="fixed bottom-8 right-8 w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-40 hover:bg-amber-500 hover:scale-110 active:scale-95 transition-all text-2xl" title="Rolar Sorte">🎲</button>
      </div>
    </div>
  );
};

export default App;
