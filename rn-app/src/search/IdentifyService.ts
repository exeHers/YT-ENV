export type IdentifyResult = {
  track: string;
  artist: string;
  confidence: number;
};

/**
 * Placeholder hook for ACRCloud/open fingerprint API integration.
 * Wire external mic-capture and API key flow later.
 */
export async function identifyExternalAudio(): Promise<IdentifyResult> {
  await new Promise(resolve => setTimeout(resolve, 700));
  return {
    track: 'Unknown Frequency',
    artist: 'DNVN',
    confidence: 0.82,
  };
}
