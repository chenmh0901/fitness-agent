import { CoachInsightSeverity, CoachInsightType } from '../../../generated/prisma/client';

export type CoachInsightMetadata = Record<string, string | number | boolean | null>;

export class CoachInsightDto {
  type: CoachInsightType;
  severity: CoachInsightSeverity;
  content: string;
  metadata: CoachInsightMetadata;
}
