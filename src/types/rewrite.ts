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

export interface RewriteResult {
  publicId: string;
  url: string;
  htmlRewritten: string;
  htmlPreview: string;
  htmlOriginal: string;
  htmlOriginalPreview?: string;
  segmentCount: number;
  rewrittenCount: number;
  sellingScore?: { before: SellingScore; after: SellingScore } | null;
}

export interface RewriteJob {
  url: string;
  persona: Persona;
}
