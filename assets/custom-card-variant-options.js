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
    this.variants = [];

    // Get translations from data attributes
    this.translations = {
      addToCart: this.container.getAttribute('data-translation-add-to-cart') || 'Add to cart',
      soldOut: this.container.getAttribute('data-translation-sold-out') || 'Sold out',
      chooseOptions: this.container.getAttribute('data-translation-choose-options') || 'Choose options',
    };

    this.init();
  }

  init() {
    if (!this.container) return;

    // Get product data from the card
    const card = this.container.closest('.card-wrapper');
    if (!card) return;

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

  setupQuickAddIntegration(card) {
    // Listen for quick add modal opening
    const quickAddButton = card.querySelector('.quick-add__submit[data-product-url]');
    if (quickAddButton) {
      quickAddButton.addEventListener('click', (e) => {
        // Store selected variant info before modal opens
        if (this.selectedColor && this.selectedSize && this.variants.length) {
          const variant = this.findMatchingVariant(this.selectedColor, this.selectedSize);
          if (variant) {
            quickAddButton.setAttribute('data-preselect-variant-id', variant.id);
            quickAddButton.setAttribute('data-preselect-color', this.selectedColor);
            quickAddButton.setAttribute('data-preselect-size', this.selectedSize);
          }
        }
      });
    }

    // Listen for modal content loaded to pre-select variant
    const modal = card.querySelector('quick-add-modal');
    if (modal) {
      modal.addEventListener('product-info:loaded', () => {
        this.preselectVariantInModal(modal);
      });
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
        // Update add to cart button if selections already made
        if (this.selectedColor && this.selectedSize) {
          this.updateAddToCartButton();
        }
      }
    } catch (error) {
      console.warn('Could not load product data for variant selection:', error);
    }
  }

  setupEventListeners() {
    // Color selection
    const colorOptions = this.container.querySelectorAll('.custom-card-variant-options__option--swatch');
    colorOptions.forEach((option) => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectColor(option);
      });
    });

    // Size selection
    const sizeOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button');
    sizeOptions.forEach((option) => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectSize(option);
      });
    });
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

    // Update size availability based on selected color
    this.updateSizeAvailability();
    this.updateAddToCartButton();
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

    // Update color availability based on selected size
    this.updateColorAvailability();
    this.updateAddToCartButton();
  }

  updateSizeAvailability() {
    if (!this.selectedColor || !this.variants.length) return;

    const sizeOptions = this.container.querySelectorAll('.custom-card-variant-options__option--button');

    sizeOptions.forEach((sizeOption) => {
      const sizeValue =
        sizeOption.getAttribute('data-option-value') ||
        sizeOption.querySelector('.custom-card-variant-options__button-text')?.textContent.trim();
      const isAvailable = this.isVariantAvailable(this.selectedColor, sizeValue);

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
      const isAvailable = this.isVariantAvailable(colorValue, this.selectedSize);

      if (isAvailable) {
        colorOption.classList.remove('custom-card-variant-options__option--unavailable');
      } else {
        colorOption.classList.add('custom-card-variant-options__option--unavailable');
      }
    });
  }

  isVariantAvailable(color, size) {
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

      // Both must match if both are specified
      if (hasColor && hasSize) {
        // Check inventory
        if (variant.inventory_management === 'shopify') {
          return variant.inventory_quantity > 0;
        }
        return variant.available;
      }

      return false;
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

    // Find the matching variant
    if (this.selectedColor && this.selectedSize && this.variants.length) {
      const matchingVariant = this.findMatchingVariant(this.selectedColor, this.selectedSize);

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
            buttonText.textContent = buttonText.textContent.trim().replace(
              new RegExp(chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
              addToCartText
            );
            if (!buttonText.textContent.includes(addToCartText) && !buttonText.textContent.includes(this.translations.soldOut)) {
              buttonText.textContent = addToCartText;
            }
          } else {
            addToCartButton.disabled = true;
            buttonText.textContent = this.translations.soldOut;
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
                  `(${chooseOptionsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                  'i'
                );
                node.textContent = node.textContent.replace(regex, soldOutText);
              }
            });
          }
        }

        // Store selected variant ID for quick add modal
        if (quickAddButton) {
          quickAddButton.setAttribute('data-selected-variant-id', matchingVariant.id);
        }
      }
    } else {
      // If not both selected, reset button state
      if (quickAddButton) {
        quickAddButton.removeAttribute('data-selected-variant-id');
      }

      // Reset button state when selections are cleared
      const addToCartText = this.translations.addToCart;
      const soldOutText = this.translations.soldOut;
      const chooseOptionsText = this.translations.chooseOptions;

      let buttonText = addToCartButton.querySelector('span:first-child');
      if (buttonText) {
        if (buttonText.textContent === soldOutText || buttonText.textContent === addToCartText) {
          addToCartButton.disabled = false;
          if (quickAddButton && quickAddButton.hasAttribute('data-product-url')) {
            buttonText.textContent = chooseOptionsText;
          } else {
            buttonText.textContent = addToCartText;
          }
        }
      } else {
        // Fallback: update button text directly
        if (addToCartButton.textContent.includes(soldOutText) || addToCartButton.textContent.includes(addToCartText)) {
          addToCartButton.disabled = false;
          if (quickAddButton && quickAddButton.hasAttribute('data-product-url')) {
            const regex = new RegExp(
              `(${soldOutText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${addToCartText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
              'i'
            );
            addToCartButton.textContent = addToCartButton.textContent.replace(regex, chooseOptionsText);
          }
        }
      }
    }
  }

  findMatchingVariant(color, size) {
    if (!this.variants.length) return null;

    const colorPosition = parseInt(this.container.getAttribute('data-color-position')) || 1;
    const sizePosition = parseInt(this.container.getAttribute('data-size-position')) || 2;

    return this.variants.find((variant) => {
      // Check color at correct position
      let colorMatch = false;
      if (colorPosition === 1) colorMatch = variant.option1 === color;
      else if (colorPosition === 2) colorMatch = variant.option2 === color;
      else if (colorPosition === 3) colorMatch = variant.option3 === color;

      // Check size at correct position
      let sizeMatch = false;
      if (sizePosition === 1) sizeMatch = variant.option1 === size;
      else if (sizePosition === 2) sizeMatch = variant.option2 === size;
      else if (sizePosition === 3) sizeMatch = variant.option3 === size;

      return colorMatch && sizeMatch;
    });
  }

  updateAvailability() {
    // Initial availability is already set by Liquid
    // This method can be used for dynamic updates if needed
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
