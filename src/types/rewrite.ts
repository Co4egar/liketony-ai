import { Persona } from "@/data/personas";

export interface RewriteResult {
  publicId: string;
  url: string;
  htmlRewritten: string;
  htmlPreview: string;
  htmlOriginal: string;
  segmentCount: number;
  rewrittenCount: number;
}

export interface RewriteJob {
  url: string;
  persona: Persona;
}
