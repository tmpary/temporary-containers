import { TemporaryContainers } from './tmp';
import { Isolation } from './isolation';
import { delay } from './lib';
import { Utils } from './utils';
import {
  PreferencesSchema,
  IsolationAction,
  Tab,
  Debug,
  ClickType,
  ClickMessage,
  WebRequestOnBeforeRequestDetails,
} from '~/types';

export class MouseClick {
  public isolated: {
    [key: string]: {
      clickType: ClickType;
      tab: Tab;
      count: number;
      abortController: AbortController;
    };
  } = {};

  private background: TemporaryContainers;
  private debug: Debug;
  private pref!: PreferencesSchema;
  private utils!: Utils;
  private isolation!: Isolation;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
    this.isolated = {};
  }

  initialize(): void {
    this.pref = this.background.pref;
    this.utils = this.background.utils;
    this.isolation = this.background.isolation;
  }

  linkClicked(
    message: ClickMessage,
    sender: browser.runtime.MessageSender
  ): void {
    let clickType: ClickType | false = false;
    const url = message.href;
    if (message.event.button === 1) {
      clickType = 'middle';
    } else if (
      message.event.button === 0 &&
      !message.event.ctrlKey &&
      !message.event.metaKey
    ) {
      clickType = 'left';
    } else if (
      message.event.button === 0 &&
      (message.event.ctrlKey || message.event.metaKey)
    ) {
      clickType = 'ctrlleft';
    }

    if (!clickType || !sender.tab) {
      return;
    }

    if (!this.checkClick(clickType, message, sender)) {
      return;
    }

    if (this.isolated[url]) {
      this.debug('[linkClicked] aborting isolated cleanup', url);
      this.isolated[url].abortController.abort();
    }

    const abortController = new AbortController();
    if (!this.isolated[url]) {
      this.isolated[url] = {
        clickType,
        tab: sender.tab as Tab,
        abortController,
        count: 0,
      };
    }
    this.isolated[url].count++;

    delay(1500, { signal: abortController.signal })
      .then(() => {
        this.debug('[linkClicked] cleaning up isolated', url);
        delete this.isolated[url];
      })
      .catch(this.debug);
  }

  public checkClickPreferences = (
    preferences: { action: IsolationAction },
    parsedClickedURL: { hostname: string },
    parsedSenderTabURL: { hostname: string }
  ): boolean => {
    if (preferences.action === 'always') {
      this.debug(
        '[checkClick] click handled based on preference "always"',
        preferences
      );
      return true;
    }

    if (preferences.action === 'never') {
      this.debug(
        '[checkClickPreferences] click not handled based on preference "never"',
        preferences,
        parsedClickedURL,
        parsedSenderTabURL
      );
      return false;
    }

    if (preferences.action === 'notsamedomainexact') {
      if (parsedSenderTabURL.hostname !== parsedClickedURL.hostname) {
        this.debug(
          '[checkClickPreferences] click handled based on preference "notsamedomainexact"',
          preferences,
          parsedClickedURL,
          parsedSenderTabURL
        );
        return true;
      } else {
        this.debug(
          '[checkClickPreferences] click not handled based on preference "notsamedomainexact"',
          preferences,
          parsedClickedURL,
          parsedSenderTabURL
        );
        return false;
      }
    }

    if (preferences.action === 'notsamedomain') {
      if (
        this.utils.sameDomain(
          parsedSenderTabURL.hostname,
          parsedClickedURL.hostname
        )
      ) {
        this.debug(
          '[checkClickPreferences] click not handled from preference "notsamedomain"',
          parsedClickedURL,
          parsedSenderTabURL
        );
        return false;
      } else {
        this.debug(
          '[checkClickPreferences] click handled from preference "notsamedomain"',
          parsedClickedURL,
          parsedSenderTabURL
        );
        return true;
      }
    }

    this.debug('[checkClickPreferences] this should never happen');
    return false;
  };

  checkClick(
    type: ClickType,
    message: ClickMessage,
    sender: browser.runtime.MessageSender
  ): boolean {
    const tab = sender.tab as Tab;
    const parsedSenderTabURL = new URL(tab.url);
    const parsedClickedURL = new URL(message.href);
    this.debug('[checkClick] checking click', type, message, sender);

    for (const domainPatternPreferences of this.pref.isolation.domain) {
      const domainPattern = domainPatternPreferences.targetPattern;
      if (!this.utils.matchDomainPattern(tab.url, domainPattern)) {
        continue;
      }
      if (!domainPatternPreferences.mouseClick[type]) {
        continue;
      }
      const preferences = domainPatternPreferences.mouseClick[type];
      this.debug('[checkClick] per website pattern found');
      if (preferences.action === 'global') {
        this.debug('[checkClick] breaking because "global"');
        break;
      }
      return this.checkClickPreferences(
        preferences,
        parsedClickedURL,
        parsedSenderTabURL
      );
    }
    this.debug(
      '[checkClick] no website pattern found, checking global preferences'
    );
    return this.checkClickPreferences(
      this.pref.isolation.global.mouseClick[type],
      parsedClickedURL,
      parsedSenderTabURL
    );
  }

  beforeHandleRequest(request: WebRequestOnBeforeRequestDetails): void {
    if (!this.isolated[request.url]) {
      return;
    }
    this.debug(
      '[beforeHandleRequest] aborting isolated mouseclick cleanup',
      request.url
    );
    this.isolated[request.url].abortController.abort();
  }

  afterHandleRequest(request: WebRequestOnBeforeRequestDetails): void {
    if (!this.isolated[request.url]) {
      return;
    }
    this.isolated[request.url].abortController = new AbortController();
    delay(1500, { signal: this.isolated[request.url].abortController.signal })
      .then(() => {
        this.debug('[beforeHandleRequest] cleaning up isolated', request.url);
        delete this.isolated[request.url];
      })
      .catch(this.debug);
  }
}
