import {
  CONTAINER_COLORS,
  CONTAINER_ICONS,
  TOOLBAR_ICON_COLORS,
  IGNORED_DOMAINS_DEFAULT,
  REDIRECTOR_DOMAINS_DEFAULT,
} from './shared';

export type TabId = number;
export type WindowId = number;

export type Milliseconds = number;
export type IgnoredDomain = typeof IGNORED_DOMAINS_DEFAULT[number] | string;
export type RedirectorDomain =
  | typeof REDIRECTOR_DOMAINS_DEFAULT[number]
  | string;

export type CookieStoreId = string;

export interface ContainerOptions {
  name: string;
  color: ContainerColor;
  icon: ContainerIcon;
  number: number;
  clean: boolean;
  deletesHistory?: boolean;
  history?: {
    [key: string]: { tabId: TabId };
  };
}

export interface CreateTabOptions {
  cookieStoreId: CookieStoreId;
  url?: string;
  active?: boolean;
  index?: number;
  pinned?: boolean;
  openerTabId?: number;
  windowId?: number;
}

export interface TmpTabOptions {
  tab?: Tab;
  url?: string;
  active?: boolean;
  request?: false | WebRequestOnBeforeRequestDetails;
  dontPin?: boolean;
  deletesHistory?: boolean;
  macConfirmPage?: boolean;
  openerTab?: Tab;
}

export type IsolationAction =
  | 'never'
  | 'notsamedomain' // legacy
  | 'notsamedomainexact' // legacy
  | 'always'
  | 'global';

export interface IsolationGlobal {
  navigation: {
    action: IsolationAction;
  };
  mouseClick: {
    middle: {
      action: IsolationAction;
      container: 'default' | 'deleteshistory';
    };
    ctrlleft: {
      action: IsolationAction;
      container: 'default' | 'deleteshistory';
    };
    left: {
      action: IsolationAction;
      container: 'default' | 'deleteshistory';
    };
  };
  excluded: {
    [key: string]: Record<string, unknown>;
  };
  excludedContainers: {
    [key: string]: Record<string, unknown>;
  };
}

export interface IsolationDomain extends IsolationGlobal {
  targetPattern: string;
  originPattern?: string;
  always: {
    action: 'enabled' | 'disabled';
    allowedInPermanent: boolean;
    allowedInTemporary: boolean;
  };
}

export interface Cookie {
  [key: string]: string;
  domain: string;
  expirationDate: string;
  firstPartyDomain: string;
  httpOnly: '' | 'true' | 'false';
  name: string;
  path: string;
  sameSite: '' | browser.cookies.SameSiteStatus;
  secure: '' | 'true' | 'false';
  url: string;
  value: string;
}

export interface Script {
  code: string;
  runAt: 'document_start' | 'document_end' | 'document_idle';
}

export type ToolbarIconColor =
  | 'default'
  | 'black-simple'
  | 'blue-simple'
  | 'red-simple'
  | 'white-simple';

export interface StorageLocal {
  containerPrefix: string | false;
  tempContainerCounter: number;
  tempContainers: {
    [key: string]: ContainerOptions;
  };
  tempContainersNumbers: number[];
  statistics: {
    startTime: Date;
    containersDeleted: number;
    cookiesDeleted: number;
    cacheDeleted: number;
    deletesHistory: {
      containersDeleted: number;
      cookiesDeleted: number;
      urlsDeleted: number;
    };
  };
  isolation: {
    active: boolean;
    reactivateTargetTime: number;
  };
  preferences: PreferencesSchema;
  lastFileExport: false;
  version: false | string;
}

export interface PreferencesSchema {
  automaticMode: {
    active: boolean;
    newTab: 'created' | 'navigation';
  };
  notifications: boolean;
  container: {
    namePrefix: string;
    color: ContainerColor;
    colorRandom: boolean;
    colorRandomExcluded: ContainerColor[];
    icon: ContainerIcon;
    iconRandom: boolean;
    iconRandomExcluded: ContainerIcon[];
    numberMode: 'keep' | 'keepuntilrestart' | 'reuse' | 'hide';
    removal: Milliseconds;
  };
  iconColor: ToolbarIconColor;
  isolation: {
    reactivateDelay: number;
    global: IsolationGlobal;
    domain: IsolationDomain[];
    mac: {
      action: 'enabled' | 'disabled';
    };
  };
  browserActionPopup: boolean;
  pageAction: boolean;
  contextMenu: boolean;
  contextMenuBookmarks: boolean;
  keyboardShortcuts: {
    AltC: boolean;
    AltP: boolean;
    AltN: boolean;
    AltShiftC: boolean;
    AltX: boolean;
    AltO: boolean;
    AltI: boolean;
  };
  replaceTabs: boolean;
  closeRedirectorTabs: {
    active: boolean;
    delay: number;
    domains: RedirectorDomain[];
  };
  ignoreRequests: IgnoredDomain[];
  cookies: {
    domain: {
      [key: string]: Cookie[];
    };
  };
  scripts: {
    active: boolean;
    domain: {
      [key: string]: Script[];
    };
  };
  deletesHistory: {
    active: boolean;
    automaticMode: 'never' | 'automatic';
    contextMenu: boolean;
    contextMenuBookmarks: boolean;
    containerAlwaysPerDomain: 'never' | 'automatic';
    containerIsolation: 'never' | 'automatic';
    containerRemoval: Milliseconds;
    containerMouseClicks: 'never' | 'automatic';
    statistics: boolean;
  };
  statistics: boolean;
  ui: {
    expandPreferences: boolean;
    popupDefaultTab:
      | 'isolation-global'
      | 'isolation-per-domain'
      | 'actions'
      | 'statistics';
  };
}

export interface Tab extends browser.tabs.Tab {
  id: number;
  url: string;
  windowId: number;
  cookieStoreId: string;
}

export interface Permissions {
  bookmarks: boolean;
  downloads: boolean;
  history: boolean;
  notifications: boolean;
  webNavigation: boolean;
}

export type ContainerColor = typeof CONTAINER_COLORS[number];
export type ContainerIcon = typeof CONTAINER_ICONS[number];
export type ToolbarIconColors = typeof TOOLBAR_ICON_COLORS[number];

export interface MacAssignment {
  userContextId: string;
  cookieStoreId: string;
  neverAsk: boolean;
}

export type OnBeforeRequestResult =
  | undefined
  | boolean
  | { clean?: boolean; cancel?: boolean };

export type ClickType = 'middle' | 'left' | 'ctrlleft';
export interface ClickEvent {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface ClickMessage {
  href: string;
  event: ClickEvent;
}

export interface RuntimeMessage {
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: ClickMessage | any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Debug = (...args: any[]) => Promise<void>;

export interface WebRequestOnBeforeRequestDetails
  extends browser.webRequest._OnBeforeRequestDetails {
  cookieStoreId: string;
}

export interface ToolTip {
  hidden: boolean;
  position?: 'bottom left' | 'top left';
}

export type DomainPatternType = 'target' | 'origin' | 'exclusion';
