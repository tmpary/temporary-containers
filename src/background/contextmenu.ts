import { TemporaryContainers } from '../background';
import { Container } from './container';
import { PreferencesSchema } from './preferences';
import { WindowId } from './tabs';

export class ContextMenu {
  private nextMenuInstanceId = 0;
  private lastMenuInstanceId = 0;

  private background: TemporaryContainers;
  private pref!: PreferencesSchema;
  private container!: Container;

  constructor(background: TemporaryContainers) {
    this.background = background;
  }

  public initialize() {
    this.pref = this.background.pref;
    this.container = this.background.container;

    this.add();
  }

  public async onClicked(
    info: browser.menus.OnClickData,
    tab: browser.tabs.Tab
  ) {
    switch (info.menuItemId) {
      case 'open-link-in-new-temporary-container-tab':
        this.container.createTabInTempContainer({
          tab,
          url: info.linkUrl,
          active: false,
          deletesHistory:
            this.pref.deletesHistory.automaticMode === 'automatic',
        });
        break;

      case 'open-link-in-new-deletes-history-temporary-container-tab':
        this.container.createTabInTempContainer({
          tab,
          url: info.linkUrl,
          active: false,
          deletesHistory: true,
        });
        break;

      case 'open-bookmark-in-new-temporary-container-tab': {
        const bookmarks = await browser.bookmarks.get(info.bookmarkId);
        if (bookmarks[0].url) {
          this.container.createTabInTempContainer({
            tab,
            url: bookmarks[0].url,
            active: false,
            deletesHistory:
              this.pref.deletesHistory.automaticMode === 'automatic',
          });
        }
        break;
      }

      case 'open-bookmark-in-new-deletes-history-temporary-container-tab': {
        const bookmarks = await browser.bookmarks.get(info.bookmarkId);
        if (bookmarks[0].url) {
          this.container.createTabInTempContainer({
            tab,
            url: bookmarks[0].url,
            active: false,
            deletesHistory: true,
          });
        }
        break;
      }
    }
  }

  public async onShown(info: { bookmarkId: string }) {
    if (!info.bookmarkId) {
      return;
    }
    const menuInstanceId = this.nextMenuInstanceId++;
    this.lastMenuInstanceId = menuInstanceId;

    const bookmarks = await browser.bookmarks.get(info.bookmarkId);
    if (bookmarks[0].url) {
      return;
    }

    await this.toggleBookmarks(false);

    if (menuInstanceId !== this.lastMenuInstanceId) {
      this.toggleBookmarks(true);
      return;
    }
    await browser.contextMenus.refresh();
    this.toggleBookmarks(true);
  }

  public async toggleBookmarks(visible: boolean) {
    if (
      this.pref.contextMenuBookmarks &&
      this.background.permissions.bookmarks
    ) {
      await browser.contextMenus.update(
        'open-bookmark-in-new-temporary-container-tab',
        {
          visible,
        }
      );
    }
    if (
      this.pref.deletesHistory.contextMenuBookmarks &&
      this.background.permissions.history &&
      this.background.permissions.bookmarks
    ) {
      await browser.contextMenus.update(
        'open-bookmark-in-new-deletes-history-temporary-container-tab',
        {
          visible,
        }
      );
    }
  }

  public async add() {
    if (this.pref.contextMenu) {
      browser.contextMenus.create({
        id: 'open-link-in-new-temporary-container-tab',
        title: 'Open link in new Temporary Container tab',
        contexts: ['link'],
        icons: {
          '16': 'icons/page-w-16.svg',
          '32': 'icons/page-w-32.svg',
        },
      });
    }
    if (
      this.pref.deletesHistory.contextMenu &&
      this.background.permissions.history
    ) {
      browser.contextMenus.create({
        id: 'open-link-in-new-deletes-history-temporary-container-tab',
        title: 'Open link in new "Deletes History Temporary Container" tab',
        contexts: ['link'],
        icons: {
          '16': 'icons/page-w-16.svg',
          '32': 'icons/page-w-32.svg',
        },
      });
    }
    if (
      this.pref.contextMenuBookmarks &&
      this.background.permissions.bookmarks
    ) {
      browser.contextMenus.create({
        id: 'open-bookmark-in-new-temporary-container-tab',
        title: 'Open Bookmark in new Temporary Container tab',
        contexts: ['bookmark'],
        icons: {
          '16': 'icons/page-w-16.svg',
          '32': 'icons/page-w-32.svg',
        },
      });
    }
    if (
      this.pref.deletesHistory.contextMenuBookmarks &&
      this.background.permissions.history &&
      this.background.permissions.bookmarks
    ) {
      browser.contextMenus.create({
        id: 'open-bookmark-in-new-deletes-history-temporary-container-tab',
        title: 'Open Bookmark in new "Deletes History Temporary Container" tab',
        contexts: ['bookmark'],
        icons: {
          '16': 'icons/page-w-16.svg',
          '32': 'icons/page-w-32.svg',
        },
      });
    }
  }

  public remove() {
    return browser.contextMenus.removeAll();
  }

  public async windowsOnFocusChanged(windowId: WindowId) {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      return;
    }
    await this.remove();
    this.add();
  }
}
