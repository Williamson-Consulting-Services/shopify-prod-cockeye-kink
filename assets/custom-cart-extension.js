class CartExtension {
  constructor() {
    this.cartUpdateUnsubscriber = undefined;
  }

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        fetch(`${routes.cart_url}.js`)
          .then((response) => response.json())
          .then((state) => {
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-extension', cartState: state });
          })
          .catch(() => {
            // Silently fail if cart fetch fails
          });
      } else if (event.source !== 'product-form') {
        fetch(`${routes.cart_url}?section_id=main-cart-items`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const itemCount = html.querySelector('[data-cart-item-count]');
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'cart-extension',
              section: 'main-cart-items',
              itemCount: itemCount ? Number(itemCount.textContent) : null,
            });
          })
          .catch(() => {
            // Silently fail if section fetch fails
          });
      }
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }
}

const cartExtension = new CartExtension();
cartExtension.connectedCallback();
