export type JournalTag = 'tadabbur' | 'milestone' | 'struggle' | 'breakthrough';

export type JournalEntry = {
  id: string;
  surahNumber: number | null;
  ayahNumber: number | null;
  content: string;
  tag: JournalTag;
  pinned: boolean;
  createdAt: string;
};

export type VocabWord = {
  id: string;
  word: string;
  root: string;
  meaning: string;
  foundIn: string;
  createdAt: string;
};

export type MilestoneType = 'auto' | 'manual';

export type JournalMilestone = {
  id: string;
  text: string;
  emoji: string;
  type: MilestoneType;
  createdAt: string;
};

export type MonthlyTask = {
  id: string;
  month: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type SurahStatus = 'memorized' | 'in_progress' | 'weak' | 'not_started';

export type SurahProgress = {
  id: string;
  surahNumber: number;
  status: SurahStatus;
  confidence: string | null;
  lastReviewed: string | null;
  notes: string;
  createdAt: string;
};

export type WeeklyIntention = {
  id: string;
  week: string;
  text: string;
  done: boolean;
  createdAt: string;
};

export type Profile = {
  fullName: string | null;
  dailyGoalPages: number | null;
};
