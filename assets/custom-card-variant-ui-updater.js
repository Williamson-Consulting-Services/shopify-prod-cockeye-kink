/**
 * UI Updater Module
 * Handles updating availability states, buttons, and inventory display
 */

if (typeof CustomCardVariantUIUpdater === 'undefined') {
  window.CustomCardVariantUIUpdater = (function () {
    'use strict';

    // Debug configuration - enable/disable specific feature logging
    const DEBUG = {
      image: false, // Image handler updates
      availability: true, // Availability matrix and option availability
      variant: false, // Variant matching and selection
      cart: false, // Add to cart functionality
      general: false, // General operations
    };

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
          if (DEBUG.availability) console.warn('[UIUpdater] No variants available for availability check');
          return;
        }

        // Update color availability - check with current selections (excluding color itself)
        if (this.config.colorPosition) {
          this.container.querySelectorAll('[data-option-type="color"]').forEach((option) => {
            const colorValue = option.getAttribute('data-option-value');
            // Check availability with current selections (size, other options) but not this color
            const testSelections = this.buildTestSelections(selectedOptions, 'color');
            const isAvailable = this.checkOptionAvailability(
              'color',
              colorValue,
              this.config.colorPosition,
              testSelections,
            );
            this.setOptionAvailability(option, isAvailable);
          });
        }

        // Update size availability - check with current selections (excluding size itself)
        if (this.config.sizePosition) {
          this.container.querySelectorAll('[data-option-type="size"]').forEach((option) => {
            const sizeValue = option.getAttribute('data-option-value');
            // Check availability with current selections (color, other options) but not this size
            const testSelections = this.buildTestSelections(selectedOptions, 'size');
            const isAvailable = this.checkOptionAvailability(
              'size',
              sizeValue,
              this.config.sizePosition,
              testSelections,
            );
            this.setOptionAvailability(option, isAvailable);
          });
        }

        // Update other options availability - check with current selections (excluding this option)
        if (this.config.otherOptions) {
          Object.keys(this.config.otherOptions).forEach((optionName) => {
            const position = this.config.otherOptions[optionName];
            this.container
              .querySelectorAll(`[data-option-type="other"][data-option-name="${this.escapeSelector(optionName)}"]`)
              .forEach((option) => {
                const optionValue = option.getAttribute('data-option-value');
                // Check availability with current selections but not this option
                const testSelections = this.buildTestSelections(selectedOptions, optionName);
                const isAvailable = this.checkOptionAvailability(optionName, optionValue, position, testSelections);
                this.setOptionAvailability(option, isAvailable);
              });
          });
        }

        if (DEBUG.availability) console.groupEnd();
      }

      buildTestSelections(selectedOptions, excludeOptionName) {
        // Build test selections with current selections, excluding the option we're testing
        const testSelections = Object.assign({}, selectedOptions);
        const normalizedExclude = this.normalizeOptionName(excludeOptionName);
        delete testSelections[normalizedExclude];
        return testSelections;
      }

      checkOptionAvailability(optionName, optionValue, position, selectedOptions) {
        if (!this.variants.length) {
          if (DEBUG.availability)
            console.warn(`[UIUpdater] checkOptionAvailability: No variants for ${optionName}="${optionValue}"`);
          return true;
        }

        // Build test selections with current selections plus the option we're testing
        const testSelections = Object.assign({}, selectedOptions);
        const normalizedName = this.normalizeOptionName(optionName);
        testSelections[normalizedName] = optionValue;

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
              return isAvailable;
            }

            return false;
          });

          return result;
        }

        // Fallback to direct variant checking
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
            return isAvailable;
          }

          return false;
        });

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
          if (DEBUG.cart) console.warn('[UIUpdater] No add to cart button found');
          return;
        }

        // Check if product requires custom data entry (has "custom-" template)
        const hasCustomTemplate = this.container.getAttribute('data-has-custom-template') === 'true';
        if (hasCustomTemplate) {
          // Always show "Choose Options" for products requiring custom data entry
          // These products need measurements or other custom data before adding to cart
          this.updateButtonText(button, 'chooseOptions');
          if (quickAddButton) {
            quickAddButton.removeAttribute('data-selected-variant-id');
            quickAddButton.removeAttribute('data-direct-add');
          }
          return; // Exit early, don't process variant selection
        }

        // Check if all required options are selected
        const allRequiredSelected = this.hasAllRequiredOptionsSelected(selectedOptions);

        // Find matching variant
        const variant = findMatchingVariant();

        // Only show "Add to cart" if all required options are selected AND a variant is found
        if (variant && allRequiredSelected) {
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
          } else {
            if (DEBUG.cart) console.warn('[UIUpdater] No variant ID input found');
          }

          if (quickAddButton) {
            quickAddButton.setAttribute('data-selected-variant-id', variant.id);

            // Enable direct add when all required options are selected and variant is available
            if (allRequiredSelected && isAvailable) {
              quickAddButton.setAttribute('data-direct-add', 'true');
            } else {
              quickAddButton.removeAttribute('data-direct-add');
            }
          }

          // Update button text
          this.updateButtonText(button, isAvailable ? 'addToCart' : 'soldOut');
        } else {
          // Not all options selected or no matching variant
          if (DEBUG.cart && !variant) {
            console.warn('[UIUpdater] No matching variant found for selections:', selectedOptions);
          }

          if (quickAddButton) {
            quickAddButton.removeAttribute('data-selected-variant-id');
            quickAddButton.removeAttribute('data-direct-add');
          }

          // Check if all variants are unavailable
          const allUnavailable = this.checkIfAllVariantsUnavailable();
          this.updateButtonText(button, allUnavailable ? 'soldOut' : 'chooseOptions');
        }
      }

      hasAllRequiredOptionsSelected(selectedOptions) {
        if (!this.config) return false;

        // Check color option (if exists)
        if (this.config.colorPosition) {
          if (!selectedOptions.color) {
            return false;
          }
        }

        // Check size option (if exists)
        if (this.config.sizePosition) {
          if (!selectedOptions.size) {
            return false;
          }
        }

        // Check other options (if any exist)
        if (this.config.otherOptions && Object.keys(this.config.otherOptions).length > 0) {
          for (const optionName in this.config.otherOptions) {
            if (!selectedOptions[optionName]) {
              return false;
            }
          }
        }

        return true;
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
