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
  const messageElement = footer.querySelector('.checkout-footer__message:not(.checkout-footer__message--duplicate)');
  const suppressed =
    window.location.pathname.includes('/checkouts/') ||
    window.location.pathname.includes('/checkout') ||
    window.location.pathname.includes('/thank-you');

  function checkTextScroll() {
    const statusElement = footer.querySelector('.checkout-footer__status');
    const wrapper = footer.querySelector('[data-message-wrapper]');
    const duplicate = wrapper?.querySelector('.checkout-footer__message--duplicate');

    if (!messageElement || !statusElement || !wrapper) {
      if (duplicate) {
        duplicate.hidden = true;
        duplicate.textContent = '';
      }
      if (wrapper) wrapper.removeAttribute('data-needs-scroll');
      if (statusElement) statusElement.removeAttribute('data-needs-scroll');
      return;
    }

    // Hide duplicate and remove scroll attributes on desktop
    if (window.innerWidth > 749) {
      if (duplicate) {
        duplicate.hidden = true;
        duplicate.textContent = '';
      }
      wrapper.removeAttribute('data-needs-scroll');
      statusElement.removeAttribute('data-needs-scroll');
      return;
    }

    // Mobile: Check if text needs scrolling
    // Use the text container (parent of status) for width calculation, similar to banner
    const textContainer = statusElement?.closest('.checkout-footer__text-container');
    const containerWidth = textContainer ? textContainer.offsetWidth : statusElement.offsetWidth;

    // Measure the actual text width
    // The wrapper has display: inline-block and white-space: nowrap, so its scrollWidth
    // should reflect the full content width even when constrained
    // We compare wrapper's scrollWidth (full content) to its offsetWidth (visible width)
    // If scrollWidth > offsetWidth, the content is overflowing and needs scrolling
    const wrapperScrollWidth = wrapper.scrollWidth;
    const wrapperOffsetWidth = wrapper.offsetWidth;

    // Account for padding on both sides and close button width (mobile only)
    // Left padding: 1rem (16px), Right padding: 3.5rem (56px) for close button
    const leftPadding = 16; // 1rem
    const rightPadding = 56; // 3.5rem for close button area
    const availableWidth = containerWidth - leftPadding - rightPadding;

    // Text needs scrolling if the wrapper's content width exceeds available space
    const needsScroll = wrapperScrollWidth > availableWidth;

    if (needsScroll && duplicate) {
      // Duplicate message for seamless scrolling (mobile only)
      duplicate.innerHTML = messageElement.innerHTML;
      duplicate.removeAttribute('hidden'); // Remove hidden attribute to show it
      wrapper.setAttribute('data-needs-scroll', 'true');
      statusElement.setAttribute('data-needs-scroll', 'true');
    } else {
      if (duplicate) {
        duplicate.setAttribute('hidden', '');
        duplicate.textContent = '';
      }
      wrapper.removeAttribute('data-needs-scroll');
      statusElement.removeAttribute('data-needs-scroll');
    }
  }

  function countCustomItems(cart) {
    if (!cart || !cart.items) return 0;
    if (!window.CustomOrderUtils) {
      // Fallback if utils not loaded yet
      return cart.items.reduce((total, item) => {
        if (!item.properties) return total;
        const customFlag = item.properties['_custom'] || item.properties['Order Type'];
        if (typeof customFlag === 'string') {
          const flagLower = customFlag.toLowerCase();
          // Check for exact 'custom' match or values containing 'custom' (e.g., 'custom-by-type')
          if (flagLower === 'custom' || flagLower.includes('custom')) {
            return total + (item.quantity || 1);
          }
        }
        return total;
      }, 0);
    }
    return cart.items.reduce((total, item) => {
      if (window.CustomOrderUtils.isCustomOrderItem(item)) {
        return total + (item.quantity || 1);
      }
      return total;
    }, 0);
  }

  function updateFooter(customCount) {
    const wrapper = footer.querySelector('[data-message-wrapper]');
    const duplicate = wrapper?.querySelector('.checkout-footer__message--duplicate');

    if (suppressed) {
      footer.hidden = true;
      // Ensure duplicate is hidden when footer is suppressed
      if (duplicate) {
        duplicate.hidden = true;
        duplicate.textContent = '';
      }
      return;
    }

    if (customCount > 0) {
      footer.hidden = false;
      if (countElement) {
        countElement.textContent = customCount;
      }
      footer.setAttribute('data-custom-item-count', customCount);
      // Check if text needs scrolling after update - this will handle duplicate visibility
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        setTimeout(checkTextScroll, 50);
      });
    } else {
      footer.hidden = true;
      // Ensure duplicate is hidden when footer is hidden
      if (duplicate) {
        duplicate.hidden = true;
        duplicate.textContent = '';
      }
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
          Pragma: 'no-cache',
          Expires: '0',
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
    // Ensure duplicate is hidden on initial load
    const wrapper = footer.querySelector('[data-message-wrapper]');
    const duplicate = wrapper?.querySelector('.checkout-footer__message--duplicate');
    if (duplicate) {
      duplicate.hidden = true;
      duplicate.textContent = '';
    }

    refreshCart(); // Initial load

    // Check text scroll on load and resize (always check to hide/show duplicate correctly)
    requestAnimationFrame(() => {
      setTimeout(checkTextScroll, 100);
    });
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        checkTextScroll();
      });
    });

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
