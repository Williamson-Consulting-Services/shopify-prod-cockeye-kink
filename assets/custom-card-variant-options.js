/**
 * Custom Card Variant Options
 * Handles interactive variant selection on product cards
 */

class CustomCardVariantOptions {
  constructor(container) {
    this.container = container;
    this.product = null;
    this.selectedColor = null;
    this.selectedSize = null;
    this.selectedOptions = {}; // Store all selected options: { optionName: value }
    this.variants = [];
    this.defaultImage = null; // Store default product image
    this.hoverTimeout = null; // For hover debouncing

    // Get translations from data attributes
    this.translations = {
      addToCart: this.container.getAttribute('data-translation-add-to-cart') || 'Add to cart',
      soldOut: this.container.getAttribute('data-translation-sold-out') || 'Sold out',
      chooseOptions: this.container.getAttribute('data-translation-choose-options') || 'Choose options',
      inStockTemplate:
        this.container.getAttribute('data-translation-in-stock-template') || 'QUANTITY_PLACEHOLDER in stock',
      lowStockTemplate:
        this.container.getAttribute('data-translation-low-stock-template') || 'Low stock: QUANTITY_PLACEHOLDER left',
    };

    // Parse other options from data attribute
    const otherOptionsData = this.container.getAttribute('data-other-options');
    if (otherOptionsData) {
      const optionsArray = otherOptionsData.split(',');
      optionsArray.forEach((optionData) => {
        const parts = optionData.split(':');
        if (parts.length === 2) {
          const optionName = parts[0];
          const optionPosition = parseInt(parts[1]);
          // Store option position mapping
          if (!this.optionPositions) {
            this.optionPositions = {};
          }
          this.optionPositions[optionName] = optionPosition;
        }
      });
    }

    this.init();
  }

  init() {
    if (!this.container) return;

    // Get product data from the card
    const card = this.container.closest('.card-wrapper');
    if (!card) return;

    // Store default product image
    this.storeDefaultImage(card);

    // Get product ID from container
    const productId = this.container.getAttribute('data-product-id');
    if (productId) {
      // Get product handle from URL or data attribute
      const productLink = card.querySelector('a[href*="/products/"]');
      if (productLink) {
        const urlMatch = productLink.href.match(/\/products\/([^\/\?]+)/);
        if (urlMatch) {
          this.loadProductData(urlMatch[1]);
        }
      }
    }

    // Set up event listeners
    this.setupEventListeners();

    // Set up quick add modal integration
    this.setupQuickAddIntegration(card);
  }

  storeDefaultImage(card) {
    // Find the main product image
    const cardImage = card.querySelector('.card__media img');
    if (cardImage) {
      this.defaultImage = {
        srcset: cardImage.getAttribute('srcset') || '',
        src: cardImage.getAttribute('src') || '',
        alt: cardImage.getAttribute('alt') || '',
        width: cardImage.getAttribute('width') || '',
        height: cardImage.getAttribute('height') || '',
      };
    }
  }

  setupQuickAddIntegration(card) {
    // Listen for quick add button clicks
    const quickAddButton = card.querySelector('.quick-add__submit[data-product-url]');
    if (quickAddButton) {
      quickAddButton.addEventListener(
        'click',
        (e) => {
          // If both color and size are selected, check if we should add directly to cart
          if (this.selectedColor && this.selectedSize && this.variants.length) {
            const variant = this.findMatchingVariant(this.selectedColor, this.selectedSize, this.selectedOptions);
            if (variant) {
              // Check if product has only color and size options (no other options)
              const hasOnlyColorAndSize = this.checkIfOnlyColorAndSize();

              if (hasOnlyColorAndSize && quickAddButton.getAttribute('data-direct-add') === 'true') {
                // Prevent modal from opening and add directly to cart
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.addToCartDirectly(variant, card);
                return false;
              } else {
                // Store selected variant info before modal opens
                quickAddButton.setAttribute('data-preselect-variant-id', variant.id);
                quickAddButton.setAttribute('data-preselect-color', this.selectedColor);
                quickAddButton.setAttribute('data-preselect-size', this.selectedSize);
              }
            }
          }
        },
        true
      ); // Use capture phase to intercept before modal opener
    }

    // Listen for modal content loaded to pre-select variant
    const modal = card.querySelector('quick-add-modal');
    if (modal) {
      modal.addEventListener('product-info:loaded', () => {
        this.preselectVariantInModal(modal);
      });
    }
  }

  checkIfOnlyColorAndSize() {
    // Check if product has exactly 2 options (color and size)
    if (!this.product || !this.product.options) {
      // Fallback: check if we have both color and size selected and variants loaded
      if (this.selectedColor && this.selectedSize && this.variants.length > 0) {
        // If we can find a matching variant and no other options are selected, assume it's only color and size
        const hasOtherOptions = Object.keys(this.selectedOptions).length > 0;
        if (!hasOtherOptions) {
          const variant = this.findMatchingVariant(this.selectedColor, this.selectedSize, this.selectedOptions);
          return variant !== null;
        }
      }
      return false;
    }

    const options = this.product.options;
    // Check if there are only 2 options and no other options are selected
    const hasOtherOptions = Object.keys(this.selectedOptions).length > 0;
    return options.length === 2 && !hasOtherOptions;
  }

  async addToCartDirectly(variant, card) {
    // Check if variant is available
    const isAvailable = variant.inventory_management === 'shopify' ? variant.inventory_quantity > 0 : variant.available;

    if (!isAvailable) {
      return; // Sold out
    }

    const quickAddButton = card.querySelector('.quick-add__submit');
    if (quickAddButton) {
      quickAddButton.disabled = true;
      quickAddButton.classList.add('loading');
      const spinner = quickAddButton.querySelector('.loading__spinner');
      if (spinner) spinner.classList.remove('hidden');
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('id', variant.id);
      formData.append('quantity', 1);

      // Get cart add URL
      const routes = window.Shopify?.routes || {};
      const cartAddUrl = routes.cart_add_url || '/cart/add.js';

      // Add to cart
      const response = await fetch(cartAddUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Publish cart update event
        if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'custom-card-variant-options',
            productVariantId: variant.id,
            cartData: data,
          });
        }

        // Update cart drawer/notification if available
        const cartDrawer = document.querySelector('cart-drawer');
        const cartNotification = document.querySelector('cart-notification');

        if (cartDrawer && cartDrawer.renderContents) {
          // Fetch full cart
          const cartResponse = await fetch('/cart.js');
          if (cartResponse.ok) {
            const cart = await cartResponse.json();
            cartDrawer.renderContents(cart);
          }
        } else if (cartNotification && cartNotification.renderContents) {
          cartNotification.renderContents(data);
        }
      } else {
        const errorData = await response.json();
        console.warn('Failed to add product to cart:', errorData);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      if (quickAddButton) {
        quickAddButton.disabled = false;
        quickAddButton.classList.remove('loading');
        const spinner = quickAddButton.querySelector('.loading__spinner');
        if (spinner) spinner.classList.add('hidden');
      }
    }
  }

  preselectVariantInModal(modal) {
    const quickAddButton = this.container
      .closest('.card-wrapper')
      ?.querySelector('.quick-add__submit[data-preselect-variant-id]');
    if (!quickAddButton) return;

    const variantId = quickAddButton.getAttribute('data-preselect-variant-id');
    const preselectColor = quickAddButton.getAttribute('data-preselect-color');
    const preselectSize = quickAddButton.getAttribute('data-preselect-size');

    if (!variantId) return;

    // Wait for variant selects to initialize
    setTimeout(() => {
      const modalContent = modal.querySelector('[id^="QuickAddInfo-"]');
      if (!modalContent) return;

      // Find variant selects component
      const variantSelects = modalContent.querySelector('variant-selects');
      if (!variantSelects) return;

      // Update variant ID input
      const variantIdInput = modalContent.querySelector('.product-variant-id');
      if (variantIdInput) {
        variantIdInput.value = variantId;
      }

      // Pre-select color option
      if (preselectColor) {
        const colorInputs = modalContent.querySelectorAll(
          'input[type="radio"][name*="olor" i], input[type="radio"][name*="Color"]'
        );
        colorInputs.forEach((input) => {
          if (input.value === preselectColor) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }

      // Pre-select size option
      if (preselectSize) {
        const sizeInputs = modalContent.querySelectorAll(
          'input[type="radio"][name*="ize" i], input[type="radio"][name*="Size"]'
        );
        sizeInputs.forEach((input) => {
          if (input.value === preselectSize) {
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

  async loadProductData(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (response.ok) {
        this.product = await response.json();
        this.variants = this.product.variants || [];
        this.updateAvailability();
        this.setupImageHover();
        // Always update button to check if all variants are unavailable
        this.updateAddToCartButton();
        // Update image if color is already selected
        if (this.selectedColor) {
          this.updateCardImage(this.selectedColor, false);
        }
        return true; // Return success
      }
      return false;
    } catch (error) {
      console.warn('Could not load product data for variant selection:', error);
      return false;
    }
  }

  setupEventListeners() {
    // Color selection
    const colorOptions = this.container.querySelectorAll('.custom-card-variant-options__option--swatch');
    colorOptions.forEach((option) => {
      // Click handler - stop all propagation to prevent navigation
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.selectColor(option);
        // Update image on click
        this.updateCardImage(option.getAttribute('data-option-value') || option.getAttribute('title'));
        return false;
      };

      option.addEventListener('click', clickHandler, true); // Use capture phase to intercept early

      // Hover handler
      option.addEventListener('mouseenter', () => {
        const colorValue = option.getAttribute('data-option-value') || option.getAttribute('title');
        this.updateCardImage(colorValue, true); // true = is hover
      });

      // Mouse leave handler - restore to selected or default
      option.addEventListener('mouseleave', () => {
        if (this.selectedColor) {
          this.updateCardImage(this.selectedColor, false);
        } else {
          this.restoreDefaultImage();
        }
      });
    });

    // Size selection
    const sizeOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button[data-option-type="size"]');
    sizeOptions.forEach((option) => {
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.selectSize(option);
        return false;
      };

      option.addEventListener('click', clickHandler, true); // Use capture phase to intercept early
    });

    // Other options selection (style, material, etc.)
    const otherOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button[data-option-type="other"]');
    otherOptions.forEach((option) => {
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.selectOtherOption(option);
        return false;
      };

      option.addEventListener('click', clickHandler, true); // Use capture phase to intercept early
    });
  }

  setupImageHover() {
    // This is called after product data is loaded
    // Additional setup if needed
  }

  selectColor(option) {
    // Remove previous selection
    const previousSelected = this.container.querySelector(
      '.custom-card-variant-options__option--swatch.custom-card-variant-options__option--selected'
    );
    if (previousSelected) {
      previousSelected.classList.remove('custom-card-variant-options__option--selected');
    }

    // Add selection to clicked option
    option.classList.add('custom-card-variant-options__option--selected');
    this.selectedColor = option.getAttribute('data-option-value') || option.getAttribute('title');

    // Update availability for all options based on current selections
    this.updateAllOptionsAvailability();

    // Update color availability to ensure selected color shows correct state
    // Check if the selected color is available with any size (or selected size if size is selected)
    if (this.selectedSize) {
      const isAvailable = this.isVariantAvailable(this.selectedColor, this.selectedSize, this.selectedOptions);
      if (isAvailable) {
        option.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        option.classList.add('custom-card-variant-options__option--unavailable');
      }
    } else {
      // If no size selected, check if color is available with any size
      const hasAvailableVariant = this.variants.some((variant) => {
        const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
        let colorMatch = false;
        if (colorPosition === 1) colorMatch = variant.option1 === this.selectedColor;
        else if (colorPosition === 2) colorMatch = variant.option2 === this.selectedColor;
        else if (colorPosition === 3) colorMatch = variant.option3 === this.selectedColor;

        if (colorMatch) {
          if (variant.inventory_management === 'shopify') {
            return variant.inventory_quantity > 0;
          }
          return variant.available;
        }
        return false;
      });

      if (hasAvailableVariant) {
        option.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        option.classList.add('custom-card-variant-options__option--unavailable');
      }
    }

    this.updateAddToCartButton();
    // Update image on selection
    this.updateCardImage(this.selectedColor, false);
  }

  selectSize(option) {
    // Remove previous selection
    const previousSelected = this.container.querySelector(
      '.custom-card-variant-options__option--button.custom-card-variant-options__option--selected'
    );
    if (previousSelected) {
      previousSelected.classList.remove('custom-card-variant-options__option--selected');
    }

    // Add selection to clicked option
    option.classList.add('custom-card-variant-options__option--selected');
    this.selectedSize =
      option.getAttribute('data-option-value') ||
      option.querySelector('.custom-card-variant-options__button-text')?.textContent.trim();

    // Update availability for all options based on current selections
    this.updateAllOptionsAvailability();

    // Update size availability to ensure selected size shows correct state
    // Check if the selected size is available with selected color (or any color if no color selected)
    if (this.selectedColor) {
      const isAvailable = this.isVariantAvailable(this.selectedColor, this.selectedSize, this.selectedOptions);
      if (isAvailable) {
        option.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        option.classList.add('custom-card-variant-options__option--unavailable');
      }
    } else {
      // If no color selected, check if size is available with any color
      const hasAvailableVariant = this.variants.some((variant) => {
        const sizePosition = parseInt(this.container.getAttribute('data-size-position')) || 2;
        let sizeMatch = false;
        if (sizePosition === 1) sizeMatch = variant.option1 === this.selectedSize;
        else if (sizePosition === 2) sizeMatch = variant.option2 === this.selectedSize;
        else if (sizePosition === 3) sizeMatch = variant.option3 === this.selectedSize;

        if (sizeMatch) {
          if (variant.inventory_management === 'shopify') {
            return variant.inventory_quantity > 0;
          }
          return variant.available;
        }
        return false;
      });

      if (hasAvailableVariant) {
        option.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        option.classList.add('custom-card-variant-options__option--unavailable');
      }
    }

    this.updateAddToCartButton();
  }

  selectOtherOption(option) {
    const optionName = option.getAttribute('data-option-name');
    const optionPosition = parseInt(option.getAttribute('data-option-position'));
    const optionValue =
      option.getAttribute('data-option-value') ||
      option.querySelector('.custom-card-variant-options__button-text')?.textContent.trim();

    // Remove previous selection for this option
    const previousSelected = this.container.querySelector(
      `.custom-card-variant-options__option--button[data-option-type="other"][data-option-name="${optionName}"].custom-card-variant-options__option--selected`
    );
    if (previousSelected) {
      previousSelected.classList.remove('custom-card-variant-options__option--selected');
    }

    // Add selection to clicked option
    option.classList.add('custom-card-variant-options__option--selected');
    this.selectedOptions[optionName] = optionValue;

    // Update availability for all other options based on current selections
    this.updateAllOptionsAvailability();
    this.updateAddToCartButton();
  }

  updateSizeAvailability() {
    if (!this.selectedColor || !this.variants.length) {
      // If no color selected, restore initial availability state from Liquid
      return;
    }

    const sizeOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button[data-option-type="size"]');

    sizeOptions.forEach((sizeOption) => {
      const sizeValue =
        sizeOption.getAttribute('data-option-value') ||
        sizeOption.querySelector('.custom-card-variant-options__button-text')?.textContent.trim();
      const isAvailable = this.isVariantAvailable(this.selectedColor, sizeValue, this.selectedOptions);

      // Always update based on current selection - remove unavailable if available, add if not
      if (isAvailable) {
        sizeOption.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        sizeOption.classList.add('custom-card-variant-options__option--unavailable');
      }
    });
  }

  updateColorAvailability() {
    if (!this.selectedSize || !this.variants.length) return;

    const colorOptions = this.container.querySelectorAll('.custom-card-variant-options__option--swatch');

    colorOptions.forEach((colorOption) => {
      const colorValue = colorOption.getAttribute('data-option-value') || colorOption.getAttribute('title');
      const isAvailable = this.isVariantAvailable(colorValue, this.selectedSize, this.selectedOptions);

      if (isAvailable) {
        colorOption.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        colorOption.classList.add('custom-card-variant-options__option--unavailable');
      }
    });
  }

  isVariantAvailable(color, size, otherSelections = {}) {
    if (!this.variants.length) return true;

    // Get option positions from container
    const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
    const sizePosition = parseInt(this.container.getAttribute('data-size-position')) || 2;

    return this.variants.some((variant) => {
      // Check if variant matches the color at the correct position
      let hasColor = false;
      if (color) {
        if (colorPosition === 1) hasColor = variant.option1 === color;
        else if (colorPosition === 2) hasColor = variant.option2 === color;
        else if (colorPosition === 3) hasColor = variant.option3 === color;
      } else {
        hasColor = true; // No color filter
      }

      // Check if variant matches the size at the correct position
      let hasSize = false;
      if (size) {
        if (sizePosition === 1) hasSize = variant.option1 === size;
        else if (sizePosition === 2) hasSize = variant.option2 === size;
        else if (sizePosition === 3) hasSize = variant.option3 === size;
      } else {
        hasSize = true; // No size filter
      }

      // Check if variant matches all other selected options
      let hasAllOtherOptions = true;
      for (const [optionName, optionValue] of Object.entries(otherSelections)) {
        const optionPosition = this.optionPositions?.[optionName];
        if (optionPosition) {
          let optionMatch = false;
          if (optionPosition === 1) optionMatch = variant.option1 === optionValue;
          else if (optionPosition === 2) optionMatch = variant.option2 === optionValue;
          else if (optionPosition === 3) optionMatch = variant.option3 === optionValue;
          if (!optionMatch) {
            hasAllOtherOptions = false;
            break;
          }
        }
      }

      // All must match if specified
      if (hasColor && hasSize && hasAllOtherOptions) {
        // Check inventory
        if (variant.inventory_management === 'shopify') {
          return variant.inventory_quantity > 0;
        }
        return variant.available;
      }

      return false;
    });
  }

  updateAllOptionsAvailability() {
    if (!this.variants.length) return;

    // Update size availability
    if (this.selectedColor) {
      this.updateSizeAvailability();
    }

    // Update color availability
    if (this.selectedSize) {
      this.updateColorAvailability();
    }

    // Update other options availability
    const otherOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button[data-option-type="other"]');
    otherOptions.forEach((option) => {
      const optionName = option.getAttribute('data-option-name');
      const optionValue = option.getAttribute('data-option-value') || option.querySelector('.custom-card-variant-options__button-text')?.textContent.trim();

      // Create selections object with current selections
      const currentSelections = { ...this.selectedOptions };
      currentSelections[optionName] = optionValue;

      const isAvailable = this.isVariantAvailable(this.selectedColor, this.selectedSize, currentSelections);

      if (isAvailable) {
        option.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        option.classList.add('custom-card-variant-options__option--unavailable');
      }
    });
  }

  checkIfAllVariantsUnavailable() {
    if (!this.variants.length) return false;

    // Check if all variants are unavailable
    return this.variants.every((variant) => {
      if (variant.inventory_management === 'shopify') {
        return variant.inventory_quantity === 0;
      }
      return !variant.available;
    });
  }

  updateAddToCartButton() {
    const card = this.container.closest('.card-wrapper');
    if (!card) return;

    // Find all possible add to cart buttons (direct form or quick add modal opener)
    const directAddButton = card.querySelector('[data-type="add-to-cart-form"] button[type="submit"]');
    const quickAddButton = card.querySelector('.quick-add__submit');
    const addToCartButton = directAddButton || quickAddButton;

    if (!addToCartButton) return;

    // Check if all variants are unavailable (no options selected)
    if (!this.selectedColor && !this.selectedSize && this.variants.length) {
      const allUnavailable = this.checkIfAllVariantsUnavailable();
      if (allUnavailable) {
        // Update button to show "Sold out"
        let buttonText = addToCartButton.querySelector('span:first-child:not(.icon-wrap):not(.loading__spinner)');

        if (!buttonText) {
          const textNodes = Array.from(addToCartButton.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
          );
          if (textNodes.length > 0) {
            buttonText = document.createElement('span');
            buttonText.textContent = textNodes[0].textContent.trim();
            textNodes[0].replaceWith(buttonText);
          }
        }

        if (buttonText) {
          addToCartButton.disabled = true;
          const soldOutText = this.translations.soldOut;
          const chooseOptionsText = this.translations.chooseOptions;
          const addToCartText = this.translations.addToCart;

          // Replace any existing button text with sold out
          buttonText.textContent = buttonText.textContent
            .trim()
            .replace(
              new RegExp(
                `(${addToCartText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${chooseOptionsText.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                )})`,
                'i'
              ),
              soldOutText
            );

          // Ensure it shows sold out
          if (!buttonText.textContent.includes(soldOutText)) {
            buttonText.textContent = soldOutText;
          }
        } else {
          // Fallback: update button text directly
          addToCartButton.disabled = true;
          const soldOutText = this.translations.soldOut;
          const chooseOptionsText = this.translations.chooseOptions;
          const addToCartText = this.translations.addToCart;

          addToCartButton.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              const regex = new RegExp(
                `(${chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                )})`,
                'i'
              );
              node.textContent = node.textContent.replace(regex, soldOutText);
            }
          });
        }
        return;
      }
    }

    // Find the matching variant
    if (this.variants.length) {
      // Check if we have enough selections to find a unique variant
      const hasColor = !!this.selectedColor;
      const hasSize = !!this.selectedSize;
      const hasOtherOptions = Object.keys(this.selectedOptions).length > 0;

      if (hasColor && hasSize) {
        const matchingVariant = this.findMatchingVariant(this.selectedColor, this.selectedSize, this.selectedOptions);

      if (matchingVariant) {
        // Check inventory availability
        const isAvailable =
          matchingVariant.inventory_management === 'shopify'
            ? matchingVariant.inventory_quantity > 0
            : matchingVariant.available;

        // Update the variant ID in the form (for direct add to cart)
        const variantIdInput = card.querySelector('.product-variant-id');
        if (variantIdInput) {
          variantIdInput.value = matchingVariant.id;
          variantIdInput.disabled = !isAvailable;
        }

        // Update inventory count display
        this.updateInventoryDisplay(matchingVariant);

        // Update button state
        // Find text element - could be in a span or directly in button
        let buttonText = addToCartButton.querySelector('span:first-child:not(.icon-wrap):not(.loading__spinner)');

        if (!buttonText) {
          // Check if text is directly in button (not wrapped in span)
          const textNodes = Array.from(addToCartButton.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
          );
          if (textNodes.length > 0) {
            // Wrap first text node in span for easier manipulation
            buttonText = document.createElement('span');
            buttonText.textContent = textNodes[0].textContent.trim();
            textNodes[0].replaceWith(buttonText);
          }
        }

        if (buttonText) {
          if (isAvailable) {
            addToCartButton.disabled = false;
            // Update button text using translation
            const chooseOptionsText = this.translations.chooseOptions;
            const addToCartText = this.translations.addToCart;
            const soldOutText = this.translations.soldOut;

            // Replace sold out text if it exists
            if (buttonText.textContent.includes(soldOutText)) {
              buttonText.textContent = buttonText.textContent.replace(
                new RegExp(soldOutText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                addToCartText
              );
            }

            // Replace choose options text
            buttonText.textContent = buttonText.textContent
              .trim()
              .replace(new RegExp(chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), addToCartText);

            // Ensure it shows add to cart if neither text is present
            if (!buttonText.textContent.includes(addToCartText) && !buttonText.textContent.includes(soldOutText)) {
              buttonText.textContent = addToCartText;
            }
          } else {
            addToCartButton.disabled = true;
            const soldOutText = this.translations.soldOut;
            const addToCartText = this.translations.addToCart;
            const chooseOptionsText = this.translations.chooseOptions;

            // Replace any existing button text with sold out
            buttonText.textContent = buttonText.textContent
              .trim()
              .replace(
                new RegExp(
                  `(${addToCartText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${chooseOptionsText.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'
                  )})`,
                  'i'
                ),
                soldOutText
              );

            // Ensure it shows sold out
            if (!buttonText.textContent.includes(soldOutText)) {
              buttonText.textContent = soldOutText;
            }
          }
        } else {
          // Fallback: update button text directly (preserve other elements)
          const chooseOptionsText = this.translations.chooseOptions;
          const addToCartText = this.translations.addToCart;
          const soldOutText = this.translations.soldOut;

          if (isAvailable) {
            addToCartButton.disabled = false;
            // Replace text while preserving spinner and other elements
            addToCartButton.childNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                node.textContent = node.textContent.replace(
                  new RegExp(chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
                  addToCartText
                );
              }
            });
          } else {
            addToCartButton.disabled = true;
            addToCartButton.childNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                const regex = new RegExp(
                  `(${chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'
                  )})`,
                  'i'
                );
                node.textContent = node.textContent.replace(regex, soldOutText);
              }
            });
          }
        }

        // Store selected variant ID for quick add modal or direct add
        if (quickAddButton) {
          quickAddButton.setAttribute('data-selected-variant-id', matchingVariant.id);

          // Check if we should convert to direct add to cart
          // If product has only color and size options, we can add directly
          const hasOnlyColorAndSize = this.checkIfOnlyColorAndSize();
          if (hasOnlyColorAndSize) {
            // Mark button for direct add to cart
            quickAddButton.setAttribute('data-direct-add', 'true');
          } else {
            quickAddButton.removeAttribute('data-direct-add');
          }
        }
      }
    } else {
      // If not both selected, check if all variants are unavailable
      if (quickAddButton) {
        quickAddButton.removeAttribute('data-selected-variant-id');
      }

      const allUnavailable = this.checkIfAllVariantsUnavailable();
      const addToCartText = this.translations.addToCart;
      const soldOutText = this.translations.soldOut;
      const chooseOptionsText = this.translations.chooseOptions;

      let buttonText = addToCartButton.querySelector('span:first-child:not(.icon-wrap):not(.loading__spinner)');
      if (!buttonText) {
        const textNodes = Array.from(addToCartButton.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        if (textNodes.length > 0) {
          buttonText = document.createElement('span');
          buttonText.textContent = textNodes[0].textContent.trim();
          textNodes[0].replaceWith(buttonText);
        }
      }

      if (allUnavailable) {
        // All variants unavailable - show "Sold out"
        addToCartButton.disabled = true;
        if (buttonText) {
          buttonText.textContent = buttonText.textContent
            .trim()
            .replace(
              new RegExp(
                `(${addToCartText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${chooseOptionsText.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                )})`,
                'i'
              ),
              soldOutText
            );
          if (!buttonText.textContent.includes(soldOutText)) {
            buttonText.textContent = soldOutText;
          }
        } else {
          // Fallback
          addToCartButton.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              const regex = new RegExp(
                `(${chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                )})`,
                'i'
              );
              node.textContent = node.textContent.replace(regex, soldOutText);
            }
          });
        }
      } else {
        // Some variants available - show "Choose options"
        // Hide inventory display when no variant selected
        this.updateInventoryDisplay(null);
        addToCartButton.disabled = false;
        if (buttonText) {
          if (buttonText.textContent === soldOutText || buttonText.textContent === addToCartText) {
            if (quickAddButton && quickAddButton.hasAttribute('data-product-url')) {
              buttonText.textContent = chooseOptionsText;
            } else {
              buttonText.textContent = addToCartText;
            }
          }
        } else {
          // Fallback
          if (
            addToCartButton.textContent.includes(soldOutText) ||
            addToCartButton.textContent.includes(addToCartText)
          ) {
            if (quickAddButton && quickAddButton.hasAttribute('data-product-url')) {
              const regex = new RegExp(
                `(${soldOutText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                )})`,
                'i'
              );
              addToCartButton.textContent = addToCartButton.textContent.replace(regex, chooseOptionsText);
            }
          }
        }
      }
    }
  }

  findMatchingVariant(color, size, otherSelections = {}) {
    if (!this.variants.length) return null;

    const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
    const sizePosition = parseInt(this.container.getAttribute('data-size-position')) || 2;

    return this.variants.find((variant) => {
      // Check color at correct position
      let colorMatch = !color; // If no color specified, match any
      if (color) {
        if (colorPosition === 1) colorMatch = variant.option1 === color;
        else if (colorPosition === 2) colorMatch = variant.option2 === color;
        else if (colorPosition === 3) colorMatch = variant.option3 === color;
      }

      // Check size at correct position
      let sizeMatch = !size; // If no size specified, match any
      if (size) {
        if (sizePosition === 1) sizeMatch = variant.option1 === size;
        else if (sizePosition === 2) sizeMatch = variant.option2 === size;
        else if (sizePosition === 3) sizeMatch = variant.option3 === size;
      }

      // Check all other selected options
      let allOtherOptionsMatch = true;
      for (const [optionName, optionValue] of Object.entries(otherSelections)) {
        const optionPosition = this.optionPositions?.[optionName];
        if (optionPosition) {
          let optionMatch = false;
          if (optionPosition === 1) optionMatch = variant.option1 === optionValue;
          else if (optionPosition === 2) optionMatch = variant.option2 === optionValue;
          else if (optionPosition === 3) optionMatch = variant.option3 === optionValue;
          if (!optionMatch) {
            allOtherOptionsMatch = false;
            break;
          }
        }
      }

      return colorMatch && sizeMatch && allOtherOptionsMatch;
    });
  }

  updateAvailability() {
    // Initial availability is already set by Liquid
    // This method can be used for dynamic updates if needed
  }

  updateInventoryDisplay(variant) {
    if (!variant) {
      // Hide inventory display if no variant
      const inventoryDisplay = this.container.querySelector('.custom-card-variant-options__inventory');
      if (inventoryDisplay) {
        inventoryDisplay.style.display = 'none';
      }
      return;
    }

    // Check if inventory tracking is enabled
    if (variant.inventory_management !== 'shopify') {
      // Hide inventory display if not tracking inventory
      const inventoryDisplay = this.container.querySelector('.custom-card-variant-options__inventory');
      if (inventoryDisplay) {
        inventoryDisplay.style.display = 'none';
      }
      return;
    }

    const quantity = variant.inventory_quantity || 0;
    const inventoryDisplay = this.container.querySelector('.custom-card-variant-options__inventory');
    const inventoryText = this.container.querySelector('.custom-card-variant-options__inventory-text');

    if (!inventoryDisplay || !inventoryText) return;

    // Show inventory display
    inventoryDisplay.style.display = 'block';

    // Determine if low stock (using threshold of 5, can be made configurable)
    const lowStockThreshold = 5;
    const isLowStock = quantity > 0 && quantity <= lowStockThreshold;

    // Get translation template
    let template = isLowStock ? this.translations.lowStockTemplate : this.translations.inStockTemplate;

    // Replace QUANTITY_PLACEHOLDER with actual quantity
    const inventoryMessage = template.replace(/QUANTITY_PLACEHOLDER/g, quantity.toString());

    inventoryText.textContent = inventoryMessage;

    // Add low stock class for styling
    if (isLowStock) {
      inventoryDisplay.classList.add('custom-card-variant-options__inventory--low-stock');
    } else {
      inventoryDisplay.classList.remove('custom-card-variant-options__inventory--low-stock');
    }
  }

  findVariantByColor(color, size = null) {
    if (!this.variants.length || !color) return null;

    const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
    const sizePosition = parseInt(this.container.getAttribute('data-size-position')) || 2;

    // Normalize color value for comparison (case-insensitive, trim whitespace)
    const normalizedColor = String(color).trim().toLowerCase();

    return this.variants.find((variant) => {
      // Check color at correct position (case-insensitive)
      let colorMatch = false;
      let variantColorValue = '';
      if (colorPosition === 1) variantColorValue = String(variant.option1 || '').trim().toLowerCase();
      else if (colorPosition === 2) variantColorValue = String(variant.option2 || '').trim().toLowerCase();
      else if (colorPosition === 3) variantColorValue = String(variant.option3 || '').trim().toLowerCase();

      colorMatch = variantColorValue === normalizedColor;

      // If size is specified, check size too
      if (size) {
        let sizeMatch = false;
        const normalizedSize = String(size).trim().toLowerCase();
        let variantSizeValue = '';
        if (sizePosition === 1) variantSizeValue = String(variant.option1 || '').trim().toLowerCase();
        else if (sizePosition === 2) variantSizeValue = String(variant.option2 || '').trim().toLowerCase();
        else if (sizePosition === 3) variantSizeValue = String(variant.option3 || '').trim().toLowerCase();
        sizeMatch = variantSizeValue === normalizedSize;
        return colorMatch && sizeMatch;
      }

      return colorMatch;
    });
  }

  getVariantImage(variant) {
    if (!variant) return null;

    // Shopify product JSON API returns variant.featured_image as a URL string
    if (variant.featured_image) {
      // featured_image is a URL string, not an object
      const imageUrl = typeof variant.featured_image === 'string'
        ? variant.featured_image
        : variant.featured_image.src || variant.featured_image;

      return {
        src: imageUrl,
        width: variant.featured_image_width || null,
        height: variant.featured_image_height || null,
        alt: variant.title || '',
      };
    }

    // Check product media for variant-specific images
    // Variants can be associated with media via variant IDs
    if (this.product && this.product.media && Array.isArray(this.product.media)) {
      // Find first image media (not video/model) associated with this variant
      const imageMedia = this.product.media.find((media) => {
        if (media.media_type !== 'image') return false;

        // Check if media is associated with this variant via variants array
        if (media.variants && Array.isArray(media.variants)) {
          return media.variants.some((v) => {
            // Handle both object with id property and direct id
            const variantId = typeof v === 'object' ? v.id : v;
            return variantId === variant.id;
          });
        }

        // Check if media has variant_ids property (Shopify sometimes uses this)
        if (media.variant_ids && Array.isArray(media.variant_ids)) {
          return media.variant_ids.includes(variant.id);
        }

        // Fallback: check if alt text contains variant info
        if (media.alt && variant.title) {
          const altLower = media.alt.toLowerCase();
          const variantTitleLower = variant.title.toLowerCase();
          // Check if alt contains variant title or color option
          if (altLower.includes(variantTitleLower)) return true;

          // Check if alt contains the color option value
          const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
          let colorValue = '';
          if (colorPosition === 1) colorValue = variant.option1 || '';
          else if (colorPosition === 2) colorValue = variant.option2 || '';
          else if (colorPosition === 3) colorValue = variant.option3 || '';
          if (colorValue && altLower.includes(colorValue.toLowerCase())) return true;
        }

        return false;
      });

      if (imageMedia && imageMedia.preview_image) {
        const previewImage = imageMedia.preview_image;
        return {
          src: typeof previewImage === 'string' ? previewImage : (previewImage.src || previewImage),
          srcset: previewImage.srcset || null,
          width: previewImage.width || null,
          height: previewImage.height || null,
          alt: imageMedia.alt || variant.title || '',
        };
      }

      // If no variant-specific image found, use first product image as fallback
      const firstImage = this.product.media.find((media) => media.media_type === 'image');
      if (firstImage && firstImage.preview_image) {
        const previewImage = firstImage.preview_image;
        return {
          src: typeof previewImage === 'string' ? previewImage : (previewImage.src || previewImage),
          srcset: previewImage.srcset || null,
          width: previewImage.width || null,
          height: previewImage.height || null,
          alt: firstImage.alt || variant.title || '',
        };
      }
    }

    return null;
  }

  buildImageSrcset(imageSrc, imageWidth, widths = [165, 360, 533, 720, 940, 1066]) {
    if (!imageSrc) return '';

    const srcsetParts = [];
    const baseUrl = imageSrc.split('?')[0]; // Remove query params

    widths.forEach((width) => {
      if (!imageWidth || imageWidth >= width) {
        // Build Shopify image URL with width parameter
        const url = `${baseUrl}?width=${width}`;
        srcsetParts.push(`${url} ${width}w`);
      }
    });

    // Add full size
    if (imageWidth) {
      srcsetParts.push(`${imageSrc} ${imageWidth}w`);
    } else {
      srcsetParts.push(`${imageSrc}`);
    }

    return srcsetParts.join(', ');
  }

  updateCardImage(colorValue, isHover = false) {
    if (!colorValue) {
      if (!isHover) {
        this.restoreDefaultImage();
      }
      return;
    }

    const card = this.container.closest('.card-wrapper');
    if (!card) return;

    const cardImage = card.querySelector('.card__media img');
    if (!cardImage) return;

    // If product data not loaded yet, try to load it
    if (!this.variants.length && this.product === null) {
      // Try to load product data if we have a handle
      const productLink = card.querySelector('a[href*="/products/"]');
      if (productLink) {
        const urlMatch = productLink.href.match(/\/products\/([^\/\?]+)/);
        if (urlMatch) {
          // Load product data and then update image
          this.loadProductData(urlMatch[1]).then(() => {
            // Retry after data loads
            this.updateCardImage(colorValue, isHover);
          });
        }
      }
      return;
    }

    // Find variant matching the color (and size if selected)
    const variant = this.findVariantByColor(colorValue, this.selectedSize);

    // If no variant found, try with just color
    const colorVariant = variant || this.findVariantByColor(colorValue);

    if (!colorVariant) {
      if (!isHover) {
        this.restoreDefaultImage();
      }
      return;
    }

    // Get variant image
    const variantImage = this.getVariantImage(colorVariant);

    if (variantImage && variantImage.src) {
      // Update image srcset
      if (variantImage.srcset) {
        cardImage.setAttribute('srcset', variantImage.srcset);
      } else {
        const srcset = this.buildImageSrcset(variantImage.src, variantImage.width);
        if (srcset) {
          cardImage.setAttribute('srcset', srcset);
        }
      }

      // Update src - use a medium size (533px) for immediate display
      if (variantImage.src) {
        // Construct proper Shopify image URL
        let srcUrl = variantImage.src;
        // Remove existing query parameters and add width
        const urlParts = srcUrl.split('?');
        const baseUrl = urlParts[0];
        // Build new URL with width parameter
        srcUrl = `${baseUrl}?width=533`;
        cardImage.setAttribute('src', srcUrl);
      }

      // Update alt text if available
      if (variantImage.alt) {
        cardImage.setAttribute('alt', variantImage.alt);
      }

      // Update width and height if available
      if (variantImage.width) {
        cardImage.setAttribute('width', variantImage.width);
      }
      if (variantImage.height) {
        cardImage.setAttribute('height', variantImage.height);
      }
    } else if (!isHover) {
      // If no variant image and not hovering, restore default
      this.restoreDefaultImage();
    }
  }

  restoreDefaultImage() {
    if (!this.defaultImage) return;

    const card = this.container.closest('.card-wrapper');
    if (!card) return;

    const cardImage = card.querySelector('.card__media img');
    if (!cardImage) return;

    // Restore default image attributes
    if (this.defaultImage.srcset) {
      cardImage.setAttribute('srcset', this.defaultImage.srcset);
    }
    if (this.defaultImage.src) {
      cardImage.setAttribute('src', this.defaultImage.src);
    }
    if (this.defaultImage.alt) {
      cardImage.setAttribute('alt', this.defaultImage.alt);
    }
    if (this.defaultImage.width) {
      cardImage.setAttribute('width', this.defaultImage.width);
    }
    if (this.defaultImage.height) {
      cardImage.setAttribute('height', this.defaultImage.height);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const variantOptionContainers = document.querySelectorAll('.custom-card-variant-options');
  variantOptionContainers.forEach((container) => {
    new CustomCardVariantOptions(container);
  });
});

// Re-initialize when new cards are loaded (e.g., via AJAX)
if (typeof CustomElements !== 'undefined' && CustomElements.observe) {
  CustomElements.observe('.custom-card-variant-options', (container) => {
    new CustomCardVariantOptions(container);
  });
}
