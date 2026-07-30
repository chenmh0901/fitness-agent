import { config } from '@vue/test-utils';

const passthroughStub = {
  template: '<div><slot /></div>',
};

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
  IonApp: passthroughStub,
  IonContent: passthroughStub,
  IonFooter: passthroughStub,
  IonHeader: passthroughStub,
  IonPage: passthroughStub,
  IonRouterOutlet: passthroughStub,
  IonSpinner: {
    template: '<span aria-label="加载中"></span>',
  },
  IonTitle: passthroughStub,
  IonToolbar: passthroughStub,
};

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});
