<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mixin } from '~/ui/mixin';

export default mixins(mixin).extend({
  props: {
    action: {
      type: String,
      required: true,
    },
    glossary: {
      type: String,
      default: '',
    },
    glossaryLabel: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
    perdomain: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    action(newAction): void {
      this.$emit('update:action', newAction);
    },
  },
});
</script>

<template>
  <div class="field">
    <label>
      <span
        v-if="glossary"
        :data-glossary="glossary"
        :data-glossary-label="glossaryLabel"
        :data-glossary-section="perdomain ? 'Per Domain' : 'Global'"
      />
      <span v-else>
        {{ label }}
      </span>
    </label>
    <select v-model="action" class="ui fluid dropdown">
      <option v-if="perdomain" value="global">
        {{ t('optionsIsolationSettingsGlobal') }}
      </option>
      <option value="never">
        {{ t('optionsIsolationSettingsNever') }}
      </option>
      <!--      <option value="notsamedomain">-->
      <!--        {{ t('optionsIsolationSettingsNotSameDomain') }}-->
      <!--      </option>-->
      <!--      <option value="notsamedomainexact">-->
      <!--        {{ t('optionsIsolationSettingsNotSameDomainExact') }}-->
      <!--      </option>-->
      <option value="always">
        {{ t('optionsIsolationSettingsAlways') }}
      </option>
    </select>
  </div>
</template>
