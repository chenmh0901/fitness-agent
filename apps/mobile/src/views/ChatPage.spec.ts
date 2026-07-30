import { flushPromises, mount } from '@vue/test-utils';
import { sendAgentMessage } from '@/api/agent.api';
import ChatPage from './ChatPage.vue';

vi.mock('@/api/agent.api', () => ({
  sendAgentMessage: vi.fn(),
}));

const sendAgentMessageMock = vi.mocked(sendAgentMessage);

describe('ChatPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    sendAgentMessageMock.mockReset();
  });

  it('sends the original natural-language message and renders the reply', async () => {
    sendAgentMessageMock.mockResolvedValue({
      answer: '已记录今天的晨起体重为90.5kg。',
    });
    const wrapper = mount(ChatPage);
    const input = wrapper.get('textarea');

    await input.setValue('今天早上90.5kg');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sendAgentMessageMock).toHaveBeenCalledWith('今天早上90.5kg');
    expect(wrapper.text()).toContain('今天早上90.5kg');
    expect(wrapper.text()).toContain('已记录今天的晨起体重为90.5kg。');
  });

  it('does not send an empty or whitespace-only message', async () => {
    const wrapper = mount(ChatPage);
    const input = wrapper.get('textarea');

    await input.setValue('   ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sendAgentMessageMock).not.toHaveBeenCalled();
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('shows a safe error and retries the failed message', async () => {
    sendAgentMessageMock
      .mockRejectedValueOnce(new Error('OpenAIAIProvider internal stack'))
      .mockResolvedValueOnce({ answer: '重试成功。' });
    const wrapper = mount(ChatPage);

    await wrapper.get('textarea').setValue('今天练什么');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('操作失败，请稍后重试。');
    expect(wrapper.text()).not.toContain('OpenAIAIProvider');

    const retryButton = wrapper.findAll('button').find((button) => button.text().trim() === '重试');
    await retryButton?.trigger('click');
    await flushPromises();

    expect(sendAgentMessageMock).toHaveBeenCalledTimes(2);
    expect(sendAgentMessageMock).toHaveBeenLastCalledWith('今天练什么');
    expect(wrapper.text()).toContain('重试成功。');
  });
});
