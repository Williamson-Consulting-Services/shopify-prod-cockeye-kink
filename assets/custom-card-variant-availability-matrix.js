/**
 * Availability Matrix Module
 * Handles building and querying the variant availability matrix
 */

if (typeof CustomCardVariantAvailabilityMatrix === 'undefined') {
  window.CustomCardVariantAvailabilityMatrix = (function () {
    'use strict';

    class AvailabilityMatrix {
      constructor(variants) {
        this.variants = variants || [];
        this.matrix = null; // { 'option1:value1|option2:value2': quantity }
        this.variantMap = null; // { 'option1:value1|option2:value2': variant }
        this.build();
      }

      build() {
        if (!this.variants.length) {
          this.matrix = {};
          this.variantMap = {};
          return;
        }

        const matrix = {};
        const variantMap = {};

        this.variants.forEach((variant) => {
          // Build a key from all option values for this variant
          const optionKeys = [];
          const optionValues = {};

          // Get all option values for this variant
          if (variant.option1) {
            optionKeys.push(`option1:${variant.option1}`);
            optionValues['option1'] = variant.option1;
          }
          if (variant.option2) {
            optionKeys.push(`option2:${variant.option2}`);
            optionValues['option2'] = variant.option2;
          }
          if (variant.option3) {
            optionKeys.push(`option3:${variant.option3}`);
            optionValues['option3'] = variant.option3;
          }

          // Create a unique key for this combination
          const combinationKey = optionKeys.sort().join('|');

          // Store variant for this combination
          variantMap[combinationKey] = variant;

          // Store quantity if inventory is tracked, otherwise mark as available
          if (variant.inventory_management === 'shopify') {
            const quantity = variant.inventory_quantity || 0;
            // If multiple variants have same combination (shouldn't happen, but handle it), sum quantities
            if (matrix[combinationKey] === undefined) {
              matrix[combinationKey] = quantity;
            } else {
              matrix[combinationKey] += quantity;
            }
          } else {
            // Not tracked = available (use -1 to indicate "available but quantity unknown")
            if (matrix[combinationKey] === undefined || matrix[combinationKey] < 0) {
              matrix[combinationKey] = variant.available ? -1 : 0;
            }
          }
        });

        this.matrix = matrix;
        this.variantMap = variantMap;
      }

      buildCombinationKey(selections, config) {
        // Build a key from selected options
        // selections: { optionName: value } or { optionPosition: value }
        const optionKeys = [];

        // Check all possible option positions
        for (let position = 1; position <= 3; position++) {
          let value = null;

          // Try to find value by position in selections
          const positionKey = `option${position}`;
          if (selections[positionKey]) {
            value = selections[positionKey];
          } else {
            // Try to find by option name mapping
            for (const optionName in selections) {
              if (optionName === 'color' || optionName === 'size') {
                const normalizedName = this.normalizeOptionName(optionName);
                let optionPosition = null;

                if (normalizedName === 'color' && config.colorPosition === position) {
                  optionPosition = config.colorPosition;
                } else if (normalizedName === 'size' && config.sizePosition === position) {
                  optionPosition = config.sizePosition;
                } else if (config.otherOptions && config.otherOptions[optionName] === position) {
                  optionPosition = config.otherOptions[optionName];
                }

                if (optionPosition === position) {
                  value = selections[optionName];
                  break;
                }
              } else if (config.otherOptions && config.otherOptions[optionName] === position) {
                value = selections[optionName];
                break;
              }
            }
          }

          if (value) {
            optionKeys.push(`option${position}:${value}`);
          }
        }

        return optionKeys.sort().join('|');
      }

      normalizeOptionName(name) {
        const lower = name.toLowerCase();
        if (lower === 'color' || lower === 'colour' || lower === 'trim color' || lower === 'trim colour') {
          return 'color';
        }
        if (lower === 'size') {
          return 'size';
        }
        return name;
      }

      getAvailability(selections, config) {
        // selections can be:
        // - { color: 'Red', size: 'Large' }
        // - { option1: 'Red', option2: 'Large' }
        // - Any combination of option names/positions
        if (!this.matrix) return null;

        const combinationKey = this.buildCombinationKey(selections, config);
        return this.matrix[combinationKey] !== undefined ? this.matrix[combinationKey] : null;
      }

      getVariant(selections, config) {
        // Get the actual variant object for a combination
        if (!this.variantMap) return null;

        const combinationKey = this.buildCombinationKey(selections, config);
        return this.variantMap[combinationKey] || null;
      }

      updateVariants(variants) {
        this.variants = variants || [];
        this.build();
      }
    }

    return AvailabilityMatrix;
  })();
}
