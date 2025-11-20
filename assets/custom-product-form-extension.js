const isCustomOrder = (formData) => {
  if (!formData) return false;

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

  setupFetchInterceptor() {
    const originalFetch = window.fetch || fetch;
    const productFormExtensionFetch = (...args) => {
      const url = args[0];
      const options = args[1] || {};

      if (typeof url === 'string' && url.includes('/cart/add')) {
        let formData = null;
        if (options.body instanceof FormData) {
          formData = options.body;
        }

        return originalFetch.apply(this, args).then((response) => {
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

      return originalFetch.apply(this, args);
    };

    if (window._fetchIntercepted) {
      const existingFetch = window.fetch;
      window.fetch = function (...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('/cart/add')) {
          return productFormExtensionFetch.apply(this, args);
        }
        return existingFetch.apply(this, args);
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

          if (isCustomOrder(formData)) {
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
