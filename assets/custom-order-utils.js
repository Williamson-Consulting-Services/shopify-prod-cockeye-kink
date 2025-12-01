/**
 * Custom Order Utilities
 * Centralized utility functions for custom order operations
 * @namespace CustomOrderUtils
 */

class CustomOrderUtils {
  /**
   * Gets the configured custom order product title from theme settings
   * Uses dependency injection pattern - depends on window.customOrderSettings abstraction
   * @returns {string} - Custom order product title (default: "Custom Order")
   */
  static getCustomOrderProductTitle() {
    // Primary: Get from global settings object (set in custom-scripts-loader.liquid)
    // This ensures settings persist even if theme.liquid is overwritten
    if (window.customOrderSettings && window.customOrderSettings.productTitle) {
      const title = String(window.customOrderSettings.productTitle).trim();
      if (title !== '') {
        return title;
      }
    }

    // Fallback: Get from custom measurements config if available
    if (window.customMeasurementsConfig && window.customMeasurementsConfig.customOrderProductTitle) {
      const title = String(window.customMeasurementsConfig.customOrderProductTitle).trim();
      if (title !== '') {
        return title;
      }
    }

    // Final fallback to default
    return 'Custom Order';
  }

  /**
   * Determines if a cart item is a custom order
   * Checks product title against configured custom order product title
   * Also checks properties for backward compatibility during migration
   * @param {Object} item - Cart item object
   * @returns {boolean} - True if item is a custom order
   */
  static isCustomOrderItem(item) {
    if (!item) return false;

    const customOrderTitle = this.getCustomOrderProductTitle();

    // Primary method: Check product title
    // Cart API may have product.title or product_title
    let productTitle = null;
    if (item.product && item.product.title) {
      productTitle = String(item.product.title).trim();
    } else if (item.product_title) {
      productTitle = String(item.product_title).trim();
    }

    if (productTitle && productTitle.toLowerCase() === customOrderTitle.toLowerCase()) {
      return true;
    }

    // Backward compatibility: Check properties (for migration period)
    if (item.properties) {
      const customFlag = item.properties['_custom'] || item.properties['Order Type'];
      if (typeof customFlag === 'string' && customFlag.toLowerCase() === 'custom') {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines if a property should be filtered out
   * Filters empty, zero, and internal (underscore-prefixed) properties
   * @param {string} propertyName - Property name
   * @param {string} propertyValue - Property value
   * @returns {boolean} - True if property should be filtered
   */
  static shouldFilterProperty(propertyName, propertyValue) {
    // Filter internal properties (starting with underscore)
    if (propertyName && propertyName.charAt(0) === '_') {
      return true;
    }

    // Filter empty/blank values
    if (!propertyValue || (typeof propertyValue === 'string' && propertyValue.trim() === '')) {
      return true;
    }

    // Filter zero values (0, 0.0, 0.00, 0.000, etc.)
    const trimmedValue = String(propertyValue).trim();
    const numValue = parseFloat(trimmedValue);

    if (!isNaN(numValue) && numValue === 0) {
      // Check if the string representation is just zeros (with optional decimal point)
      const zeroPattern = /^0+(\.0+)?$/;
      if (zeroPattern.test(trimmedValue)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filters cart item properties, removing empty, zero, and internal properties
   * @param {Object} properties - Cart item properties object
   * @returns {Object} - Filtered properties object
   */
  static filterCartItemProperties(properties) {
    if (!properties || typeof properties !== 'object') {
      return {};
    }

    const filtered = {};

    for (const [key, value] of Object.entries(properties)) {
      if (!this.shouldFilterProperty(key, value)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Builds product page URL with query parameters for editing
   * @param {string} productHandle - Product handle
   * @param {Object} properties - Cart item properties
   * @returns {string} - Product page URL with query parameters
   */
  static buildEditUrl(productHandle, properties) {
    if (!productHandle) return '/';

    const baseUrl = `/products/${productHandle}`;
    const filteredProperties = this.filterCartItemProperties(properties);

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filteredProperties)) {
      // Skip internal properties
      if (key.charAt(0) === '_') continue;

      // Encode property name and value
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(String(value));
      params.append(encodedKey, encodedValue);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Parses URL query parameters for form pre-filling
   * @returns {Object} - Parsed property values
   */
  static parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const properties = {};

    for (const [key, value] of params.entries()) {
      // Decode property name and value
      const decodedKey = decodeURIComponent(key);
      const decodedValue = decodeURIComponent(value);
      properties[decodedKey] = decodedValue;
    }

    return properties;
  }

  /**
   * Determines if a FormData object represents a custom order
   * Used for form submission detection - checks if product title matches
   * @param {FormData} formData - Form data object
   * @param {string} productTitle - Product title from the form's product
   * @returns {boolean} - True if form data represents a custom order
   */
  static isCustomOrderFromFormData(formData, productTitle) {
    if (!formData) return false;

    // Primary method: Check product title
    if (productTitle) {
      const customOrderTitle = this.getCustomOrderProductTitle();
      if (String(productTitle).trim().toLowerCase() === customOrderTitle.toLowerCase()) {
        return true;
      }
    }

    // Backward compatibility: Check properties (for migration period)
    const orderType = formData.get('properties[Order Type]');
    const customFlag = formData.get('properties[_custom]');

    return (
      (typeof orderType === 'string' && orderType.toLowerCase() === 'custom') ||
      (typeof customFlag === 'string' && customFlag.toLowerCase() === 'custom')
    );
  }
}

// Export to window namespace (following theme pattern)
window.CustomOrderUtils = CustomOrderUtils;

