/** Datasets and engine runs, computed once per page load from fixed seeds. */
import { generateAmlDataset, SCENARIOS } from './aml/generate';
import { runDetection } from '../engine/aml/alerts';
import { generateReconDataset } from './recon/generate';
import { generatePipelineDataset } from './pipeline/generate';

let amlCache: { ds: ReturnType<typeof generateAmlDataset>; alerts: ReturnType<typeof runDetection> } | null = null;
export function aml() {
  if (!amlCache) {
    const ds = generateAmlDataset();
    amlCache = { ds, alerts: runDetection(ds) };
  }
  return amlCache;
}

let reconCache: ReturnType<typeof generateReconDataset> | null = null;
export const recon = () => (reconCache ??= generateReconDataset());

let pipeCache: ReturnType<typeof generatePipelineDataset> | null = null;
export const pipeline = () => (pipeCache ??= generatePipelineDataset());

export const scenarioFor = (customerId: string) => SCENARIOS.find((s) => s.customerId === customerId) ?? null;
