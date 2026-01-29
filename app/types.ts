export type Note = {
  id: string;
  name: string;
  modifiedTime: string;
};

export type OpenNote = {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
};

export type MasterConfig = {
  pinned: string[];
  archived: string[];
  categories: Record<string, string[]>;
};
