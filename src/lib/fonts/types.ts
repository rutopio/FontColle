export interface FontAxis {
  tag: string;
  name: string | null;
  min: number | null;
  default: number | null;
  max: number | null;
}

export interface FontInstance {
  name: string | null;
  coords: Record<string, number>;
}

export interface FontRecord {
  id: string;
  name: string;
  designer: string | null;
  class: string;
  category: string | null;
  license: string | null;
  isVariable: boolean;
  subsets: string[];
  axes: FontAxis[];
  instances: FontInstance[];
  features: string[];
  facets: string[];
  // Archival metadata (may be null for older/edge fonts).
  version: number | null;
  versionString: string | null;
  dateAdded: string | null;
  weightClass: number | null;
  widthClass: number | null;
  weights: number[];
  glyphCount: number | null;
  charCount: number | null;
  primaryScript: string | null;
}
