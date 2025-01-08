import { TemporaryContainers } from './tmp';
import { delay, psl } from './lib';
import { Storage } from './storage';
import { Tabs } from './tabs';
import { CONTAINER_COLORS, CONTAINER_ICONS } from '~/shared';
import {
  ContainerColor,
  ContainerIcon,
  PreferencesSchema,
  CookieStoreId,
  TabId,
  ContainerOptions,
  Tab,
  Permissions,
  Debug,
  TmpTabOptions,
  CreateTabOptions,
  WebRequestOnBeforeRequestDetails,
} from '~/types';

export class Container {
  public noContainerTabs: {
    [key: number]: boolean;
  } = {};
  public urlCreatedContainer: Record<string, CookieStoreId> = {};
  public tabCreatedAsMacConfirmPage: {
    [key: number]: boolean;
  } = {};
  public lastCreatedInactiveTab: {
    [key: number]: TabId;
  } = {};

  private containerColors: ContainerColor[] = CONTAINER_COLORS;
  private containerIcons: ContainerIcon[] = CONTAINER_ICONS;
  private requestCreatedTab: Record<string, boolean> = {};

  private background: TemporaryContainers;
  private debug: Debug;
  private pref!: PreferencesSchema;
  private storage!: Storage;
  private permissions!: Permissions;
  private tabs!: Tabs;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
  }

  async initialize(): Promise<void> {
    this.pref = this.background.pref;
    this.storage = this.background.storage;
    this.permissions = this.background.permissions;
    this.tabs = this.background.tabs;
  }

  async createTabInTempContainer({
    tab,
    url,
    active,
    request = false,
    dontPin = true,
    deletesHistory = false,
    macConfirmPage = false,
    openerTab,
  }: TmpTabOptions): Promise<Tab | undefined> {
    if (request && request.requestId) {
      // we saw that request already
      if (this.requestCreatedTab[request.requestId]) {
        this.debug(
          '[createTabInTempContainer] we already created a tab for this request, so we stop here, probably redirect',
          tab,
          request
        );
        return;
      }
      this.requestCreatedTab[request.requestId] = true;
      // cleanup tracked requests later
      // requestIds are unique per session, so we have no pressure to remove them
      delay(300000).then(() => {
        this.debug('[createTabInTempContainer] cleanup timeout', request);
        delete this.requestCreatedTab[request.requestId];
      });
    }

    const contextualIdentity = await this.createTempContainer({
      url,
      request,
      deletesHistory,
    });

    return this.createTab({
      url,
      tab,
      active,
      dontPin,
      macConfirmPage,
      contextualIdentity,
      openerTab,
    });
  }

  async createTempContainer({
    url,
    request,
    deletesHistory,
  }: {
    url?: string;
    request?: false | WebRequestOnBeforeRequestDetails;
    deletesHistory?: boolean;
  }): Promise<browser.contextualIdentities.ContextualIdentity> {
    const containerOptions = this.generateContainerNameIconColor(
      (request && request.url) || url
    );

    if (containerOptions.number) {
      this.storage.local.tempContainersNumbers.push(containerOptions.number);
    }

    if (deletesHistory) {
      if (this.permissions.history) {
        containerOptions.name += '-deletes-history';
      } else {
        deletesHistory = false;
      }
    }
    containerOptions.deletesHistory = deletesHistory;

    try {
      this.debug(
        '[createTabInTempContainer] creating new container',
        containerOptions
      );
      const contextualIdentity = await browser.contextualIdentities.create({
        name: containerOptions.name,
        icon: containerOptions.icon,
        color: containerOptions.color,
      });
      this.debug(
        '[createTabInTempContainer] contextualIdentity created',
        contextualIdentity
      );

      this.storage.local.tempContainers[
        contextualIdentity.cookieStoreId
      ] = containerOptions;
      await this.storage.persist();

      return contextualIdentity;
    } catch (error) {
      this.debug(
        '[createTabInTempContainer] error while creating container',
        containerOptions.name,
        error
      );
      throw error;
    }
  }

  async createTab({
    url,
    tab,
    active,
    dontPin,
    macConfirmPage,
    contextualIdentity,
    openerTab,
  }: {
    url?: string;
    tab?: Tab;
    active?: boolean;
    dontPin?: boolean;
    macConfirmPage?: boolean;
    contextualIdentity: browser.contextualIdentities.ContextualIdentity;
    openerTab?: Tab;
  }): Promise<Tab> {
    try {
      const newTabOptions: CreateTabOptions = {
        cookieStoreId: contextualIdentity.cookieStoreId,
        url,
      };
      if (tab) {
        newTabOptions.active = tab.active;
        if (tab.index >= 0) {
          if (
            !tab.active &&
            this.lastCreatedInactiveTab[browser.windows.WINDOW_ID_CURRENT]
          ) {
            this.debug(
              '[createTabInTempContainer] lastCreatedInactiveTab id',
              this.lastCreatedInactiveTab
            );
            try {
              const lastCreatedInactiveTab = await browser.tabs.get(
                this.lastCreatedInactiveTab[browser.windows.WINDOW_ID_CURRENT]
              );
              this.debug(
                '[createTabInTempContainer] lastCreatedInactiveTab',
                lastCreatedInactiveTab
              );
              newTabOptions.index = lastCreatedInactiveTab.index + 1;
            } catch (error) {
              this.debug(
                '[createTabInTempContainer] failed to get lastCreatedInactiveTab',
                error
              );
              newTabOptions.index = tab.index + 1;
            }
          } else {
            newTabOptions.index = tab.index + 1;
          }
        }
        if (tab.pinned && !dontPin) {
          newTabOptions.pinned = true;
        }
        if (openerTab) {
          newTabOptions.openerTabId = openerTab.id;
        } else if (tab.openerTabId) {
          newTabOptions.openerTabId = tab.openerTabId;
        }
        if (tab.windowId) {
          newTabOptions.windowId = tab.windowId;
        }
      }
      if (active === false) {
        newTabOptions.active = false;
      }

      this.debug(
        '[createTabInTempContainer] creating tab in temporary container',
        newTabOptions
      );
      const newTab = (await browser.tabs.create(newTabOptions)) as Tab;
      if (tab && !tab.active) {
        this.lastCreatedInactiveTab[browser.windows.WINDOW_ID_CURRENT] =
          newTab.id;
      }
      this.debug(
        '[createTabInTempContainer] new tab in temp container created',
        newTab
      );
      if (url) {
        this.urlCreatedContainer[url] = contextualIdentity.cookieStoreId;
        delay(1000).then(() => {
          this.debug(
            '[createTabInTempContainer] cleaning up urlCreatedContainer',
            url
          );
          delete this.urlCreatedContainer[url];
        });
      }
      this.tabs.containerMap.set(newTab.id, contextualIdentity.cookieStoreId);
      if (macConfirmPage) {
        this.tabCreatedAsMacConfirmPage[newTab.id] = true;
      }
      await this.storage.persist();

      return newTab;
    } catch (error) {
      this.debug(
        '[createTabInTempContainer] error while creating new tab',
        error
      );
      throw error;
    }
  }

  async reloadTabInTempContainer({
    tab,
    url,
    active,
    deletesHistory,
    request,
    macConfirmPage,
    dontPin = true,
  }: {
    tab?: Tab;
    url?: string;
    active?: boolean;
    deletesHistory?: boolean;
    request?: WebRequestOnBeforeRequestDetails;
    macConfirmPage?: boolean;
    dontPin?: boolean;
  }): Promise<undefined | Tab> {
    const newTab = await this.createTabInTempContainer({
      tab,
      url,
      active,
      dontPin,
      deletesHistory,
      request,
      macConfirmPage,
    });
    if (!tab) {
      return newTab;
    }
    await this.tabs.remove(tab);
    return newTab;
  }

  generateContainerNameIconColor(url?: string): ContainerOptions {
    let tempContainerNumber = 0;
    if (this.pref.container.numberMode.startsWith('keep')) {
      this.storage.local.tempContainerCounter++;
      tempContainerNumber = this.storage.local.tempContainerCounter;
    }
    if (this.pref.container.numberMode === 'reuse') {
      tempContainerNumber = this.getReusedContainerNumber();
    }
    let containerName = this.pref.container.namePrefix;
    if (url) {
      const parsedUrl = new URL(url);
      if (containerName.includes('%fulldomain%')) {
        containerName = containerName.replace(
          '%fulldomain%',
          parsedUrl.hostname
        );
      }
      if (containerName.includes('%domain%')) {
        const domain = psl.isValid(parsedUrl.hostname)
          ? psl.get(parsedUrl.hostname)
          : parsedUrl.hostname;
        if (domain) {
          containerName = containerName.replace('%domain%', domain);
        }
      }
    } else {
      containerName = containerName
        .replace('%fulldomain%', '')
        .replace('%domain%', '');
    }
    if (tempContainerNumber) {
      containerName = `${containerName}${tempContainerNumber}`;
    }
    if (!containerName) {
      containerName = ' ';
    }

    let containerColor = this.pref.container.color;
    if (this.pref.container.colorRandom) {
      const containerColors = this.getAvailableContainerColors();
      containerColor =
        containerColors[Math.floor(Math.random() * containerColors.length)];
    }
    let containerIcon = this.pref.container.icon;
    if (this.pref.container.iconRandom) {
      let containerIcons = this.containerIcons.filter(
        (icon) => !this.pref.container.iconRandomExcluded.includes(icon)
      );
      if (!containerIcons.length) {
        containerIcons = this.containerIcons;
      }
      containerIcon =
        containerIcons[Math.floor(Math.random() * containerIcons.length)];
    }
    return {
      name: containerName,
      color: containerColor,
      icon: containerIcon,
      number: tempContainerNumber,
      clean: true,
    };
  }

  isPermanent(cookieStoreId: CookieStoreId): boolean {
    if (
      cookieStoreId !== `${this.background.containerPrefix}-default` &&
      !this.storage.local.tempContainers[cookieStoreId]
    ) {
      return true;
    }
    return false;
  }

  isTemporary(cookieStoreId: CookieStoreId, type?: 'deletesHistory'): boolean {
    return !!(
      this.storage.local.tempContainers[cookieStoreId] &&
      (!type || this.storage.local.tempContainers[cookieStoreId][type])
    );
  }

  isClean(cookieStoreId: CookieStoreId): boolean {
    return (
      this.storage.local.tempContainers[cookieStoreId] &&
      this.storage.local.tempContainers[cookieStoreId].clean
    );
  }

  markUnclean(tabId: TabId): void {
    const cookieStoreId = this.tabs.containerMap.get(tabId);
    if (cookieStoreId && this.isClean(cookieStoreId)) {
      this.debug(
        '[markUnclean] marking tmp container as not clean anymore',
        cookieStoreId
      );
      this.storage.local.tempContainers[cookieStoreId].clean = false;
    }
  }

  getReusedContainerNumber(): number {
    const tempContainersNumbers = this.storage.local.tempContainersNumbers.sort();
    if (!tempContainersNumbers.length) {
      return 1;
    } else {
      const maxContainerNumber = Math.max(...tempContainersNumbers);
      for (let i = 1; i < maxContainerNumber; i++) {
        if (!tempContainersNumbers.includes(i)) {
          return i;
        }
      }
      return maxContainerNumber + 1;
    }
  }

  getAvailableContainerColors(): ContainerColor[] {
    // even out colors
    let availableColors = [];
    const containersOptions = Object.values(this.storage.local.tempContainers);
    const assignedColors: Record<string, number> = {};
    let maxColors = 0;
    for (const containerOptions of containersOptions) {
      if (typeof containerOptions !== 'object') {
        continue;
      }
      if (!assignedColors[containerOptions.color]) {
        assignedColors[containerOptions.color] = 0;
      }
      assignedColors[containerOptions.color]++;
      if (assignedColors[containerOptions.color] > maxColors) {
        maxColors = assignedColors[containerOptions.color];
      }
    }

    for (const color of this.containerColors) {
      if (this.pref.container.colorRandomExcluded.includes(color)) {
        continue;
      }
      if (!assignedColors[color] || assignedColors[color] < maxColors) {
        availableColors.push(color);
      }
    }

    if (!availableColors.length) {
      availableColors = this.containerColors.filter(
        (color) => !this.pref.container.colorRandomExcluded.includes(color)
      );
      if (!availableColors.length) {
        availableColors = this.containerColors;
      }
    }

    return availableColors;
  }

  removeFromStorage(cookieStoreId: CookieStoreId): Promise<boolean> {
    this.storage.local.tempContainersNumbers = this.storage.local.tempContainersNumbers.filter(
      (containerNumber) =>
        this.storage.local.tempContainers[cookieStoreId].number !==
        containerNumber
    );
    delete this.storage.local.tempContainers[cookieStoreId];
    return this.storage.persist();
  }

  getType(cookieStoreId: CookieStoreId): string {
    return this.storage.local.tempContainers[cookieStoreId].deletesHistory
      ? 'deletesHistory'
      : 'regular';
  }

  getRemovalDelay(cookieStoreId: CookieStoreId): number {
    return this.getType(cookieStoreId) === 'deletesHistory'
      ? this.pref.deletesHistory.containerRemoval
      : this.pref.container.removal;
  }

  cleanupNumbers(): void {
    this.storage.local.tempContainersNumbers = Object.values(
      this.storage.local.tempContainers
    ).map((container) => container.number);
  }

  cleanupNumber(cookieStoreId: CookieStoreId): void {
    this.storage.local.tempContainersNumbers = this.storage.local.tempContainersNumbers.filter(
      (containerNumber) =>
        this.storage.local.tempContainers[cookieStoreId].number !==
        containerNumber
    );
  }

  getAllIds(): CookieStoreId[] {
    return Object.keys(this.storage.local.tempContainers);
  }
}
