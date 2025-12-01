const isCustomOrder = (formData, productTitle) => {
  if (!formData) return false;

  // Use utility function if available
  if (window.CustomOrderUtils && window.CustomOrderUtils.isCustomOrderFromFormData) {
    return window.CustomOrderUtils.isCustomOrderFromFormData(formData, productTitle);
  }

  // Fallback: Check product title
  if (productTitle && window.CustomOrderUtils) {
    const customOrderTitle = window.CustomOrderUtils.getCustomOrderProductTitle();
    if (String(productTitle).trim().toLowerCase() === customOrderTitle.toLowerCase()) {
      return true;
    }
  }

  // Backward compatibility: Check properties (for migration period)
  const customFlag = formData.get('properties[_custom]');
  const orderTypeFlag = formData.get('properties[Order Type]');

  return (
    (typeof customFlag === 'string' && customFlag.toLowerCase() === 'custom') ||
    (typeof orderTypeFlag === 'string' && orderTypeFlag.toLowerCase() === 'custom')
  );
};

class ProductFormExtension {
  constructor() {
    this.productFormData = new Map();
    this.cartUpdateUnsubscriber = undefined;
    this.setupFetchInterceptor();
    this.setupEventListeners();
  }

  getProductTitle() {
    // Try to get from product title element
    const titleElement = document.querySelector('h1.product__title, .product__title, [data-product-title]');
    if (titleElement) {
      return titleElement.textContent.trim();
    }

    // Try to get from meta tag
    const metaTitle = document.querySelector('meta[property="product:title"]');
    if (metaTitle && metaTitle.content) {
      return metaTitle.content.trim();
    }

    // Try to get from product JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data.name) return data.name.trim();
      } catch (e) {
        // Ignore parse errors
      }
    }

    return null;
  }

  setupFetchInterceptor() {
    const originalFetch = window.fetch || fetch;
    const productFormExtensionFetch = (...args) => {
      const url = args[0];
      const options = args[1] || {};

      if (typeof url === 'string' && url.includes('/cart/add')) {
        let formData = null;
        if (options.body instanceof FormData) {
          formData = options.body;

          // Filter out empty properties from FormData before sending
          // This is a safety net in case name attributes weren't removed
          if (window.CustomOrderUtils) {
            const filteredFormData = new FormData();

            for (const [key, value] of formData.entries()) {
              if (!key.startsWith('properties[')) {
                // Not a property, keep it
                filteredFormData.append(key, value);
              } else {
                // Extract property name from key like "properties[Property Name]"
                const propMatch = key.match(/properties\[(.+?)\]/);
                if (propMatch) {
                  const propName = propMatch[1];
                  const propValue = String(value || '').trim();

                  // Only include if it should NOT be filtered
                  if (!window.CustomOrderUtils.shouldFilterProperty(propName, propValue)) {
                    filteredFormData.append(key, value);
                  }
                  // If it should be filtered, we don't append it - effectively removing it
                } else {
                  // Couldn't parse, keep it to be safe
                  filteredFormData.append(key, value);
                }
              }
            }

            // Replace the original FormData with filtered one
            options.body = filteredFormData;
            formData = filteredFormData;
          }
        }

        return originalFetch.call(window, ...args).then((response) => {
          const clonedResponse = response.clone();
          clonedResponse
            .json()
            .then((data) => {
              if (formData && data && !data.status) {
                const variantId = formData.get('id');
                if (variantId) {
                  const storedFormData = new FormData();
                  for (const [key, value] of formData.entries()) {
                    storedFormData.append(key, value);
                  }

                  this.productFormData.set(variantId.toString(), {
                    formData: storedFormData,
                    response: data,
                    timestamp: Date.now(),
                  });

                  setTimeout(() => {
                    this.productFormData.delete(variantId.toString());
                  }, 10000);
                }
              }
            })
            .catch(() => {
              // Not JSON or error, ignore
            });
          return response;
        });
      }

      return originalFetch.call(window, ...args);
    };

    if (window._fetchIntercepted) {
      const existingFetch = window.fetch;
      window.fetch = function (...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('/cart/add')) {
          return productFormExtensionFetch.call(window, ...args);
        }
        return existingFetch.call(window, ...args);
      };
    } else {
      window.fetch = productFormExtensionFetch;
      window._fetchIntercepted = true;
    }
  }

  setupEventListeners() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'product-form' && event.productVariantId) {
        const stored = this.productFormData.get(event.productVariantId.toString());

        if (stored) {
          const { formData, response } = stored;

          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form-extension', cartState: response });

          // Get product title from page context
          const productTitle = this.getProductTitle();
          if (isCustomOrder(formData, productTitle)) {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'product-form-extension',
              customOrderItemAdded: true,
              productVariantId: formData.get('id'),
              response: response,
            });
          }

          this.productFormData.delete(event.productVariantId.toString());
        } else {
          fetch(`${routes.cart_url}.js`)
            .then((response) => response.json())
            .then((state) => {
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form-extension', cartState: state });
            })
            .catch(() => {
              // Silently fail if cart fetch fails
            });
        }
      }
    });

    document.addEventListener('modalClosed', () => {
      setTimeout(() => {
        const now = Date.now();
        for (const [variantId, data] of this.productFormData.entries()) {
          if (now - data.timestamp < 3000) {
            const { formData, response } = data;

            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form-extension', cartState: response });

            if (isCustomOrder(formData)) {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form-extension',
                customOrderItemAdded: true,
                productVariantId: formData.get('id'),
                response: response,
              });
            }
          }
        }
      }, 100);
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }
}

const productFormExtension = new ProductFormExtension();
