<script lang="ts">
import Draggable from 'vuedraggable';
import mixins from 'vue-typed-mixins';
import DomainPattern from '../domainpattern.vue';
import Settings from './settings.vue';
import { App } from '~/ui/root';
import { mixin } from '~/ui/mixin';
import { IsolationDomain } from '~/types';

const domainDefaults = {
  originPattern: '',
  targetPattern: '',
  always: {
    action: 'disabled',
    allowedInPermanent: false,
    allowedInTemporary: false,
  },
  navigation: {
    action: 'global',
  },
  mouseClick: {
    middle: {
      action: 'global',
    },
    ctrlleft: {
      action: 'global',
    },
    left: {
      action: 'global',
    },
  },
  excluded: {},
};

interface UIIsolationDomain extends IsolationDomain {
  _index: number;
}

export default mixins(mixin).extend({
  components: {
    DomainPattern,
    Settings,
    Draggable,
  },

  props: {
    app: {
      type: Object as () => App,
      required: true,
    },
  },

  data() {
    return {
      preferences: this.app.preferences,
      popup: this.app.popup,
      domain: this.clone(domainDefaults),
      excludeDomainPattern: '',
      isolationDomainFilter: '',
      editing: false,
      show: false,
      saved: false,
      empty: true,
      editClicked: false,
    };
  },

  computed: {
    isolationDomains: {
      get(): UIIsolationDomain[] {
        return this.preferences.isolation.domain.reduce(
          (accumulator: UIIsolationDomain[], isolated, index) => {
            if (!isolated.targetPattern.includes(this.isolationDomainFilter)) {
              return accumulator;
            }
            accumulator.push({ ...isolated, _index: index });
            return accumulator;
          },
          []
        );
      },
      set(): void {
        // suppress warning about missing setter
      },
    },
  },

  watch: {
    domain: {
      handler(domain): void {
        if (this.editing && !domain.targetPattern.trim()) {
          this.editing = false;
          this.domain = this.clone(domain);
          const domainIndex = this.preferences.isolation.domain.findIndex(
            (isolatedDomain) => !isolatedDomain.targetPattern.trim()
          );
          this.$delete(this.preferences.isolation.domain, domainIndex);
        } else if (
          !this.editing &&
          this.preferences.isolation.domain.find(
            (_domain) => _domain.targetPattern === domain.targetPattern
          )
        ) {
          $('#isolationDomainForm').form('validate form');
        } else if (this.editing) {
          if (this.editClicked) {
            this.editClicked = false;
          } else {
            this.saved = true;
            setTimeout(() => {
              this.saved = false;
            }, 1500);
          }
        }
        this.empty = false;
      },
      deep: true,
    },
  },

  async mounted() {
    this.$nextTick(() => {
      $('#isolationDomain .ui.accordion').accordion({
        ...(this.popup
          ? {
              animateChildren: false,
              duration: 0,
            }
          : {}),
        exclusive: false,
      });

      $('#isolationDomain .ui.dropdown').dropdown();
      $('#isolationDomain .ui.checkbox').checkbox();

      this.show = true;
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    $(document).form.settings.rules!.domainPattern = (
      value: string
    ): boolean => {
      if (this.editing) {
        this.reset();
        return true;
      } else {
        return !this.preferences.isolation.domain.find(
          (domain) => domain.targetPattern === value
        );
      }
    };

    $('#isolationDomainForm').form({
      inline: true,
      fields: {
        originDomainPattern: {
          rules: [],
        },
        targetDomainPattern: {
          rules: [
            {
              type: 'empty',
              prompt: this.t('optionsIsolationPerDomainPatternNoEmpty'),
            },
          ],
        },
      },
      onSuccess: (event) => {
        if (event) {
          event.preventDefault();
        }

        if (this.editing) {
          this.reset();
          this.editing = false;
        } else {
          this.domain.targetPattern = this.domain.targetPattern.trim();
          this.preferences.isolation.domain.push(this.clone(this.domain));
          this.reset();
        }
      },
    });

    $('#isolationDomainExcludeDomainsForm').form({
      fields: {
        isolationDomainExcludeDomainPattern: 'empty',
      },
      onSuccess: (event) => {
        event.preventDefault();
        this.$set(this.domain.excluded, this.excludeDomainPattern, {});
        this.excludeDomainPattern = '';
      },
    });

    if (this.popup) {
      if (!this.app.activeTab?.url.startsWith('http')) {
        return;
      }
      const isolationDomainIndex = this.preferences.isolation.domain.findIndex(
        (domain) =>
          domain.targetPattern === this.app.activeTab?.parsedUrl.hostname
      );
      if (isolationDomainIndex >= 0) {
        this.edit(isolationDomainIndex);
      } else {
        this.domain.targetPattern = this.app.activeTab.parsedUrl.hostname;
      }
    }
  },
  methods: {
    reset(): void {
      this.domain = this.clone(domainDefaults);
      this.domain.targetPattern = '';
      this.domain.originPattern = '';
      this.$nextTick(() => {
        this.empty = true;
      });

      if (!this.preferences.ui.expandPreferences) {
        $('#isolationPerDomainAccordion').accordion('close', 0);
        $('#isolationPerDomainAccordion').accordion('close', 1);
        $('#isolationPerDomainAccordion').accordion('close', 2);
        $('#isolationPerDomainAccordion').accordion('close', 3);
      }
      this.resetDropdowns();
    },

    resetDropdowns(): void {
      $('#isolationDomain .ui.dropdown').dropdown('destroy');
      this.$nextTick(() => {
        $('#isolationDomain .ui.dropdown').dropdown();
      });
    },

    edit(index: number): void {
      this.editClicked = true;
      this.editing = true;
      this.domain = this.preferences.isolation.domain[index];
      this.resetDropdowns();

      if (!this.preferences.ui.expandPreferences) {
        this.domain.always.action === domainDefaults.always.action
          ? $('#isolationPerDomainAccordion').accordion('close', 0)
          : $('#isolationPerDomainAccordion').accordion('open', 0);

        this.domain.navigation.action === domainDefaults.navigation.action
          ? $('#isolationPerDomainAccordion').accordion('close', 1)
          : $('#isolationPerDomainAccordion').accordion('open', 1);

        this.domain.mouseClick.middle.action ===
          domainDefaults.mouseClick.middle.action &&
        this.domain.mouseClick.ctrlleft.action ===
          domainDefaults.mouseClick.ctrlleft.action &&
        this.domain.mouseClick.left.action ===
          domainDefaults.mouseClick.left.action
          ? $('#isolationPerDomainAccordion').accordion('close', 2)
          : $('#isolationPerDomainAccordion').accordion('open', 2);

        !Object.keys(this.domain.excluded).length
          ? $('#isolationPerDomainAccordion').accordion('close', 3)
          : $('#isolationPerDomainAccordion').accordion('open', 3);
      }
    },

    remove(index: number, pattern: string): void {
      if (
        window.confirm(
          this.t('optionsIsolationPerDomainRemoveConfirmation', pattern)
        )
      ) {
        this.$delete(this.preferences.isolation.domain, index);
        if (this.editing && this.domain.targetPattern === pattern) {
          this.reset();
          this.editing = false;
        }
      }
    },

    removeExcludedDomain(excludedDomainPattern: string): void {
      this.$delete(this.domain.excluded, excludedDomainPattern);
    },

    expandIsolationDomainFilter(event: Event): void {
      if (!this.popup) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (
        $('#isolationDomainsAccordion > div > div.title').hasClass('active')
      ) {
        return;
      }
      setTimeout(() => {
        $('#isolationDomainsAccordion').accordion('open', 0);
      }, 200);
    },

    move(event: { moved: { oldIndex: number; newIndex: number } }): void {
      if (event.moved) {
        this.preferences.isolation.domain.move(
          this.isolationDomains[event.moved.oldIndex]._index,
          this.isolationDomains[event.moved.newIndex]._index
        );
      }
    },

    focusIsolationDomainFilter(event: Event): void {
      event.preventDefault();
      event.stopPropagation();
      (this.$refs.isolationDomainFilter as HTMLElement).focus();
    },
  },
});
</script>

<template>
  <div v-show="show" id="isolationDomain">
    <div class="ui form">
      <form id="isolationDomainForm">
        <domain-pattern
          id="originDomainPattern"
          :type="'origin'"
          :tooltip="!popup ? undefined : { hidden: true }"
          :domain-pattern.sync="domain.originPattern"
        />
        <domain-pattern
          id="targetDomainPattern"
          :type="'target'"
          :tooltip="!popup ? undefined : { hidden: true }"
          :domain-pattern.sync="domain.targetPattern"
        />
      </form>
      <div
        id="isolationPerDomainAccordion"
        style="margin-top: 15px;"
        :style="empty ? 'opacity: 0.3; pointer-events: none' : ''"
        class="ui accordion"
      >
        <div class="title">
          <h4>
            <i class="dropdown icon" />
            {{ t('optionsIsolationPerDomainAlwaysOpenIn') }}
          </h4>
        </div>
        <div
          class="content"
          :class="{ 'ui segment': !popup, 'popup-margin': popup }"
        >
          <div>
            <select
              id="isolationDomainAlways"
              v-model="domain.always.action"
              class="ui fluid dropdown"
            >
              <option value="disabled">
                {{ t('optionsIsolationDisabled') }}
              </option>
              <option value="enabled">
                {{ t('optionsIsolationEnabled') }}
              </option>
            </select>
            <div v-show="domain.always.action === 'enabled'">
              <div class="ui checkbox" style="margin-top: 14px;">
                <input
                  v-model="domain.always.allowedInPermanent"
                  type="checkbox"
                />
                <label>
                  {{
                    !popup
                      ? t('optionsIsolationPerDomainDisableIfNavPermContainer')
                      : t('optionsIsolationPerDomainDisableIfPermContainer')
                  }}
                </label>
              </div>
              <div />
              <div class="ui checkbox" style="margin-top: 14px;">
                <input
                  v-model="domain.always.allowedInTemporary"
                  type="checkbox"
                />
                <label>
                  {{
                    !popup
                      ? t('optionsIsolationPerDomainDisableIfNavTempContainer')
                      : t('optionsIsolationPerDomainDisableIfTempContainer')
                  }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="title">
          <h4>
            <i class="dropdown icon" />
            {{ t('optionsIsolationNavigation') }}
          </h4>
        </div>
        <div
          class="content"
          :class="{ 'ui segment': !popup, 'popup-margin': popup }"
        >
          <settings
            :label="t('optionsIsolationTargetDomain')"
            :perdomain="true"
            :action.sync="domain.navigation.action"
          />
        </div>
        <div class="title">
          <h4>
            <i class="dropdown icon" />
            {{ t('optionsIsolationMouseClick') }}
          </h4>
        </div>
        <div
          class="content"
          :class="{ 'ui segment': !popup, 'popup-margin': popup }"
        >
          <settings
            :label="t('optionsIsolationMouseClickMiddleMouse')"
            :perdomain="true"
            :action.sync="domain.mouseClick.middle.action"
          />
          <settings
            :label="t('optionsIsolationMouseClickCtrlLeftMouse')"
            :perdomain="true"
            :action.sync="domain.mouseClick.ctrlleft.action"
          />
          <settings
            :label="t('optionsIsolationMouseClickLeftMouse')"
            :perdomain="true"
            :action.sync="domain.mouseClick.left.action"
          />
        </div>
        <div class="title">
          <h4>
            <i class="dropdown icon" />
            {{ t('optionsIsolationExcludeTargetDomains') }}
          </h4>
        </div>
        <div
          class="content popup-exclude-margin"
          :class="{ 'ui segment': !popup, 'popup-margin': popup }"
        >
          <div>
            <div class="field">
              <form id="isolationDomainExcludeDomainsForm" class="ui form">
                <domain-pattern
                  id="isolationDomainExcludeDomainPattern"
                  :tooltip="
                    !popup ? { position: 'top left' } : { hidden: true }
                  "
                  :domain-pattern.sync="excludeDomainPattern"
                  :type="'exclusion'"
                />
                <div class="field">
                  <button class="ui button primary">
                    {{ t('optionsIsolationExclude') }}
                  </button>
                </div>
              </form>
              <div style="margin-top: 20px;">
                <div v-if="!Object.keys(domain.excluded).length">
                  {{ t('optionsIsolationNoDomainsExcluded') }}
                </div>
                <div v-else>
                  <div
                    v-for="(_, excludedDomainPattern) in domain.excluded"
                    :key="excludedDomainPattern"
                  >
                    <div style="margin-top: 5px;" />
                    <span
                      :data-tooltip="
                        t(
                          'optionsIsolationPerDomainRemove',
                          excludedDomainPattern
                        )
                      "
                      style="margin-top: 10px; color: red; cursor: pointer;"
                      @click="removeExcludedDomain(excludedDomainPattern)"
                    >
                      <i class="icon-trash-empty" />
                    </span>
                    {{ excludedDomainPattern }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <br />
    <div class="field">
      <button
        form="isolationDomainForm"
        class="ui button primary"
        :disabled="!domain.targetPattern.trim()"
      >
        <span v-if="editing">
          <transition name="fade">
            <span v-if="saved">
              <i class="check circle icon" />
              Saved
            </span>
            <span v-if="!saved">
              {{
                t('optionsIsolationPerDomainDoneEditing', domain.targetPattern)
              }}
            </span>
          </transition>
        </span>
        <span v-else>
          {{ t('optionsIsolationPerDomainAdd', domain.targetPattern) }}
        </span>
      </button>
    </div>
    <br />
    <div id="isolationDomainsAccordion" :class="{ 'ui accordion': popup }">
      <div
        v-if="!Object.keys(isolationDomains).length && !isolationDomainFilter"
        style="margin-top: 10px;"
        :class="{ content: popup }"
      >
        {{ t('optionsIsolationPerDomainNoIsolatedDomainsAdded') }}
      </div>
      <div v-else :class="{ content: popup }">
        <div :class="{ title: popup }">
          <i v-if="popup" class="dropdown icon" />
          <span
            v-if="
              Object.keys(isolationDomains).length > 1 || isolationDomainFilter
            "
            class="ui icon mini input"
            style="margin-right: 10px;"
          >
            <input
              ref="isolationDomainFilter"
              v-model="isolationDomainFilter"
              type="text"
              size="15"
              :placeholder="t('optionsIsolationPerDomainFilterIsolatedDomains')"
              @focus="expandIsolationDomainFilter"
              @click="expandIsolationDomainFilter"
            />
            <i
              class="circular search link icon"
              @click="focusIsolationDomainFilter"
            />
          </span>
          <span v-else>
            <strong>{{ t('optionsIsolationPerDomainIsolatedDomains') }}</strong>
          </span>
        </div>
        <div :class="{ content: popup }">
          <div style="margin-top: 5px;" />
          <draggable
            v-model="isolationDomains"
            group="isolationDomains"
            @change="move"
          >
            <div
              v-for="isolatedDomain in isolationDomains"
              :key="isolatedDomain.pattern"
            >
              <span
                :data-tooltip="
                  t('optionsIsolationPerDomainEdit', isolatedDomain.pattern)
                "
                style="cursor: pointer;"
                data-position="right center"
                @click="edit(isolatedDomain._index)"
              >
                <i class="icon-pencil" style="color: #2185d0;" />
              </span>
              <span
                :data-tooltip="
                  t('optionsIsolationPerDomainRemove', isolatedDomain.pattern)
                "
                data-position="right center"
                style="color: red; cursor: pointer;"
                @click="remove(isolatedDomain._index, isolatedDomain.pattern)"
              >
                <i class="icon-trash-empty" />
              </span>
              <span
                :data-tooltip="
                  !popup && isolationDomains.length > 1
                    ? t('optionsIsolationPerDomainDragTooltip')
                    : undefined
                "
                data-position="right center"
                :style="isolationDomains.length > 1 ? 'cursor: grab' : ''"
              >
                <i
                  v-if="isolationDomains.length > 1"
                  class="hand rock icon"
                  style="color: #2185d0; margin-left: 3px; opacity: 0.8;"
                />
              </span>
              {{ isolatedDomain.pattern }}
            </div>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>
