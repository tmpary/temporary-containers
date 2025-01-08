<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mixin } from '~/ui/mixin';
import { DomainPatternType, ToolTip } from '~/types';

export default mixins(mixin).extend({
  props: {
    id: {
      type: String,
      required: true,
    },
    tooltip: {
      type: Object,
      default: (): ToolTip => ({
        hidden: false,
        position: 'bottom left',
      }),
    },
    type: {
      type: String as () => DomainPatternType,
      default: 'origin',
    },
    domainPattern: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    glossary: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    getLabelTranslation() {
      switch (this.type) {
        case 'target':
          return this.t('optionsTargetPattern');
        case 'origin':
          return this.t('optionsOptionalOriginPattern');
        case 'exclusion':
          return this.t('optionsExclusionPattern');
      }
    },
    getExamplePlaceholder() {
      const placeholders = ['*.example.com', 'www.example.com', 'example.com'];
      return placeholders[Math.floor(Math.random() * placeholders.length)];
    },
  },
  watch: {
    domainPattern(newDomainPattern): void {
      this.$emit('update:domainPattern', newDomainPattern);
    },
  },
});
</script>
<template>
  <div
    :id="`${id}Div`"
    ref="div"
    class="field input"
    :class="{ disabled: disabled }"
  >
    <label>
      <span v-if="glossary" data-glossary="Domain Pattern" />
      <span v-else>{{ getLabelTranslation() }}</span>
    </label>
    <input
      :id="id"
      v-model="domainPattern"
      type="text"
      :placeholder="getExamplePlaceholder()"
    />
  </div>
</template>
