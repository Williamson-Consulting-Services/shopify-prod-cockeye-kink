/**
 * Custom Card Variant Options
 * Main controller for interactive variant selection on product cards
 * Uses modular components for maintainability
 */

// Prevent redeclaration if script is loaded multiple times
if (typeof CustomCardVariantOptions === 'undefined') {
  window.CustomCardVariantOptions = (function () {
    'use strict';

    // Debug configuration - enable/disable specific feature logging
    const DEBUG = {
      image: false, // Image handler updates
      availability: false, // Availability matrix and option availability
      variant: false, // Variant matching and selection
      cart: false, // Add to cart functionality
      general: false, // General operations
    };

    class CustomCardVariantOptions {
      constructor(container) {
        this.container = container;
        this.card = container.closest('.card-wrapper');
        if (!this.card) return;

        // Prevent duplicate initialization on the same container
        if (this.container.dataset.ccvoInitialized === 'true') {
          return;
        }
        this.container.dataset.ccvoInitialized = 'true';

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

        // Cart update state
        this.cartUpdateUnsubscriber = null;
        this.isCartUpdating = false;

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
            if (DEBUG.variant || DEBUG.general) {
              console.group(`[CustomCardVariantOptions] Product Loaded: ${this.product.title || urlMatch[1]}`);
              console.log('Product ID:', this.product.id);
              console.log('Product Handle:', urlMatch[1]);
              console.log('Total Variants:', this.variants.length);
              console.log('Config:', {
                colorPosition: this.config.colorPosition,
                sizePosition: this.config.sizePosition,
                otherOptions: this.config.otherOptions,
              });

              // DEBUG: Log all variants with details
              if (DEBUG.variant) {
                console.log(
                  'Variants:',
                  this.variants.map((v) => ({
                    id: v.id,
                    sku: v.sku || 'N/A',
                    title: v.title,
                    option1: v.option1,
                    option2: v.option2,
                    option3: v.option3,
                    available: v.available,
                    inventory_management: v.inventory_management,
                    inventory_quantity: v.inventory_quantity,
                    inventory_policy: v.inventory_policy,
                  })),
                );
              }
            }

            // Build availability matrix
            if (window.CustomCardVariantAvailabilityMatrix) {
              this.availabilityMatrix = new window.CustomCardVariantAvailabilityMatrix(this.variants);

              // DEBUG: Log availability matrix
              if (DEBUG.availability) {
                console.log('Availability Matrix:', this.availabilityMatrix.matrix);
                console.log('Variant Map Keys:', Object.keys(this.availabilityMatrix.variantMap || {}));
              }
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
            const autoSelected = this.autoSelectSingleOptionValues();
            this.updateAllAvailability(this.selectedOptions);
            if (autoSelected) {
              this.updateAllAvailability(this.selectedOptions);
            }
            this.updateAddToCartButton();
            this.updateInventoryDisplay();

            // Update image if color already selected
            if (this.getSelectedColor() && this.imageHandler) {
              this.imageHandler.updateImage(this.getSelectedColor(), false);
            }

            if (DEBUG.variant || DEBUG.general) console.groupEnd();
          }
        } catch (error) {
          if (DEBUG.general) console.warn('Could not load product data:', error);
        } finally {
          this.isLoading = false;
        }
      }

      setupCartUpdateListener() {
        // Subscribe to cart update events to disable image handler during cart operations
        if (typeof subscribe === 'function') {
          const PUB_SUB_EVENTS = window.PUB_SUB_EVENTS || { cartUpdate: 'cart-update' };
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
            // Mark cart as updating - image handler will check this
            this.isCartUpdating = true;

            // Clear any pending image update timeouts
            this.clearAllImageUpdateTimeouts();

            // Reset flag after a short delay (cart operations typically complete quickly)
            setTimeout(() => {
              this.isCartUpdating = false;
            }, 1000);
          });
        }
      }

      clearAllImageUpdateTimeouts() {
        // Clear any pending image update timeouts
        // Note: Individual handlers manage their own timeouts, but guards prevent execution
        // This method can be extended if we need to track timeouts globally
      }

      destroy() {
        // Cleanup: Unsubscribe from cart updates
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
          this.cartUpdateUnsubscriber = null;
        }

        // Cleanup: Disconnect observer
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }

      setupEventListeners() {
        // Subscribe to cart updates to disable image handler during cart operations
        this.setupCartUpdateListener();

        // Setup left-to-right hover effect for color swatches
        this.setupColorSwatchHoverEffect();

        // Color swatch clicks
        this.container.querySelectorAll('[data-option-type="color"]').forEach((option) => {
          option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.selectOption('color', option.getAttribute('data-option-value'));
            return false;
          });

          // Individual swatch hover (for direct hover on specific swatch)
          option.addEventListener('mouseenter', async () => {
            // Guard: Check if card is still in DOM (prevents errors during cart updates)
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check if cart is updating (prevents image flashing during cart operations)
            const cartItems =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
              return;
            }

            const colorValue = option.getAttribute('data-option-value');

            // Trigger data load if not loaded yet
            if (!this.dataLoaded && !this.isLoading) {
              await this.loadProductData();
            }

            // Guard: Check again after async operation
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check cart state again after async operation
            const cartItemsAfter =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItemsAfter && cartItemsAfter.classList.contains('cart__items--disabled')) {
              return;
            }

            // Update image handler with latest data
            if (this.imageHandler) {
              // Update handler with latest variants and product
              this.imageHandler.updateVariants(this.variants);
              this.imageHandler.updateProduct(this.product);

              // Small delay to ensure data is processed
              setTimeout(() => {
                // Guard: Check again before updating (cart updates might have removed card)
                if (!this.card || !document.body.contains(this.card)) {
                  return;
                }

                // Guard: Check if cart is updating (prevents image flashing during cart operations)
                const cartItemsTimeout =
                  document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
                if (cartItemsTimeout && cartItemsTimeout.classList.contains('cart__items--disabled')) {
                  return;
                }

                if (DEBUG.image) {
                  console.log('[CustomCardVariantOptions] Hover - updating image for color:', colorValue);
                  console.log('[CustomCardVariantOptions] Variants available:', this.variants.length);
                  console.log('[CustomCardVariantOptions] Product loaded:', !!this.product);
                }
                this.imageHandler.updateImage(colorValue, true);
              }, 50);
            } else {
              if (DEBUG.image) console.warn('[CustomCardVariantOptions] Image handler not available');
            }
          });

          option.addEventListener('mouseleave', () => {
            // Guard: Check if card is still in DOM (prevents errors during cart updates)
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check if cart is updating (prevents image flashing during cart operations)
            const cartItems =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
              return;
            }

            // Only restore if not hovering over swatch container (which handles its own hover)
            const swatchContainer = this.container.querySelector('.custom-card-variant-options__swatches');
            if (!swatchContainer || !swatchContainer.matches(':hover')) {
              const selectedColor = this.getSelectedColor();
              if (this.imageHandler) {
                if (selectedColor) {
                  this.imageHandler.updateImage(selectedColor, false);
                } else {
                  this.imageHandler.restoreDefaultImage();
                }
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

        // Toggle selection - if already selected, deselect
        const currentValue = this.selectedOptions[normalizedName];
        if (currentValue === value) {
          // Deselect
          delete this.selectedOptions[normalizedName];
          value = null;
        } else {
          // Select new value
          this.selectedOptions[normalizedName] = value;
        }

        // Update UI (always update, even for unavailable options)
        this.updateSelectionUI(normalizedName, value);
        this.updateAllAvailability(this.selectedOptions);
        const autoSelected = this.autoSelectSingleOptionValues();
        if (autoSelected) {
          this.updateAllAvailability(this.selectedOptions);
        }
        this.updateAddToCartButton();
        this.updateInventoryDisplay();

        // Update image if color selected or deselected
        if (normalizedName === 'color' && this.imageHandler) {
          if (value) {
            this.imageHandler.updateImage(value, false);
          } else {
            // Restore default image when deselected
            this.imageHandler.restoreDefaultImage();
          }
        }
      }

      setupColorSwatchHoverEffect() {
        const swatchContainer = this.container.querySelector('.custom-card-variant-options__swatches');
        if (!swatchContainer) return;

        const colorOptions = Array.from(this.container.querySelectorAll('[data-option-type="color"]'));
        if (colorOptions.length === 0) return;

        // Get all available color values
        const colorValues = colorOptions.map((option) => option.getAttribute('data-option-value'));

        // Detect if device supports hover (not touch-only)
        const isTouchDevice = this.isTouchDevice();

        if (isTouchDevice) {
          // On mobile/touch devices, use swipe gesture instead of hover
          this.setupColorSwatchSwipeEffect(swatchContainer, colorValues);
        } else {
          // On desktop, do not use horizontal hover mapping.
          // Per-swatch hover and selection already update images, and the
          // horizontal sweep interaction causes incorrect matches when swatches
          // wrap into multiple rows.
        }
      }

      isTouchDevice() {
        // Check if device has touch capability
        // Note: Modern devices may have both touch and mouse, so we check for primary pointer
        return (
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        );
      }

      setupColorSwatchMouseHover(swatchContainer, colorValues) {
        let hoverTimeout = null;
        const self = this; // Store reference for timeout cleanup

        swatchContainer.addEventListener('mouseenter', async () => {
          // Guard: Check if card is still in DOM (prevents errors during cart updates)
          if (!this.card || !document.body.contains(this.card)) {
            return;
          }

          // Guard: Check if cart is updating (prevents image flashing during cart operations)
          const cartItems =
            document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
          if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
            return;
          }

          // Trigger data load if not loaded yet
          if (!this.dataLoaded && !this.isLoading) {
            await this.loadProductData();
          }

          // Guard: Check again after async operation
          if (!this.card || !document.body.contains(this.card)) {
            return;
          }

          // Guard: Check cart state again after async operation
          const cartItemsAfter =
            document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
          if (cartItemsAfter && cartItemsAfter.classList.contains('cart__items--disabled')) {
            return;
          }

          // Update image handler with latest data
          if (this.imageHandler) {
            this.imageHandler.updateVariants(this.variants);
            this.imageHandler.updateProduct(this.product);
          }
        });

        swatchContainer.addEventListener('mousemove', (e) => {
          // Guard: Check if card is still in DOM (prevents errors during cart updates)
          if (!this.card || !document.body.contains(this.card)) {
            return;
          }

          // Guard: Check if cart is updating (prevents image flashing during cart operations)
          const cartItems =
            document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
          if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
            return;
          }

          if (!this.imageHandler || colorValues.length === 0) return;

          // Clear any pending timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
          }

          // Get mouse position relative to swatch container
          const rect = swatchContainer.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

          // Map percentage to color index (0% = first color, 100% = last color)
          const colorIndex = Math.floor((percentage / 100) * colorValues.length);
          const clampedIndex = Math.min(colorIndex, colorValues.length - 1);
          const colorValue = colorValues[clampedIndex];

          if (DEBUG.image) {
            console.log('[CustomCardVariantOptions] Hover position:', {
              x,
              percentage: percentage.toFixed(1) + '%',
              colorIndex: clampedIndex,
              colorValue,
            });
          }

          // Small debounce to avoid too many updates
          hoverTimeout = setTimeout(() => {
            // Guard: Check again before updating (cart updates might have removed card)
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check if cart is updating (prevents image flashing during cart operations)
            const cartItemsTimeout =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItemsTimeout && cartItemsTimeout.classList.contains('cart__items--disabled')) {
              return;
            }

            if (this.imageHandler && colorValue) {
              this.imageHandler.updateImage(colorValue, true);
            }
          }, 10);
        });

        swatchContainer.addEventListener('mouseleave', () => {
          // Guard: Check if card is still in DOM (prevents errors during cart updates)
          if (!this.card || !document.body.contains(this.card)) {
            return;
          }

          // Guard: Check if cart is updating (prevents image flashing during cart operations)
          const cartItems =
            document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
          if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
            return;
          }

          // Clear any pending timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
          }

          // Restore to selected color or default
          this.restoreImageAfterHover();
        });
      }

      setupColorSwatchSwipeEffect(swatchContainer, colorValues) {
        let touchStartX = null;
        let touchStartY = null;
        let isSwiping = false;
        let swipeTimeout = null;
        const self = this; // Store reference for timeout cleanup

        swatchContainer.addEventListener(
          'touchstart',
          async (e) => {
            // Guard: Check if card is still in DOM (prevents errors during cart updates)
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check if cart is updating (prevents image flashing during cart operations)
            const cartItems =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
              return;
            }

            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            isSwiping = false;

            // Trigger data load if not loaded yet
            if (!this.dataLoaded && !this.isLoading) {
              await this.loadProductData();
            }

            // Guard: Check again after async operation
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check cart state again after async operation
            const cartItemsAfter =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItemsAfter && cartItemsAfter.classList.contains('cart__items--disabled')) {
              return;
            }

            // Update image handler with latest data
            if (this.imageHandler) {
              this.imageHandler.updateVariants(this.variants);
              this.imageHandler.updateProduct(this.product);
            }
          },
          { passive: true },
        );

        swatchContainer.addEventListener(
          'touchmove',
          (e) => {
            // Guard: Check if card is still in DOM (prevents errors during cart updates)
            if (!this.card || !document.body.contains(this.card)) {
              return;
            }

            // Guard: Check if cart is updating (prevents image flashing during cart operations)
            const cartItems =
              document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
            if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
              return;
            }

            if (!touchStartX || !this.imageHandler || colorValues.length === 0) return;

            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);

            // Only treat as swipe if horizontal movement is greater than vertical
            if (deltaX > deltaY && deltaX > 10) {
              isSwiping = true;
              e.preventDefault(); // Prevent scrolling while swiping

              // Get touch position relative to swatch container
              const rect = swatchContainer.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

              // Map percentage to color index
              const colorIndex = Math.floor((percentage / 100) * colorValues.length);
              const clampedIndex = Math.min(colorIndex, colorValues.length - 1);
              const colorValue = colorValues[clampedIndex];

              if (DEBUG.image) {
                console.log('[CustomCardVariantOptions] Swipe position:', {
                  x,
                  percentage: percentage.toFixed(1) + '%',
                  colorIndex: clampedIndex,
                  colorValue,
                });
              }

              // Debounce updates during swipe
              if (swipeTimeout) {
                clearTimeout(swipeTimeout);
              }

              swipeTimeout = setTimeout(() => {
                // Guard: Check again before updating (cart updates might have removed card)
                if (!this.card || !document.body.contains(this.card)) {
                  return;
                }

                // Guard: Check if cart is updating (prevents image flashing during cart operations)
                const cartItemsTimeout =
                  document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
                if (cartItemsTimeout && cartItemsTimeout.classList.contains('cart__items--disabled')) {
                  return;
                }

                if (this.imageHandler && colorValue) {
                  this.imageHandler.updateImage(colorValue, true);
                }
              }, 50);
            }
          },
          { passive: false },
        );

        swatchContainer.addEventListener(
          'touchend',
          () => {
            touchStartX = null;
            touchStartY = null;

            // Clear any pending timeout
            if (swipeTimeout) {
              clearTimeout(swipeTimeout);
              swipeTimeout = null;
            }

            // Only restore if it was a swipe, not a tap
            if (isSwiping) {
              // Small delay to allow tap to register if it was actually a tap
              setTimeout(() => {
                // Guard: Check again before restoring
                if (!this.card || !document.body.contains(this.card)) {
                  return;
                }

                // Guard: Check cart state again
                const cartItemsAfter =
                  document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
                if (cartItemsAfter && cartItemsAfter.classList.contains('cart__items--disabled')) {
                  return;
                }

                this.restoreImageAfterHover();
              }, 100);
            }

            isSwiping = false;
          },
          { passive: true },
        );
      }

      restoreImageAfterHover() {
        // Guard: Check if card is still in DOM (prevents errors during cart updates)
        if (!this.card || !document.body.contains(this.card)) {
          return;
        }

        // Guard: Check if cart is updating (prevents image flashing during cart operations)
        const cartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
        if (cartItems && cartItems.classList.contains('cart__items--disabled')) {
          return;
        }

        const selectedColor = this.getSelectedColor();
        if (this.imageHandler) {
          if (selectedColor) {
            this.imageHandler.updateImage(selectedColor, false);
          } else {
            this.imageHandler.restoreDefaultImage();
          }
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
        // Remove previous selection for this option (all options of this type)
        const optionType = optionName === 'color' ? 'color' : optionName === 'size' ? 'size' : 'other';
        this.container
          .querySelectorAll(`[data-option-type="${optionType}"].custom-card-variant-options__option--selected`)
          .forEach((option) => {
            option.classList.remove('custom-card-variant-options__option--selected');
          });

        // Add selection to clicked option (even if unavailable)
        if (value) {
          const selector =
            optionName === 'color'
              ? `[data-option-type="color"][data-option-value="${this.escapeSelector(value)}"]`
              : optionName === 'size'
                ? `[data-option-type="size"][data-option-value="${this.escapeSelector(value)}"]`
                : `[data-option-type="other"][data-option-name="${this.escapeSelector(
                    optionName,
                  )}"][data-option-value="${this.escapeSelector(value)}"]`;

          const selectedOption = this.container.querySelector(selector);
          if (selectedOption) {
            selectedOption.classList.add('custom-card-variant-options__option--selected');
            if (DEBUG.variant) console.log('[CustomCardVariantOptions] Selected option:', optionName, value);
          } else {
            if (DEBUG.variant) console.warn('[CustomCardVariantOptions] Could not find option to select:', selector);
          }
        } else {
          if (DEBUG.variant) console.log('[CustomCardVariantOptions] Deselected option:', optionName);
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
          if (DEBUG.variant) console.warn('[CustomCardVariantOptions] findMatchingVariant: No variants available');
          return null;
        }

        if (DEBUG.variant) {
          console.group('[CustomCardVariantOptions] findMatchingVariant');
          console.log('Selected Options:', this.selectedOptions);
          console.log('Config:', this.config);
        }

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

          if (DEBUG.variant) console.log('Looking up variant with selections:', selections);
          const variant = this.availabilityMatrix.getVariant(selections, this.config);
          if (variant) {
            if (DEBUG.variant) {
              console.log('Found variant via matrix:', {
                id: variant.id,
                sku: variant.sku || 'N/A',
                option1: variant.option1,
                option2: variant.option2,
                option3: variant.option3,
                inventory_quantity: variant.inventory_quantity,
                available: variant.available,
              });
              console.groupEnd();
            }
            return variant;
          }
          if (DEBUG.variant) console.log('No variant found via matrix, trying fallback');
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

        if (DEBUG.variant) console.log('Fallback search:', { color, size, otherSelections });
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
            available: variant.available,
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

      isVariantAvailable(variant) {
        if (!variant) return false;
        return variant.available === true;
      }

      matchesSelectionsForVariant(variant, excludeOptionName = null) {
        const normalizedExclude = excludeOptionName ? this.normalizeOptionName(excludeOptionName) : null;

        const matchesOption = (optionKey, position) => {
          if (!position) return true;
          if (normalizedExclude && this.normalizeOptionName(optionKey) === normalizedExclude) return true;
          const selectedValue = this.selectedOptions[optionKey];
          if (!selectedValue) return true;
          const variantValue = this.getVariantOptionValue(variant, position);
          return variantValue === selectedValue;
        };

        if (this.config.colorPosition && !matchesOption('color', this.config.colorPosition)) return false;
        if (this.config.sizePosition && !matchesOption('size', this.config.sizePosition)) return false;

        if (this.config.otherOptions) {
          for (const optionName in this.config.otherOptions) {
            if (!matchesOption(optionName, this.config.otherOptions[optionName])) return false;
          }
        }

        return true;
      }

      getPossibleOptionValues(position, excludeOptionName = null) {
        const availableValues = new Set();
        const allValues = new Set();
        const normalizedExclude = excludeOptionName ? this.normalizeOptionName(excludeOptionName) : null;

        this.variants.forEach((variant) => {
          if (!this.matchesSelectionsForVariant(variant, normalizedExclude)) return;
          const value = this.getVariantOptionValue(variant, position);
          if (!value) return;
          allValues.add(value);
          if (this.isVariantAvailable(variant)) {
            availableValues.add(value);
          }
        });

        return {
          available: Array.from(availableValues),
          all: Array.from(allValues),
        };
      }

      autoSelectSingleOptionValues() {
        if (!this.variants.length) return false;
        let changed = false;

        const maybeSelect = (optionName, position) => {
          if (!position) return;
          if (this.selectedOptions[optionName]) return;
          const { available, all } = this.getPossibleOptionValues(position, optionName);

          let autoValue = null;
          if (available.length === 1) {
            autoValue = available[0];
          } else if (available.length === 0 && all.length === 1) {
            // All possibilities are unavailable, but only one exists
            autoValue = all[0];
          }

          if (autoValue) {
            this.selectedOptions[optionName] = autoValue;
            this.updateSelectionUI(optionName, autoValue);
            changed = true;
          }
        };

        maybeSelect('color', this.config.colorPosition);
        maybeSelect('size', this.config.sizePosition);
        if (this.config.otherOptions) {
          Object.keys(this.config.otherOptions).forEach((optionName) => {
            maybeSelect(optionName, this.config.otherOptions[optionName]);
          });
        }

        return changed;
      }

      updateAllAvailability() {
        if (DEBUG.availability) console.log('[CustomCardVariantOptions] updateAllAvailability called');
        if (this.uiUpdater) {
          this.uiUpdater.updateAllAvailability(this.selectedOptions);
        } else {
          if (DEBUG.availability) console.warn('[CustomCardVariantOptions] UI Updater not initialized');
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

        // Intercept quick add button click for direct add when all options are selected
        quickAddButton.addEventListener(
          'click',
          (e) => {
            // Check if we should add directly (all options selected and variant available)
            const shouldAddDirectly = quickAddButton.getAttribute('data-direct-add') === 'true';
            const variantId = quickAddButton.getAttribute('data-selected-variant-id');

            if (shouldAddDirectly && variantId) {
              // Prevent modal from opening and add to cart directly
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              this.addToCartDirectly(variantId, quickAddButton);
              return false;
            }
            // If not all options selected, allow modal to open (default Dawn behavior)
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
        if (!variantId) {
          console.error('[CustomCardVariantOptions] No variant ID provided for direct add');
          return;
        }

        if (DEBUG.cart) console.log('[CustomCardVariantOptions] Adding to cart directly, variant ID:', variantId);
        button.disabled = true;
        button.classList.add('loading');

        try {
          // Get cart notification or drawer
          const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

          const routes = window.Shopify && window.Shopify.routes ? window.Shopify.routes : {};
          const cartAddUrl = routes.cart_add_url || '/cart/add.js';

          const formData = new FormData();
          formData.append('id', variantId);
          formData.append('quantity', 1);

          // Request sections for cart notification (same as product-form.js)
          if (cart && cart.getSectionsToRender) {
            const sections = cart.getSectionsToRender().map((section) => section.id);
            if (sections.length > 0) {
              formData.append('sections', sections.join(','));
              formData.append('sections_url', window.location.pathname);
            }
            cart.setActiveElement(document.activeElement);
          }

          if (DEBUG.cart) console.log('[CustomCardVariantOptions] Sending request to:', cartAddUrl);

          // Use fetchConfig if available (same as product-form.js)
          let config = { method: 'POST', body: formData };
          if (typeof fetchConfig === 'function') {
            config = fetchConfig('javascript');
            config.headers['X-Requested-With'] = 'XMLHttpRequest';
            delete config.headers['Content-Type'];
            config.body = formData;
          } else {
            // Fallback if fetchConfig not available
            config = {
              method: 'POST',
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: formData,
            };
          }

          const response = await fetch(cartAddUrl, config);

          if (response.ok) {
            const data = await response.json();
            if (DEBUG.cart) console.log('[CustomCardVariantOptions] Add to cart successful:', data);

            // Check for errors
            if (data.status) {
              console.error('[CustomCardVariantOptions] Add to cart error:', data.description || data.message);
              return;
            }

            // Publish cart update event
            const PUB_SUB_EVENTS = window.PUB_SUB_EVENTS || { cartUpdate: 'cart-update' };
            if (typeof publish === 'function') {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-card',
                productVariantId: variantId,
                cartData: data,
              });
            }

            // Render cart notification (same as product-form.js)
            if (cart && cart.renderContents) {
              cart.renderContents(data);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[CustomCardVariantOptions] Add to cart failed:', response.status, errorData);
          }
        } catch (error) {
          console.error('[CustomCardVariantOptions] Error adding to cart:', error);
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

    // Initialize (idempotent, re-usable after dynamic renders)
    function initCardVariantOptions(force = false) {
      document.querySelectorAll('.custom-card-variant-options').forEach((container) => {
        if (!force && container.dataset.ccvoInitialized === 'true') return;
        new CustomCardVariantOptions(container);
      });
    }

    // Expose re-init helper for dynamic content (e.g., facets redraw)
    window.initializeCustomCardVariantOptions = initCardVariantOptions;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initCardVariantOptions(false));
    } else {
      initCardVariantOptions(false);
    }

    // Re-initialize when new cards are loaded (e.g., via AJAX/observers)
    if (typeof CustomElements !== 'undefined' && CustomElements.observe) {
      CustomElements.observe('.custom-card-variant-options', (container) => {
        if (container.dataset.ccvoInitialized === 'true') return;
        new CustomCardVariantOptions(container);
      });
    }

    return CustomCardVariantOptions;
  })();
}
