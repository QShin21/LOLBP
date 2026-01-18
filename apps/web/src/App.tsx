import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Sword, Lock, RotateCcw, CheckCircle2, Ban, Clock, HelpCircle, XCircle, Undo2, Download, Search, X, ArrowRightLeft, Check, Wifi, WifiOff, PlusCircle, Copy, Users, UserCog, Eye, AlertCircle, Play, SkipForward, ThumbsUp, Pause, PlayCircle, History, LogOut, Trophy, Skull } from 'lucide-react';

// ==========================================
// MODULE: Types & Constants
// ==========================================

type Side = 'BLUE' | 'RED';
type ActionType = 'BAN' | 'PICK' | 'SWAP' | 'FINISH_SWAP' | 'START_GAME' | 'RESET_GAME' | 'TOGGLE_READY' | 'PAUSE_GAME' | 'RESUME_GAME' | 'SET_SIDES' | 'REPORT_RESULT';
type Role = 'TOP' | 'JG' | 'MID' | 'BOT' | 'SUP' | 'SPECIAL';
type DraftPhase = 'DRAFT' | 'SWAP' | 'FINISHED';
type DraftStatus = 'NOT_STARTED' | 'RUNNING' | 'FINISHED';
type SeriesMode = 'BO1' | 'BO2' | 'BO3' | 'BO5';
type DraftMode = 'STANDARD' | 'FEARLESS';
type TeamId = 'TEAM_A' | 'TEAM_B';
type UserRole = 'REFEREE' | 'SPECTATOR' | TeamId;

const SPECIAL_ID_NONE = 'special_none';
const SPECIAL_ID_RANDOM = 'special_random';

interface Hero { id: string; name: string; roles: Role[]; avatarColor: string; }
interface DraftStep { index: number; side: Side; type: 'BAN' | 'PICK'; label: string; }
interface DraftAction { seq: number; stepIndex: number; type: ActionType; side?: Side; heroId?: string; swapData?: { fromIndex: number; toIndex: number }; actorRole?: string; }

interface GameResultSnapshot {
  gameIdx: number;
  winner: TeamId;
  blueSideTeam: TeamId;
  redSideTeam: TeamId;
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
}

interface DraftState {
  lastActionSeq: number;
  matchTitle: string;
  seriesMode: SeriesMode;
  draftMode: DraftMode; 
  teamA: { name: string; wins: number };
  teamB: { name: string; wins: number };
  currentGameIdx: number;
  sides: { [key in TeamId]: Side | null };
  nextSideSelector: TeamId | 'REFEREE' | null;
  seriesHistory: GameResultSnapshot[];

  status: DraftStatus;
  phase: DraftPhase;
  stepIndex: number; 
  draftStepIndex: number; 
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
  history: DraftAction[]; 
  stepEndsAt: number;
  blueReady: boolean;
  redReady: boolean;
  paused: boolean;
  pauseReason?: string;
  pausedAt?: number;
}

// ==========================================
// MODULE: Data (Visual Only)
// ==========================================

const RAW_HEROES: Hero[] = [
  // A
  { id: 'aatrox', name: 'Aatrox', roles: ['TOP'], avatarColor: 'bg-red-700' },
  { id: 'ahri', name: 'Ahri', roles: ['MID'], avatarColor: 'bg-pink-500' },
  { id: 'akali', name: 'Akali', roles: ['MID', 'TOP'], avatarColor: 'bg-green-700' },
  { id: 'akshan', name: 'Akshan', roles: ['MID', 'TOP'], avatarColor: 'bg-yellow-600' },
  { id: 'alistar', name: 'Alistar', roles: ['SUP'], avatarColor: 'bg-purple-700' },
  { id: 'amumu', name: 'Amumu', roles: ['JG', 'SUP'], avatarColor: 'bg-green-500' },
  { id: 'anivia', name: 'Anivia', roles: ['MID'], avatarColor: 'bg-blue-300' },
  { id: 'annie', name: 'Annie', roles: ['MID', 'SUP'], avatarColor: 'bg-red-500' },
  { id: 'aphelios', name: 'Aphelios', roles: ['BOT'], avatarColor: 'bg-teal-600' },
  { id: 'ashe', name: 'Ashe', roles: ['BOT', 'SUP'], avatarColor: 'bg-blue-400' },
  { id: 'aurelionsol', name: 'Aurelion Sol', roles: ['MID'], avatarColor: 'bg-indigo-600' },
  { id: 'azir', name: 'Azir', roles: ['MID'], avatarColor: 'bg-yellow-500' },
  // B
  { id: 'bard', name: 'Bard', roles: ['SUP'], avatarColor: 'bg-yellow-200' },
  { id: 'belveth', name: 'Bel\'Veth', roles: ['JG'], avatarColor: 'bg-purple-400' },
  { id: 'blitz', name: 'Blitzcrank', roles: ['SUP'], avatarColor: 'bg-yellow-600' },
  { id: 'brand', name: 'Brand', roles: ['SUP', 'JG', 'MID'], avatarColor: 'bg-orange-600' },
  { id: 'braum', name: 'Braum', roles: ['SUP'], avatarColor: 'bg-blue-600' },
  { id: 'briar', name: 'Briar', roles: ['JG'], avatarColor: 'bg-red-900' },
  // C
  { id: 'caitlyn', name: 'Caitlyn', roles: ['BOT'], avatarColor: 'bg-purple-500' },
  { id: 'camille', name: 'Camille', roles: ['TOP', 'SUP'], avatarColor: 'bg-gray-400' },
  { id: 'cassiopeia', name: 'Cassiopeia', roles: ['MID'], avatarColor: 'bg-green-800' },
  { id: 'chogath', name: 'Cho\'Gath', roles: ['TOP', 'MID'], avatarColor: 'bg-purple-900' },
  { id: 'corki', name: 'Corki', roles: ['MID', 'BOT'], avatarColor: 'bg-red-300' },
  // D
  { id: 'darius', name: 'Darius', roles: ['TOP'], avatarColor: 'bg-red-800' },
  { id: 'diana', name: 'Diana', roles: ['JG', 'MID'], avatarColor: 'bg-gray-200' },
  { id: 'drmundo', name: 'Dr. Mundo', roles: ['TOP', 'JG'], avatarColor: 'bg-purple-600' },
  { id: 'draven', name: 'Draven', roles: ['BOT'], avatarColor: 'bg-red-600' },
  // E
  { id: 'ekko', name: 'Ekko', roles: ['JG', 'MID'], avatarColor: 'bg-green-400' },
  { id: 'elise', name: 'Elise', roles: ['JG'], avatarColor: 'bg-purple-800' },
  { id: 'evelynn', name: 'Evelynn', roles: ['JG'], avatarColor: 'bg-pink-700' },
  { id: 'ezreal', name: 'Ezreal', roles: ['BOT'], avatarColor: 'bg-yellow-400' },
  // F
  { id: 'fiddlesticks', name: 'Fiddlesticks', roles: ['JG', 'SUP'], avatarColor: 'bg-green-900' },
  { id: 'fiora', name: 'Fiora', roles: ['TOP'], avatarColor: 'bg-pink-400' },
  { id: 'fizz', name: 'Fizz', roles: ['MID'], avatarColor: 'bg-blue-500' },
  // G
  { id: 'galio', name: 'Galio', roles: ['MID', 'SUP'], avatarColor: 'bg-gray-300' },
  { id: 'gangplank', name: 'Gangplank', roles: ['TOP'], avatarColor: 'bg-orange-800' },
  { id: 'garen', name: 'Garen', roles: ['TOP'], avatarColor: 'bg-blue-600' },
  { id: 'gnar', name: 'Gnar', roles: ['TOP'], avatarColor: 'bg-orange-500' },
  { id: 'gragas', name: 'Gragas', roles: ['JG', 'TOP', 'SUP'], avatarColor: 'bg-orange-300' },
  { id: 'graves', name: 'Graves', roles: ['JG'], avatarColor: 'bg-gray-600' },
  { id: 'gwen', name: 'Gwen', roles: ['TOP', 'JG'], avatarColor: 'bg-blue-400' },
  // H
  { id: 'hecarim', name: 'Hecarim', roles: ['JG'], avatarColor: 'bg-blue-800' },
  { id: 'heimerdinger', name: 'Heimerdinger', roles: ['SUP', 'MID', 'TOP'], avatarColor: 'bg-yellow-300' },
  { id: 'hwei', name: 'Hwei', roles: ['MID', 'SUP'], avatarColor: 'bg-purple-300' },
  // I
  { id: 'illaoi', name: 'Illaoi', roles: ['TOP'], avatarColor: 'bg-green-700' },
  { id: 'irelia', name: 'Irelia', roles: ['TOP', 'MID'], avatarColor: 'bg-pink-300' },
  { id: 'ivern', name: 'Ivern', roles: ['JG'], avatarColor: 'bg-green-200' },
  // J
  { id: 'janna', name: 'Janna', roles: ['SUP'], avatarColor: 'bg-gray-100' },
  { id: 'jarvaniv', name: 'Jarvan IV', roles: ['JG', 'TOP'], avatarColor: 'bg-yellow-700' },
  { id: 'jax', name: 'Jax', roles: ['TOP', 'JG'], avatarColor: 'bg-purple-800' },
  { id: 'jayce', name: 'Jayce', roles: ['TOP', 'MID'], avatarColor: 'bg-yellow-100' },
  { id: 'jhin', name: 'Jhin', roles: ['BOT'], avatarColor: 'bg-red-200' },
  { id: 'jinx', name: 'Jinx', roles: ['BOT'], avatarColor: 'bg-pink-600' },
  // K
  { id: 'ksante', name: 'K\'Sante', roles: ['TOP'], avatarColor: 'bg-orange-700' },
  { id: 'kaisa', name: 'Kai\'Sa', roles: ['BOT'], avatarColor: 'bg-purple-700' },
  { id: 'kalista', name: 'Kalista', roles: ['BOT'], avatarColor: 'bg-teal-800' },
  { id: 'karma', name: 'Karma', roles: ['SUP', 'MID'], avatarColor: 'bg-green-300' },
  { id: 'karthus', name: 'Karthus', roles: ['JG', 'BOT'], avatarColor: 'bg-slate-600' },
  { id: 'kassadin', name: 'Kassadin', roles: ['MID'], avatarColor: 'bg-purple-900' },
  { id: 'katarina', name: 'Katarina', roles: ['MID'], avatarColor: 'bg-red-700' },
  { id: 'kayle', name: 'Kayle', roles: ['TOP', 'MID'], avatarColor: 'bg-yellow-200' },
  { id: 'kayn', name: 'Kayn', roles: ['JG'], avatarColor: 'bg-gray-800' },
  { id: 'kennen', name: 'Kennen', roles: ['TOP', 'MID'], avatarColor: 'bg-purple-400' },
  { id: 'khazix', name: 'Kha\'Zix', roles: ['JG'], avatarColor: 'bg-purple-600' },
  { id: 'kindred', name: 'Kindred', roles: ['JG'], avatarColor: 'bg-slate-200' },
  { id: 'kled', name: 'Kled', roles: ['TOP'], avatarColor: 'bg-orange-700' },
  { id: 'kogmaw', name: 'Kog\'Maw', roles: ['BOT', 'MID'], avatarColor: 'bg-purple-300' },
  // L
  { id: 'leblanc', name: 'LeBlanc', roles: ['MID'], avatarColor: 'bg-purple-800' },
  { id: 'leesin', name: 'Lee Sin', roles: ['JG'], avatarColor: 'bg-red-600' },
  { id: 'leona', name: 'Leona', roles: ['SUP'], avatarColor: 'bg-yellow-500' },
  { id: 'lillia', name: 'Lillia', roles: ['JG'], avatarColor: 'bg-pink-400' },
  { id: 'lissandra', name: 'Lissandra', roles: ['MID'], avatarColor: 'bg-blue-200' },
  { id: 'lucian', name: 'Lucian', roles: ['BOT', 'MID'], avatarColor: 'bg-gray-200' },
  { id: 'lulu', name: 'Lulu', roles: ['SUP'], avatarColor: 'bg-purple-200' },
  { id: 'lux', name: 'Lux', roles: ['MID', 'SUP'], avatarColor: 'bg-yellow-200' },
  // M
  { id: 'malphite', name: 'Malphite', roles: ['TOP', 'SUP', 'MID'], avatarColor: 'bg-stone-600' },
  { id: 'malzahar', name: 'Malzahar', roles: ['MID'], avatarColor: 'bg-purple-600' },
  { id: 'maokai', name: 'Maokai', roles: ['SUP', 'TOP', 'JG'], avatarColor: 'bg-green-700' },
  { id: 'masteryi', name: 'Master Yi', roles: ['JG'], avatarColor: 'bg-yellow-300' },
  { id: 'milio', name: 'Milio', roles: ['SUP'], avatarColor: 'bg-orange-200' },
  { id: 'missfortune', name: 'Miss Fortune', roles: ['BOT'], avatarColor: 'bg-red-400' },
  { id: 'mordekaiser', name: 'Mordekaiser', roles: ['TOP', 'JG'], avatarColor: 'bg-green-900' },
  { id: 'morgana', name: 'Morgana', roles: ['SUP', 'JG', 'MID'], avatarColor: 'bg-purple-900' },
  // N
  { id: 'naafiri', name: 'Naafiri', roles: ['MID', 'TOP', 'JG'], avatarColor: 'bg-red-800' },
  { id: 'nami', name: 'Nami', roles: ['SUP'], avatarColor: 'bg-teal-400' },
  { id: 'nasus', name: 'Nasus', roles: ['TOP'], avatarColor: 'bg-purple-700' },
  { id: 'nautilus', name: 'Nautilus', roles: ['SUP'], avatarColor: 'bg-teal-700' },
  { id: 'neeko', name: 'Neeko', roles: ['MID', 'SUP'], avatarColor: 'bg-green-200' },
  { id: 'nidalee', name: 'Nidalee', roles: ['JG'], avatarColor: 'bg-orange-200' },
  { id: 'nilah', name: 'Nilah', roles: ['BOT'], avatarColor: 'bg-blue-500' },
  { id: 'nocturne', name: 'Nocturne', roles: ['JG'], avatarColor: 'bg-slate-900' },
  { id: 'nunu', name: 'Nunu & Willump', roles: ['JG'], avatarColor: 'bg-blue-200' },
  // O
  { id: 'olaf', name: 'Olaf', roles: ['JG', 'TOP'], avatarColor: 'bg-orange-400' },
  { id: 'orianna', name: 'Orianna', roles: ['MID'], avatarColor: 'bg-blue-400' },
  { id: 'ornn', name: 'Ornn', roles: ['TOP'], avatarColor: 'bg-red-900' },
  // P
  { id: 'pantheon', name: 'Pantheon', roles: ['SUP', 'MID', 'TOP', 'JG'], avatarColor: 'bg-yellow-800' },
  { id: 'poppy', name: 'Poppy', roles: ['JG', 'TOP', 'SUP'], avatarColor: 'bg-yellow-600' },
  { id: 'pyke', name: 'Pyke', roles: ['SUP'], avatarColor: 'bg-green-800' },
  // Q
  { id: 'qiyana', name: 'Qiyana', roles: ['JG', 'MID'], avatarColor: 'bg-green-500' },
  { id: 'quinn', name: 'Quinn', roles: ['TOP'], avatarColor: 'bg-blue-300' },
  // R
  { id: 'rakan', name: 'Rakan', roles: ['SUP'], avatarColor: 'bg-yellow-400' },
  { id: 'rammus', name: 'Rammus', roles: ['JG'], avatarColor: 'bg-green-600' },
  { id: 'reksai', name: 'Rek\'Sai', roles: ['JG'], avatarColor: 'bg-purple-500' },
  { id: 'rell', name: 'Rell', roles: ['SUP', 'JG'], avatarColor: 'bg-yellow-600' },
  { id: 'renata', name: 'Renata Glasc', roles: ['SUP'], avatarColor: 'bg-purple-800' },
  { id: 'renekton', name: 'Renekton', roles: ['TOP'], avatarColor: 'bg-green-800' },
  { id: 'rengar', name: 'Rengar', roles: ['JG', 'TOP'], avatarColor: 'bg-gray-400' },
  { id: 'riven', name: 'Riven', roles: ['TOP'], avatarColor: 'bg-gray-400' },
  { id: 'rumble', name: 'Rumble', roles: ['TOP', 'MID'], avatarColor: 'bg-blue-500' },
  { id: 'ryze', name: 'Ryze', roles: ['MID', 'TOP'], avatarColor: 'bg-blue-700' },
  // S
  { id: 'samira', name: 'Samira', roles: ['BOT'], avatarColor: 'bg-red-800' },
  { id: 'sejuani', name: 'Sejuani', roles: ['JG', 'TOP'], avatarColor: 'bg-blue-200' },
  { id: 'senna', name: 'Senna', roles: ['SUP', 'BOT'], avatarColor: 'bg-green-900' },
  { id: 'seraphine', name: 'Seraphine', roles: ['SUP', 'MID', 'BOT'], avatarColor: 'bg-pink-200' },
  { id: 'sett', name: 'Sett', roles: ['TOP', 'SUP'], avatarColor: 'bg-orange-600' },
  { id: 'shaco', name: 'Shaco', roles: ['JG', 'SUP'], avatarColor: 'bg-gray-700' },
  { id: 'shen', name: 'Shen', roles: ['TOP', 'SUP'], avatarColor: 'bg-purple-500' },
  { id: 'shyvana', name: 'Shyvana', roles: ['JG', 'TOP'], avatarColor: 'bg-red-500' },
  { id: 'singed', name: 'Singed', roles: ['TOP'], avatarColor: 'bg-green-700' },
  { id: 'sion', name: 'Sion', roles: ['TOP'], avatarColor: 'bg-red-900' },
  { id: 'sivir', name: 'Sivir', roles: ['BOT'], avatarColor: 'bg-yellow-600' },
  { id: 'skarner', name: 'Skarner', roles: ['JG', 'TOP'], avatarColor: 'bg-purple-400' },
  { id: 'smolder', name: 'Smolder', roles: ['BOT', 'MID'], avatarColor: 'bg-orange-500' },
  { id: 'sona', name: 'Sona', roles: ['SUP'], avatarColor: 'bg-blue-300' },
  { id: 'soraka', name: 'Soraka', roles: ['SUP'], avatarColor: 'bg-yellow-200' },
  { id: 'swain', name: 'Swain', roles: ['SUP', 'MID', 'BOT'], avatarColor: 'bg-red-900' },
  { id: 'sylas', name: 'Sylas', roles: ['MID', 'JG', 'TOP'], avatarColor: 'bg-gray-500' },
  { id: 'syndra', name: 'Syndra', roles: ['MID'], avatarColor: 'bg-purple-900' },
  // T
  { id: 'tahmkench', name: 'Tahm Kench', roles: ['SUP', 'TOP'], avatarColor: 'bg-green-800' },
  { id: 'taliyah', name: 'Taliyah', roles: ['JG', 'MID'], avatarColor: 'bg-orange-400' },
  { id: 'talon', name: 'Talon', roles: ['JG', 'MID'], avatarColor: 'bg-blue-800' },
  { id: 'taric', name: 'Taric', roles: ['SUP'], avatarColor: 'bg-blue-200' },
  { id: 'teemo', name: 'Teemo', roles: ['TOP', 'JG', 'SUP'], avatarColor: 'bg-green-400' },
  { id: 'thresh', name: 'Thresh', roles: ['SUP'], avatarColor: 'bg-green-800' },
  { id: 'tristana', name: 'Tristana', roles: ['BOT', 'MID'], avatarColor: 'bg-blue-500' },
  { id: 'trundle', name: 'Trundle', roles: ['JG', 'TOP'], avatarColor: 'bg-blue-700' },
  { id: 'tryndamere', name: 'Tryndamere', roles: ['TOP'], avatarColor: 'bg-gray-500' },
  { id: 'twistedfate', name: 'Twisted Fate', roles: ['MID', 'TOP'], avatarColor: 'bg-blue-600' },
  { id: 'twitch', name: 'Twitch', roles: ['BOT', 'SUP', 'JG'], avatarColor: 'bg-green-700' },
  // U
  { id: 'udyr', name: 'Udyr', roles: ['JG', 'TOP'], avatarColor: 'bg-orange-900' },
  { id: 'urgot', name: 'Urgot', roles: ['TOP'], avatarColor: 'bg-green-600' },
  // V
  { id: 'varus', name: 'Varus', roles: ['BOT', 'MID', 'TOP'], avatarColor: 'bg-purple-800' },
  { id: 'vayne', name: 'Vayne', roles: ['BOT', 'TOP'], avatarColor: 'bg-purple-900' },
  { id: 'veigar', name: 'Veigar', roles: ['MID', 'SUP', 'BOT'], avatarColor: 'bg-purple-500' },
  { id: 'velkoz', name: 'Vel\'Koz', roles: ['SUP', 'MID'], avatarColor: 'bg-purple-200' },
  { id: 'vex', name: 'Vex', roles: ['MID'], avatarColor: 'bg-gray-900' },
  { id: 'vi', name: 'Vi', roles: ['JG'], avatarColor: 'bg-pink-800' },
  { id: 'viego', name: 'Viego', roles: ['JG', 'MID'], avatarColor: 'bg-green-900' },
  { id: 'viktor', name: 'Viktor', roles: ['MID', 'TOP'], avatarColor: 'bg-yellow-600' },
  { id: 'vladimir', name: 'Vladimir', roles: ['MID', 'TOP'], avatarColor: 'bg-red-700' },
  { id: 'volibear', name: 'Volibear', roles: ['JG', 'TOP'], avatarColor: 'bg-blue-200' },
  // W
  { id: 'warwick', name: 'Warwick', roles: ['JG', 'TOP'], avatarColor: 'bg-green-800' },
  { id: 'wukong', name: 'Wukong', roles: ['JG', 'TOP'], avatarColor: 'bg-yellow-600' },
  // X
  { id: 'xayah', name: 'Xayah', roles: ['BOT'], avatarColor: 'bg-purple-500' },
  { id: 'xerath', name: 'Xerath', roles: ['SUP', 'MID'], avatarColor: 'bg-blue-400' },
  { id: 'xinzhao', name: 'Xin Zhao', roles: ['JG'], avatarColor: 'bg-yellow-500' },
  // Y
  { id: 'yasuo', name: 'Yasuo', roles: ['MID', 'TOP', 'BOT'], avatarColor: 'bg-blue-300' },
  { id: 'yone', name: 'Yone', roles: ['MID', 'TOP'], avatarColor: 'bg-red-300' },
  { id: 'yorick', name: 'Yorick', roles: ['TOP', 'JG'], avatarColor: 'bg-blue-800' },
  { id: 'yuumi', name: 'Yuumi', roles: ['SUP'], avatarColor: 'bg-blue-200' },
  // Z
  { id: 'zac', name: 'Zac', roles: ['JG', 'TOP', 'SUP'], avatarColor: 'bg-green-600' },
  { id: 'zed', name: 'Zed', roles: ['MID', 'JG'], avatarColor: 'bg-gray-800' },
  { id: 'zeri', name: 'Zeri', roles: ['BOT', 'MID'], avatarColor: 'bg-green-300' },
  { id: 'ziggs', name: 'Ziggs', roles: ['BOT', 'MID'], avatarColor: 'bg-orange-400' },
  { id: 'zilean', name: 'Zilean', roles: ['SUP', 'MID'], avatarColor: 'bg-yellow-400' },
  { id: 'zoe', name: 'Zoe', roles: ['MID', 'SUP'], avatarColor: 'bg-purple-300' },
  { id: 'zyra', name: 'Zyra', roles: ['SUP', 'JG'], avatarColor: 'bg-green-600' },
];

const HEROES: Hero[] = [
  { id: SPECIAL_ID_NONE, name: 'NO BAN', roles: ['SPECIAL'], avatarColor: 'bg-slate-800' },
  { id: SPECIAL_ID_RANDOM, name: 'RANDOM', roles: ['SPECIAL'], avatarColor: 'bg-slate-800' },
  ...RAW_HEROES
];

const DRAFT_SEQUENCE: Omit<DraftStep, 'index'>[] = [
  { side: 'BLUE', type: 'BAN', label: 'B-BAN 1' }, { side: 'RED', type: 'BAN', label: 'R-BAN 1' },
  { side: 'BLUE', type: 'BAN', label: 'B-BAN 2' }, { side: 'RED', type: 'BAN', label: 'R-BAN 2' },
  { side: 'BLUE', type: 'BAN', label: 'B-BAN 3' }, { side: 'RED', type: 'BAN', label: 'R-BAN 3' },
  { side: 'BLUE', type: 'PICK', label: 'B-PICK 1' }, { side: 'RED', type: 'PICK', label: 'R-PICK 1' }, { side: 'RED', type: 'PICK', label: 'R-PICK 2' },
  { side: 'BLUE', type: 'PICK', label: 'B-PICK 2' }, { side: 'BLUE', type: 'PICK', label: 'B-PICK 3' }, { side: 'RED', type: 'PICK', label: 'R-PICK 3' },
  { side: 'RED', type: 'BAN', label: 'R-BAN 4' }, { side: 'BLUE', type: 'BAN', label: 'B-BAN 4' },
  { side: 'RED', type: 'BAN', label: 'R-BAN 5' }, { side: 'BLUE', type: 'BAN', label: 'B-BAN 5' },
  { side: 'RED', type: 'PICK', label: 'R-PICK 4' }, { side: 'BLUE', type: 'PICK', label: 'B-PICK 4' }, { side: 'BLUE', type: 'PICK', label: 'B-PICK 5' }, { side: 'RED', type: 'PICK', label: 'R-PICK 5' },
];

const getCurrentStep = (state: DraftState): DraftStep | null => {
  if (state.draftStepIndex >= DRAFT_SEQUENCE.length) return null;
  return { ...DRAFT_SEQUENCE[state.draftStepIndex], index: state.draftStepIndex };
};
const getHero = (id: string | null) => HEROES.find(h => h.id === id);

// ==========================================
// UI COMPONENTS
// ==========================================

const Lobby = ({ onCreate, onJoin }: { onCreate: (config: any) => void, onJoin: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [config, setConfig] = useState({ matchTitle: '', teamA: 'T1', teamB: 'GEN', seriesMode: 'BO3', draftMode: 'STANDARD' });
  const [joinId, setJoinId] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://lol.qq.com/act/a20220120lpl/img/bg.jpg')] bg-cover bg-center" />
      
      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl z-10">
        <div className="text-center mb-8">
          <Sword size={48} className="mx-auto text-yellow-500 mb-4" />
          <h1 className="text-4xl font-black text-white italic tracking-tighter">BP SIMULATOR</h1>
          <p className="text-slate-400">Tournament Edition</p>
        </div>

        <div className="flex gap-4 mb-6 bg-slate-800 p-1 rounded-lg">
          <button onClick={() => setActiveTab('CREATE')} className={`flex-1 py-2 rounded-md font-bold transition-all ${activeTab === 'CREATE' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Create Room</button>
          <button onClick={() => setActiveTab('JOIN')} className={`flex-1 py-2 rounded-md font-bold transition-all ${activeTab === 'JOIN' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Join Room</button>
        </div>

        {activeTab === 'CREATE' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Match Title (Optional)</label>
              <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" placeholder="e.g. Worlds Finals 2025" value={config.matchTitle} onChange={e => setConfig({...config, matchTitle: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team A Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={config.teamA} onChange={e => setConfig({...config, teamA: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team B Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={config.teamB} onChange={e => setConfig({...config, teamB: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Series Format</label>
              <div className="flex gap-2">
                {['BO1', 'BO2', 'BO3', 'BO5'].map(m => (
                  <button key={m} onClick={() => setConfig({...config, seriesMode: m})} className={`flex-1 py-2 rounded border ${config.seriesMode === m ? 'bg-yellow-600 border-yellow-600 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{m}</button>
                ))}
              </div>
            </div>
            {/* Draft Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Draft Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setConfig({...config, draftMode: 'STANDARD'})} className={`flex-1 py-2 rounded border ${config.draftMode === 'STANDARD' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>Standard</button>
                <button onClick={() => setConfig({...config, draftMode: 'FEARLESS'})} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${config.draftMode === 'FEARLESS' ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                   <Skull size={16} /> Fearless
                </button>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 italic">
                 {config.draftMode === 'STANDARD' ? 'Heroes reset each game.' : 'Global Fearless: Heroes picked in previous games are banned for BOTH teams.'}
              </div>
            </div>

            <button onClick={() => onCreate(config)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-bold text-lg mt-4 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">CREATE LOBBY</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="Enter Room ID" className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white text-center font-mono text-xl uppercase tracking-widest" value={joinId} onChange={e => setJoinId(e.target.value)} />
            <button disabled={!joinId} onClick={() => onJoin(joinId)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-lg disabled:opacity-50">CONNECT</button>
          </div>
        )}
      </div>
    </div>
  );
};

const RoleSelectionModal = ({ state, onSelect }: { state: DraftState, onSelect: (role: UserRole) => void }) => {
  // Defensive check for white screen
  if (!state || !state.teamA || !state.teamB) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-2xl w-full shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white italic tracking-tighter mb-2">SELECT YOUR ROLE</h1>
          <p className="text-slate-400">{state.matchTitle || 'Standard Match'} • {state.seriesMode}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onSelect('TEAM_A')} className="group h-32 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-white rounded-xl flex flex-col items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-slate-300" />
            <span className="text-xl font-bold text-white">{state.teamA?.name || 'Team A'}</span>
            <span className="text-xs text-slate-500">TEAM A</span>
          </button>
          <button onClick={() => onSelect('TEAM_B')} className="group h-32 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-white rounded-xl flex flex-col items-center justify-center gap-2">
            <Sword className="w-8 h-8 text-slate-300" />
            <span className="text-xl font-bold text-white">{state.teamB?.name || 'Team B'}</span>
            <span className="text-xs text-slate-500">TEAM B</span>
          </button>
          <button onClick={() => onSelect('REFEREE')} className="h-20 bg-yellow-950/30 hover:bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-center justify-center gap-2 text-yellow-500 font-bold"><UserCog /> REFEREE</button>
          <button onClick={() => onSelect('SPECTATOR')} className="h-20 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 font-bold"><Eye /> SPECTATOR</button>
        </div>
      </div>
    </div>
  );
};

const HeroCard = ({ hero, status, onClick, isHovered, isFearlessBanned }: any) => {
  const isSpecial = hero.id === SPECIAL_ID_NONE || hero.id === SPECIAL_ID_RANDOM;
  let baseClass = "relative flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all border-2";
  let visualClass = "";

  if (isFearlessBanned) {
     visualClass = "border-red-900/30 bg-red-950/20 opacity-40 grayscale cursor-not-allowed";
  } else if (status === 'AVAILABLE') {
      visualClass = isHovered 
        ? "border-yellow-400 bg-slate-700 scale-105 shadow-lg" 
        : "border-slate-700 bg-slate-800 hover:bg-slate-700";
      if (isSpecial) visualClass += " bg-slate-900 border-dashed";
  } else {
      visualClass = "border-slate-800 bg-slate-900 opacity-30 grayscale cursor-not-allowed";
  }

  const renderContent = () => {
    if (hero.id === SPECIAL_ID_NONE) return <XCircle className="w-8 h-8 text-slate-500" />;
    if (hero.id === SPECIAL_ID_RANDOM) return <HelpCircle className="w-8 h-8 text-yellow-500" />;
    return (
       <div className={`w-12 h-12 rounded-full mb-2 ${hero.avatarColor} border border-white/10 flex items-center justify-center text-xs font-bold`}>
          {hero.name.substring(0, 2)}
       </div>
    );
  };

  return (
    <div className={`${baseClass} ${visualClass}`} onClick={(!isFearlessBanned && status === 'AVAILABLE') ? onClick : undefined}>
      {renderContent()}
      <span className={`text-xs text-center font-medium truncate w-full ${isSpecial ? 'text-slate-400' : ''}`}>{hero.name}</span>
      {isFearlessBanned && <div className="absolute top-1 right-1 text-red-500"><Skull size={12}/></div>}
      {!isFearlessBanned && status === 'BANNED' && !isSpecial && <Ban className="absolute text-red-500 w-8 h-8 opacity-80" />}
      {!isFearlessBanned && status === 'PICKED' && !isSpecial && <CheckCircle2 className="absolute text-blue-500 w-8 h-8 opacity-80" />}
    </div>
  );
};

const TeamPanel = ({ side, bans, picks, active, phase, swapSelection, onSwapClick, userRole, status, isReady, onToggleReady, paused, teamName, teamWins, canControl }: any) => {
  const POSITION_LABELS = ['TOP', 'JG', 'MID', 'BOT', 'SUP'];
  const isBlue = side === 'BLUE';
  const textColor = isBlue ? 'text-blue-400' : 'text-red-400';
  const bgColor = isBlue ? 'bg-blue-950/30' : 'bg-red-950/30';
  const borderColor = isBlue ? 'border-blue-900' : 'border-red-900';
  const banSlots = Array(5).fill(null); 
  const pickSlots = Array(5).fill(null);

  const canInteract = canControl && status === 'RUNNING' && !paused;
  const canToggleReady = canControl && status === 'NOT_STARTED';

  // FIX: Safety check for teamWins to prevent Array length error
  const safeWins = Math.max(0, teamWins || 0);

  return (
    <div className={`flex flex-col w-72 h-full ${bgColor} border-r border-l ${isBlue ? 'border-r-0 border-l ' + borderColor : 'border-l-0 border-r ' + borderColor} p-4 transition-colors duration-500 ${active ? 'bg-opacity-50 ring-1 ring-inset ' + (isBlue ? 'ring-blue-500' : 'ring-red-500') : ''}`}>
      <div className="mb-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
           <span className={`text-3xl font-black italic uppercase ${textColor}`}>{teamName}</span>
           <div className="flex gap-0.5">
             {[...Array(safeWins)].map((_,i) => <div key={i} className="w-2 h-2 bg-yellow-500 rounded-full" />)}
           </div>
        </div>
        <div className={`text-[10px] font-bold px-2 rounded ${isBlue ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'}`}>{side} SIDE</div>
        
        {status === 'NOT_STARTED' && (
          <div className="mt-4">
             {onToggleReady && canToggleReady ? (
               <button onClick={onToggleReady} className={`flex items-center gap-2 px-6 py-2 rounded font-bold transition-all ${isReady ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                 {isReady ? 'READY' : 'CLICK TO READY'}
               </button>
             ) : (
               <div className={`flex items-center gap-2 px-4 py-1 rounded text-xs font-bold border ${isReady ? 'border-green-500 text-green-400' : 'border-slate-700 text-slate-500'}`}>
                 {isReady ? 'READY' : 'WAITING'}
               </div>
             )}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 mb-4">
        {pickSlots.map((_, i) => {
          // FIX: Access picks safely
          const heroId = picks && picks[i];
          const hero = heroId ? getHero(heroId) : null;
          const isSwapSelected = phase === 'SWAP' && swapSelection?.side === side && swapSelection?.index === i;
          const isSwapMode = phase === 'SWAP';
          const allowClick = isSwapMode && hero && canInteract;

          return (
            <div key={i} 
              onClick={() => allowClick ? onSwapClick(side, i) : undefined}
              className={`h-16 w-full bg-slate-900/80 rounded border ${isSwapSelected ? 'border-green-400' : 'border-slate-800'} flex items-center px-3 relative overflow-hidden ${allowClick ? 'cursor-pointer hover:bg-slate-800' : ''}`}>
               <div className="absolute right-2 top-1 text-[9px] font-black text-slate-600 tracking-wider">{POSITION_LABELS[i]}</div>
               {hero ? (
                 <><div className={`absolute left-0 top-0 bottom-0 w-1 ${hero.avatarColor}`}></div><div className={`w-10 h-10 rounded-full ${hero.avatarColor} mr-3 flex items-center justify-center text-[10px]`}>{hero.name.substring(0,2)}</div><span className="font-bold text-slate-200">{hero.name}</span></>
               ) : <span className="text-slate-700 text-sm italic">Picking...</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {banSlots.map((_, i) => {
          // FIX: Access bans safely
          const heroId = bans && bans[i];
          const hero = heroId ? getHero(heroId) : null;
          const isNoBan = heroId === SPECIAL_ID_NONE;
          return (
            <div key={i} className="w-10 h-10 bg-slate-900 rounded border border-slate-800 flex items-center justify-center relative">
               {hero && !isNoBan ? <><div className={`w-full h-full rounded opacity-50 ${hero.avatarColor}`}></div><Ban className="absolute w-6 h-6 text-red-500" /></> : isNoBan ? <XCircle className="w-6 h-6 text-slate-600" /> : <span className="text-slate-800 text-[10px]">{i+1}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GameHistoryCard = ({ game, state }: { game: GameResultSnapshot, state: DraftState }) => {
  const blueTeamName = game.blueSideTeam === 'TEAM_A' ? state.teamA?.name : state.teamB?.name;
  const redTeamName = game.redSideTeam === 'TEAM_A' ? state.teamA?.name : state.teamB?.name;
  const winnerName = game.winner === 'TEAM_A' ? state.teamA?.name : state.teamB?.name;
  
  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 mb-3 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <span className="text-yellow-500 font-bold tracking-widest text-sm">GAME {game.gameIdx}</span>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">WINNER:</span>
          <span className={`font-bold ${game.winner === game.blueSideTeam ? 'text-blue-400' : 'text-red-400'}`}>{winnerName}</span>
        </div>
      </div>
      
      {/* Blue Side */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-24 text-right text-blue-400 font-bold text-xs">{blueTeamName}</div>
        <div className="flex gap-1">
          {game.blueBans.map((h, i) => (
            <div key={i} className="w-6 h-6 rounded bg-slate-800 border border-slate-600 flex items-center justify-center opacity-70" title={`Ban: ${getHero(h)?.name}`}>
               {h !== SPECIAL_ID_NONE && <div className={`w-full h-full ${getHero(h)?.avatarColor}`} />}
               <Ban className="w-3 h-3 text-red-500 absolute" />
            </div>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {game.bluePicks.map((h, i) => (
            <div key={i} className="w-8 h-8 rounded bg-slate-800 border border-blue-900 flex items-center justify-center" title={`Pick: ${getHero(h)?.name}`}>
               <div className={`w-full h-full ${getHero(h)?.avatarColor}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Red Side */}
      <div className="flex items-center gap-4">
        <div className="w-24 text-right text-red-400 font-bold text-xs">{redTeamName}</div>
        <div className="flex gap-1">
          {game.redBans.map((h, i) => (
            <div key={i} className="w-6 h-6 rounded bg-slate-800 border border-slate-600 flex items-center justify-center opacity-70" title={`Ban: ${getHero(h)?.name}`}>
               {h !== SPECIAL_ID_NONE && <div className={`w-full h-full ${getHero(h)?.avatarColor}`} />}
               <Ban className="w-3 h-3 text-red-500 absolute" />
            </div>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {game.redPicks.map((h, i) => (
            <div key={i} className="w-8 h-8 rounded bg-slate-800 border border-red-900 flex items-center justify-center" title={`Pick: ${getHero(h)?.name}`}>
               <div className={`w-full h-full ${getHero(h)?.avatarColor}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP
// ==========================================

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('room'));
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [state, setState] = useState<DraftState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [hoveredHeroId, setHoveredHeroId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30); 
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [swapSelection, setSwapSelection] = useState<{ side: Side, index: number } | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'info'} | null>(null);

  const [lastSeenSeq, setLastSeenSeq] = useState<number>(0);
  const [missedActions, setMissedActions] = useState<DraftAction[]>([]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  // WS Connection
  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(`ws://localhost:8080?room=${roomId}`);
    wsRef.current = ws;
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATE_SYNC') {
          const ns = msg.payload as DraftState;
          if (lastSeenSeq > 0 && ns.lastActionSeq > lastSeenSeq + 1) {
             const res = await fetch(`http://localhost:8080/rooms/${roomId}/actions?afterSeq=${lastSeenSeq}`);
             const data = await res.json();
             if (data.actions?.length) setMissedActions(prev => [...prev, ...data.actions]);
          }
          setLastSeenSeq(ns.lastActionSeq);
          setState(ns);
        } else if (msg.type === 'ACTION_REJECTED') {
          setToast({ msg: msg.payload.reason, type: 'error' });
        }
      } catch (e) { console.error(e); }
    };
    return () => ws.close();
  }, [roomId, lastSeenSeq]);

  const send = (type: string, payload: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type, payload: { ...payload, actorRole: userRole } }));
  };

  // Helpers
  const currentStep = useMemo(() => state ? getCurrentStep(state) : null, [state]);
  const usedHeroes = useMemo(() => state ? new Set([...state.blueBans, ...state.redBans, ...state.bluePicks, ...state.redPicks]) : new Set(), [state]);
  const filteredHeroes = useMemo(() => HEROES.filter(h => 
    (roleFilter === 'ALL' || h.roles.includes(roleFilter as Role) || h.roles.includes('SPECIAL')) &&
    (!searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [searchTerm, roleFilter]);

  // Derived Info
  const myTeamId = (userRole === 'TEAM_A' || userRole === 'TEAM_B') ? userRole : null;
  const mySide = state && myTeamId ? state.sides[myTeamId] : null; 
  const isReferee = userRole === 'REFEREE';
  const isSpectator = userRole === 'SPECTATOR';
  
  const canInteract = useMemo(() => {
    if (!state || state.paused || state.status !== 'RUNNING') return false;
    if (isReferee) return true;
    if (state.phase === 'DRAFT' && currentStep && mySide) return currentStep.side === mySide;
    return false;
  }, [state, isReferee, currentStep, mySide]);

  // Timer
  useEffect(() => {
    if (!state || state.status !== 'RUNNING' || state.paused) { 
      if (state?.paused && state.pausedAt) setTimeLeft(Math.max(0, Math.ceil((state.stepEndsAt - state.pausedAt) / 1000)));
      else setTimeLeft(0);
      return; 
    }
    const i = setInterval(() => setTimeLeft(Math.max(0, Math.ceil((state.stepEndsAt - Date.now()) / 1000))), 200);
    return () => clearInterval(i);
  }, [state?.stepEndsAt, state?.status, state?.paused, state?.pausedAt]);

  // Actions
  const handleLock = () => { if (hoveredHeroId) { send('ACTION_SUBMIT', { heroId: hoveredHeroId }); setHoveredHeroId(null); } };
  const handleSwap = (side: Side, index: number) => {
    if (isSpectator || (state?.status !== 'RUNNING') || state?.paused) return;
    if (!isReferee && side !== mySide) return;
    if (!swapSelection) setSwapSelection({ side, index });
    else if (swapSelection.side === side && swapSelection.index !== index) {
      send('ACTION_SUBMIT', { type: 'SWAP', side, swapData: { fromIndex: swapSelection.index, toIndex: index } });
      setSwapSelection(null);
    } else setSwapSelection(null);
  };
  
  // New Actions
  const handleCreate = async (cfg: any) => {
    const res = await fetch('http://localhost:8080/rooms', { method: 'POST', body: JSON.stringify(cfg) });
    const data = await res.json();
    window.history.pushState(null, '', `?room=${data.roomId}`);
    setRoomId(data.roomId);
  };
  const handleJoin = (id: string) => {
    window.history.pushState(null, '', `?room=${id}`);
    setRoomId(id);
  };
  // FIX: Added Exit handler
  const handleExitRoom = () => {
    const newUrl = window.location.pathname;
    window.history.pushState(null, '', newUrl);
    setRoomId(null);
    setState(null);
    setIsConnected(false);
    if (wsRef.current) wsRef.current.close();
  };
  
  // FIX: Simplified side selection logic
  const handleSideSelection = (selectedSide: Side) => {
    let sideForA: Side = selectedSide;
    // Just pass the side for Team A based on button click logic.
    // Left button (Team A blue) -> 'BLUE'
    // Right button (Team B blue) -> 'RED'
    send('ACTION_SUBMIT', { type: 'SET_SIDES', sideForA: selectedSide });
  };

  const handleReportResult = (winner: TeamId) => send('ACTION_SUBMIT', { type: 'REPORT_RESULT', winner });

  if (!roomId) return <Lobby onCreate={handleCreate} onJoin={handleJoin} />;
  
  // Guard against missing state
  if (!state || !state.teamA || !state.teamB || !state.sides) {
    return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4"><div className="animate-spin text-yellow-500"><RotateCcw /></div></div>;
  }

  const bothSidesSet = state.sides.TEAM_A && state.sides.TEAM_B;
  const getTeamData = (teamId: string | null) => {
    if (teamId === 'TEAM_A') return state.teamA;
    if (teamId === 'TEAM_B') return state.teamB;
    return null;
  };
  const teamOnBlueId = state.sides.TEAM_A === 'BLUE' ? 'TEAM_A' : state.sides.TEAM_B === 'BLUE' ? 'TEAM_B' : null;
  const teamOnRedId = state.sides.TEAM_A === 'RED' ? 'TEAM_A' : state.sides.TEAM_B === 'RED' ? 'TEAM_B' : null;
  const blueData = getTeamData(teamOnBlueId);
  const redData = getTeamData(teamOnRedId);
  const isBlueUser = userRole === 'REFEREE' || (teamOnBlueId && userRole === teamOnBlueId);
  const isRedUser = userRole === 'REFEREE' || (teamOnRedId && userRole === teamOnRedId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-yellow-500/30 relative">
      {/* Toast & Overlays */}
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-3 rounded-full shadow-xl z-50 animate-bounce">{toast.msg}</div>}
      {!userRole && <RoleSelectionModal state={state} onSelect={setUserRole} />}
      
      {/* Header */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shadow-lg z-10 relative">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl text-yellow-500">{state.matchTitle || 'DRAFT'}</div>
          {state.draftMode === 'FEARLESS' && <div className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-800 uppercase tracking-widest flex items-center gap-1"><Skull size={10}/> Fearless</div>}
          <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-xs font-mono">
            <span className={state.teamA.wins > state.teamB.wins ? 'text-yellow-400' : 'text-white'}>{state.teamA.name} {state.teamA.wins || 0}</span>
            <span className="mx-2 text-slate-500">-</span>
            <span className={state.teamB.wins > state.teamA.wins ? 'text-yellow-400' : 'text-white'}>{state.teamB.wins} {state.teamB.name}</span>
            <span className="ml-3 text-slate-500">({state.seriesMode})</span>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
           <div className={`text-[10px] font-bold px-2 py-0.5 rounded mb-1 tracking-widest ${state.paused ? 'bg-red-600 text-white' : state.status === 'RUNNING' ? 'bg-green-900 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
             {state.paused ? 'PAUSED' : `GAME ${state.currentGameIdx} • ${state.status}`}
           </div>
           {state.status === 'RUNNING' && !state.paused && ((currentStep || state.phase === 'SWAP') ? (
             <div className={`text-xl font-black flex gap-2 ${state.phase === 'SWAP' ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
               {state.phase === 'SWAP' ? <><span>SWAP PHASE</span><span className="text-slate-600">|</span><span>{timeLeft}s</span></> : <><span className={currentStep ? (currentStep.side === 'BLUE' ? 'text-blue-400' : 'text-red-400') : 'text-white'}>{currentStep ? `${currentStep.side} ${currentStep.type}` : ''}</span><span className="text-slate-600">|</span><span>{timeLeft}s</span></>}
             </div>
           ) : null)}
        </div>
        <div className="flex items-center gap-4">
           {isReferee && (
             <div className="flex bg-slate-800 rounded p-1">
               {state.status === 'RUNNING' && !state.paused && <button onClick={() => send('ACTION_SUBMIT', { type: 'PAUSE_GAME', reason: 'Admin' })} className="p-2 hover:text-yellow-500"><Pause size={16}/></button>}
               {state.paused && <button onClick={() => send('ACTION_SUBMIT', { type: 'RESUME_GAME' })} className="p-2 hover:text-green-500"><PlayCircle size={16}/></button>}
               {state.status === 'NOT_STARTED' && bothSidesSet && (
                 <button onClick={() => send('ACTION_SUBMIT', { type: 'START_GAME' })} disabled={!state.blueReady || !state.redReady} className="p-2 hover:text-green-500 disabled:opacity-30"><Play size={16}/></button>
               )}
               <button onClick={() => send('ACTION_SUBMIT', { type: 'RESET_GAME' })} className="p-2 hover:text-white"><RotateCcw size={16}/></button>
             </div>
           )}
           <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400">
             {userRole === 'TEAM_A' ? state.teamA.name : userRole === 'TEAM_B' ? state.teamB.name : userRole}
           </div>
           {/* FIX: Added Exit Button */}
           <button onClick={handleExitRoom} className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full font-bold transition-all" title="Exit Room">
             <LogOut size={14} /> Exit
           </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <TeamPanel 
          side="BLUE" bans={state.blueBans} picks={state.bluePicks} active={state.status === 'RUNNING' && currentStep?.side === 'BLUE'} 
          teamName={blueData ? blueData.name : 'TBD'} teamWins={blueData ? blueData.wins : 0} status={state.status} isReady={state.blueReady}
          canControl={isBlueUser} onToggleReady={canInteract || (bothSidesSet && isBlueUser) ? () => send('TOGGLE_READY', { side: 'BLUE' }) : undefined}
          swapSelection={swapSelection} onSwapClick={handleSwap} phase={state.phase}
        />
        <div className="flex-1 flex flex-col bg-slate-950 relative">
          {state.status === 'NOT_STARTED' && !bothSidesSet && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
               <h2 className="text-4xl font-black text-white italic mb-8">SIDE SELECTION</h2>
               <div className="text-slate-400 mb-8 text-xl">
                 {state.nextSideSelector === 'REFEREE' ? 'Referee is setting initial sides' : `${getTeamData(state.nextSideSelector)?.name} is choosing side`}
               </div>
               {(isReferee || userRole === state.nextSideSelector) && (
                 <div className="flex flex-col items-center gap-6">
                   <div className="text-2xl font-bold text-blue-400">这一局的蓝色方是：</div>
                   <div className="flex gap-16">
                     <button onClick={() => handleSideSelection('BLUE')} className="group flex flex-col items-center gap-4">
                        <div className="w-64 h-40 bg-slate-900 border-4 border-slate-700 hover:border-blue-500 hover:bg-blue-900/20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-2xl">
                          <span className="text-3xl font-black text-white uppercase">{state.teamA.name}</span>
                          <span className="text-xs text-slate-500 font-bold tracking-widest">TEAM A</span>
                        </div>
                     </button>
                     <button onClick={() => handleSideSelection('RED')} className="group flex flex-col items-center gap-4">
                        <div className="w-64 h-40 bg-slate-900 border-4 border-slate-700 hover:border-blue-500 hover:bg-blue-900/20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-2xl">
                          <span className="text-3xl font-black text-white uppercase">{state.teamB.name}</span>
                          <span className="text-xs text-slate-500 font-bold tracking-widest">TEAM B</span>
                        </div>
                     </button>
                   </div>
                 </div>
               )}
            </div>
          )}
          {state.status === 'RUNNING' && state.phase === 'DRAFT' && (
             <>
               <div className="h-14 border-b border-slate-800 flex items-center px-4 gap-4">
                 <input type="text" placeholder="Search..." className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-white w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 <div className="flex gap-1">{['ALL','TOP','JG','MID','BOT','SUP'].map(r => <button key={r} onClick={() => setRoleFilter(r)} className={`px-2 py-1 rounded text-[10px] font-bold ${roleFilter===r ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>{r}</button>)}</div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 grid grid-cols-6 gap-2 content-start">
                 {filteredHeroes.map(h => {
                   const used = usedHeroes.has(h.id);
                   const isFearlessBanned = fearlessBannedHeroes.has(h.id); // Assuming this variable exists from previous logic, adding it if not present
                   const status = h.id.startsWith('special') ? (currentStep?.type === 'BAN' && h.id === SPECIAL_ID_NONE ? 'AVAILABLE' : currentStep?.type === 'PICK' && h.id === SPECIAL_ID_RANDOM ? 'AVAILABLE' : 'DISABLED') : used ? 'DISABLED' : 'AVAILABLE';
                   return <HeroCard key={h.id} hero={h} status={status} isHovered={hoveredHeroId === h.id} onClick={() => { if(canInteract) setHoveredHeroId(h.id); }} isFearlessBanned={isFearlessBanned} />;
                 })}
               </div>
               <div className="h-20 border-t border-slate-800 flex items-center justify-center gap-4">
                 {getHero(hoveredHeroId) && <div className="text-white font-bold">{getHero(hoveredHeroId)?.name}</div>}
                 <button onClick={handleLock} disabled={!hoveredHeroId || !canInteract} className="bg-yellow-600 disabled:opacity-50 text-white px-8 py-2 rounded font-bold">LOCK IN</button>
               </div>
             </>
          )}
          {state.phase === 'SWAP' && state.status === 'RUNNING' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90">
               <h2 className="text-4xl font-black text-white italic mb-4">SWAP PHASE</h2>
               {canInteract && <button onClick={() => send('ACTION_SUBMIT', { type: 'FINISH_SWAP' })} className="bg-green-600 text-white px-8 py-3 rounded font-bold flex items-center gap-2"><Check /> CONFIRM SWAPS</button>}
            </div>
          )}
          {state.status === 'FINISHED' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 overflow-y-auto p-8">
               <h2 className="text-4xl font-black text-yellow-500 italic mb-8">GAME COMPLETED</h2>
               {isReferee && !state.seriesHistory?.some(g => g.gameIdx === state.currentGameIdx) ? (
                 <div className="text-center mb-10">
                   <p className="text-slate-400 mb-4">Select the winner of Game {state.currentGameIdx}</p>
                   <div className="flex gap-8 justify-center">
                     <button onClick={() => handleReportResult('TEAM_A')} className="w-48 h-32 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-yellow-500 rounded-xl flex flex-col items-center justify-center gap-2"><span className="text-2xl font-bold text-white">{state.teamA.name}</span><span className="text-xs text-green-400">WINNER</span></button>
                     <button onClick={() => handleReportResult('TEAM_B')} className="w-48 h-32 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-yellow-500 rounded-xl flex flex-col items-center justify-center gap-2"><span className="text-2xl font-bold text-white">{state.teamB.name}</span><span className="text-xs text-green-400">WINNER</span></button>
                   </div>
                 </div>
               ) : null}
               {state.seriesHistory && state.seriesHistory.length > 0 && (
                 <div className="w-full max-w-4xl">
                    <h3 className="text-white text-xl font-bold mb-4 text-center border-b border-slate-700 pb-2">SERIES HISTORY</h3>
                    {state.seriesHistory.map((game) => <GameHistoryCard key={game.gameIdx} game={game} state={state} />)}
                 </div>
               )}
            </div>
          )}
        </div>
        <TeamPanel 
          side="RED" bans={state.redBans} picks={state.redPicks} active={state.status === 'RUNNING' && currentStep?.side === 'RED'} 
          teamName={redData ? redData.name : 'TBD'} teamWins={redData ? redData.wins : 0} status={state.status} isReady={state.redReady}
          canControl={isRedUser} onToggleReady={canInteract || (bothSidesSet && isRedUser) ? () => send('TOGGLE_READY', { side: 'RED' }) : undefined}
          swapSelection={swapSelection} onSwapClick={handleSwap} phase={state.phase}
        />
      </main>
    </div>
  );
}