import { TemporaryContainers } from './background/tmp';

window.tmp = new TemporaryContainers();
window.tmp
  .initialize()
  .then((tmp) => {
    if (tmp.storage.installed) {
      tmp.debug('[bg] fresh install, showing options');
      browser.tabs.create({
        url: browser.runtime.getURL('options.html?installed'),
      });
    }
  })
  .catch((error) => {
    browser.browserAction.onClicked.addListener(() => {
      browser.tabs.create({
        url: browser.runtime.getURL(`
          options.html?error=${encodeURIComponent(error?.toString())}
        `),
      });
    });
    browser.browserAction.setPopup({
      popup: null,
    });
    browser.browserAction.setTitle({ title: 'Temporary Containers Error' });
    browser.browserAction.setBadgeBackgroundColor({
      color: 'red',
    });
    browser.browserAction.setBadgeText({
      text: 'E',
    });
    browser.browserAction.enable();

    window.tmp?.eventlisteners?.remove();
    throw error;
  });
