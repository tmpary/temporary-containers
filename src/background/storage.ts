import { TemporaryContainers } from './tmp';
import { StorageLocal, Debug } from '~/types';

export class Storage {
  public local!: StorageLocal;
  public installed: boolean;
  public defaults: StorageLocal;

  private background: TemporaryContainers;
  private debug: Debug;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
    this.installed = false;

    this.defaults = {
      containerPrefix: false,
      tempContainerCounter: 0,
      tempContainers: {},
      tempContainersNumbers: [],
      statistics: {
        startTime: new Date(),
        containersDeleted: 0,
        cookiesDeleted: 0,
        cacheDeleted: 0,
        deletesHistory: {
          containersDeleted: 0,
          cookiesDeleted: 0,
          urlsDeleted: 0,
        },
      },
      isolation: {
        active: true,
        reactivateTargetTime: 0,
      },
      preferences: background.preferences.defaults,
      lastFileExport: false,
      version: false,
    };
  }

  async initialize(): Promise<boolean> {
    this.local = (await browser.storage.local.get()) as StorageLocal;

    // empty storage *should* mean new install
    if (!this.local || !Object.keys(this.local).length) {
      return this.install();
    }

    // check for managed preferences
    try {
      const managed = await browser.storage.managed.get();
      if (managed && Object.keys(managed).length) {
        this.local.version = managed.version;
        this.local.preferences = managed.preferences;
        await this.persist();
      }
    } catch (error) {
      this.debug(
        '[initialize] accessing managed storage failed:',
        error?.toString()
      );
    }

    this.debug('[initialize] storage initialized', this.local);
    if (
      this.background.utils.addMissingKeys({
        defaults: this.defaults,
        source: this.local,
      })
    ) {
      await this.persist();
    }

    // migrate if currently running version is different from version in storage
    if (this.local.version && this.background.version !== this.local.version) {
      try {
        await this.background.migration.migrate({
          preferences: this.local.preferences,
          previousVersion: this.local.version,
        });
      } catch (error) {
        this.debug('[initialize] migration failed', error?.toString());
      }
    }

    return true;
  }

  async persist(): Promise<boolean> {
    try {
      if (!this.local || !Object.keys(this.local).length) {
        this.debug('[persist] tried to persist corrupt storage', this.local);
        return false;
      }
      await browser.storage.local.set(this.local);
      this.debug('[persist] storage persisted');
      return true;
    } catch (error) {
      this.debug(
        '[persist] something went wrong while trying to persist the storage',
        error
      );
      return false;
    }
  }

  async install(): Promise<boolean> {
    this.debug('[install] installing storage');

    this.local = this.background.utils.clone(this.defaults);
    this.local.version = this.background.version;

    if (!(await this.persist())) {
      throw new Error('[install] something went wrong while installing');
    }
    this.debug('[install] storage installed', this.local);
    this.installed = true;
    return true;
  }
}
