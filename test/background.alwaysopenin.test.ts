import {
  preferencesTestSet,
  loadBackground,
  Background,
  expect,
} from './setup';

preferencesTestSet.map((preferences) => {
  describe(`preferences: ${JSON.stringify(preferences)}`, () => {
    let bg: Background;
    describe('Always Open In', () => {
      beforeEach(async () => {
        bg = await loadBackground({ preferences });
        bg.tmp.storage.local.preferences.isolation.domain = [
          {
            ...bg.tmp.storage.local.preferences.isolation.global,
            targetPattern: 'example.com',
            always: {
              action: 'enabled',
              allowedInPermanent: false,
              allowedInTemporary: false,
            },
          },
          {
            ...bg.tmp.storage.local.preferences.isolation.global,
            targetPattern: '*.notexample.com',
            always: {
              action: 'enabled',
              allowedInPermanent: false,
              allowedInTemporary: false,
            },
          },
        ];
      });

      it('should open in a new temporary container', async () => {
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:newtab',
          url: 'https://example.com',
          originContainer: 'firefox-default',
        });
        bg.browser.tabs.create.should.have.been.calledOnce;
      });

      it('should open in a new temporary container even when about:blank', async () => {
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:blank',
          url: 'https://example.com',
          originContainer: 'firefox-default',
        });
        bg.browser.tabs.create.should.have.been.calledOnce;
      });

      it('should not open in a new temporary container if its a clean tmp tab', async () => {
        await bg.helper.openNewTmpTab({
          createsTabId: 2,
          createsContainer: 'firefox-tmp1',
        });
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:newtab',
          url: 'https://example.com',
          originContainer: 'firefox-tmp1',
        });

        bg.browser.tabs.create.should.not.have.been.called;
      });

      it('should not open in a new temporary container if its allowed in permanent container', async () => {
        bg.tmp.storage.local.preferences.isolation.domain = [
          {
            ...bg.tmp.storage.local.preferences.isolation.global,
            targetPattern: 'example.com',
            always: {
              action: 'enabled',
              allowedInPermanent: true,
              allowedInTemporary: false,
            },
          },
        ];
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:newtab',
          url: 'https://example.com',
          originContainer: 'firefox-container-1',
        });

        bg.browser.tabs.create.should.not.have.been.called;
      });

      it('should not open in a new temporary container if the tab url belonging to the request matches the pattern', async () => {
        await bg.helper.openNewTmpTab({
          createsTabId: 2,
          createsContainer: 'firefox-tmp1',
        });
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:newtab',
          url: 'https://example.com',
          originContainer: 'firefox-tmp1',
          resetHistory: true,
        });

        await bg.helper.request({
          tabId: 2,
          url: 'https://example.com',
          originContainer: 'firefox-tmp1',
        });
        bg.browser.tabs.create.should.not.have.been.called;
      });

      it('should not open in a new temporary container if the tab url belonging to the request matches the wildcard pattern', async () => {
        await bg.helper.openNewTmpTab({
          createsTabId: 2,
          createsContainer: 'firefox-tmp1',
        });
        await bg.helper.request({
          tabId: 2,
          tabUrl: 'about:newtab',
          url: 'https://foo.notexample.com',
          originContainer: 'firefox-tmp1',
          resetHistory: true,
        });

        await bg.helper.request({
          tabId: 2,
          tabUrl: 'https://foo.notexample.com',
          url: 'https://foo.notexample.com',
          originContainer: 'firefox-tmp1',
        });

        await bg.helper.request({
          tabId: 2,
          url: 'https://bar.example.com',
          originContainer: 'firefox-tmp1',
        });
        bg.browser.tabs.create.should.not.have.been.called;
      });

      it('should open in a new temporary container if the tab url belonging to the request doesnt match the pattern', async () => {
        await bg.helper.openNewTmpTab({
          createsTabId: 2,
          createsContainer: 'firefox-tmp1',
        });
        await bg.helper.request({
          requestId: 1,
          tabId: 2,
          url: 'http://notexample.com',
          originContainer: 'firefox-tmp1',
          resetHistory: true,
        });

        const result = await bg.helper.request({
          requestId: 2,
          tabId: 2,
          tabUrl: 'http://notexample.com',
          url: 'http://example.com',
          originContainer: 'firefox-tmp1',
          createsTabId: 3,
          createsContainer: 'firefox-tmp2',
        });
        expect(result).to.deep.equal({ cancel: true });
        bg.browser.tabs.create.should.have.been.calledOnce;

        const result2 = await bg.helper.request({
          requestId: 3,
          tabId: 3,
          tabUrl: 'about:blank',
          url: 'http://example.com',
          originContainer: 'firefox-tmp2',
          resetHistory: true,
        });
        const result3 = await bg.helper.request({
          requestId: 3,
          tabId: 3,
          tabUrl: 'about:blank',
          url: 'https://example.com',
          originContainer: 'firefox-tmp2',
        });
        bg.browser.tabs.create.should.not.have.been.called;
        expect(result2).to.be.undefined;
        expect(result3).to.be.undefined;
      });
    });
  });
});
