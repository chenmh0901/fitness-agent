import { TrainingPlanVersionController } from './training-plan-version.controller';
import { TrainingPlanVersionService } from './training-plan-version.service';

describe('TrainingPlanVersionController', () => {
  const getActiveVersion = jest.fn();
  const getVersionHistory = jest.fn();
  const controller = new TrainingPlanVersionController({
    getActiveVersion,
    getVersionHistory,
  } as unknown as TrainingPlanVersionService);

  beforeEach(() => {
    getActiveVersion.mockReset();
    getVersionHistory.mockReset();
  });

  it('returns the current active plan version', async () => {
    const currentVersion = {
      id: 'version-2',
      versionNumber: 2,
    };
    getActiveVersion.mockResolvedValue(currentVersion);

    await expect(controller.getCurrentPlan()).resolves.toBe(currentVersion);
    expect(getActiveVersion).toHaveBeenCalledTimes(1);
  });

  it('returns plan version history', async () => {
    const history = [
      { id: 'version-2', versionNumber: 2 },
      { id: 'version-1', versionNumber: 1 },
    ];
    getVersionHistory.mockResolvedValue(history);

    await expect(controller.getPlanHistory()).resolves.toBe(history);
    expect(getVersionHistory).toHaveBeenCalledTimes(1);
  });
});
