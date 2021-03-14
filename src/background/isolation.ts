import { TemporaryContainers } from './tmp';
import { Container } from './container';
import { MultiAccountContainers } from './mac';
import { Management } from './management';
import { MouseClick } from './mouseclick';
import { Request } from './request';
import { BrowserAction } from './browseraction';
import { PageAction } from './pageaction';
import { Storage } from './storage';
import { Utils } from './utils';
import {
  Debug,
  IsolationAction,
  MacAssignment,
  PreferencesSchema,
  Tab,
  WebRequestOnBeforeRequestDetails,
} from '~/types';

export class Isolation {
  private background: TemporaryContainers;
  private debug: Debug;
  private pref!: PreferencesSchema;
  private container!: Container;
  private request!: Request;
  private mouseclick!: MouseClick;
  private mac!: MultiAccountContainers;
  private management!: Management;
  private utils!: Utils;
  private browseraction!: BrowserAction;
  private pageaction!: PageAction;
  private storage!: Storage;
  private reactivateInterval: number;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
    this.reactivateInterval = 0;
  }

  initialize(): void {
    this.pref = this.background.pref;
    this.container = this.background.container;
    this.request = this.background.request;
    this.mouseclick = this.background.mouseclick;
    this.mac = this.background.mac;
    this.management = this.background.management;
    this.utils = this.background.utils;
    this.browseraction = this.background.browseraction;
    this.pageaction = this.background.pageaction;
    this.storage = this.background.storage;
    this.debug(
      '[initialize] isolation initialized',
      this.storage.local.isolation
    );
    if (this.storage.local.isolation.reactivateTargetTime) {
      this.setActiveState(
        this.storage.local.isolation.reactivateTargetTime < new Date().getTime()
      );
    }
  }

  async maybeIsolate({
    tab,
    request,
    openerTab,
    macAssignment,
  }: {
    tab?: Tab;
    request: WebRequestOnBeforeRequestDetails;
    openerTab?: Tab;
    macAssignment?: MacAssignment;
  }): Promise<boolean | { cancel: true }> {
    if (!this.getActiveState()) {
      this.debug('[maybeIsolate] isolation is disabled');
      return false;
    }
    if (
      tab &&
      request &&
      request.originUrl &&
      this.mac.isConfirmPage(request.originUrl)
    ) {
      this.debug('[maybeIsolate] we are coming from a mac confirm page');
      this.mac.containerConfirmed[tab.id] = tab.cookieStoreId;
      return false;
    }

    if (
      this.mouseclick.isolated[request.url] &&
      tab &&
      tab.cookieStoreId !== `${this.background.containerPrefix}-default` &&
      this.container.urlCreatedContainer[request.url] === tab.cookieStoreId
    ) {
      this.debug(
        '[maybeIsolate] link click already created this container, we can stop here',
        request,
        tab
      );
      return false;
    }

    const isolate = await this.shouldIsolate({
      tab,
      request,
      openerTab,
      macAssignment,
    });
    if (!isolate) {
      this.debug('[maybeIsolate] decided to not isolate', tab, request);
      return false;
    }
    this.debug('[maybeIsolate] decided to isolate', tab, request);

    const excludedDomainPatterns = Object.keys(
      this.pref.isolation.global.excluded
    );
    if (excludedDomainPatterns.length) {
      const excluded = excludedDomainPatterns.find((excludedDomainPattern) => {
        return this.utils.matchDomainPattern(
          request.url,
          excludedDomainPattern
        );
      });
      if (excluded) {
        this.debug(
          '[maybeIsolate] request url matches global excluded domain pattern',
          request,
          excludedDomainPatterns
        );
        return false;
      }
    }

    if (
      tab &&
      this.container.isPermanent(tab.cookieStoreId) &&
      this.pref.isolation.global.excludedContainers[tab.cookieStoreId]
    ) {
      this.debug(
        '[maybeIsolate] container on global excluded containers list',
        tab
      );
      return false;
    }

    if (
      macAssignment &&
      tab &&
      this.mac.containerConfirmed[tab.id] &&
      tab.cookieStoreId === this.mac.containerConfirmed[tab.id]
    ) {
      this.debug(
        '[maybeIsolate] mac confirmed container, not isolating',
        this.mac.containerConfirmed,
        macAssignment
      );
      return false;
    }

    this.debug('[maybeIsolate] isolating', tab, request);
    if (this.request.cancelRequest(request)) {
      this.debug('[maybeIsolate] canceling request');
      return { cancel: true };
    }

    if (
      macAssignment &&
      (!tab || (tab && tab.cookieStoreId !== macAssignment.cookieStoreId))
    ) {
      this.debug(
        '[maybeIsolate] decided to reopen but mac assigned, maybe reopen confirmpage',
        request,
        tab,
        macAssignment
      );
      this.mac.maybeReopenConfirmPage(macAssignment, request, tab, true);
      return false;
    }

    const params = {
      tab,
      url: request.url,
      request,
      deletesHistory:
        this.pref.deletesHistory.containerIsolation === 'automatic',
    };

    let reload = false;
    if (typeof isolate === 'object') {
      if (isolate.deletesHistory) {
        params.deletesHistory = true;
      }

      if (isolate.reload) {
        reload = true;
      }
    }

    if (
      tab &&
      (reload ||
        tab.url === 'about:home' ||
        tab.url === 'about:newtab' ||
        tab.url === 'about:blank' ||
        this.pref.replaceTabs)
    ) {
      await this.container.reloadTabInTempContainer(params);
    } else {
      await this.container.createTabInTempContainer(params);
    }
    return { cancel: true };
  }

  async shouldIsolate({
    tab,
    request,
    openerTab,
    macAssignment,
  }: {
    tab?: Tab;
    request: WebRequestOnBeforeRequestDetails;
    openerTab?: Tab;
    macAssignment?: MacAssignment;
  }): Promise<boolean | Record<string, unknown>> {
    this.debug('[shouldIsolate]', tab, request);

    // special-case TST group tabs #264
    if (
      openerTab &&
      this.management.addons.get('treestyletab@piro.sakura.ne.jp')?.enabled
    ) {
      try {
        const treeItem = await browser.runtime.sendMessage(
          'treestyletab@piro.sakura.ne.jp',
          {
            tab: openerTab.id,
            type: 'get-tree',
          }
        );
        if (treeItem && treeItem.states.includes('group-tab')) {
          this.debug(
            '[shouldIsolate] not isolating because originated from TST group tag',
            openerTab,
            tab,
            request
          );
          return false;
        }
      } catch (error) {
        this.debug('[shouldIsolate] failed contacting TST', error.toString());
      }
    }

    return (
      this.shouldIsolateMouseClick({ request, tab, openerTab }) ||
      this.shouldIsolateMac({ tab, macAssignment }) ||
      (await this.shouldIsolateNavigation({ request, tab, openerTab })) ||
      (await this.shouldIsolateAlways({ request, tab, openerTab }))
    );
  }

  shouldIsolateMouseClick({
    request,
    tab,
    openerTab,
  }: {
    tab?: Tab;
    request: WebRequestOnBeforeRequestDetails;
    openerTab?: Tab;
  }): boolean | Record<string, unknown> {
    if (!this.mouseclick.isolated[request.url]) {
      return false;
    }

    if (
      tab &&
      ![tab.id, tab.openerTabId].includes(
        this.mouseclick.isolated[request.url].tab.id
      )
    ) {
      this.debug(
        '[shouldIsolateMouseClick] not isolating mouse click because tab/openerTab id is different',
        request,
        tab,
        openerTab,
        this.mouseclick.isolated[request.url].tab
      );
      return false;
    }

    this.debug(
      '[beforeHandleRequest] decreasing isolated mouseclick count',
      this.mouseclick.isolated[request.url]
    );
    this.mouseclick.isolated[request.url].count--;

    if (this.mouseclick.isolated[request.url].count < 0) {
      this.debug(
        '[shouldIsolateMouseClick] not isolating and removing isolated mouseclick because its count is < 0',
        this.mouseclick.isolated[request.url]
      );
      this.mouseclick.isolated[request.url].abortController.abort();
      delete this.mouseclick.isolated[request.url];
      return false;
    }

    const isolate: { deletesHistory?: boolean; reload?: boolean } = {};
    const clickType = this.mouseclick.isolated[request.url].clickType;
    if (
      this.pref.isolation.global.mouseClick[clickType].container ===
      'deleteshistory'
    ) {
      isolate.deletesHistory = true;
    }

    if (
      tab &&
      clickType === 'left' &&
      this.mouseclick.isolated[request.url].tab.id !== tab.id
    ) {
      isolate.reload = true;
    }

    if (!this.mouseclick.isolated[request.url].count) {
      this.debug(
        '[shouldIsolateMouseClick] removing isolated mouseclick because its count is 0',
        this.mouseclick.isolated[request.url]
      );
      this.mouseclick.isolated[request.url].abortController.abort();
      delete this.mouseclick.isolated[request.url];
    }

    this.debug(
      '[shouldIsolateMouseClick] decided to isolate mouseclick',
      this.mouseclick.isolated[request.url]
    );

    return isolate;
  }

  async shouldIsolateNavigation({
    request,
    tab,
    openerTab,
  }: {
    tab?: Tab;
    request: WebRequestOnBeforeRequestDetails;
    openerTab?: Tab;
  }): Promise<boolean> {
    if (!tab || !tab.url) {
      this.debug(
        '[shouldIsolateNavigation] we cant proceed without tab url information',
        tab,
        request
      );
      return false;
    }

    if (
      (tab.url === 'about:blank' ||
        tab.url === 'about:newtab' ||
        tab.url === 'about:home') &&
      !openerTab
    ) {
      this.debug(
        '[shouldIsolateNavigation] not isolating because the tab url is blank/newtab/home and no openerTab'
      );
      return false;
    }

    if (
      openerTab &&
      tab.url === 'about:blank' &&
      this.container.isPermanent(tab.cookieStoreId) &&
      openerTab.cookieStoreId !== tab.cookieStoreId
    ) {
      this.debug(
        '[shouldIsolateNavigation] the tab loads a permanent container that is different from the openerTab, probaby explicitly selected in the context menu'
      );
      return false;
    }

    const url =
      this.request.lastSeenRequestUrl[request.requestId] &&
      this.request.lastSeenRequestUrl[request.requestId] !== tab.url
        ? this.request.lastSeenRequestUrl[request.requestId]
        : (tab.url === 'about:blank' &&
            openerTab &&
            openerTab.url.startsWith('http') &&
            openerTab.url) ||
          tab.url;
    const parsedURL =
      url.startsWith('about:') || url.startsWith('moz-extension:')
        ? url
        : new URL(url).hostname;
    const parsedRequestURL = new URL(request.url);

    for (const patternPreferences of this.pref.isolation.domain) {
      const targetDomainPattern = patternPreferences.targetPattern;
      const originDomainPattern = patternPreferences.originPattern;

      const originUrl =
        (tab.url === 'about:blank' &&
          openerTab &&
          openerTab.url.startsWith('http') &&
          openerTab.url) ||
        tab.url;

      const originUrlMatches = this.utils.matchDomainPattern(
        originUrl,
        originDomainPattern
      );
      const targetUrlMatches = this.utils.matchDomainPattern(
        request.url,
        targetDomainPattern
      );

      if (!targetUrlMatches || !originUrlMatches) {
        continue;
      }

      if (patternPreferences.excluded) {
        for (const excludedDomainPattern of Object.keys(
          patternPreferences.excluded
        )) {
          if (
            !this.utils.matchDomainPattern(request.url, excludedDomainPattern)
          ) {
            continue;
          }
          this.debug(
            '[shouldIsolateNavigation] not isolating because excluded domain pattern matches',
            request.url,
            excludedDomainPattern
          );
          return false;
        }
      }

      if (patternPreferences.navigation) {
        const navigationPreferences = patternPreferences.navigation;
        this.debug(
          '[shouldIsolateNavigation] found pattern',
          targetDomainPattern,
          originDomainPattern,
          navigationPreferences
        );

        if (navigationPreferences.action === 'global') {
          this.debug('[shouldIsolateNavigation] breaking because "global"');
          break;
        }

        return await this.checkIsolationPreferenceAgainstUrl(
          navigationPreferences.action,
          parsedURL,
          parsedRequestURL.hostname
        );
      }
    }

    if (
      await this.checkIsolationPreferenceAgainstUrl(
        this.pref.isolation.global.navigation.action,
        parsedURL,
        parsedRequestURL.hostname
      )
    ) {
      return true;
    }

    this.debug('[shouldIsolateNavigation] not isolating');
    return false;
  }

  async shouldIsolateAlways({
    request,
    tab,
    openerTab,
  }: {
    tab?: Tab;
    request: WebRequestOnBeforeRequestDetails;
    openerTab?: Tab;
  }): Promise<boolean> {
    if (!tab || !tab.url) {
      this.debug(
        '[shouldIsolateAlways] we cant proceed without tab url information',
        tab,
        request
      );
      return false;
    }

    for (const patternPreferences of this.pref.isolation.domain) {
      const targetDomainPattern = patternPreferences.targetPattern;
      const originDomainPattern = patternPreferences.originPattern;

      const originUrl =
        (tab.url === 'about:blank' &&
          openerTab &&
          openerTab.url.startsWith('http') &&
          openerTab.url) ||
        tab.url;

      const originUrlMatches = this.utils.matchDomainPattern(
        originUrl,
        originDomainPattern
      );
      const targetUrlMatches = this.utils.matchDomainPattern(
        request.url,
        targetDomainPattern
      );

      if (!targetUrlMatches || !originUrlMatches) {
        continue;
      }
      if (!patternPreferences.always) {
        continue;
      }

      const preferences = patternPreferences.always;
      this.debug(
        '[shouldIsolateAlways] found pattern for incoming request url',
        targetDomainPattern,
        preferences
      );
      if (preferences.action === 'disabled') {
        this.debug(
          '[shouldIsolateAlways] not isolating because "always" disabled'
        );
        continue;
      }

      if (
        preferences.allowedInPermanent &&
        this.container.isPermanent(tab.cookieStoreId)
      ) {
        this.debug(
          '[shouldIsolateAlways] not isolating because disabled in permanent container'
        );
        continue;
      }

      const isTemporary = this.container.isTemporary(tab.cookieStoreId);
      if (!isTemporary) {
        this.debug(
          '[shouldIsolateAlways] isolating because not in a tmp container'
        );
        return true;
      }

      if (preferences.allowedInTemporary && isTemporary) {
        this.debug(
          '[shouldIsolateAlways] not isolating because disabled in tmp container'
        );
        return false;
      }

      if (!this.utils.matchDomainPattern(tab.url, targetDomainPattern)) {
        let openerMatches = false;
        if (
          openerTab &&
          openerTab.url.startsWith('http') &&
          this.utils.matchDomainPattern(openerTab.url, targetDomainPattern)
        ) {
          openerMatches = true;
          this.debug(
            '[shouldIsolateAlways] opener tab url matched the pattern',
            openerTab.url,
            targetDomainPattern
          );
        }
        if (!openerMatches) {
          this.debug(
            '[shouldIsolateAlways] isolating because the tab/opener url doesnt match the pattern',
            tab.url,
            openerTab,
            targetDomainPattern
          );
          return true;
        }
      }
    }
    return false;
  }

  shouldIsolateMac({
    tab,
    macAssignment,
  }: {
    tab?: Tab;
    macAssignment?: MacAssignment;
  }): boolean {
    if (this.pref.isolation.mac.action === 'disabled') {
      this.debug('[shouldIsolateMac] mac isolation disabled');
      return false;
    }
    if (tab && !this.container.isPermanent(tab.cookieStoreId)) {
      this.debug('[shouldIsolateMac] we are not in a permanent container');
      return false;
    }
    if (
      !macAssignment ||
      (macAssignment &&
        tab &&
        tab.cookieStoreId !== macAssignment.cookieStoreId)
    ) {
      this.debug(
        '[shouldIsolateMac] mac isolating because request url is not assigned to the tabs container'
      );
      return true;
    }
    this.debug('[shouldIsolateMac] no mac isolation', tab, macAssignment);
    return false;
  }

  async checkIsolationPreferenceAgainstUrl(
    preference: IsolationAction,
    origin: string,
    target: string
  ): Promise<boolean> {
    this.debug(
      '[checkIsolationPreferenceAgainstUrl]',
      preference,
      origin,
      target
    );
    switch (preference) {
      case 'always':
        this.debug(
          '[checkIsolationPreferenceAgainstUrl] isolating based on "always"'
        );
        return true;

      case 'notsamedomainexact':
      // if (target !== origin) {
      //   this.debug(
      //     '[checkIsolationPreferenceAgainstUrl] isolating based on "notsamedomainexact"'
      //   );
      //   return true;
      // }

      case 'notsamedomain':
      // if (!this.utils.sameDomain(origin, target)) {
      //   this.debug(
      //     '[checkIsolationPreferenceAgainstUrl] isolating based on "notsamedomain"'
      //   );
      //   return true;
      // }
    }
    return false;
  }

  getActiveState(): boolean {
    return this.storage.local.isolation.active;
  }

  setActiveState(active: boolean): void {
    this.debug('[setActiveState] isolation', active);
    this.storage.local.isolation.active = active;
    this.storage.persist();
    if (active) {
      this.browseraction.removeIsolationInactiveBadge();
      this.reactivateStopInterval();
    } else {
      this.browseraction.addIsolationInactiveBadge();
      this.reactivateStartInterval();
    }
    this.pageaction.showOrHide();
  }

  toggleActiveState(): void {
    this.setActiveState(!this.getActiveState());
  }

  reactivateCheckTarget(): void {
    const diff: number = Math.round(
      (this.storage.local.isolation.reactivateTargetTime -
        new Date().getTime()) /
        1000
    );
    if (diff <= 0) {
      this.reactivateStopInterval();
      this.setActiveState(true);
    } else if (diff <= 30 || diff % 10 == 0) {
      this.browseraction.addIsolationInactiveBadge(diff);
    }
  }

  reactivateStartInterval(): void {
    if (this.pref.isolation.reactivateDelay > 0) {
      this.debug(
        '[reactivateStartInterval] isolation',
        this.storage.local.isolation
      );
      this.reactivateStopInterval();
      const reactivateTargetTime: number = this.storage.local.isolation
        .reactivateTargetTime;
      this.storage.local.isolation.reactivateTargetTime = reactivateTargetTime
        ? reactivateTargetTime
        : new Date().getTime() + this.pref.isolation.reactivateDelay * 1000;
      this.reactivateInterval = window.setInterval(() => {
        this.reactivateCheckTarget();
      }, 1000);
    }
  }

  reactivateStopInterval(): void {
    if (this.reactivateInterval) {
      window.clearInterval(this.reactivateInterval);
      this.reactivateInterval = 0;
    }
    this.storage.local.isolation.reactivateTargetTime = 0;
  }
}
