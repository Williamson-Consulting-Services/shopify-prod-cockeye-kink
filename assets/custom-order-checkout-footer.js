/**
 * Custom Order Checkout Footer
 * Displays sticky footer with custom item count and checkout button
 */

window.CustomOrderCheckoutFooter = (function () {
  const footer = document.querySelector('.custom-order-checkout-footer');
  if (!footer) {
    return { update: () => {}, refresh: () => {} };
  }

  const countElement = footer.querySelector('.checkout-footer__count');
  const suppressed =
    window.location.pathname.includes('/checkouts/') ||
    window.location.pathname.includes('/checkout') ||
    window.location.pathname.includes('/thank-you');

  function countCustomItems(cart) {
    if (!cart || !cart.items) return 0;
    return cart.items.filter((item) => {
      if (!item.properties) return false;
      const customFlag = item.properties['_custom'] || item.properties['Order Type'];
      return typeof customFlag === 'string' && customFlag.toLowerCase() === 'custom';
    }).length;
  }

  function updateFooter(customCount) {
    if (suppressed) {
      footer.hidden = true;
      return;
    }

    if (customCount > 0) {
      footer.hidden = false;
      if (countElement) {
        countElement.textContent = customCount;
      }
      footer.setAttribute('data-custom-item-count', customCount);
    } else {
      footer.hidden = true;
    }
  }

  async function refreshCart() {
    if (suppressed) return;
    try {
      const cartUrl = `/cart.js?timestamp=${Date.now()}&_=${Date.now()}`;
      const response = await fetch(cartUrl, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      if (!response.ok) throw new Error(response.statusText);
      const cart = await response.json();
      const customCount = countCustomItems(cart);
      updateFooter(customCount);
    } catch (error) {
      console.warn('CustomOrderCheckoutFooter cart check failed:', error);
    }
  }

  function init() {
    refreshCart(); // Initial load
    subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.cartState) {
        const customCount = countCustomItems(event.cartState);
        updateFooter(customCount);
      } else if (event.customOrderItemAdded) {
        setTimeout(refreshCart, 200);
      } else if (event.itemCount !== undefined) {
        refreshCart();
      } else if (event.source === 'product-form') {
        // When item is added to cart from product form, refresh after a delay
        // to allow the cart API to update. Use a longer delay to ensure cart is updated.
        setTimeout(refreshCart, 500);
      } else {
        // Fallback: refresh cart for any other cart update event
        setTimeout(refreshCart, 200);
      }
    });

    // Listen for cart removals
    const removalSelectors = [
      '[data-cart-remove]',
      '[data-cart-remove-button]',
      '.cart-remove-button',
      'button[name="remove"]',
      'a[href*="cart/change"]',
    ];

    function handlePotentialRemoval(event) {
      if (!event) return;
      const target = event.target;
      if (!target) return;
      const shouldRefresh = removalSelectors.some((selector) => target.closest(selector));
      if (shouldRefresh) {
        setTimeout(refreshCart, 150);
      }
    }

    document.addEventListener('click', handlePotentialRemoval, true);
    document.addEventListener('submit', handlePotentialRemoval, true);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { update: updateFooter, refresh: refreshCart };
})();

