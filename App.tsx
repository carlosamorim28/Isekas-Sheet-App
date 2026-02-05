
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_CHARACTER_DATA, RANK_BONUS, RANK_NAMES, OFFICIAL_SKILL_LIST } from './constants';
import { AttributeCard, calculateMod } from './components/AttributeCard';
import { StatusBar } from './components/StatusBar';
import { Attribute, Skill, Spell, Ability, Item, ProficiencyRank, ItemType, CharacterData } from './types';

const STORAGE_KEY = 'rpg_sheet_characters_v1';
const INDEX_KEY = 'rpg_sheet_active_index_v1';

// Tabelas de Custos de XP
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

const calculateSkillUpgradeOnly = (rank: ProficiencyRank, isDiscounted: boolean = false) => {
  const costs: Record<ProficiencyRank, number> = {
    'E': 0, 'D': 10, 'C': 10 + 50, 'B': 10 + 50 + 200, 'A': 10 + 50 + 200 + 300, 'S': 10 + 50 + 200 + 300 + 500,
  };
  const total = costs[rank];
  return isDiscounted ? Math.floor(total * 0.5) : total;
};

const getEntryCost = (type: 'spell' | 'ability', origin: 'learned' | 'created', rank?: ProficiencyRank, isDiscounted: boolean = false) => {
  if (type === 'ability') return 0;
  const table: Record<ProficiencyRank, number> = {
    'E': 10, 'D': 20, 'C': 50, 'B': 100, 'A': 200, 'S': 500
  };
  const base = table[rank || 'E'];
  let cost = origin === 'created' ? base * 2 : base;
  return isDiscounted ? Math.floor(cost * 0.5) : cost;
};

const App: React.FC = () => {
  // Estado para múltiplos personagens com carregamento inicial do localStorage
  const [characters, setCharacters] = useState<CharacterData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [{ ...INITIAL_CHARACTER_DATA, name: "Ardrin Massafunda" }];
  });

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const saved = localStorage.getItem(INDEX_KEY);
    return saved ? parseInt(saved) : 0;
  });

  // Salvar sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem(INDEX_KEY, activeIndex.toString());
  }, [activeIndex]);
  
  // Atalho para o personagem atual
  const activeChar = characters[activeIndex] || characters[0] || INITIAL_CHARACTER_DATA;

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
  
  // Novo estado para definir o rank ao adicionar uma perícia
  const [selectedInitialRank, setSelectedInitialRank] = useState<ProficiencyRank>('E');

  // Estados para nova perícia customizada
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillAttr, setCustomSkillAttr] = useState("Força");

  // Helper para atualizar o personagem ativo no array
  const updateActiveChar = (updated: CharacterData) => {
    const newChars = [...characters];
    newChars[activeIndex] = updated;
    setCharacters(newChars);
  };

  const xpSpent = useMemo(() => {
    const attrSpent = activeChar.attributes.reduce((acc, a) => acc + calculateTotalAttrSpent(a.value), 0);
    
    const skillSpent = activeChar.skills.reduce((acc, s) => {
      const currentCost = calculateSkillUpgradeOnly(s.rank, s.isDiscounted);
      // Se for inicial, o custo do rank inicial é 0. O gasto é a diferença.
      const offset = s.initialRank ? calculateSkillUpgradeOnly(s.initialRank, s.isDiscounted) : 0;
      return acc + (currentCost - offset);
    }, 0);

    const spellSpent = activeChar.spells.reduce((acc, s) => {
      const currentCost = getEntryCost('spell', s.origin, s.rank, s.isDiscounted);
      // Magias também podem ser iniciais
      const offset = s.initialRank ? getEntryCost('spell', s.origin, s.initialRank, s.isDiscounted) : 0;
      return acc + (currentCost - offset);
    }, 0);

    return attrSpent + skillSpent + spellSpent;
  }, [activeChar]);

  const availableXp = activeChar.totalXp - xpSpent;

  const getAttrTotalValue = (name: string) => {
    const attr = activeChar.attributes.find(a => a.name === name);
    return attr ? attr.value + attr.racialBonus : 0;
  };
  const getAttrMod = (name: string) => calculateMod(getAttrTotalValue(name));
  const hpMax = useMemo(() => 20 + (5 * getAttrMod('Constituição')) + activeChar.hp.extraMax, [activeChar.attributes, activeChar.hp.extraMax]);
  const mpMax = useMemo(() => 200 + (20 * getAttrMod('Mana')) + activeChar.mp.extraMax, [activeChar.attributes, activeChar.mp.extraMax]);

  const armorBonus = useMemo(() => {
    return activeChar.inventory
      .filter(item => item.type === 'armor' && item.isEquipped)
      .reduce((acc, item) => acc + (item.defense || 0), 0);
  }, [activeChar.inventory]);

  // Cálculo da Perícia de Defesa Selecionada
  const armorSkillBonus = useMemo(() => {
    const selectedSkill = activeChar.skills.find(s => s.name === activeChar.selectedArmorSkillName);
    return selectedSkill ? RANK_BONUS[selectedSkill.rank] : 0;
  }, [activeChar.skills, activeChar.selectedArmorSkillName]);

  const effectiveAc = activeChar.ac + armorBonus + armorSkillBonus;

  // Lista de perícias de armadura disponíveis para seleção
  const availableArmorSkills = useMemo(() => {
    const armorSkillNames = ["Armaduras Leves", "Armaduras Médias", "Armaduras Pesadas", "Defesa sem Armadura", "Escudos"];
    return activeChar.skills.filter(s => armorSkillNames.includes(s.name));
  }, [activeChar.skills]);

  const handleAvatarClick = () => isEditing && fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateActiveChar({ ...activeChar, avatar: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleUpgradeSkill = (idx: number) => {
    const skill = activeChar.skills[idx];
    const RANKS: ProficiencyRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
    const currentIdx = RANKS.indexOf(skill.rank);
    if (currentIdx < RANKS.length - 1) {
      const nextRank = RANKS[currentIdx + 1];
      const currentRankCost = calculateSkillUpgradeOnly(skill.rank, skill.isDiscounted);
      const nextRankCost = calculateSkillUpgradeOnly(nextRank, skill.isDiscounted);
      const upgradeCost = nextRankCost - currentRankCost;
      
      if (availableXp >= upgradeCost) {
        const newSkills = [...activeChar.skills];
        newSkills[idx] = { ...skill, rank: nextRank };
        updateActiveChar({ ...activeChar, skills: newSkills });
      }
    }
  };

  const handleSelectSkill = (skill: { name: string; attr: string }) => {
    if (!skill.name.trim()) return;
    if (activeChar.skills.find(s => s.name.toLowerCase() === skill.name.toLowerCase())) {
        alert("Já existe uma perícia com este nome.");
        return;
    }
    const newSkill: Skill = {
      name: skill.name,
      rank: selectedInitialRank,
      initialRank: isSkillInitialDuringCreation ? selectedInitialRank : 'E', // Se for inicial, o rank atual é o offset
      relatedAttribute: skill.attr,
      initialBonus: 0,
      isDiscounted: isSkillDiscounted
    };
    updateActiveChar({ ...activeChar, skills: [...activeChar.skills, newSkill] });
    setShowSkillSelect(false);
    setCustomSkillName("");
  };

  const handleAddSpell = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rank = formData.get('rank') as ProficiencyRank;
    const newSpell: Spell = {
      name: formData.get('name') as string,
      rank: rank,
      initialRank: isSpellInitialDuringCreation ? rank : 'E',
      cost: formData.get('cost') as string,
      description: formData.get('description') as string,
      origin: formData.get('origin') as 'learned' | 'created',
      isDiscounted: isSpellDiscounted
    };
    updateActiveChar({ ...activeChar, spells: [...activeChar.spells, newSpell] });
    setShowSpellForm(false);
  };

  const handleAddAbility = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAbility: Ability = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      origin: 'learned'
    };
    updateActiveChar({ ...activeChar, abilities: [...activeChar.abilities, newAbility] });
    setShowAbilityForm(false);
  };

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: Item = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      type: formData.get('type') as ItemType,
      damage: (formData.get('damage') as string) || undefined,
      defense: parseInt(formData.get('defense') as string) || 0,
      description: formData.get('description') as string,
      specialAbility: formData.get('specialAbility') as string,
      isEquipped: false
    };
    updateActiveChar({ ...activeChar, inventory: [...activeChar.inventory, newItem] });
    setShowItemForm(false);
  };

  const toggleEquip = (itemId: string) => {
    const newInventory = activeChar.inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, isEquipped: !item.isEquipped };
      }
      return item;
    });
    updateActiveChar({ ...activeChar, inventory: newInventory });
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
    const individualRolls = [];
    for (let i = 0; i < numDice; i++) {
      const r = Math.floor(Math.random() * dieSize) + 1;
      individualRolls.push(r);
      totalRoll += r;
    }

    setRollResult({ 
      name: `Dano: ${item.name}`, 
      roll: individualRolls.join(' + '), 
      bonus: staticBonus, 
      total: totalRoll + staticBonus,
      isDamage: true
    });
    setTimeout(() => setRollResult(null), 5000);
  };

  const addNewCharacter = () => {
    const newChar = { ...INITIAL_CHARACTER_DATA, name: "Novo Aventureiro" };
    const newCharacters = [...characters, newChar];
    setCharacters(newCharacters);
    setActiveIndex(newCharacters.length - 1);
    setIsEditing(true);
  };

  const deleteActiveCharacter = () => {
    if (characters.length <= 1) return alert("Você deve ter pelo menos um personagem.");
    if (confirm(`Deseja realmente excluir ${activeChar.name}?`)) {
      const newChars = characters.filter((_, i) => i !== activeIndex);
      setCharacters(newChars);
      setActiveIndex(0);
    }
  };

  // Funções de Exportar e Importar
  const handleExport = () => {
    const dataStr = JSON.stringify(characters, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rpg_fichas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedChars = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedChars)) {
          if (confirm("Isso irá substituir sua lista atual de personagens. Deseja continuar?")) {
            setCharacters(importedChars);
            setActiveIndex(0);
          }
        } else {
          alert("Arquivo inválido. Formato esperado: Lista de personagens.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    // Limpar o input para permitir importar o mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Barra de Seleção de Personagem */}
      <nav className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-2 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {characters.map((char, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border whitespace-nowrap ${
                  activeIndex === idx 
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/40'
                }`}
              >
                <img 
                  src={char.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${char.name || 'default'}`} 
                  className="w-5 h-5 rounded-full object-cover"
                  alt="Mini Avatar"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider">{char.name || "Aventureiro"}</span>
              </button>
            ))}
            <button 
              onClick={addNewCharacter}
              className="w-8 h-8 rounded-full bg-slate-800 border border-dashed border-slate-600 text-slate-500 flex items-center justify-center hover:text-amber-500 hover:border-amber-500 transition-all text-xl"
              title="Novo Personagem"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="px-3 py-1.5 rounded bg-slate-800 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase hover:bg-slate-700 transition-all flex items-center gap-2"
              title="Salvar personagens em um arquivo"
            >
              📤 Exportar
            </button>
            <button 
              onClick={handleImportClick}
              className="px-3 py-1.5 rounded bg-slate-800 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase hover:bg-slate-700 transition-all flex items-center gap-2"
              title="Carregar personagens de um arquivo"
            >
              📥 Importar
            </button>
            <input 
              type="file" 
              ref={importInputRef} 
              onChange={handleImportFile} 
              className="hidden" 
              accept=".json"
            />
          </div>
        </div>
      </nav>

      <div className="px-4 md:px-8 max-w-6xl mx-auto">
        <header className="py-8 border-b border-amber-500/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div 
              onClick={handleAvatarClick}
              className={`w-24 h-24 rounded-full overflow-hidden border-4 border-amber-600/50 bg-slate-800 shadow-xl shadow-amber-900/20 relative group ${isEditing ? 'cursor-pointer' : ''}`}
            >
              <img 
                src={activeChar.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${activeChar.name || 'default'}`} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-center">
                  <span className="text-[10px] font-bold text-white px-1">Mudar Imagem</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <input 
                  type="text" 
                  placeholder="Nome do Personagem"
                  value={activeChar.name} 
                  onChange={e => updateActiveChar({...activeChar, name: e.target.value})}
                  className="text-3xl font-cinzel font-bold text-amber-500 bg-transparent border-b border-amber-500/30 outline-none w-full"
                />
              ) : (
                <h1 className="text-4xl font-cinzel font-bold text-amber-500 leading-none">{activeChar.name || "Sem Nome"}</h1>
              )}
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-800/90 px-4 py-2 rounded-xl border border-amber-500/10 flex items-center gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">XP Total</span>
                    {isEditing ? (
                      <input type="number" value={activeChar.totalXp} onChange={e => updateActiveChar({...activeChar, totalXp: parseInt(e.target.value) || 0})} className="w-20 bg-transparent text-amber-500 font-bold outline-none border-b border-amber-500/20" />
                    ) : <span className="text-amber-500 font-bold">{activeChar.totalXp}</span>}
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">XP Disponível</span>
                    <span className={`font-bold ${availableXp >= 0 ? 'text-green-400' : 'text-red-500'}`}>{availableXp}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all border-b-4 ${isEditing ? 'bg-green-600 border-green-800' : 'bg-amber-600 border-amber-800'}`}
            >
              {isEditing ? '✓ SALVAR FICHA' : '⚔ EVOLUIR'}
            </button>
            {isEditing && (
              <button 
                onClick={deleteActiveCharacter}
                className="text-[9px] font-bold text-red-500 uppercase tracking-widest hover:underline"
              >
                Excluir Personagem
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
                    key={idx} attr={attr} isEditing={isEditing}
                    xpCost={getAttrXPCostForNextPoint(attr.value)}
                    canAfford={availableXp >= getAttrXPCostForNextPoint(attr.value)}
                    onUpgrade={() => {
                      const cost = getAttrXPCostForNextPoint(attr.value);
                      if (availableXp >= cost) {
                        const n = [...activeChar.attributes];
                        n[idx].value += 1;
                        updateActiveChar({...activeChar, attributes: n});
                      }
                    }}
                    onRacialChange={(val) => {
                      const n = [...activeChar.attributes];
                      n[idx].racialBonus = val;
                      updateActiveChar({...activeChar, attributes: n});
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
                    <button onClick={() => setIsSkillDiscounted(!isSkillDiscounted)} className={`text-[8px] px-2 py-1 rounded font-bold border ${isSkillDiscounted ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      50% OFF
                    </button>
                    <button onClick={() => setIsSkillInitialDuringCreation(!isSkillInitialDuringCreation)} className={`text-[8px] px-2 py-1 rounded font-bold border ${isSkillInitialDuringCreation ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      INICIAL (Grátis)
                    </button>
                    <button onClick={() => setShowSkillSelect(!showSkillSelect)} className="bg-amber-600 text-[10px] px-3 py-1 rounded font-bold hover:bg-amber-500">+ ADICIONAR PERÍCIA</button>
                  </div>
                )}
              </div>

              {showSkillSelect && isEditing && (
                <div className="mb-6 p-4 bg-slate-900/80 rounded-xl border border-amber-500/20 space-y-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-[8px] uppercase font-bold text-slate-500">Rank Selecionado:</span>
                    <div className="flex flex-wrap gap-2">
                      {(['E', 'D', 'C', 'B', 'A', 'S'] as ProficiencyRank[]).map(rank => (
                        <button 
                          key={rank}
                          onClick={() => setSelectedInitialRank(rank)}
                          className={`px-3 py-1 rounded text-[9px] font-bold border transition-all ${selectedInitialRank === rank ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/40'}`}
                        >
                          {rank} - {RANK_NAMES[rank]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-amber-500/10 pt-4">
                    <span className="text-[8px] uppercase font-bold text-slate-500 mb-2 block">Perícia Personalizada:</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text" 
                            placeholder="Nome da Perícia..."
                            value={customSkillName}
                            onChange={(e) => setCustomSkillName(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700 flex-1"
                        />
                        <select 
                            value={customSkillAttr}
                            onChange={(e) => setCustomSkillAttr(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700"
                        >
                            {activeChar.attributes.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                        </select>
                        <button 
                            onClick={() => handleSelectSkill({ name: customSkillName, attr: customSkillAttr })}
                            className="bg-indigo-600 text-[10px] px-4 py-2 rounded font-bold hover:bg-indigo-500 uppercase tracking-wider"
                        >
                            Criar
                        </button>
                    </div>
                  </div>

                  <div className="border-t border-amber-500/10 pt-4">
                    <span className="text-[8px] uppercase font-bold text-slate-500 mb-2 block">Perícias Sugeridas:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {OFFICIAL_SKILL_LIST.map(skill => (
                        <button 
                            key={skill.name}
                            onClick={() => handleSelectSkill(skill)}
                            className="text-[10px] p-2 bg-slate-800 hover:bg-amber-600/20 text-left rounded border border-slate-700 transition-colors"
                        >
                            <div className="font-bold text-amber-500">{skill.name}</div>
                            <div className="text-[7px] text-slate-500 uppercase">{skill.attr}</div>
                        </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChar.skills.map((skill, idx) => {
                  const bonus = RANK_BONUS[skill.rank] + skill.initialBonus;
                  const attrMod = getAttrMod(skill.relatedAttribute);
                  const isActuallyInitial = skill.initialRank !== 'E';
                  return (
                    <div key={idx} className={`flex flex-col p-4 bg-slate-800/30 rounded-xl border transition-all ${isActuallyInitial ? 'border-green-500/20' : 'border-slate-700/30 hover:border-amber-500/20'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[7px] uppercase font-bold text-slate-500">{skill.relatedAttribute} {skill.isDiscounted ? '(Desc.)' : ''}</span>
                            {isActuallyInitial && <span className="text-[6px] bg-green-600 text-white px-1 rounded uppercase font-bold">Inicial (RK {skill.initialRank})</span>}
                          </div>
                          <h4 className="text-slate-100 font-bold text-sm">{skill.name}</h4>
                        </div>
                        <div className="bg-slate-900 px-3 py-1 rounded border border-amber-500/10 text-center">
                          <div className="text-xs font-bold text-amber-500">+{bonus + attrMod}</div>
                          <div className="text-[7px] text-slate-500 uppercase">Total</div>
                        </div>
                      </div>
                      <div className="mt-auto pt-3 border-t border-slate-700/30 flex items-center justify-between">
                         <span className="text-amber-500 text-[8px] font-bold uppercase">{RANK_NAMES[skill.rank]}</span>
                         {isEditing ? (
                           <div className="flex items-center gap-2">
                              <button 
                                  onClick={() => {
                                      const n = [...activeChar.skills];
                                      n.splice(idx, 1);
                                      updateActiveChar({...activeChar, skills: n});
                                  }} 
                                  className="text-[8px] text-red-500 hover:underline"
                              >
                                  Remover
                              </button>
                              <button onClick={() => handleUpgradeSkill(idx)} className="text-[9px] px-2 py-1 bg-indigo-600 rounded font-bold hover:bg-indigo-500 disabled:opacity-50" disabled={skill.rank === 'S'}>UP RANK</button>
                           </div>
                         ) : (
                           <button onClick={() => handleRoll(skill.name, bonus + attrMod)} className="text-[9px] font-bold text-slate-500 hover:text-amber-500">ROLAR</button>
                         )}
                      </div>
                    </div>
                  );
                })}
                {activeChar.skills.length === 0 && <div className="col-span-2 text-center py-8 text-slate-600 italic text-sm">Nenhuma perícia aprendida.</div>}
              </div>
            </section>

            {/* HABILIDADES DO PERSONAGEM */}
            <section className="glass-panel p-6 rounded-2xl border-amber-500/10">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/10 pb-2">
                <h2 className="text-xl font-medieval text-amber-200">⚔️ Habilidades</h2>
                {isEditing && (
                  <button onClick={() => setShowAbilityForm(!showAbilityForm)} className="bg-indigo-600 text-[10px] px-3 py-1 rounded font-bold">+ NOVA HABILIDADE</button>
                )}
              </div>

              {showAbilityForm && isEditing && (
                <form onSubmit={handleAddAbility} className="mb-8 p-6 bg-slate-900/50 rounded-xl border border-amber-500/20 space-y-4">
                  <input name="name" placeholder="Nome da Habilidade" required className="w-full bg-slate-800 p-2 rounded text-xs text-white border border-slate-700" />
                  <textarea name="description" placeholder="Descrição da habilidade..." required className="w-full bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 h-24" />
                  <button type="submit" className="w-full bg-indigo-600 py-2 rounded font-bold text-xs uppercase tracking-widest">Adicionar Habilidade</button>
                </form>
              )}

              <div className="space-y-4">
                {activeChar.abilities.map((ability, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-amber-500/30 transition-all flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-amber-200 font-bold font-cinzel text-base">{ability.name}</h4>
                      {isEditing && (
                        <button 
                          onClick={() => {
                            const n = [...activeChar.abilities];
                            n.splice(idx, 1);
                            updateActiveChar({...activeChar, abilities: n});
                          }}
                          className="text-[9px] text-red-500 font-bold hover:underline"
                        >
                          REMOVER
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{ability.description}</p>
                  </div>
                ))}
                {activeChar.abilities.length === 0 && <div className="text-center py-8 text-slate-600 italic text-sm">Nenhuma habilidade especial registrada.</div>}
              </div>
            </section>

            {/* INVENTÁRIO & ARMAS */}
            <section className="glass-panel p-6 rounded-2xl border-amber-500/10">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/10 pb-2">
                <h2 className="text-xl font-medieval text-amber-200">🗡️ Inventário & Armaria</h2>
                {isEditing && (
                  <button onClick={() => setShowItemForm(!showItemForm)} className="bg-indigo-600 text-[10px] px-3 py-1 rounded font-bold">+ NOVO ITEM</button>
                )}
              </div>

              {showItemForm && (
                <form onSubmit={handleAddItem} className="mb-8 p-6 bg-slate-900/50 rounded-xl border border-amber-500/20 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input name="name" placeholder="Nome do Item" required className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700" />
                    <select name="type" className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700">
                      <option value="weapon">Arma</option>
                      <option value="armor">Armadura</option>
                      <option value="utility">Utilitário</option>
                      <option value="consumable">Consumível</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="damage" placeholder="Dano (ex: 1d8 + 2)" className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700" />
                    <input name="defense" type="number" placeholder="Bônus de Defesa" className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700" />
                  </div>
                  <textarea name="description" placeholder="Descrição curta..." className="w-full bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 h-16" />
                  <textarea name="specialAbility" placeholder="Habilidade Especial / Efeitos..." className="w-full bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 h-16" />
                  <button type="submit" className="w-full bg-green-600 py-2 rounded font-bold text-xs">FORJAR ITEM</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChar.inventory.map((item) => (
                  <div key={item.id} className={`p-4 rounded-xl bg-slate-800/40 border transition-all flex flex-col group ${item.isEquipped ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-700/50 hover:border-amber-500/30'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] uppercase font-bold text-indigo-400">{item.type}</span>
                          {item.isEquipped && <span className="text-[7px] bg-amber-600 text-white px-1 rounded font-black uppercase tracking-widest">Equipado</span>}
                        </div>
                        <h4 className="text-amber-200 font-bold font-cinzel text-sm">{item.name}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.damage && !isEditing && (
                          <button 
                            onClick={() => handleDamageRoll(item)}
                            className="bg-red-900/50 text-red-200 text-[10px] px-3 py-1 rounded-full border border-red-700 hover:bg-red-800 transition-colors flex items-center gap-1"
                          >
                            ⚔️ {item.damage}
                          </button>
                        )}
                        {(item.type === 'armor' || item.type === 'weapon') && (
                          <button 
                            onClick={() => toggleEquip(item.id)}
                            className={`text-[8px] font-bold px-2 py-0.5 rounded border transition-colors ${item.isEquipped ? 'bg-amber-600/20 border-amber-500 text-amber-500 hover:bg-amber-600/40' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                          >
                            {item.isEquipped ? 'DESEQUIPAR' : 'EQUIPAR'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mb-3 italic">"{item.description}"</p>
                    
                    <div className="flex gap-4 mb-2">
                      {item.defense ? (
                          <span className="text-[9px] font-bold text-green-400 flex items-center gap-1">🛡️ Defesa +{item.defense}</span>
                      ) : null}
                    </div>

                    {item.specialAbility && (
                      <div className="mt-auto pt-3 border-t border-slate-700/30">
                        <span className="text-[7px] uppercase font-black text-amber-600/60 block mb-1">Habilidade / Efeito</span>
                        <p className="text-[9px] text-slate-300 leading-tight">{item.specialAbility}</p>
                      </div>
                    )}

                    {isEditing && (
                      <button 
                        onClick={() => {
                          const n = activeChar.inventory.filter(i => i.id !== item.id);
                          updateActiveChar({...activeChar, inventory: n});
                        }}
                        className="mt-4 text-[8px] text-red-500 font-bold self-end hover:underline"
                      >
                        DESCARTAR
                      </button>
                    )}
                  </div>
                ))}
                {activeChar.inventory.length === 0 && <div className="col-span-2 text-center py-8 text-slate-600 italic text-sm">Alforje vazio.</div>}
              </div>
            </section>
          </div>

          {/* STATUS VITAIS & GRIMÓRIO */}
          <div className="lg:col-span-4 space-y-8">
            <section className="glass-panel p-6 rounded-2xl border-t-4 border-red-900/40">
              <h2 className="text-xl font-medieval text-amber-200 mb-6">❖ Status</h2>
              <StatusBar label="Vida" current={activeChar.hp.current} max={hpMax} color="bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" icon="❤️" onUpdate={v => updateActiveChar({...activeChar, hp: {...activeChar.hp, current: v}})} isEditing={isEditing} onMaxUpdate={v => updateActiveChar({...activeChar, hp: {...activeChar.hp, extraMax: v - 20 - (5 * getAttrMod('Constituição'))}})} />
              <StatusBar label="Mana" current={activeChar.mp.current} max={mpMax} color="bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" icon="✨" onUpdate={v => updateActiveChar({...activeChar, mp: {...activeChar.mp, current: v}})} isEditing={isEditing} onMaxUpdate={v => updateActiveChar({...activeChar, mp: {...activeChar.mp, extraMax: v - 200 - (20 * getAttrMod('Mana'))}})} />
              
              <div className="mt-8 bg-slate-950/80 p-5 rounded-2xl border border-amber-500/10">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Defesa (CA)</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {armorBonus > 0 && <span className="text-[8px] text-green-400 font-bold uppercase">Itens: +{armorBonus}</span>}
                      {armorSkillBonus > 0 && <span className="text-[8px] text-indigo-400 font-bold uppercase">Perícia: +{armorSkillBonus}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Base:</span>
                        <input type="number" value={activeChar.ac} onChange={e => updateActiveChar({...activeChar, ac: parseInt(e.target.value) || 0})} className="w-12 bg-transparent text-right text-2xl font-cinzel text-amber-500 outline-none border-b border-amber-500/20" />
                        <span className="text-2xl font-cinzel text-amber-200">/ {effectiveAc}</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-cinzel text-amber-500">{effectiveAc}</div>
                    )}
                  </div>
                </div>

                {/* Seletor de Perícia de Armadura/Defesa */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <label className="text-[8px] text-slate-500 uppercase font-bold block mb-1">Perícia de Defesa Ativa:</label>
                  <select 
                    value={activeChar.selectedArmorSkillName || ""}
                    onChange={(e) => updateActiveChar({...activeChar, selectedArmorSkillName: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 p-2 rounded focus:outline-none focus:border-amber-500/40"
                  >
                    <option value="">Nenhuma Selecionada</option>
                    {availableArmorSkills.map(skill => (
                      <option key={skill.name} value={skill.name}>
                        {skill.name} (+{RANK_BONUS[skill.rank]})
                      </option>
                    ))}
                  </select>
                  {availableArmorSkills.length === 0 && (
                    <p className="text-[8px] text-amber-500/60 mt-1 italic">Aprenda perícias de Armadura ou Defesa para ganhar bônus em CA.</p>
                  )}
                </div>
              </div>
            </section>

            {/* GRIMÓRIO */}
            <section className="glass-panel p-6 rounded-2xl border-indigo-500/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medieval text-indigo-300">۞ Grimório</h2>
                {isEditing && (
                  <div className="flex gap-2">
                    <button onClick={() => setIsSpellDiscounted(!isSpellDiscounted)} className={`text-[8px] px-2 py-1 rounded font-bold border ${isSpellDiscounted ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      50% OFF
                    </button>
                    <button 
                      onClick={() => setShowSpellForm(!showSpellForm)}
                      className="text-[10px] px-2 py-1 bg-indigo-600 rounded font-bold hover:bg-indigo-500"
                    >
                      + NOVA MAGIA
                    </button>
                  </div>
                )}
              </div>

              {showSpellForm && isEditing && (
                <form onSubmit={handleAddSpell} className="mb-4 p-4 bg-indigo-950/20 rounded-xl border border-indigo-500/20 space-y-3">
                   <input name="name" placeholder="Nome da Magia" required className="w-full bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700" />
                   <div className="grid grid-cols-2 gap-2">
                     <input name="cost" placeholder="Custo Mana (ex: 2 PM)" required className="bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700" />
                     <select name="rank" className="bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700">
                        {(['E', 'D', 'C', 'B', 'A', 'S'] as ProficiencyRank[]).map(r => <option key={r} value={r}>{r} - {RANK_NAMES[r]}</option>)}
                     </select>
                   </div>
                   <textarea name="description" placeholder="Descrição da magia..." required className="w-full bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700 h-16" />
                   <div className="grid grid-cols-2 gap-2">
                     <select name="origin" className="bg-slate-800 p-2 rounded text-[10px] text-white border border-slate-700">
                        <option value="learned">Aprendida</option>
                        <option value="created">Criada</option>
                     </select>
                     <div className="flex items-center gap-2 px-1">
                        <input 
                          type="checkbox" 
                          id="isInitialSpell"
                          checked={isSpellInitialDuringCreation}
                          onChange={(e) => setIsSpellInitialDuringCreation(e.target.checked)}
                          className="w-3 h-3"
                        />
                        <label htmlFor="isInitialSpell" className="text-[10px] text-indigo-300 font-bold uppercase">Inicial (Grátis)?</label>
                     </div>
                   </div>
                   <button type="submit" className="w-full bg-indigo-600 py-1.5 rounded font-bold text-[10px] uppercase">ADICIONAR AO LIVRO</button>
                </form>
              )}

              <div className="space-y-3">
                {activeChar.spells.map((spell, idx) => {
                  const isActuallyInitial = spell.initialRank !== 'E';
                  return (
                    <div key={idx} className={`bg-indigo-950/20 p-3 rounded-xl border flex flex-col gap-2 ${isActuallyInitial ? 'border-green-500/30' : 'border-indigo-500/10'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-indigo-300 font-bold text-xs">{spell.name} {spell.isDiscounted ? '(Desc.)' : ''}</h4>
                            {isActuallyInitial && <span className="text-[6px] bg-green-600 text-white px-1 rounded uppercase font-bold">Inicial (RK {spell.initialRank})</span>}
                          </div>
                          <span className="text-[8px] text-indigo-500 font-bold">{spell.cost}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] bg-indigo-900/40 text-indigo-200 px-2 py-1 rounded font-bold uppercase">RK {spell.rank}</span>
                          {isEditing && (
                            <button 
                              onClick={() => {
                                const n = [...activeChar.spells];
                                n.splice(idx, 1);
                                updateActiveChar({...activeChar, spells: n});
                              }} 
                              className="text-[7px] text-red-500 hover:underline"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic leading-tight">{spell.description}</p>
                    </div>
                  );
                })}
                {activeChar.spells.length === 0 && <div className="text-center py-4 text-slate-600 italic text-xs">Nenhum feitiço conhecido.</div>}
              </div>
            </section>
          </div>
        </main>

        {/* RESULTADO DE ROLAGEM */}
        {rollResult && (
          <div className="fixed bottom-10 inset-x-0 flex justify-center z-50 animate-in fade-in slide-in-from-bottom-8">
            <div className={`glass-panel px-12 py-6 rounded-3xl border-2 shadow-2xl flex items-center gap-10 ${rollResult.isDamage ? 'border-red-600 bg-slate-950/95' : 'border-amber-500 bg-slate-900/95'}`}>
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-amber-500 mb-1">{rollResult.name}</div>
                <div className="text-6xl font-medieval text-white">{rollResult.total}</div>
              </div>
              <div className="text-[12px] text-slate-400 border-l border-slate-800 pl-10 space-y-2 font-bold uppercase tracking-tight">
                <div>Rolagem: <span className="text-white">{rollResult.roll}</span></div>
                <div>Bônus: <span className="text-amber-500">+{rollResult.bonus}</span></div>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => handleRoll("Sorte", 0)} className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center shadow-2xl border-2 border-slate-900 z-40 hover:scale-110 active:rotate-45 transition-all">
          <span className="text-3xl">🎲</span>
        </button>
      </div>
    </div>
  );
};

export default App;
