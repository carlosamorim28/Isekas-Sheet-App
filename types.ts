
export type ProficiencyRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ItemType = 'weapon' | 'armor' | 'utility' | 'consumable';

export interface XpLog {
  id: string;
  timestamp: number;
  description: string;
  cost: number;
}

export interface Attribute {
  name: string;
  value: number;
  racialBonus: number; 
  bonusFromItems: number; 
  icon: string;
}

export interface Skill {
  name: string;
  rank: ProficiencyRank;
  initialRank?: ProficiencyRank; // Se definido, o custo até este rank é 0
  relatedAttribute: string;
  relatedAttribute2?: string; // Segundo atributo opcional
  initialBonus: number;
  isDiscounted?: boolean;
}

export interface Spell {
  name: string;
  rank: ProficiencyRank;
  initialRank?: ProficiencyRank; // Se definido, o custo até este rank é 0
  cost: string;
  description: string;
  origin: 'learned' | 'created';
  isDiscounted?: boolean;
}

export interface Ability {
  name: string;
  description: string;
  origin: 'learned' | 'created';
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  damage?: string;
  defense?: number;
  description: string;
  specialAbility?: string;
  weight?: number;
  isEquipped?: boolean;
  // Novos campos para combate
  attackBonus?: number;
  damageBonus?: number;
  relatedSkillName?: string;
  relatedAttr1?: string;
  relatedAttr2?: string;
}

export interface CharacterData {
  id: string; // Adicionado ID para facilitar referências
  name: string;
  folder?: string; // Campo para organização por pastas
  avatar?: string;
  totalXp: number;
  xp: number;     
  age: number;
  gender: string;
  attributes: Attribute[];
  hp: { current: number; extraMax: number };
  mp: { current: number; extraMax: number };
  ac: number;
  selectedArmorSkillName?: string;
  skills: Skill[];
  inventory: Item[];
  spells: Spell[];
  abilities: Ability[];
  xpLog: XpLog[];
}
