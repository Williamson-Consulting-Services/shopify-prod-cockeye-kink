/**
 * Custom Cart Notification Extension
 * Adds swipe-to-dismiss functionality for mobile devices
 * Extends Dawn's cart-notification component without modifying base theme
 */

(function () {
  'use strict';

  // Wait for DOM and cart-notification to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Wait a bit for cart-notification custom element to be defined
    setTimeout(setupSwipeToDismiss, 100);
  }

  function setupSwipeToDismiss() {
    const cartNotification = document.querySelector('cart-notification');
    if (!cartNotification) {
      // Retry if not yet available
      setTimeout(setupSwipeToDismiss, 100);
      return;
    }

    const notification = cartNotification.querySelector('#cart-notification');
    if (!notification) return;

    // Detect if device supports touch
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (!isTouchDevice) return;

    // Swipe-to-dismiss state
    let touchStartY = null;
    let touchStartX = null;
    let isDragging = false;
    let currentTranslateY = 0;
    const dismissThreshold = 80; // pixels to drag up before dismissing
    let originalTransition = null;

    notification.addEventListener(
      'touchstart',
      (e) => {
        if (!notification.classList.contains('active')) return;

        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        isDragging = false;
        currentTranslateY = 0;

        // Store original transition
        originalTransition = notification.style.transition || getComputedStyle(notification).transition;

        // Disable transition during drag for smooth movement
        notification.style.transition = 'none';
      },
      { passive: true },
    );

    notification.addEventListener(
      'touchmove',
      (e) => {
        if (!notification.classList.contains('active') || touchStartY === null) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - touchStartY;
        const deltaX = Math.abs(touch.clientX - touchStartX);

        // Only allow vertical swipes (up to dismiss)
        // Require more vertical than horizontal movement
        if (Math.abs(deltaY) > deltaX && Math.abs(deltaY) > 5) {
          isDragging = true;
          e.preventDefault(); // Prevent scrolling while dragging

          // Only allow upward swipes (negative deltaY = dragging up)
          if (deltaY < 0) {
            currentTranslateY = deltaY;
            // Apply transform directly for smooth dragging
            notification.style.transform = `translateY(${deltaY}px)`;
          }
        }
      },
      { passive: false },
    );

    notification.addEventListener(
      'touchend',
      () => {
        if (!isDragging) {
          touchStartY = null;
          touchStartX = null;
          return;
        }

        // Restore transition
        if (originalTransition) {
          notification.style.transition = originalTransition;
        } else {
          notification.style.transition = '';
        }

        // Check if dragged enough to dismiss
        if (Math.abs(currentTranslateY) >= dismissThreshold) {
          // Dismiss the notification by calling close method
          if (cartNotification && typeof cartNotification.close === 'function') {
            cartNotification.close();
          }
        } else {
          // Snap back to original position - clear inline style to let CSS handle it
          notification.style.transform = '';
        }

        // Reset state
        touchStartY = null;
        touchStartX = null;
        isDragging = false;
        currentTranslateY = 0;
      },
      { passive: true },
    );

    // Listen for when notification opens to ensure clean state
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isActive = notification.classList.contains('active');
          const isAnimate = notification.classList.contains('animate');

          // When opening (adding active class), ensure no inline transform interferes
          if (isActive && isAnimate && !isDragging) {
            // Clear any inline transform to let CSS animation work
            notification.style.transform = '';
            notification.style.transition = '';
          }

          // When closing (removing active class), clean up
          if (!isActive && !isDragging) {
            notification.style.transform = '';
            notification.style.transition = '';
          }
        }
      });
    });

    observer.observe(notification, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
})();
