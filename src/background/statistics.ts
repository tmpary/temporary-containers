import { TemporaryContainers } from './tmp';
import { Cleanup } from './cleanup';
import { Container } from './container';
import { Storage } from './storage';
import { formatBytes } from '../shared';
import { PreferencesSchema, Tab, CookieStoreId, Debug } from '~/types';

export class Statistics {
  private removedContainerCount = 0;
  private removedContainerCookiesCount = 0;
  private removedContainerHistoryCount = 0;
  private removedContentLength = 0;
  private requests: Record<string, { contentLength: number }> = {};

  private background: TemporaryContainers;
  private debug: Debug;
  private pref!: PreferencesSchema;
  private storage!: Storage;
  private container!: Container;
  private cleanup!: Cleanup;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
  }

  initialize(): void {
    this.pref = this.background.pref;
    this.storage = this.background.storage;
    this.container = this.background.container;
    this.cleanup = this.background.cleanup;
  }

  async collect(
    request: browser.webRequest._OnCompletedDetails
  ): Promise<void> {
    if (!this.pref.statistics && !this.pref.deletesHistory.statistics) {
      return;
    }

    if (request.tabId === -1) {
      return;
    }

    let tab;
    try {
      tab = (await browser.tabs.get(request.tabId)) as Tab;
    } catch (error) {
      return;
    }

    if (!this.container.isTemporary(tab.cookieStoreId)) {
      return;
    }

    if (!this.requests[tab.cookieStoreId]) {
      this.requests[tab.cookieStoreId] = {
        contentLength: 0,
      };
    }
    if (!request.fromCache && request.responseHeaders) {
      const contentLength = request.responseHeaders.find(
        (header) => header.name === 'content-length'
      );
      if (contentLength && contentLength.value) {
        this.requests[tab.cookieStoreId].contentLength += parseInt(
          contentLength.value,
          10
        );
      }
    }
  }

  async update(
    historyClearedCount: number,
    cookieStoreId: CookieStoreId
  ): Promise<void> {
    this.removedContainerCount++;

    let cookieCount = 0;
    try {
      const cookies = await browser.cookies.getAll({ storeId: cookieStoreId });
      cookieCount = cookies.length;
    } catch (error) {
      this.debug('[tryToRemove] couldnt get cookies', cookieStoreId, error);
    }

    if (historyClearedCount) {
      this.removedContainerHistoryCount += historyClearedCount;
    }
    if (this.pref.statistics) {
      this.storage.local.statistics.containersDeleted++;
    }

    if (
      this.pref.deletesHistory.statistics &&
      this.container.isTemporary(cookieStoreId, 'deletesHistory')
    ) {
      this.storage.local.statistics.deletesHistory.containersDeleted++;
      if (historyClearedCount) {
        this.storage.local.statistics.deletesHistory.urlsDeleted += historyClearedCount;
      }
      if (cookieCount) {
        this.storage.local.statistics.deletesHistory.cookiesDeleted += cookieCount;
      }
    }
    if (cookieCount) {
      if (this.pref.statistics) {
        this.storage.local.statistics.cookiesDeleted += cookieCount;
      }
      this.removedContainerCookiesCount += cookieCount;
    }

    if (
      this.requests[cookieStoreId] &&
      this.requests[cookieStoreId].contentLength
    ) {
      if (this.pref.statistics) {
        this.storage.local.statistics.cacheDeleted += this.requests[
          cookieStoreId
        ].contentLength;
      }
      this.removedContentLength += this.requests[cookieStoreId].contentLength;
    }

    delete this.requests[cookieStoreId];
  }

  finish(): void {
    if (this.removedContainerCount) {
      let notificationMessage = `Deleted Temporary Containers: ${this.removedContainerCount}`;
      if (this.removedContainerCookiesCount) {
        notificationMessage += `\nand ${this.removedContainerCookiesCount} Cookies`;
      }
      if (this.removedContentLength) {
        notificationMessage += `\nand ~${formatBytes(
          this.removedContentLength
        )} Cache`;
      }
      if (this.removedContainerHistoryCount) {
        notificationMessage += `\nand ${this.removedContainerHistoryCount} URLs from History`;
      }
      this.cleanup.maybeShowNotification(notificationMessage);
    }

    this.removedContainerCount = 0;
    this.removedContainerCookiesCount = 0;
    this.removedContainerHistoryCount = 0;
    this.removedContentLength = 0;
  }
}
