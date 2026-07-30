import { flushPromises, mount } from '@vue/test-utils';
import { sendAgentMessage } from '@/api/agent.api';
import { getTodayFitnessSummary } from '@/api/daily-fitness.api';
import { createDailyFitnessSummary } from '@/test/daily-fitness.fixture';
import TodayPage from './TodayPage.vue';

vi.mock('@/api/daily-fitness.api', () => ({
  getTodayFitnessSummary: vi.fn(),
}));

vi.mock('@/api/agent.api', () => ({
  sendAgentMessage: vi.fn(),
}));

const getTodayFitnessSummaryMock = vi.mocked(getTodayFitnessSummary);
const sendAgentMessageMock = vi.mocked(sendAgentMessage);

describe('TodayPage', () => {
  beforeEach(() => {
    getTodayFitnessSummaryMock.mockReset();
    sendAgentMessageMock.mockReset();
  });

  it('loads and displays the current fitness summary', async () => {
    getTodayFitnessSummaryMock.mockResolvedValue(createDailyFitnessSummary());

    const wrapper = mount(TodayPage);
    await flushPromises();

    expect(wrapper.text()).toContain('2026年7月30日');
    expect(wrapper.text()).toContain('当前目标：减脂');
    expect(wrapper.text()).toContain('90.5 kg');
    expect(wrapper.text()).toContain('7小时');
    expect(wrapper.text()).toContain('barbell bench press');
    expect(wrapper.text()).toContain('4 组 × 8 次');
    expect(getTodayFitnessSummaryMock).toHaveBeenCalledTimes(1);
    expect(sendAgentMessageMock).not.toHaveBeenCalled();
  });

  it('shows explicit empty states without calculating fallback values', async () => {
    const summary = createDailyFitnessSummary();
    summary.weightSummary = {
      days: 7,
      recordCount: 0,
      averageWeight: null,
      firstWeight: null,
      latestWeight: null,
      minWeight: null,
      maxWeight: null,
      weightRange: null,
      volatility: null,
      weeklyAverageChange: null,
      change: null,
      trend: 'insufficient_data',
    };
    summary.sleepSummary = {
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: 'no_data',
    };
    summary.todayWorkout = null;
    getTodayFitnessSummaryMock.mockResolvedValue(summary);

    const wrapper = mount(TodayPage);
    await flushPromises();

    expect(wrapper.text()).toContain('暂无晨起体重数据');
    expect(wrapper.text()).toContain('暂无睡眠数据');
    expect(wrapper.text()).toContain('今天没有安排训练。');
  });

  it('shows a safe API failure state and retries on demand', async () => {
    getTodayFitnessSummaryMock
      .mockRejectedValueOnce(new Error('internal provider stack'))
      .mockResolvedValueOnce(createDailyFitnessSummary());

    const wrapper = mount(TodayPage);
    await flushPromises();

    expect(wrapper.text()).toContain('今日状态加载失败');
    expect(wrapper.text()).toContain('操作失败，请稍后重试。');
    expect(wrapper.text()).not.toContain('provider stack');

    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('点击重试'));
    expect(retryButton).toBeDefined();
    await retryButton?.trigger('click');
    await flushPromises();

    expect(getTodayFitnessSummaryMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('当前目标：减脂');
  });

  it('generates the daily suggestion only after an explicit button click', async () => {
    getTodayFitnessSummaryMock.mockResolvedValue(createDailyFitnessSummary());
    sendAgentMessageMock.mockResolvedValue({
      answer: '今天保持计划热量，并按计划完成卧推训练。',
    });
    const wrapper = mount(TodayPage);
    await flushPromises();

    expect(sendAgentMessageMock).not.toHaveBeenCalled();
    const suggestionButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('生成今日建议'));
    await suggestionButton?.trigger('click');
    await flushPromises();

    expect(sendAgentMessageMock).toHaveBeenCalledTimes(1);
    expect(sendAgentMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('只针对今天提出建议，不修改长期计划'),
    );
    expect(wrapper.text()).toContain('今天保持计划热量');
  });
});
