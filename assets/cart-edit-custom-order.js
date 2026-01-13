/**
 * Cart Edit Custom Order
 * Handles editing custom order items from cart page
 * Follows class-based architecture pattern
 */

(function () {
  'use strict';

  class CartEditCustomOrder {
    constructor() {
      this.init();
    }

    init() {
      // Wait for CustomOrderUtils to be available
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupEditButtons());
      } else {
        this.setupEditButtons();
      }
    }

    setupEditButtons() {
      // Use event delegation for dynamically added cart items
      // Handles both edit button clicks and product title clicks (for custom orders)
      document.addEventListener('click', (event) => {
        const editButton = event.target.closest('[data-edit-custom-order]');
        if (!editButton) return;

        // Prevent default navigation if clicking on editable title
        if (editButton.tagName === 'A') {
          event.preventDefault();
        }

        this.handleEditClick(editButton);
      });
    }

    async handleEditClick(button) {
      const itemIndex = button.dataset.editCustomOrder;
      if (!itemIndex) return;

      try {
        // Get cart data
        const cartResponse = await fetch(`${routes.cart_url}.js`);
        if (!cartResponse.ok) throw new Error('Failed to fetch cart');

        const cart = await cartResponse.json();
        const item = cart.items[parseInt(itemIndex) - 1];

        if (!item) {
          console.error('Item not found in cart');
          return;
        }

        // Check if it's a custom order
        if (!window.CustomOrderUtils) {
          console.error('CustomOrderUtils not available');
          return;
        }

        // Check if it's a custom order
        if (!window.CustomOrderUtils.isCustomOrderItem(item)) {
          console.warn('Item is not a custom order', {
            itemTitle: item.product?.title || item.product_title,
            customOrderTitle: window.CustomOrderUtils.getCustomOrderProductTitle(),
            properties: item.properties,
            fullItem: item,
          });
          return;
        }

        // Get product handle from item URL or properties
        const productHandle = this.extractProductHandle(item);
        if (!productHandle) {
          console.error('Could not determine product handle');
          return;
        }

        // Build edit URL with properties
        const editUrl = window.CustomOrderUtils.buildEditUrl(productHandle, item.properties);

        // Remove item from cart
        await this.removeItemFromCart(itemIndex);

        // Redirect to product page
        window.location.href = editUrl;
      } catch (error) {
        console.error('Error editing custom order:', error);
        // Show user-friendly error message
        alert('Unable to edit this item. Please try again.');
      }
    }

    extractProductHandle(item) {
      // Try to get handle from item URL (most reliable)
      if (item.url) {
        const match = item.url.match(/\/products\/([^\/\?]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }

      // Fallback: try to get from product handle if available
      if (item.product && item.product.handle) {
        return item.product.handle;
      }

      // Last resort: try product handle from properties or variant
      if (item.variant && item.variant.product) {
        // This structure may vary, but try common patterns
        if (item.variant.product.handle) {
          return item.variant.product.handle;
        }
      }

      console.warn('Product handle not available from cart item:', item);
      return null;
    }

    async removeItemFromCart(itemIndex) {
      const response = await fetch(`${routes.cart_change_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: parseInt(itemIndex),
          quantity: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove item from cart');
      }

      // Publish cart update event
      if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
        const cart = await fetch(`${routes.cart_url}.js`).then((r) => r.json());
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'cart-edit-custom-order',
          cartState: cart,
        });
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CartEditCustomOrder();
    });
  } else {
    new CartEditCustomOrder();
  }
})();
