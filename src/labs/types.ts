export type LabId = 'osi' | 'crc' | 'hamming' | 'arq' | 'mac' | 'tcp-congestion';

export interface LabStep {
  title: string;
  badge?: string;
  detail: string[];
  table?: { columns: string[]; rows: string[][] };
}

export interface LabDefinition {
  id: LabId;
  title: string;
  summary: string;
  topic: string;
}

export function stepCount(steps: LabStep[]): number {
  return steps.length;
}
