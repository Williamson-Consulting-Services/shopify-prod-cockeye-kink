/**
 * UI Updater Module
 * Handles updating availability states, buttons, and inventory display
 */

if (typeof CustomCardVariantUIUpdater === 'undefined') {
  window.CustomCardVariantUIUpdater = (function () {
    'use strict';

    class UIUpdater {
      constructor(container, card, config, translations, availabilityMatrix, variants) {
        this.container = container;
        this.card = card;
        this.config = config;
        this.translations = translations;
        this.availabilityMatrix = availabilityMatrix;
        this.variants = variants || [];
      }

      updateAllAvailability(selectedOptions) {
        if (!this.variants.length) {
          console.warn('[UIUpdater] No variants available for availability check');
          return;
        }

        // DEBUG: Log current state
        console.group('[UIUpdater] updateAllAvailability');
        console.log('Selected Options:', selectedOptions);
        console.log('Variants Count:', this.variants.length);
        console.log('Config:', this.config);

        // Only mark options as unavailable if they're truly unavailable (no variants exist)
        // Don't grey out options based on current selections - just highlight selected ones
        // The initial availability is set in Liquid, we only update if variants change

        // Update color availability - check if option has any available variants
        if (this.config.colorPosition) {
          this.container.querySelectorAll('[data-option-type="color"]').forEach((option) => {
            const colorValue = option.getAttribute('data-option-value');
            // Only check if this option has any available variants at all (not based on current selections)
            const isAvailable = this.checkOptionAvailability(
              'color',
              colorValue,
              this.config.colorPosition,
              {}, // Check without current selections - just if option exists
            );
            console.log(`Color "${colorValue}": ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
            this.setOptionAvailability(option, isAvailable);
          });
        }

        // Update size availability - check if option has any available variants
        if (this.config.sizePosition) {
          this.container.querySelectorAll('[data-option-type="size"]').forEach((option) => {
            const sizeValue = option.getAttribute('data-option-value');
            // Only check if this option has any available variants at all (not based on current selections)
            const isAvailable = this.checkOptionAvailability(
              'size',
              sizeValue,
              this.config.sizePosition,
              {}, // Check without current selections - just if option exists
            );
            console.log(`Size "${sizeValue}": ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
            this.setOptionAvailability(option, isAvailable);
          });
        }

        // Update other options availability - check if option has any available variants
        if (this.config.otherOptions) {
          Object.keys(this.config.otherOptions).forEach((optionName) => {
            const position = this.config.otherOptions[optionName];
            this.container
              .querySelectorAll(`[data-option-type="other"][data-option-name="${this.escapeSelector(optionName)}"]`)
              .forEach((option) => {
                const optionValue = option.getAttribute('data-option-value');
                // Only check if this option has any available variants at all (not based on current selections)
                const isAvailable = this.checkOptionAvailability(optionName, optionValue, position, {});
                console.log(`${optionName} "${optionValue}": ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
                this.setOptionAvailability(option, isAvailable);
              });
          });
        }

        console.groupEnd();
      }

      checkOptionAvailability(optionName, optionValue, position, selectedOptions) {
        if (!this.variants.length) {
          console.warn(`[UIUpdater] checkOptionAvailability: No variants for ${optionName}="${optionValue}"`);
          return true;
        }

        // Build test selections with current selections plus the option we're testing
        const testSelections = Object.assign({}, selectedOptions);
        const normalizedName = this.normalizeOptionName(optionName);
        testSelections[normalizedName] = optionValue;

        // DEBUG: Log what we're checking
        console.log(`[UIUpdater] Checking availability for ${optionName}="${optionValue}" (position ${position})`);
        console.log('  Test Selections:', testSelections);
        console.log('  Current Selections:', selectedOptions);

        // Use availability matrix if available
        if (this.availabilityMatrix && this.availabilityMatrix.matrix) {
          // Check if any variant combination exists with current selections + this option
          const result = this.variants.some((variant) => {
            // Check if this variant matches all current selections
            let matchesCurrentSelections = true;

            // Check each selected option
            for (const key in selectedOptions) {
              const selectedValue = selectedOptions[key];
              const normalizedKey = this.normalizeOptionName(key);
              let variantPosition = null;

              // Find the position for this option
              if (normalizedKey === 'color' && this.config.colorPosition) {
                variantPosition = this.config.colorPosition;
              } else if (normalizedKey === 'size' && this.config.sizePosition) {
                variantPosition = this.config.sizePosition;
              } else if (this.config.otherOptions && this.config.otherOptions[key]) {
                variantPosition = this.config.otherOptions[key];
              }

              if (variantPosition) {
                const variantValue = this.getVariantOptionValue(variant, variantPosition);
                if (variantValue !== selectedValue) {
                  matchesCurrentSelections = false;
                }
              }
            }

            // Check if this variant has the option value we're testing
            let matchesTestOption = false;
            if (position) {
              const variantValue = this.getVariantOptionValue(variant, position);
              if (variantValue === optionValue) {
                matchesTestOption = true;
              }
            }

            // If variant matches all current selections and the test option, check availability
            if (matchesCurrentSelections && matchesTestOption) {
              const isAvailable = this.isVariantAvailable(variant);
              console.log(`  Variant ${variant.id} (${variant.sku || 'N/A'}): ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`, {
                option1: variant.option1,
                option2: variant.option2,
                option3: variant.option3,
                inventory_management: variant.inventory_management,
                inventory_quantity: variant.inventory_quantity,
                available: variant.available
              });
              return isAvailable;
            }

            return false;
          });

          console.log(`  Result: ${result ? 'AVAILABLE' : 'UNAVAILABLE'}`);
          return result;
        }

        // Fallback to direct variant checking
        console.log('  Using fallback variant checking (no matrix)');
        const result = this.variants.some((variant) => {
          let matches = true;

          // Check color
          if (selectedOptions.color && this.config.colorPosition) {
            const variantColor = this.getVariantOptionValue(variant, this.config.colorPosition);
            if (variantColor !== selectedOptions.color) matches = false;
          }

          // Check size
          if (selectedOptions.size && this.config.sizePosition) {
            const variantSize = this.getVariantOptionValue(variant, this.config.sizePosition);
            if (variantSize !== selectedOptions.size) matches = false;
          }

          // Check the option we're testing
          if (position) {
            const variantValue = this.getVariantOptionValue(variant, position);
            if (variantValue !== optionValue) matches = false;
          }

          // Check other selected options
          for (const key in testSelections) {
            if (key !== optionName && key !== 'color' && key !== 'size') {
              const otherPosition = this.config.otherOptions && this.config.otherOptions[key];
              if (otherPosition) {
                const variantValue = this.getVariantOptionValue(variant, otherPosition);
                if (variantValue !== testSelections[key]) matches = false;
              }
            }
          }

          if (matches) {
            const isAvailable = this.isVariantAvailable(variant);
            console.log(`  Variant ${variant.id} (${variant.sku || 'N/A'}): ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`, {
              option1: variant.option1,
              option2: variant.option2,
              option3: variant.option3,
              inventory_management: variant.inventory_management,
              inventory_quantity: variant.inventory_quantity,
              available: variant.available
            });
            return isAvailable;
          }

          return false;
        });

        console.log(`  Result: ${result ? 'AVAILABLE' : 'UNAVAILABLE'}`);
        return result;
      }

      getVariantOptionValue(variant, position) {
        if (position === 1) return variant.option1 || '';
        if (position === 2) return variant.option2 || '';
        if (position === 3) return variant.option3 || '';
        return '';
      }

      isVariantAvailable(variant) {
        if (!variant) return false;
        // Shopify already handles inventory tracking and sets variant.available accordingly
        return variant.available === true;
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

      setOptionAvailability(option, isAvailable) {
        if (isAvailable) {
          option.classList.remove('custom-card-variant-options__option--unavailable');
        } else {
          option.classList.add('custom-card-variant-options__option--unavailable');
        }
      }

      escapeSelector(str) {
        return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
      }

      updateAddToCartButton(selectedOptions, findMatchingVariant) {
        const addToCartButton = this.card.querySelector('[data-type="add-to-cart-form"] button[type="submit"]');
        const quickAddButton = this.card.querySelector('.quick-add__submit');
        const button = addToCartButton || quickAddButton;
        if (!button) {
          console.warn('[UIUpdater] No add to cart button found');
          return;
        }

        // Find matching variant
        const variant = findMatchingVariant();

        if (variant) {
          const isAvailable = this.isVariantAvailable(variant);

          // Update variant ID - check multiple possible selectors
          let variantIdInput = this.card.querySelector('.product-variant-id');
          if (!variantIdInput) {
            variantIdInput = this.card.querySelector('input[name="id"]');
          }
          if (!variantIdInput) {
            variantIdInput = this.card.querySelector('input[type="hidden"][name="id"]');
          }

          if (variantIdInput) {
            variantIdInput.value = variant.id;
            variantIdInput.disabled = !isAvailable;
            console.log('[UIUpdater] Updated variant ID input:', variant.id);
          } else {
            console.warn('[UIUpdater] No variant ID input found');
          }

          if (quickAddButton) {
            quickAddButton.setAttribute('data-selected-variant-id', variant.id);
            console.log('[UIUpdater] Set data-selected-variant-id:', variant.id);

            // Check if we can add directly (only color and size)
            const hasOnlyColorAndSize = this.hasOnlyColorAndSize();
            if (hasOnlyColorAndSize && selectedOptions.color && selectedOptions.size) {
              quickAddButton.setAttribute('data-direct-add', 'true');
              console.log('[UIUpdater] Enabled direct add to cart');
            } else {
              quickAddButton.removeAttribute('data-direct-add');
              console.log('[UIUpdater] Disabled direct add (requires modal)');
            }
          }

          // Update button text
          this.updateButtonText(button, isAvailable ? 'addToCart' : 'soldOut');
        } else {
          // No matching variant
          console.warn('[UIUpdater] No matching variant found for selections:', selectedOptions);

          if (quickAddButton) {
            quickAddButton.removeAttribute('data-selected-variant-id');
            quickAddButton.removeAttribute('data-direct-add');
          }

          // Check if all variants are unavailable
          const allUnavailable = this.checkIfAllVariantsUnavailable();
          this.updateButtonText(button, allUnavailable ? 'soldOut' : 'chooseOptions');
        }
      }

      hasOnlyColorAndSize() {
        if (!this.config) return false;
        const optionCount = Object.keys(this.config.otherOptions || {}).length;
        return optionCount === 0 && this.config.colorPosition && this.config.sizePosition;
      }

      checkIfAllVariantsUnavailable() {
        if (!this.variants.length) return false;
        return this.variants.every((variant) => !this.isVariantAvailable(variant));
      }

      updateButtonText(button, state) {
        const text =
          state === 'addToCart'
            ? this.translations.addToCart
            : state === 'soldOut'
              ? this.translations.soldOut
              : this.translations.chooseOptions;

        // Find text element
        let textElement = button.querySelector('span:first-child:not(.icon-wrap):not(.loading__spinner)');

        if (!textElement) {
          const textNodes = Array.from(button.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
          );
          if (textNodes.length > 0) {
            textElement = document.createElement('span');
            textElement.textContent = textNodes[0].textContent.trim();
            textNodes[0].replaceWith(textElement);
          }
        }

        if (textElement) {
          textElement.textContent = text;
        } else {
          // Fallback: update button text directly
          button.textContent = text;
        }

        // Update disabled state
        button.disabled = state === 'soldOut';
      }

      updateInventoryDisplay(selectedOptions, findMatchingVariant, availabilityMatrix) {
        const variant = findMatchingVariant();
        const inventoryDisplay = this.container.querySelector('.custom-card-variant-options__inventory');
        const inventoryText = this.container.querySelector('.custom-card-variant-options__inventory-text');

        if (!inventoryDisplay || !inventoryText) return;

        // Try to get quantity from availability matrix first (faster)
        let quantity = null;

        if (availabilityMatrix && availabilityMatrix.matrix) {
          // Build selections object with position keys
          const selections = {};

          if (selectedOptions.color && this.config.colorPosition) {
            selections[`option${this.config.colorPosition}`] = selectedOptions.color;
          }
          if (selectedOptions.size && this.config.sizePosition) {
            selections[`option${this.config.sizePosition}`] = selectedOptions.size;
          }

          // Add other selected options
          Object.keys(selectedOptions).forEach((key) => {
            if (key !== 'color' && key !== 'size') {
              const position = this.config.otherOptions && this.config.otherOptions[key];
              if (position) {
                selections[`option${position}`] = selectedOptions[key];
              }
            }
          });

          quantity = availabilityMatrix.getAvailability(selections, this.config);
        }

        // Fallback to variant if matrix doesn't have it
        if (quantity === null && variant) {
          // Shopify already handles inventory tracking - use variant.available
          if (variant.available) {
            // Available - get quantity if tracked
            if (variant.inventory_management === 'shopify' && variant.inventory_quantity !== null) {
              quantity = variant.inventory_quantity || 0;
            } else {
              quantity = -1; // -1 means available but quantity unknown
            }
          } else {
            quantity = 0; // Not available
          }
        }

        if (quantity === null || quantity === 0) {
          inventoryDisplay.style.display = 'none';
          return;
        }

        inventoryDisplay.style.display = 'block';
        const lowStockThreshold = 5;
        const isLowStock = quantity > 0 && quantity <= lowStockThreshold;

        let template = isLowStock ? this.translations.lowStockTemplate : this.translations.inStockTemplate;
        const message = template.replace(/QUANTITY_PLACEHOLDER/g, quantity > 0 ? quantity.toString() : '0');
        inventoryText.textContent = message;

        if (isLowStock) {
          inventoryDisplay.classList.add('custom-card-variant-options__inventory--low-stock');
        } else {
          inventoryDisplay.classList.remove('custom-card-variant-options__inventory--low-stock');
        }
      }

      updateVariants(variants) {
        this.variants = variants || [];
      }

      updateAvailabilityMatrix(availabilityMatrix) {
        this.availabilityMatrix = availabilityMatrix;
      }
    }

    return UIUpdater;
  })();
}
