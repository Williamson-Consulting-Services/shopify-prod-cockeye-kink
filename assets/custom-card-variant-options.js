/**
 * Custom Card Variant Options
 * Main controller for interactive variant selection on product cards
 * Uses modular components for maintainability
 */

// Prevent redeclaration if script is loaded multiple times
if (typeof CustomCardVariantOptions === 'undefined') {
  window.CustomCardVariantOptions = (function () {
    'use strict';

    class CustomCardVariantOptions {
      constructor(container) {
        this.container = container;
        this.card = container.closest('.card-wrapper');
        if (!this.card) return;

        // State
        this.product = null;
        this.variants = [];
        this.selectedOptions = {}; // { optionName: value }
        this.isLoading = false;
        this.dataLoaded = false;

        // Configuration
        this.config = this.parseConfig();
        this.translations = this.parseTranslations();

        // Modules
        this.availabilityMatrix = null;
        this.imageHandler = null;
        this.uiUpdater = null;

        // Lazy loading observer
        this.observer = null;

        // Initialize
        this.init();
      }

      parseConfig() {
        const config = {
          productId: this.container.getAttribute('data-product-id'),
          colorPosition: parseInt(this.container.getAttribute('data-color-position')) || null,
          sizePosition: parseInt(this.container.getAttribute('data-size-position')) || null,
          otherOptions: {},
        };

        // Parse other options
        const otherOptionsData = this.container.getAttribute('data-other-options');
        if (otherOptionsData) {
          otherOptionsData.split(',').forEach((optionData) => {
            const parts = optionData.split(':');
            if (parts.length === 2) {
              config.otherOptions[parts[0]] = parseInt(parts[1]);
            }
          });
        }

        return config;
      }

      parseTranslations() {
        return {
          addToCart: this.container.getAttribute('data-translation-add-to-cart') || 'Add to cart',
          soldOut: this.container.getAttribute('data-translation-sold-out') || 'Sold out',
          chooseOptions: this.container.getAttribute('data-translation-choose-options') || 'Choose options',
          inStockTemplate:
            this.container.getAttribute('data-translation-in-stock-template') || 'QUANTITY_PLACEHOLDER in stock',
          lowStockTemplate:
            this.container.getAttribute('data-translation-low-stock-template') ||
            'Low stock: QUANTITY_PLACEHOLDER left',
        };
      }

      init() {
        // Initialize image handler
        if (window.CustomCardVariantImageHandler) {
          this.imageHandler = new window.CustomCardVariantImageHandler(this.card, [], null, this.config);
        }

        // Initialize UI updater
        if (window.CustomCardVariantUIUpdater) {
          this.uiUpdater = new window.CustomCardVariantUIUpdater(
            this.container,
            this.card,
            this.config,
            this.translations,
            null,
            [],
          );
        }

        this.setupEventListeners();
        this.setupLazyLoading();
        this.setupQuickAddIntegration();
      }

      setupLazyLoading() {
        // Use IntersectionObserver to lazy load product data when card is near viewport
        if ('IntersectionObserver' in window) {
          this.observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting && !this.dataLoaded && !this.isLoading) {
                  this.loadProductData();
                  // Unobserve after loading starts
                  if (this.observer) {
                    this.observer.unobserve(this.card);
                  }
                }
              });
            },
            {
              rootMargin: '200px', // Start loading 200px before card enters viewport
              threshold: 0.01,
            },
          );

          this.observer.observe(this.card);
        } else {
          // Fallback: load immediately if IntersectionObserver not supported
          this.loadProductData();
        }
      }

      async loadProductData() {
        if (!this.config.productId || this.isLoading || this.dataLoaded) return;

        const productLink = this.card.querySelector('a[href*="/products/"]');
        if (!productLink) return;

        const urlMatch = productLink.href.match(/\/products\/([^\/\?]+)/);
        if (!urlMatch) return;

        try {
          this.isLoading = true;
          const response = await fetch(`/products/${urlMatch[1]}.js`);
          if (response.ok) {
            this.product = await response.json();
            this.variants = this.product.variants || [];

            // DEBUG: Log product and variant data
            console.group(`[CustomCardVariantOptions] Product Loaded: ${this.product.title || urlMatch[1]}`);
            console.log('Product ID:', this.product.id);
            console.log('Product Handle:', urlMatch[1]);
            console.log('Total Variants:', this.variants.length);
            console.log('Config:', {
              colorPosition: this.config.colorPosition,
              sizePosition: this.config.sizePosition,
              otherOptions: this.config.otherOptions
            });

            // DEBUG: Log all variants with details
            console.log('Variants:', this.variants.map((v) => ({
              id: v.id,
              sku: v.sku || 'N/A',
              title: v.title,
              option1: v.option1,
              option2: v.option2,
              option3: v.option3,
              available: v.available,
              inventory_management: v.inventory_management,
              inventory_quantity: v.inventory_quantity,
              inventory_policy: v.inventory_policy
            })));

            // Build availability matrix
            if (window.CustomCardVariantAvailabilityMatrix) {
              this.availabilityMatrix = new window.CustomCardVariantAvailabilityMatrix(this.variants);

              // DEBUG: Log availability matrix
              console.log('Availability Matrix:', this.availabilityMatrix.matrix);
              console.log('Variant Map Keys:', Object.keys(this.availabilityMatrix.variantMap || {}));
            }

            // Update modules
            if (this.imageHandler) {
              this.imageHandler.updateVariants(this.variants);
              this.imageHandler.updateProduct(this.product);
            }

            if (this.uiUpdater) {
              this.uiUpdater.updateVariants(this.variants);
              this.uiUpdater.updateAvailabilityMatrix(this.availabilityMatrix);
            }

            this.dataLoaded = true;
            this.updateAllAvailability();
            this.updateAddToCartButton();
            this.updateInventoryDisplay();

            // Update image if color already selected
            if (this.getSelectedColor() && this.imageHandler) {
              this.imageHandler.updateImage(this.getSelectedColor(), false);
            }

            console.groupEnd();
          }
        } catch (error) {
          console.warn('Could not load product data:', error);
        } finally {
          this.isLoading = false;
        }
      }

      setupEventListeners() {
        // Color swatch clicks
        this.container.querySelectorAll('[data-option-type="color"]').forEach((option) => {
          option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.selectOption('color', option.getAttribute('data-option-value'));
            return false;
          });

          // Hover for image preview (load data if needed)
          option.addEventListener('mouseenter', () => {
            // Trigger data load if not loaded yet
            if (!this.dataLoaded && !this.isLoading) {
              this.loadProductData();
            }
            const colorValue = option.getAttribute('data-option-value');
            if (this.imageHandler) {
              this.imageHandler.updateImage(colorValue, true);
            }
          });

          option.addEventListener('mouseleave', () => {
            const selectedColor = this.getSelectedColor();
            if (this.imageHandler) {
              if (selectedColor) {
                this.imageHandler.updateImage(selectedColor, false);
              } else {
                this.imageHandler.restoreDefaultImage();
              }
            }
          });
        });

        // Size button clicks
        this.container.querySelectorAll('[data-option-type="size"]').forEach((option) => {
          option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.selectOption('size', option.getAttribute('data-option-value'));
            return false;
          });
        });

        // Other option clicks
        this.container.querySelectorAll('[data-option-type="other"]').forEach((option) => {
          option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const optionName = option.getAttribute('data-option-name');
            const optionValue = option.getAttribute('data-option-value');
            this.selectOption(optionName, optionValue);
            return false;
          });
        });
      }

      selectOption(optionName, value) {
        // Normalize option name
        const normalizedName = this.normalizeOptionName(optionName);

        // Update selection
        if (value) {
          this.selectedOptions[normalizedName] = value;
        } else {
          delete this.selectedOptions[normalizedName];
        }

        // Update UI
        this.updateSelectionUI(normalizedName, value);
        this.updateAllAvailability();
        this.updateAddToCartButton();
        this.updateInventoryDisplay();

        // Update image if color selected
        if (normalizedName === 'color' && value && this.imageHandler) {
          this.imageHandler.updateImage(value, false);
        }
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

      updateSelectionUI(optionName, value) {
        // Remove previous selection for this option
        const previousSelected = this.container.querySelector(
          `[data-option-type="${optionName === 'color' ? 'color' : optionName === 'size' ? 'size' : 'other'}"].custom-card-variant-options__option--selected`,
        );
        if (previousSelected) {
          previousSelected.classList.remove('custom-card-variant-options__option--selected');
        }

        // Add selection to clicked option
        if (value) {
          const selector =
            optionName === 'color'
              ? `[data-option-type="color"][data-option-value="${this.escapeSelector(value)}"]`
              : optionName === 'size'
                ? `[data-option-type="size"][data-option-value="${this.escapeSelector(value)}"]`
                : `[data-option-type="other"][data-option-name="${this.escapeSelector(optionName)}"][data-option-value="${this.escapeSelector(value)}"]`;

          const selectedOption = this.container.querySelector(selector);
          if (selectedOption) {
            selectedOption.classList.add('custom-card-variant-options__option--selected');
          }
        }
      }

      escapeSelector(str) {
        return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
      }

      getSelectedColor() {
        return this.selectedOptions.color || null;
      }

      getSelectedSize() {
        return this.selectedOptions.size || null;
      }

      findMatchingVariant() {
        if (!this.variants.length) {
          console.warn('[CustomCardVariantOptions] findMatchingVariant: No variants available');
          return null;
        }

        console.group('[CustomCardVariantOptions] findMatchingVariant');
        console.log('Selected Options:', this.selectedOptions);
        console.log('Config:', this.config);

        // Use variant map if available (faster lookup)
        if (this.availabilityMatrix && this.availabilityMatrix.variantMap) {
          const selections = {};

          // Build selections object with position keys
          if (this.getSelectedColor() && this.config.colorPosition) {
            selections[`option${this.config.colorPosition}`] = this.getSelectedColor();
          }
          if (this.getSelectedSize() && this.config.sizePosition) {
            selections[`option${this.config.sizePosition}`] = this.getSelectedSize();
          }

          // Add other selected options
          Object.keys(this.selectedOptions).forEach((key) => {
            if (key !== 'color' && key !== 'size') {
              const position = this.config.otherOptions[key];
              if (position) {
                selections[`option${position}`] = this.selectedOptions[key];
              }
            }
          });

          console.log('Looking up variant with selections:', selections);
          const variant = this.availabilityMatrix.getVariant(selections, this.config);
          if (variant) {
            console.log('Found variant via matrix:', {
              id: variant.id,
              sku: variant.sku || 'N/A',
              option1: variant.option1,
              option2: variant.option2,
              option3: variant.option3,
              inventory_quantity: variant.inventory_quantity,
              available: variant.available
            });
            console.groupEnd();
            return variant;
          }
          console.log('No variant found via matrix, trying fallback');
        }

        // Fallback to searching variants
        const color = this.getSelectedColor();
        const size = this.getSelectedSize();
        const otherSelections = {};

        // Get other selected options
        Object.keys(this.selectedOptions).forEach((key) => {
          if (key !== 'color' && key !== 'size') {
            otherSelections[key] = this.selectedOptions[key];
          }
        });

        console.log('Fallback search:', { color, size, otherSelections });
        const variant = this.variants.find((variant) => {
          // Check color
          if (color && this.config.colorPosition) {
            const variantColor = this.getVariantOptionValue(variant, this.config.colorPosition);
            if (variantColor !== color) return false;
          }

          // Check size
          if (size && this.config.sizePosition) {
            const variantSize = this.getVariantOptionValue(variant, this.config.sizePosition);
            if (variantSize !== size) return false;
          }

          // Check other options
          for (const optionName in otherSelections) {
            const position = this.config.otherOptions[optionName];
            if (position) {
              const variantValue = this.getVariantOptionValue(variant, position);
              if (variantValue !== otherSelections[optionName]) return false;
            }
          }

          return true;
        });

        if (variant) {
          console.log('Found variant via fallback:', {
            id: variant.id,
            sku: variant.sku || 'N/A',
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            inventory_quantity: variant.inventory_quantity,
            available: variant.available
          });
        } else {
          console.warn('No matching variant found');
        }
        console.groupEnd();
        return variant;
      }

      getVariantOptionValue(variant, position) {
        if (position === 1) return variant.option1 || '';
        if (position === 2) return variant.option2 || '';
        if (position === 3) return variant.option3 || '';
        return '';
      }

      updateAllAvailability() {
        console.log('[CustomCardVariantOptions] updateAllAvailability called');
        if (this.uiUpdater) {
          this.uiUpdater.updateAllAvailability(this.selectedOptions);
        } else {
          console.warn('[CustomCardVariantOptions] UI Updater not initialized');
        }
      }

      updateAddToCartButton() {
        if (this.uiUpdater) {
          this.uiUpdater.updateAddToCartButton(this.selectedOptions, () => this.findMatchingVariant());
        }
      }

      updateInventoryDisplay() {
        if (this.uiUpdater) {
          this.uiUpdater.updateInventoryDisplay(
            this.selectedOptions,
            () => this.findMatchingVariant(),
            this.availabilityMatrix,
          );
        }
      }

      setupQuickAddIntegration() {
        const quickAddButton = this.card.querySelector('.quick-add__submit[data-product-url]');
        if (!quickAddButton) return;

        // Intercept quick add button click for direct add
        quickAddButton.addEventListener(
          'click',
          (e) => {
            if (quickAddButton.getAttribute('data-direct-add') === 'true') {
              const variantId = quickAddButton.getAttribute('data-selected-variant-id');
              if (variantId) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.addToCartDirectly(variantId, quickAddButton);
                return false;
              }
            }
          },
          true,
        ); // Capture phase

        // Listen for modal to pre-select variant
        document.addEventListener('product-info:loaded', (event) => {
          const modal = event.target.closest('quick-add-modal');
          if (modal && this.card.contains(event.target)) {
            this.preselectVariantInModal(modal);
          }
        });
      }

      async addToCartDirectly(variantId, button) {
        if (!variantId) return;

        button.disabled = true;
        button.classList.add('loading');

        try {
          const routes = window.Shopify && window.Shopify.routes ? window.Shopify.routes : {};
          const cartAddUrl = routes.cart_add_url || '/cart/add.js';

          const formData = new FormData();
          formData.append('id', variantId);
          formData.append('quantity', 1);

          const response = await fetch(cartAddUrl, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (typeof publish === 'function') {
              publish('cartUpdate', {
                cartState: data,
                itemCount: data.item_count,
                customOrderItemAdded: true,
                source: 'product-card',
              });
            }
          }
        } catch (error) {
          console.error('Error adding to cart:', error);
        } finally {
          button.disabled = false;
          button.classList.remove('loading');
        }
      }

      preselectVariantInModal(modal) {
        const quickAddButton = this.card.querySelector('.quick-add__submit[data-preselect-variant-id]');
        if (!quickAddButton) return;

        const variantId = quickAddButton.getAttribute('data-preselect-variant-id');
        if (!variantId) return;

        setTimeout(() => {
          const modalContent = modal.querySelector('[id^="QuickAddInfo-"]');
          if (!modalContent) return;

          const variantSelects = modalContent.querySelector('variant-selects');
          if (!variantSelects) return;

          const variantIdInput = modalContent.querySelector('.product-variant-id');
          if (variantIdInput) {
            variantIdInput.value = variantId;
          }

          // Pre-select color
          const selectedColor = this.getSelectedColor();
          if (selectedColor) {
            const colorInputs = modalContent.querySelectorAll('input[type="radio"][name*="olor" i]');
            colorInputs.forEach((input) => {
              if (input.value === selectedColor) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          }

          // Pre-select size
          const selectedSize = this.getSelectedSize();
          if (selectedSize) {
            const sizeInputs = modalContent.querySelectorAll('input[type="radio"][name*="ize" i]');
            sizeInputs.forEach((input) => {
              if (input.value === selectedSize) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          }

          // Trigger variant update
          if (variantSelects.updateOptions) {
            variantSelects.updateOptions();
          }
        }, 100);
      }
    }

    // Initialize on page load
    function init() {
      document.querySelectorAll('.custom-card-variant-options').forEach((container) => {
        new CustomCardVariantOptions(container);
      });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // Re-initialize when new cards are loaded (e.g., via AJAX)
    if (typeof CustomElements !== 'undefined' && CustomElements.observe) {
      CustomElements.observe('.custom-card-variant-options', (container) => {
        new CustomCardVariantOptions(container);
      });
    }

    return CustomCardVariantOptions;
  })();
}
