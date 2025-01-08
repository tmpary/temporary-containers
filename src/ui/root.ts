import jQuery from 'jquery';
declare global {
  interface Window {
    $: JQueryStatic;
    jQuery: JQueryStatic;
  }
}
window.$ = window.jQuery = jQuery;

import 'jquery-address';
import 'sortablejs';
import 'fomantic-ui';
import Vue, { VNode } from 'vue';
import { ExtendedVue } from 'vue/types/vue';
import { getPermissions } from '~/shared';
import { Tab, Permissions, PreferencesSchema, StorageLocal } from '~/types';

interface Data {
  app: App | UninitializedApp;
  expandedPreferences: boolean;
}

interface UninitializedApp {
  initialized: false;
  popup: boolean;
}

interface ActiveTab extends Tab {
  parsedUrl: URL;
}

export interface App {
  initialized: boolean;
  popup: boolean;
  storage: StorageLocal;
  preferences: PreferencesSchema;
  permissions: Permissions;
  currentTab: Tab;
  activeTab?: ActiveTab;
}

export interface Popup extends App {
  activeTab: ActiveTab;
}

export interface InitializeOptions {
  showMessage?: string;
  showError?: string;
}

declare global {
  interface String {
    capitalize: () => string;
  }
  interface Array<T> {
    move: (from: number, to: number) => void;
  }
}

String.prototype.capitalize = function (): string {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.move = function (from, to): void {
  this.splice(to, 0, this.splice(from, 1)[0]);
};

export default (
  App: ExtendedVue<Vue, unknown, unknown, unknown, unknown>,
  { popup = false }
): void => {
  new Vue({
    el: '#app',
    data(): Data {
      return {
        app: {
          initialized: false,
          popup,
        },
        expandedPreferences: false,
      };
    },
    watch: {
      app: {
        async handler(app, oldApp): Promise<void> {
          if (!app.initialized) {
            return;
          } else if (!oldApp.preferences) {
            this.maybeExpandPreferences(app);
            return;
          }

          if (!popup) {
            await this.checkPermissions(app);
          }

          try {
            await browser.runtime.sendMessage({
              method: 'savePreferences',
              payload: {
                preferences: app.preferences,
              },
            });
          } catch (error) {
            console.error('error while saving preferences', error);
            this.$root.$emit(
              'showError',
              `Error while saving preferences: ${error?.toString()}`
            );
            window.setTimeout(() => {
              this.$root.$emit('initialize');
            }, 5000);
          }

          this.maybeExpandPreferences(app);
        },
        deep: true,
      },
    },
    mounted(): void {
      this.initialize();

      this.$root.$on('initialize', (options: InitializeOptions) => {
        this.app = {
          initialized: false,
          popup,
        };
        this.expandedPreferences = false;
        this.$nextTick(() => {
          this.initialize(options);
        });
      });
    },
    methods: {
      async initialize(options: InitializeOptions = {}): Promise<void> {
        let pongError = false;
        let initializeLoader = false;

        if (window.location.search.startsWith('?error')) {
          this.$root.$emit('showInitializeError');
          return;
        }

        setTimeout(() => {
          if (!this.app.initialized && !pongError) {
            initializeLoader = true;
            this.$root.$emit('showInitializeLoader');
          }
        }, 500);

        try {
          const pong = await browser.runtime.sendMessage({ method: 'ping' });
          if (pong !== 'pong') {
            pongError = true;
          }
        } catch (error) {
          pongError = true;
        }
        if (pongError) {
          if (initializeLoader) {
            this.$root.$emit('hideInitializeLoader');
          }
          this.$root.$emit('showInitializeError');
          return;
        }

        const permissions = await getPermissions();

        let storage;
        try {
          storage = (await browser.storage.local.get()) as StorageLocal;
          if (
            !storage.preferences ||
            !Object.keys(storage.preferences).length
          ) {
            this.$root.$emit(
              'showError',
              'Loading preferences failed, please try again'
            );
            return;
          }
        } catch (error) {
          this.$root.$emit(
            'showError',
            `Loading preferences failed, please try again. ${error?.toString()}`
          );
          return;
        }
        const currentTab = (await browser.tabs.getCurrent()) as Tab;
        const app: App = {
          initialized: true,
          popup,
          storage,
          preferences: storage.preferences,
          permissions,
          currentTab,
        };

        if (popup) {
          const [tab] = (await browser.tabs.query({
            currentWindow: true,
            active: true,
          })) as Tab[];
          app.activeTab = {
            ...tab,
            parsedUrl: new URL(tab.url),
          };
        }

        this.app = app;

        if (options.showMessage) {
          this.$nextTick(() => {
            this.$root.$emit('showMessage', options.showMessage);
          });
        } else if (options.showError) {
          this.$nextTick(() => {
            this.$root.$emit('showError', options.showError);
          });
        } else {
          this.$root.$emit('hideMessage');
        }
        if (initializeLoader) {
          this.$root.$emit('hideInitializeLoader');
        }
      },
      async checkPermissions(app: App): Promise<void> {
        if (app.preferences.notifications && !app.permissions.notifications) {
          // eslint-disable-next-line require-atomic-updates
          app.preferences.notifications = app.permissions.notifications = await browser.permissions.request(
            {
              permissions: ['notifications'],
            }
          );
        }

        if (
          app.preferences.contextMenuBookmarks &&
          !app.permissions.bookmarks
        ) {
          // eslint-disable-next-line require-atomic-updates
          app.preferences.contextMenuBookmarks = app.permissions.bookmarks = await browser.permissions.request(
            {
              permissions: ['bookmarks'],
            }
          );
        }

        if (
          app.preferences.deletesHistory.contextMenuBookmarks &&
          !app.permissions.bookmarks
        ) {
          // eslint-disable-next-line require-atomic-updates
          app.preferences.deletesHistory.contextMenuBookmarks = app.permissions.bookmarks = await browser.permissions.request(
            {
              permissions: ['bookmarks'],
            }
          );
        }

        if (app.preferences.deletesHistory.active && !app.permissions.history) {
          // eslint-disable-next-line require-atomic-updates
          app.preferences.deletesHistory.active = app.permissions.history = await browser.permissions.request(
            {
              permissions: ['history'],
            }
          );
        }

        if (app.preferences.scripts.active && !app.permissions.webNavigation) {
          // eslint-disable-next-line require-atomic-updates
          app.preferences.scripts.active = app.permissions.webNavigation = await browser.permissions.request(
            {
              permissions: ['webNavigation'],
            }
          );
        }
      },
      maybeExpandPreferences(app: App): void {
        this.$nextTick(() => {
          if (
            app.preferences.ui.expandPreferences &&
            !this.expandedPreferences
          ) {
            Array.from(Array(15)).map((_, idx) => {
              $('.ui.accordion:not(#glossaryAccordion)').accordion('open', idx);
            });
            this.expandedPreferences = true;
          } else if (
            !app.preferences.ui.expandPreferences &&
            this.expandedPreferences
          ) {
            this.expandedPreferences = false;
            this.$root.$emit('initialize');
          }
        });
      },
    },
    render(h): VNode {
      return h(App, {
        props: {
          app: this.app,
        },
      });
    },
  });
};
