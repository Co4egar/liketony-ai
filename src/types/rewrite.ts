import { Persona } from "@/data/personas";

export interface SellingScoreAxis {
  score: number; // 0..20
  note: string;
}

export interface SellingScore {
  total: number; // 0..100
  axes: {
    clarity: SellingScoreAxis;
    specificity: SellingScoreAxis;
    outcome: SellingScoreAxis;
    cta: SellingScoreAxis;
    voice: SellingScoreAxis;
  };
}

export interface PredictedOptimization {
  min: number;      // conservative lower bound, 0..100
  expected: number; // realistic expected, 0..100
  reasoning: string;
}

export interface SellingScoreBundle {
  before: SellingScore;
  after: SellingScore;
  predictedOptimized?: PredictedOptimization | null;
}

export interface RewriteResult {
  publicId: string;
  url: string;
  htmlRewritten: string;
  htmlPreview: string;
  htmlOriginal: string;
  htmlOriginalPreview?: string;
  segmentCount: number;
  rewrittenCount: number;
  sellingScore?: SellingScoreBundle | null;
}

export interface RewriteJob {
  url: string;
  persona: Persona;
}
