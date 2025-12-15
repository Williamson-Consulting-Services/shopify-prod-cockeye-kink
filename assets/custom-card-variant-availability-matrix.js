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
          console.warn('[AvailabilityMatrix] No variants to build matrix');
          this.matrix = {};
          this.variantMap = {};
          return;
        }

        console.group('[AvailabilityMatrix] Building matrix');
        console.log('Variants:', this.variants.length);

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

          // Store availability and quantity
          // Shopify already handles inventory tracking - variant.available reflects the actual availability
          // We store quantity for display purposes (if inventory is tracked)
          let quantity;
          if (variant.available) {
            // Variant is available - store quantity if tracked, otherwise use -1 to indicate "available but quantity unknown"
            if (variant.inventory_management === 'shopify' && variant.inventory_quantity !== null) {
              quantity = variant.inventory_quantity || 0;
              // If multiple variants have same combination (shouldn't happen, but handle it), sum quantities
              if (matrix[combinationKey] === undefined) {
                matrix[combinationKey] = quantity;
              } else {
                matrix[combinationKey] += quantity;
              }
            } else {
              // Available but quantity not tracked
              if (matrix[combinationKey] === undefined || matrix[combinationKey] < 0) {
                matrix[combinationKey] = -1; // -1 means available but quantity unknown
              }
              quantity = matrix[combinationKey];
            }
          } else {
            // Variant is not available
            if (matrix[combinationKey] === undefined) {
              matrix[combinationKey] = 0;
            }
            quantity = 0;
          }

          // DEBUG: Log each variant
          console.log(`Variant ${variant.id} (SKU: ${variant.sku || 'N/A'}):`, {
            combinationKey,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            inventory_management: variant.inventory_management,
            inventory_quantity: variant.inventory_quantity,
            available: variant.available,
            matrixQuantity: quantity,
          });
        });

        this.matrix = matrix;
        this.variantMap = variantMap;

        console.log('Matrix built:', Object.keys(matrix).length, 'combinations');
        console.log('Matrix contents:', matrix);
        console.groupEnd();
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
