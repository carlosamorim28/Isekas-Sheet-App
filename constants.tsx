
import { CharacterData } from './types';

export const INITIAL_CHARACTER_DATA: CharacterData = {
  name: "",
  totalXp: 0,
  xp: 0, // Este campo será calculado reativamente no App.tsx
  age: 0,
  gender: "Não Definido",
  attributes: [
    { name: "Força", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "⚔️" },
    { name: "Destreza", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "🏹" },
    { name: "Constituição", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "🛡️" },
    { name: "Poder Mágico", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "🔮" },
    { name: "Ofício", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "⚒️" },
    { name: "Mente", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "🧠" },
    { name: "Mana", value: 0, racialBonus: 0, bonusFromItems: 0, icon: "✨" },
  ],
  hp: { current: 20, extraMax: 0 },
  mp: { current: 200, extraMax: 0 },
  ac: 10,
  selectedArmorSkillName: "",
  skills: [],
  inventory: [],
  spells: [],
  abilities: []
};

export const RANK_BONUS: Record<string, number> = {
  'E': 0, 'D': 2, 'C': 4, 'B': 6, 'A': 8, 'S': 10
};

export const RANK_NAMES: Record<string, string> = {
  'E': 'Destreinado', 'D': 'Treinado', 'C': 'Especialista', 'B': 'Mestre', 'A': 'Grão-Mestre', 'S': 'Lendário'
};

export const OFFICIAL_SKILL_LIST = [
  { name: "Ato de Força", attr: "Força" },
  { name: "Arremessar", attr: "Força" },
  { name: "Atletismo", attr: "Força" },
  { name: "Acrobacia", attr: "Destreza" },
  { name: "Furtividade", attr: "Destreza" },
  { name: "Mãos Leves", attr: "Destreza" },
  { name: "Investigação", attr: "Ofício" },
  { name: "Primeiros Socorros", attr: "Ofício" },
  { name: "Ferraria", attr: "Ofício" },
  { name: "Alquimia", attr: "Ofício" },
  { name: "Encantamento", attr: "Ofício" },
  { name: "Culinária", attr: "Ofício" },
  { name: "Rastreamento", attr: "Mente" },
  { name: "Intuição", attr: "Mente" },
  { name: "Percepção", attr: "Mente" },
  { name: "Perícia Mágica (Pura)", attr: "Poder Mágico" },
  { name: "Perícia Mágica (Fogo)", attr: "Poder Mágico" },
  { name: "Perícia Mágica (Terra)", attr: "Poder Mágico" },
  { name: "Armas Corpo à Corpo", attr: "Força" },
  { name: "Armas à Distância", attr: "Destreza" },
  { name: "Escudos", attr: "Força" },
  { name: "Defesa sem Armadura", attr: "Destreza" },
  { name: "Armaduras Leves", attr: "Destreza" },
  { name: "Armaduras Médias", attr: "Força" },
  { name: "Armaduras Pesadas", attr: "Constituição" }
];
