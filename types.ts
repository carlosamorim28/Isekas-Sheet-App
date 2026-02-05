
export type ProficiencyRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ItemType = 'weapon' | 'armor' | 'utility' | 'consumable';

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
  initialRank: ProficiencyRank; // Rank em que a perícia foi adicionada (custo 0)
  relatedAttribute: string;
  initialBonus: number;
  isDiscounted?: boolean;
}

export interface Spell {
  name: string;
  rank: ProficiencyRank;
  initialRank: ProficiencyRank; // Rank em que a magia foi adicionada (custo 0)
  cost: string;
  description: string; // Nova descrição da magia
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
  damage?: string; // Ex: "1d8 + 4"
  defense?: number;
  description: string;
  specialAbility?: string;
  weight?: number;
  isEquipped?: boolean;
}

export interface CharacterData {
  name: string;
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
}