export enum CoachRecommendationType {
  TRAINING = 'TRAINING',
  NUTRITION = 'NUTRITION',
  RECOVERY = 'RECOVERY',
  GOAL = 'GOAL',
}

export class CoachRecommendationDto {
  type: CoachRecommendationType;
  action: string;
  reason: string;
}
