<script lang="ts">
import mixins from 'vue-typed-mixins';
import { App } from '../root';
import { mixin } from '../mixin';
import { Permissions, PreferencesSchema } from '~/types';

interface Data {
  preferences: PreferencesSchema;
  permissions: Permissions;
  lastSyncExport:
    | false
    | {
        date: number;
        version: string;
      };
  lastFileExport:
    | false
    | {
        date: number;
        version: string;
      };
  download: false | { id: number; date: number; version: string };
  addonVersion: string;
}

interface ExportedPreferences {
  version: string;
  date: number;
  preferences: PreferencesSchema;
}

interface ImportedPreferences {
  version: string;
  preferences: PreferencesSchema;
}

export default mixins(mixin).extend({
  props: {
    app: {
      type: Object as () => App,
      required: true,
    },
  },
  data(): Data {
    return {
      preferences: this.app.preferences,
      permissions: this.app.permissions,
      lastSyncExport: false,
      lastFileExport: false,
      download: false,
      addonVersion: browser.runtime.getManifest().version,
    };
  },
  async mounted() {
    const { export: importPreferences } = await browser.storage.sync.get(
      'export'
    );
    if (importPreferences) {
      this.lastSyncExport = {
        date: importPreferences.date,
        version: importPreferences.version,
      };
    }
    const { lastFileExport } = await browser.storage.local.get(
      'lastFileExport'
    );
    if (lastFileExport) {
      this.lastFileExport = lastFileExport;
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes.export || !changes.export.newValue) {
        return;
      }
      this.lastSyncExport = {
        date: changes.export.newValue.date,
        version: changes.export.newValue.version,
      };
    });

    if (this.permissions.downloads) {
      this.addDownloadListener();
    }
  },
  methods: {
    getPreferences(): ExportedPreferences {
      const preferences = this.clone(this.preferences);
      preferences.isolation.global.excludedContainers = [];

      return {
        version: browser.runtime.getManifest().version,
        date: Date.now(),
        preferences,
      };
    },

    async exportPreferences(): Promise<void> {
      if (!this.permissions.downloads) {
        this.permissions.downloads = await browser.permissions.request({
          permissions: ['downloads'],
        });
        if (!this.permissions.downloads) {
          return;
        }
        this.addDownloadListener();
      }

      const preferences = this.getPreferences();
      const exportedPreferences = JSON.stringify(preferences, null, 2);

      const date = new Date(preferences.date);
      const dateString = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      ]
        .map((s) => s.toString().padStart(2, '0'))
        .join('-');
      const timeString = [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map((s) => s.toString().padStart(2, '0'))
        .join('.');
      const blob = new Blob([exportedPreferences], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      try {
        this.download = {
          id: await browser.downloads.download({
            url,
            filename: `temporary_containers_preferences_${dateString}_${timeString}.json`,
            saveAs: true,
          }),
          date: preferences.date,
          version: preferences.version,
        };
      } catch (error) {
        this.$root.$emit(
          'showError',
          `Exporting to file failed: ${error?.toString()}`,
          { close: true }
        );
      }
    },

    async exportPreferencesSync(): Promise<void> {
      try {
        const { export: importPreferences } = await browser.storage.sync.get(
          'export'
        );
        if (
          importPreferences &&
          !window.confirm(`
          There's already an export in Firefox Sync:\n
          Date: ${new Date(importPreferences.date).toLocaleString()}\n
          Version: ${importPreferences.version}\n\n
          Overwrite Firefox Sync export?\n
        `)
        ) {
          return;
        }
        await browser.storage.sync.set({
          export: this.getPreferences(),
        });
        this.$root.$emit(
          'showMessage',
          'Successfully exported to Firefox Sync'
        );
      } catch (error) {
        this.$root.$emit(
          'showError',
          `Exporting to Firefox Sync failed: ${error?.toString()}`
        );
      }
    },

    async importPreferencesSync(): Promise<void> {
      try {
        const { export: importPreferences } = await browser.storage.sync.get(
          'export'
        );
        if (!importPreferences || !Object.keys(importPreferences).length) {
          this.$root.$emit(
            'showError',
            'No preferences found in Firefox Sync',
            { close: true }
          );
          return;
        }
        if (this.confirmedImportPreferences(importPreferences)) {
          this.saveImportedPreferences(importPreferences);
        }
      } catch (error) {
        this.$root.$emit(
          'showError',
          `Importing from Firefox Sync failed: ${error?.toString()}`
        );
      }
    },

    confirmedImportPreferences(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      importPreferences: any,
      fileName?: string
    ): boolean {
      return window.confirm(`
        ${
          fileName
            ? `Import preferences from ${fileName}?`
            : 'Import preferences?'
        }\n
        Date: ${new Date(importPreferences.date).toLocaleString()}\n
        Version: ${importPreferences.version}\n\n
        All existing preferences are overwritten.
      `);
    },

    async importPreferences({
      target,
    }: {
      target: HTMLInputElement;
    }): Promise<void> {
      const [file] = target.files as FileList;
      if (!file) {
        return;
      }

      const importPreferences: ImportedPreferences = await new Promise(
        (resolve) => {
          const reader = new FileReader();
          reader.readAsText(file, 'UTF-8');
          reader.onload = async (event): Promise<void> => {
            try {
              if (!event.target || typeof event.target.result !== 'string') {
                throw new Error('invalid input');
              }
              resolve(JSON.parse(event.target.result));
            } catch (error) {
              console.error('error while importing preferences', error);
              this.$root.$emit(
                'showError',
                'Error while importing preferences!'
              );
            }
          };
        }
      );

      if (this.confirmedImportPreferences(importPreferences, file.name)) {
        this.saveImportedPreferences(importPreferences);
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async saveImportedPreferences(
      importedPreferences: ImportedPreferences
    ): Promise<void> {
      // firefox can't request permissions after async calls in user input handlers
      if (!this.permissions.notifications) {
        importedPreferences.preferences.notifications = false;
      }
      if (!this.permissions.bookmarks) {
        importedPreferences.preferences.contextMenuBookmarks = false;
        importedPreferences.preferences.deletesHistory.contextMenuBookmarks = false;
      }
      if (!this.permissions.history) {
        importedPreferences.preferences.deletesHistory.active = false;
      }
      if (!this.permissions.webNavigation) {
        importedPreferences.preferences.scripts.active = false;
      }

      await browser.runtime.sendMessage({
        method: 'importPreferences',
        payload: {
          preferences: importedPreferences.preferences,
          previousVersion: importedPreferences.version,
        },
      });

      this.$root.$emit('initialize', { showMessage: 'Preferences imported.' });
    },

    async wipePreferencesSync(): Promise<void> {
      if (
        !window.confirm(`
        Wipe Firefox sync export?\n
        This can't be undone.
      `)
      ) {
        return;
      }

      try {
        await browser.storage.sync.clear();
        this.lastSyncExport = false;
        this.$root.$emit(
          'showMessage',
          'Successfully wiped Firefox Sync export'
        );
      } catch (error) {
        this.$root.$emit(
          'showError',
          `Wiping Firefox Sync failed: ${error?.toString()}`
        );
      }
    },

    addDownloadListener(): void {
      browser.downloads.onChanged.addListener(async (downloadDelta) => {
        console.log('downloadDelta', downloadDelta);
        if (
          !this.download ||
          this.download.id !== downloadDelta.id ||
          !downloadDelta.state ||
          downloadDelta.state.current !== 'complete'
        ) {
          return;
        }
        const lastFileExport = {
          date: this.download.date,
          version: this.download.version,
        };
        this.lastFileExport = lastFileExport;
        this.download = false;

        browser.runtime.sendMessage({
          method: 'lastFileExport',
          payload: { lastFileExport },
        });
      });
    },
  },
});
</script>

<template>
  <div class="ui form">
    <div class="ui two column very relaxed grid">
      <div class="column">
        <div class="field">
          <label>Export Preferences</label>
        </div>
        <div class="ui small notice message">
          Preferences that include permanent containers are stripped from the
          export since it's not possible to make sure that those containers
          exist when importing, which would lead to unexpected behavior.
          <br /><br />
          <i
            >Installed Add-on version: <strong>{{ addonVersion }}</strong></i
          >
        </div>
        <div class="field">
          <button class="ui button primary" @click="exportPreferences">
            Export to local file
          </button>
        </div>
        <div v-if="lastFileExport" class="field" style="margin-bottom: 30px;">
          <h5>Last local file export</h5>
          <div>
            <ul>
              <li>
                Date: {{ new Date(lastFileExport.date).toLocaleString() }}
              </li>
              <li>Version: {{ lastFileExport.version }}</li>
            </ul>
          </div>
        </div>
        <div class="field">
          <button class="ui button primary" @click="exportPreferencesSync">
            Export to Firefox Sync
          </button>
        </div>
        <div v-if="lastSyncExport" class="field">
          <button
            class="ui button negative primary"
            @click="wipePreferencesSync"
          >
            Wipe Firefox Sync export
          </button>
        </div>
        <div v-if="lastSyncExport" class="field">
          <h5>Last Firefox Sync export</h5>
          <div>
            <ul>
              <li>
                Date: {{ new Date(lastSyncExport.date).toLocaleString() }}
              </li>
              <li>Version: {{ lastSyncExport.version }}</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="field">
          <label>Import Preferences</label>
        </div>
        <div class="ui small notice message">
          Currently it's not possible to request permissions while importing, so
          if you have notifications, bookmarks context menu, or deletes history
          preferences in your import, those will get ignored and you have to
          reconfigure them.
        </div>
        <div class="field">
          <label>
            <input
              id="importPreferences"
              type="file"
              class="hidden"
              @change="importPreferences"
            />
            <div class="ui button primary">
              Import from local file
            </div>
          </label>
        </div>
        <div class="field">
          <button class="ui button primary" @click="importPreferencesSync">
            Import from Firefox Sync
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
