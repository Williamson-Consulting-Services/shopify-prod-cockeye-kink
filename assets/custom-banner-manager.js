/**
 * Reusable Banner Manager
 * Provides minimize/restore functionality for sticky banners
 */

window.CustomBannerManager = (function () {
  const LOCAL_STORAGE_PREFIX = 'customBannerMinimized_';

  /**
   * Initialize a banner with minimize/restore functionality
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.banner - The banner element
   * @param {HTMLElement} options.minimizedBar - The minimized bar element (optional)
   * @param {string} options.storageKey - Unique key for localStorage persistence
   * @param {Function} options.onMinimize - Callback when minimized
   * @param {Function} options.onRestore - Callback when restored
   * @param {boolean} options.autoRestoreOnShow - Auto-restore when banner is shown (default: true)
   */
  function initBanner(options) {
    const {
      banner,
      minimizedBar,
      storageKey,
      onMinimize = () => {},
      onRestore = () => {},
      autoRestoreOnShow = true,
    } = options;

    if (!banner) return null;

    const minimizedBarElement = minimizedBar || banner.querySelector('[data-banner-minimized]');
    const closeButton = banner.querySelector('[data-banner-close]');
    const localStorageKey = storageKey ? `${LOCAL_STORAGE_PREFIX}${storageKey}` : null;

    const state = {
      minimized: localStorageKey
        ? localStorage.getItem(localStorageKey) === 'true'
        : false,
    };

    function applyMinimizedState() {
      if (state.minimized) {
        banner.classList.add('custom-banner--minimized');
        if (minimizedBarElement) {
          minimizedBarElement.hidden = false;
          minimizedBarElement.setAttribute('data-just-minimized', 'true');
          setTimeout(() => {
            if (minimizedBarElement) {
              minimizedBarElement.removeAttribute('data-just-minimized');
            }
          }, 2000);
        }
      } else {
        banner.classList.remove('custom-banner--minimized');
        if (minimizedBarElement) minimizedBarElement.hidden = true;
      }
    }

    function minimize() {
      state.minimized = true;
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, 'true');
      }
      applyMinimizedState();
      onMinimize();
    }

    function restore() {
      state.minimized = false;
      if (localStorageKey) {
        localStorage.removeItem(localStorageKey);
      }
      applyMinimizedState();
      onRestore();
    }

    function handleClose() {
      minimize();
    }

    function handleMinimizedBarClick() {
      restore();
    }

    function handleKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state.minimized) {
          restore();
        } else {
          minimize();
        }
      }
    }

    // Touch swipe detection
    let touchStartY = null;
    let touchStartTime = null;
    const SWIPE_THRESHOLD = 50;
    const SWIPE_TIME_THRESHOLD = 300;

    function handleTouchStart(e) {
      if (state.minimized) return;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }

    function handleTouchMove(e) {
      if (state.minimized || touchStartY === null) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;

      if (deltaY > 0 && deltaY > SWIPE_THRESHOLD) {
        const swipeTime = Date.now() - touchStartTime;
        if (swipeTime < SWIPE_TIME_THRESHOLD) {
          minimize();
          touchStartY = null;
          touchStartTime = null;
        }
      }
    }

    function handleTouchEnd() {
      touchStartY = null;
      touchStartTime = null;
    }

    // Event listeners
    if (closeButton) {
      closeButton.addEventListener('click', handleClose);
    }

    if (minimizedBarElement) {
      minimizedBarElement.addEventListener('click', handleMinimizedBarClick);
      minimizedBarElement.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleMinimizedBarClick();
      });
      minimizedBarElement.addEventListener('keydown', handleKeyDown);
    }

    banner.addEventListener('touchstart', handleTouchStart, { passive: true });
    banner.addEventListener('touchmove', handleTouchMove, { passive: true });
    banner.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Auto-restore when banner becomes visible
    if (autoRestoreOnShow) {
      const observer = new MutationObserver(() => {
        if (!banner.hidden && state.minimized) {
          state.minimized = false;
          if (localStorageKey) {
            localStorage.removeItem(localStorageKey);
          }
          applyMinimizedState();
        }
      });

      observer.observe(banner, {
        attributes: true,
        attributeFilter: ['hidden'],
      });
    }

    // Initialize state
    applyMinimizedState();

    return {
      minimize,
      restore,
      isMinimized: () => state.minimized,
    };
  }

  return {
    initBanner,
  };
})();

