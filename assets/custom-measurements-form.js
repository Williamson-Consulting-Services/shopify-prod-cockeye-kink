/**
 * Custom Measurements Form
 * Class-based modular system for managing custom product measurements
 */

(function () {
  'use strict';

  // Utility class for value formatting and parsing
  class MeasurementUtils {
    constructor(config) {
      // Use config values if available, otherwise fall back to defaults
      const constants = (config && config.constants) || {};
      this.precision = (config && config.precision) || 3;
      this.INCH_TO_CM = constants.INCH_TO_CM || 2.54;
      this.CM_TO_INCH = constants.CM_TO_INCH || 1 / 2.54;
    }

    formatValue(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '';
      }
      return Number(value).toFixed(this.precision);
    }

    parseValue(raw) {
      if (typeof raw !== 'string') return NaN;
      const trimmed = raw.trim();
      if (trimmed === '') return NaN;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : NaN;
    }

    hasValidNumber(input) {
      if (!input) return false;
      return Number.isFinite(this.parseValue(input.value));
    }
  }

  // Utility class for handling "Other" option in dropdowns
  class OtherOptionHandler {
    constructor(selectId, wrapperId, textId, onInteraction) {
      this.selectEl = document.getElementById(selectId);
      this.wrapperEl = document.getElementById(wrapperId);
      this.textEl = document.getElementById(textId);
      this.onInteraction = onInteraction || (() => {});
      this.init();
    }

    init() {
      if (!this.selectEl || !this.wrapperEl || !this.textEl) return;

      this.selectEl.addEventListener('change', () => this.handleSelectChange());
      this.textEl.addEventListener('input', () => this.onInteraction());
    }

    handleSelectChange() {
      this.onInteraction();
      if (this.selectEl.value === 'Other') {
        this.wrapperEl.style.display = 'flex';
      } else {
        this.wrapperEl.style.display = 'none';
        this.textEl.value = '';
      }
    }

    reset() {
      if (this.wrapperEl) this.wrapperEl.style.display = 'none';
      if (this.textEl) this.textEl.value = '';
      if (this.selectEl) this.selectEl.selectedIndex = 0;
    }
  }

  // Utility class for collapsible sections
  class CollapsibleSection {
    constructor(toggleElement) {
      this.toggle = toggleElement;
      this.targetId = toggleElement.dataset.target;
      this.content = document.getElementById(this.targetId);
      if (!this.content) return;

      this.plusIcon = toggleElement.querySelector('.toggle-plus');
      this.minusIcon = toggleElement.querySelector('.toggle-minus');
      this.init();
    }

    init() {
      this.toggle.addEventListener('click', () => this.toggleSection());
    }

    toggleSection() {
      const isExpanded = this.toggle.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        this.collapse();
      } else {
        this.expand();
      }
    }

    expand() {
      this.content.style.display = 'block';
      this.toggle.setAttribute('aria-expanded', 'true');
      if (this.plusIcon) this.plusIcon.style.display = 'none';
      if (this.minusIcon) this.minusIcon.style.display = 'inline';

      // Focus on textarea if present
      const textarea = this.content.querySelector('textarea');
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }
    }

    collapse() {
      this.content.style.display = 'none';
      this.toggle.setAttribute('aria-expanded', 'false');
      if (this.plusIcon) this.plusIcon.style.display = 'inline';
      if (this.minusIcon) this.minusIcon.style.display = 'none';
    }
  }

  // Utility class for character counting
  class CharacterCounter {
    constructor(textarea, counterElement, maxLength = 500) {
      this.textarea = textarea;
      this.counter = counterElement;
      this.maxLength = maxLength;
      this.init();
    }

    init() {
      this.textarea.addEventListener('input', () => this.update());
      this.update(); // Initial count
    }

    update() {
      const length = this.textarea.value.length;
      this.counter.textContent = length;

      const counterParent = this.counter.parentElement;
      if (length >= this.maxLength) {
        counterParent.classList.add('character-limit-reached');
      } else {
        counterParent.classList.remove('character-limit-reached');
      }
    }
  }

  // Validation service
  class ValidationService {
    constructor(config, utils) {
      this.config = config;
      this.utils = utils;
    }

    publishValidationState(isValid, selectedCategory, shouldScroll = false) {
      if (
        typeof publish === 'function' &&
        typeof PUB_SUB_EVENTS !== 'undefined' &&
        PUB_SUB_EVENTS.customMeasurementsValidationChange
      ) {
        const eventData = {
          isValid,
          selectedCategory,
          shouldScroll,
          timestamp: Date.now(),
        };
        publish(PUB_SUB_EVENTS.customMeasurementsValidationChange, eventData);
      } else {
        console.warn('[ValidationService] Cannot publish - pub/sub not available', {
          hasPublish: typeof publish === 'function',
          hasEvents: typeof PUB_SUB_EVENTS !== 'undefined',
          eventName: PUB_SUB_EVENTS?.customMeasurementsValidationChange,
        });
      }
    }

    validateRequiredFields(selectedCategory, shouldScroll = false) {
      // Check if we're in product-type mode (customer-facing form)
      const isProductTypeMode =
        this.config?.autoSelectedCategory !== undefined && this.config?.autoSelectedCategory !== null;

      if (!selectedCategory || !this.config.measurements) {
        this.publishValidationState(false, selectedCategory, shouldScroll);
        return false;
      }

      // Query for harness section if needed (only for staff-facing forms)
      const harnessSection = document.getElementById('harness-details');

      const activeFields = document.querySelectorAll('.measurement-field.active');

      // Check if there are any required measurement fields for this category
      let hasRequiredMeasurements = false;
      if (selectedCategory !== 'Other') {
        for (const field of activeFields) {
          const measName = field.dataset.measurement;
          const measConfig = this.config.measurements[measName];
          if (!measConfig) continue;

          const categoryInfo = measConfig.categories ? measConfig.categories[selectedCategory] : null;
          if (categoryInfo && categoryInfo.required) {
            hasRequiredMeasurements = true;
            break;
          }
        }
      }

      // Validate measurement fields only if there are required ones
      // Skip measurement validation when "Other" category is selected
      if (selectedCategory !== 'Other') {
        for (const field of activeFields) {
          const measName = field.dataset.measurement;
          const measConfig = this.config.measurements[measName];
          if (!measConfig) continue;

          const categoryInfo = measConfig.categories ? measConfig.categories[selectedCategory] : null;
          if (!categoryInfo || !categoryInfo.required) continue;

          const inInput = field.querySelector('.measurement-in');
          const cmInput = field.querySelector('.measurement-cm');
          const hasValue = this.utils.hasValidNumber(inInput) || this.utils.hasValidNumber(cmInput);
          if (!hasValue) {
            // Add error class and scroll to field (only on submit)
            field.classList.add('measurement-field--error');
            if (inInput) inInput.classList.add('measurement-input--error');
            if (cmInput) cmInput.classList.add('measurement-input--error');
            if (shouldScroll) {
              field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            this.publishValidationState(false, selectedCategory, shouldScroll);
            return false;
          } else {
            // Remove error class on valid fields
            field.classList.remove('measurement-field--error');
            if (inInput) inInput.classList.remove('measurement-input--error');
            if (cmInput) cmInput.classList.remove('measurement-input--error');
          }
        }
      }

      // Validate associate field - only required if there are required measurement fields
      // If all measurement fields are optional, associate is also optional
      const associateSelect = document.getElementById('associate-select');
      if (associateSelect && hasRequiredMeasurements) {
        const selectedValue = associateSelect.value;
        if (!selectedValue || selectedValue === '') {
          associateSelect.classList.add('measurement-input--error');
          if (shouldScroll) {
            associateSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
          return false;
        }
        if (selectedValue === 'Other') {
          const associateText = document.getElementById('associate-text');
          if (!associateText || !associateText.value || associateText.value.trim() === '') {
            associateText.classList.add('measurement-input--error');
            if (shouldScroll) {
              associateText.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            this.publishValidationState(false, selectedCategory, shouldScroll);
            return false;
          }
        }
        associateSelect.classList.remove('measurement-input--error');
      } else if (associateSelect) {
        // Clear error state if associate is optional
        associateSelect.classList.remove('measurement-input--error');
        const associateText = document.getElementById('associate-text');
        if (associateText) associateText.classList.remove('measurement-input--error');
      }

      // Validate leather color (required for all categories except Tag)
      // In product-type mode (customer-facing), leather color is handled by variants, not required
      // If all measurement fields are optional, leather color is also optional
      if (selectedCategory !== 'Tag' && !isProductTypeMode && hasRequiredMeasurements) {
        const leatherColorRadios = document.querySelectorAll('.leather-color-radio');
        let hasLeatherColor = false;
        let isLeatherColorOther = false;
        let firstLeatherColorRadio = null;

        leatherColorRadios.forEach((radio) => {
          if (!firstLeatherColorRadio) firstLeatherColorRadio = radio;
          if (radio.checked) {
            hasLeatherColor = true;
            if (radio.value === 'Other') {
              isLeatherColorOther = true;
            }
          }
        });

        const leatherColorText = document.getElementById('leather-color-text');
        const hasCustomText = leatherColorText && leatherColorText.value && leatherColorText.value.trim() !== '';

        if (!hasLeatherColor || (isLeatherColorOther && !hasCustomText)) {
          if (shouldScroll && firstLeatherColorRadio) {
            const leatherColorSection = document.getElementById('leather-color-section');
            if (leatherColorSection) {
              leatherColorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          if (isLeatherColorOther && leatherColorText) {
            leatherColorText.classList.add('measurement-input--error');
          }
          this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
          return false;
        }
        if (leatherColorText) leatherColorText.classList.remove('measurement-input--error');
      } else if (selectedCategory !== 'Tag' && !isProductTypeMode) {
        // Clear error state if leather color is optional
        const leatherColorText = document.getElementById('leather-color-text');
        if (leatherColorText) leatherColorText.classList.remove('measurement-input--error');
      }

      // Validate custom text input (if present - from validated-text-input component)
      // Only validate if visible and there are required measurement fields
      // Check for custom text input by looking for input with name="properties[Custom Text]"
      const customTextInput = document.querySelector('input[name="properties[Custom Text]"]');
      if (customTextInput && hasRequiredMeasurements) {
        // Check if input is visible (not hidden via display:none or visibility:hidden)
        const isVisible =
          customTextInput.offsetParent !== null &&
          customTextInput.style.display !== 'none' &&
          customTextInput.style.visibility !== 'hidden';

        if (isVisible) {
          const value = customTextInput.value.trim();
          const maxLengthAttr = customTextInput.getAttribute('maxlength');
          let maxLength;

          if (maxLengthAttr !== null && maxLengthAttr !== '') {
            maxLength = parseInt(maxLengthAttr, 10);
            if (isNaN(maxLength) || maxLength < 0) {
              const errorMsg = `Custom text input has invalid maxlength attribute: "${maxLengthAttr}". Expected a positive number.`;
              console.error(errorMsg);
              throw new Error(errorMsg);
            }
          } else {
            // No maxlength attribute - require configurable default
            if (!this.config || !this.config.customTextMaxLengthDefault) {
              const errorMsg =
                'Custom text input missing maxlength attribute and config.customTextMaxLengthDefault is not defined. Please configure customTextMaxLengthDefault in custom-measurements-config.liquid.';
              console.error(errorMsg);
              throw new Error(errorMsg);
            }
            maxLength = this.config.customTextMaxLengthDefault;
            console.warn('Custom text input missing maxlength attribute, using config default:', maxLength);
          }

          // Check if empty (required field)
          if (!value) {
            if (shouldScroll) {
              customTextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            customTextInput.classList.add('measurement-input--error');
            this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
            return false;
          }

          // Check length (validate trimmed length, not raw length)
          if (maxLength > 0 && value.length > maxLength) {
            if (shouldScroll) {
              customTextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            customTextInput.classList.add('measurement-input--error');
            this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
            return false;
          }

          // Check HTML5 validity (this checks required, pattern, maxlength attributes)
          // Note: checkValidity() uses the raw value, not trimmed, so we check it after our trimmed checks
          if (!customTextInput.checkValidity()) {
            if (shouldScroll) {
              customTextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            customTextInput.classList.add('measurement-input--error');
            this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
            return false;
          }
        }

        // All validations passed - clear error state
        customTextInput.classList.remove('measurement-input--error');
      } else if (customTextInput) {
        // Clear error state if custom text is optional
        customTextInput.classList.remove('measurement-input--error');
      }

      // Validate harness section - only if active and there are required measurement fields
      // If all measurement fields are optional, harness fields are also optional
      if (harnessSection && harnessSection.classList.contains('active') && hasRequiredMeasurements) {
        // Validate harness type selection
        const harnessTypeInputs = document.querySelectorAll('.harness-type-input');
        let hasHarnessType = false;
        let firstHarnessTypeInput = null;
        harnessTypeInputs.forEach((input) => {
          if (!firstHarnessTypeInput) firstHarnessTypeInput = input;
          if (input.checked) {
            hasHarnessType = true;
          }
        });
        if (!hasHarnessType) {
          if (shouldScroll && firstHarnessTypeInput) {
            const harnessTypeSelector = document.getElementById('harness-type-selector');
            if (harnessTypeSelector) {
              harnessTypeSelector.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
          return false;
        }
      }

      // Validate tag type selection (if Tag category is selected)
      // Only required if there are required measurement fields
      // If all measurement fields are optional, tag type is also optional
      const tagTypeSelector = document.getElementById('tag-type-selector');
      if (tagTypeSelector && tagTypeSelector.style.display !== 'none' && hasRequiredMeasurements) {
        const tagTypeInputs = document.querySelectorAll('.tag-type-input');
        let hasTagType = false;
        let firstTagTypeInput = null;
        tagTypeInputs.forEach((input) => {
          if (!firstTagTypeInput) firstTagTypeInput = input;
          if (input.checked) {
            hasTagType = true;
          }
        });
        if (!hasTagType) {
          if (shouldScroll && tagTypeSelector) {
            tagTypeSelector.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          this.publishValidationState(false, selectedCategory, harnessSection, shouldScroll);
          return false;
        }
      }

      // Validate harness fields - only if active and there are required measurement fields
      // If all measurement fields are optional, harness fields are also optional
      if (harnessSection && harnessSection.classList.contains('active') && hasRequiredMeasurements) {
        // Validate harness fields (excluding leather color which is always required)
        const harnessFields = [
          'properties[Left Front Plate]',
          'properties[Right Front Plate]',
          'properties[Back Plate]',
          'properties[Long Sliders]',
        ];

        for (const fieldName of harnessFields) {
          const select = document.querySelector(`select[name="${fieldName}"]`);
          if (!select) continue;
          const selectedOption = select.options[select.selectedIndex];
          const hasSelectValue =
            selectedOption &&
            selectedOption.value !== '' &&
            selectedOption.value !== null &&
            selectedOption.value !== 'Select one' &&
            selectedOption.value !== 'Other';

          const customTextName = fieldName.replace(']', ' - Text]');
          const customText = document.querySelector(`input[name="${customTextName}"]`);
          const hasCustomText = customText && customText.value && customText.value.trim() !== '';

          if (!hasSelectValue && !hasCustomText) {
            select.classList.add('measurement-input--error');
            if (shouldScroll && select.closest('.select-wrapper')) {
              select.closest('.select-wrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            this.publishValidationState(false, selectedCategory, shouldScroll);
            return false;
          } else {
            select.classList.remove('measurement-input--error');
          }
        }
      }

      // All validations passed
      this.publishValidationState(true, selectedCategory, shouldScroll);
      return true;
    }
  }

  // Button state manager
  class ButtonStateManager {
    constructor(buttonId, sectionId) {
      this.buttonId = buttonId;
      this.sectionId = sectionId;
      this.button = null;
      this.warningLogged = false;
      this.listenerAttached = false;
      this.initialButtonText = null; // Store initial button text to detect Dawn's sold out state
      this.validationUnsubscriber = null;
      this.setupValidationSubscription();
    }

    setupValidationSubscription() {
      // Subscribe to validation state changes via pub/sub
      if (
        typeof subscribe === 'function' &&
        typeof PUB_SUB_EVENTS !== 'undefined' &&
        PUB_SUB_EVENTS.customMeasurementsValidationChange
      ) {
        this.validationUnsubscriber = subscribe(PUB_SUB_EVENTS.customMeasurementsValidationChange, (event) => {
          // Update button state based on validation event
          this.update(event.isValid);
        });
      } else {
        console.warn('[ButtonStateManager] Cannot subscribe - pub/sub not available', {
          hasSubscribe: typeof subscribe === 'function',
          hasEvents: typeof PUB_SUB_EVENTS !== 'undefined',
          eventName: PUB_SUB_EVENTS?.customMeasurementsValidationChange,
        });
      }
    }

    destroy() {
      // Clean up subscription
      if (this.validationUnsubscriber) {
        this.validationUnsubscriber();
        this.validationUnsubscriber = null;
      }
    }

    resolveButton() {
      if (this.button && document.body.contains(this.button)) {
        return this.button;
      }

      const buttonSelectors = [
        `#${this.buttonId}`,
        `#product-form-${this.sectionId} button[type="submit"]`,
        `#product-form-${this.sectionId} button[name="add"]`,
        'form[action*="/cart/add"] button[type="submit"]',
        'form[action*="/cart/add"] button[name="add"]',
        'button[name="add"][type="submit"]',
      ];

      for (const selector of buttonSelectors) {
        const candidate = document.querySelector(selector);
        if (candidate) {
          this.button = candidate;
          // Store initial button text to detect if Dawn set it to "Sold out" or "Unavailable"
          if (this.initialButtonText === null) {
            const buttonTextSpan = this.button.querySelector('span');
            this.initialButtonText = buttonTextSpan ? buttonTextSpan.textContent.trim() : '';
          }
          if (!this.listenerAttached) {
            // Attach handlers directly to the button using mousedown/pointerdown
            // These events fire even on disabled buttons, unlike click events
            const handleDisabledButton = (event) => {
              // If button is disabled, run validation with scrolling and prevent submission
              if (
                this.button.disabled ||
                this.button.hasAttribute('disabled') ||
                this.button.getAttribute('aria-disabled') === 'true'
              ) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (window.customMeasurementsForm && window.customMeasurementsForm.validationService) {
                  window.customMeasurementsForm.validationService.validateRequiredFields(
                    window.customMeasurementsForm.selectedCategory,
                    true, // Enable scrolling when clicking disabled button
                  );
                }
                return false;
              }
            };

            // mousedown and pointerdown work on disabled buttons
            this.button.addEventListener('mousedown', handleDisabledButton, true);
            this.button.addEventListener('pointerdown', handleDisabledButton, true);

            // Also handle click for when button is enabled
            this.button.addEventListener('click', (event) => {
              if (
                this.button.disabled ||
                this.button.hasAttribute('disabled') ||
                this.button.getAttribute('aria-disabled') === 'true'
              ) {
                event.preventDefault();
                event.stopPropagation();
                if (window.customMeasurementsForm && window.customMeasurementsForm.validationService) {
                  window.customMeasurementsForm.validationService.validateRequiredFields(
                    window.customMeasurementsForm.selectedCategory,
                    true,
                  );
                }
                return false;
              }
              // If button is enabled, proceed normally
              if (window.customMeasurementsForm) {
                window.customMeasurementsForm.setResetAfterAddToCartPending(true);
              }
            });

            this.listenerAttached = true;
          }
          return this.button;
        }
      }

      if (!this.warningLogged) {
        console.warn('Could not find add to cart button with ID:', this.buttonId);
        this.warningLogged = true;
      }

      return null;
    }

    update(isValid) {
      const button = this.resolveButton();
      if (!button) return;

      // Check if Dawn disabled the button (variant sold out)
      // Dawn sets button text to "Sold out" or "Unavailable" when variant is unavailable
      const buttonTextSpan = button.querySelector('span');
      const currentButtonText = buttonTextSpan ? buttonTextSpan.textContent.trim() : '';
      const isSoldOut = currentButtonText === 'Sold out' || currentButtonText === 'Unavailable';

      // Also check variant ID input - if it's disabled, variant is sold out
      const variantIdInput = document.querySelector('.product-variant-id');
      const isVariantSoldOut = variantIdInput && variantIdInput.hasAttribute('disabled');

      // If Dawn marked it as sold out, respect that and don't enable
      if (isSoldOut || isVariantSoldOut) {
        // Keep it disabled, but don't override Dawn's text or state
        return;
      }

      // Otherwise, manage button state based on our validation
      if (!isValid) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.setAttribute('disabled', 'disabled');
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Please select a category and fill all required measurements';
      } else {
        // Validation passed and variant is available - enable the button
        button.disabled = false;
        button.style.opacity = '1';
        button.removeAttribute('disabled');
        button.removeAttribute('aria-disabled');
        button.removeAttribute('title');
        // Restore "Add to cart" text if it was changed
        if (buttonTextSpan && currentButtonText !== 'Add to cart') {
          buttonTextSpan.textContent = 'Add to cart';
        }
      }
    }

    resetLoadingState() {
      const button = this.resolveButton();
      if (button) {
        button.classList.remove('loading');
        button.removeAttribute('aria-disabled');
        const spinner = button.querySelector('.loading-overlay__spinner');
        if (spinner) spinner.classList.add('hidden');
      }
    }
  }

  // Measurement manager — single shared store so measurements persist across category/type switches (e.g. Chest when moving Harness → Shirt)
  class MeasurementManager {
    constructor(config, utils) {
      this.config = config;
      this.utils = utils;
      /** Shared across all categories and sub-types: measName -> { in, cm } */
      this.sharedMeasurements = new Map();
      this.isSyncingValues = false;
    }

    /** Returns the shared store (same for all categories) so values persist when switching type. */
    getCategoryStore(category) {
      if (!category) return null;
      return this.sharedMeasurements;
    }

    syncValues(measName, sourceUnit, numericValue, currentCategoryStore) {
      const field = document.querySelector(`.measurement-field[data-measurement="${measName}"]`);
      if (!field) return;
      const inInput = field.querySelector('.measurement-in');
      const cmInput = field.querySelector('.measurement-cm');
      if (!inInput || !cmInput) return;

      if (this.isSyncingValues) return;
      this.isSyncingValues = true;

      if (sourceUnit === 'in') {
        if (inInput.value !== this.utils.formatValue(numericValue)) {
          inInput.value = this.utils.formatValue(numericValue);
        }
        const converted = numericValue * this.utils.INCH_TO_CM;
        cmInput.value = this.utils.formatValue(converted);
        if (currentCategoryStore) {
          currentCategoryStore.set(measName, { in: numericValue, cm: converted });
        }
      } else {
        if (cmInput.value !== this.utils.formatValue(numericValue)) {
          cmInput.value = this.utils.formatValue(numericValue);
        }
        const converted = numericValue * this.utils.CM_TO_INCH;
        inInput.value = this.utils.formatValue(converted);
        if (currentCategoryStore) {
          currentCategoryStore.set(measName, { in: converted, cm: numericValue });
        }
      }

      this.isSyncingValues = false;
    }

    /** Saves active measurement fields into the shared store (merge only; does not clear other measurements). */
    saveCategoryMeasurements(category, measurementFields) {
      if (!category) return;
      const store = this.sharedMeasurements;

      measurementFields.forEach((field) => {
        if (!field.classList.contains('active')) return;
        const measName = field.dataset.measurement;
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');
        let inValue = this.utils.parseValue(inInput ? inInput.value : '');
        let cmValue = this.utils.parseValue(cmInput ? cmInput.value : '');

        if (!Number.isFinite(inValue) && Number.isFinite(cmValue)) {
          inValue = cmValue * this.utils.CM_TO_INCH;
        } else if (!Number.isFinite(cmValue) && Number.isFinite(inValue)) {
          cmValue = inValue * this.utils.INCH_TO_CM;
        }

        if (Number.isFinite(inValue) || Number.isFinite(cmValue)) {
          store.set(measName, {
            in: Number.isFinite(inValue) ? inValue : null,
            cm: Number.isFinite(cmValue) ? cmValue : null,
          });
        }
      });
    }

    /** Restores measurement field values from the shared store (so e.g. Chest is filled when switching to Shirt). */
    restoreMeasurementsForCategory(category, measurementFields) {
      const store = this.sharedMeasurements;
      measurementFields.forEach((field) => {
        const measName = field.dataset.measurement;
        const stored = store ? store.get(measName) : null;
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');

        if (stored && (Number.isFinite(stored.in) || Number.isFinite(stored.cm))) {
          if (inInput) {
            inInput.value = Number.isFinite(stored.in) ? this.utils.formatValue(stored.in) : '';
          }
          if (cmInput) {
            cmInput.value = Number.isFinite(stored.cm) ? this.utils.formatValue(stored.cm) : '';
          }
        } else {
          if (inInput) inInput.value = '';
          if (cmInput) cmInput.value = '';
        }
      });
    }

    /**
     * Merges measurement params from URL (or edit_ref state) into the shared store.
     * Ensures measurements from other categories (e.g. Shirt's Chest when we're on Tag page) are
     * preserved so that Shirt → Tag → Shirt keeps Shirt data.
     * @param {Object} urlParams - Parsed URL/state object with keys like "Chest (in)", "Chest (cm)".
     */
    mergeMeasurementsFromUrlParams(urlParams) {
      if (!urlParams || typeof urlParams !== 'object') return;
      const store = this.sharedMeasurements;
      const byName = new Map();
      for (const [key, value] of Object.entries(urlParams)) {
        const str = value != null ? String(value).trim() : '';
        if (str === '') continue;
        const num = this.utils.parseValue(str);
        if (!Number.isFinite(num)) continue;
        let measName;
        let unit;
        if (key.endsWith(' (in)')) {
          measName = key.slice(0, -5).trim();
          unit = 'in';
        } else if (key.endsWith(' (cm)')) {
          measName = key.slice(0, -5).trim();
          unit = 'cm';
        } else continue;
        if (!measName) continue;
        let entry = byName.get(measName);
        if (!entry) {
          entry = { in: null, cm: null };
          byName.set(measName, entry);
        }
        if (unit === 'in') entry.in = num;
        else entry.cm = num;
      }
      byName.forEach((entry, measName) => {
        if (!Number.isFinite(entry.in) && !Number.isFinite(entry.cm)) return;
        const existing = store.get(measName) || { in: null, cm: null };
        let inVal = Number.isFinite(entry.in) ? entry.in : (Number.isFinite(existing.in) ? existing.in : null);
        let cmVal = Number.isFinite(entry.cm) ? entry.cm : (Number.isFinite(existing.cm) ? existing.cm : null);
        if (Number.isFinite(inVal) && !Number.isFinite(cmVal)) cmVal = inVal * this.utils.INCH_TO_CM;
        if (Number.isFinite(cmVal) && !Number.isFinite(inVal)) inVal = cmVal * this.utils.CM_TO_INCH;
        store.set(measName, { in: inVal, cm: cmVal });
      });
    }

    clearAll() {
      this.sharedMeasurements.clear();
    }
  }

  // Category manager
  class CategoryManager {
    constructor(config) {
      this.config = config;
    }

    updateMeasurementsForCategory(category, measurementFields) {
      measurementFields.forEach((field) => {
        const measName = field.dataset.measurement;
        const measConfig = this.config.measurements[measName];
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');
        const categoryInfo = measConfig && measConfig.categories ? measConfig.categories[category] : null;
        let baseLabel = field.dataset.labelBase || measName;

        // Strip asterisks from baseLabel for display
        baseLabel = baseLabel.replace(/\*+$/, '').trim();
        // Store clean label without asterisk
        field.dataset.labelBase = baseLabel;

        const labelElement = field.querySelector('label');
        const isOtherCategory = category === 'Other';

        if (categoryInfo && categoryInfo.included) {
          field.classList.add('active');
          const isOptional = categoryInfo.required === false;
          field.classList.toggle('measurement-field--optional', isOptional);
          field.dataset.optional = isOptional ? 'true' : 'false';

          if (labelElement) {
            // Special case: "Other" category - no indicators
            if (isOtherCategory) {
              labelElement.innerHTML = baseLabel;
            } else if (isOptional) {
              // Optional field: show "(optional)" in italics
              labelElement.innerHTML = `${baseLabel} <span class="opt-tag">(optional)</span>`;
            } else {
              // Mandatory field: show red asterisk
              labelElement.innerHTML = `${baseLabel} <span class="req-star">*</span>`;
            }
          }
          if (inInput) inInput.value = '';
          if (cmInput) cmInput.value = '';
        } else {
          field.classList.remove('active');
          field.classList.remove('measurement-field--optional');
          field.removeAttribute('data-optional');
          if (labelElement) {
            labelElement.innerHTML = baseLabel;
          }
          const inInput = field.querySelector('.measurement-in');
          const cmInput = field.querySelector('.measurement-cm');
          if (inInput) inInput.value = '';
          if (cmInput) cmInput.value = '';
        }
      });

      // Hide measurement group headers if they have no active measurements
      this.updateMeasurementGroupVisibility();
    }

    updateMeasurementGroupVisibility() {
      const measurementGroups = document.querySelectorAll('.measurement-group[data-group]');
      measurementGroups.forEach((group) => {
        const groupContainer = group.querySelector('.measurements-group');
        if (!groupContainer) {
          group.style.display = 'none';
          return;
        }

        const hasActiveMeasurements = groupContainer.querySelectorAll('.measurement-field.active').length > 0;
        group.style.display = hasActiveMeasurements ? '' : 'none';
      });
    }

    clearAllErrorStates() {
      // Clear error states from all measurement fields
      document.querySelectorAll('.measurement-field--error').forEach((field) => {
        field.classList.remove('measurement-field--error');
      });
      document.querySelectorAll('.measurement-input--error').forEach((input) => {
        input.classList.remove('measurement-input--error');
      });
    }

    updateSectionVisibility(
      category,
      harnessSection,
      harnessTypeSelector,
      tagTypeSelector,
      leatherColorSection,
      notesSection,
      associateSection,
      otherCategoryNotice,
    ) {
      // Show/hide "Other" category notice banner
      if (otherCategoryNotice) {
        const showNotice = category === 'Other';
        otherCategoryNotice.style.display = showNotice ? 'block' : 'none';
      }

      // Leather color is available for all categories except Tag
      if (leatherColorSection) {
        if (category === 'Tag') {
          leatherColorSection.classList.remove('active');
          leatherColorSection.style.display = 'none';
          // Reset leather color selection when hiding
          const leatherColorRadios = leatherColorSection.querySelectorAll('.leather-color-radio');
          leatherColorRadios.forEach((radio) => {
            radio.checked = false;
          });
          const leatherColorText = document.getElementById('leather-color-text');
          const leatherColorTextWrapper = document.getElementById('leather-color-text-wrapper');
          if (leatherColorText) leatherColorText.value = '';
          if (leatherColorTextWrapper) leatherColorTextWrapper.style.display = 'none';
        } else {
          leatherColorSection.classList.add('active');
          leatherColorSection.style.display = '';
        }
      }

      // Show/hide tag type selector
      if (tagTypeSelector) {
        const showTagType = category === 'Tag';
        if (showTagType) {
          tagTypeSelector.style.display = 'block';
          tagTypeSelector.classList.add('active');
        } else {
          tagTypeSelector.style.display = 'none';
          tagTypeSelector.classList.remove('active');
          // Reset tag type selection when hiding
          const tagTypeInputs = tagTypeSelector.querySelectorAll('input[type="radio"]');
          tagTypeInputs.forEach((input) => {
            input.checked = false;
          });
        }
      }

      if (harnessSection) {
        const showHarness =
          (this.config.categoryConfig && this.config.categoryConfig.harness_details
            ? this.config.categoryConfig.harness_details.includes(category)
            : false) ||
          (this.config.categories && this.config.categories.harness_details
            ? this.config.categories.harness_details.includes(category)
            : false);
        harnessSection.classList.toggle('active', showHarness);
      }
      if (harnessTypeSelector) {
        const showHarnessType = category === 'Harness';
        if (showHarnessType) {
          harnessTypeSelector.style.display = 'block';
          harnessTypeSelector.classList.add('active');
        } else {
          harnessTypeSelector.style.display = 'none';
          harnessTypeSelector.classList.remove('active');
          // Reset harness type selection when hiding
          const harnessTypeInputs = harnessTypeSelector.querySelectorAll('input[type="radio"]');
          harnessTypeInputs.forEach((input) => {
            input.checked = false;
          });
        }
      }
      if (notesSection) {
        notesSection.classList.add('active');
      }
      if (associateSection) {
        associateSection.classList.add('active');
      }

      // Hide all custom text wrappers except associate
      document.querySelectorAll('.custom-text-wrapper').forEach((wrapper) => {
        if (wrapper.id !== 'associate-text-wrapper') {
          wrapper.style.display = 'none';
        }
      });

      // Handle associate "Other" option
      const associateSelect = document.getElementById('associate-select');
      const associateTextWrapper = document.getElementById('associate-text-wrapper');
      if (associateSelect && associateTextWrapper) {
        const selectedValue = associateSelect.value;
        if (selectedValue === 'Other') {
          associateTextWrapper.style.display = 'flex';
        } else {
          associateTextWrapper.style.display = 'none';
          const associateText = document.getElementById('associate-text');
          if (associateText) associateText.value = '';
        }
      }
    }
  }

  // Main form controller
  class CustomMeasurementsForm {
    constructor(sectionId) {
      this.sectionId = sectionId;
      this.config = window.customMeasurementsConfig || this.buildConfigFromDOM();

      // Debug logging (enabled via ?cm_debug=1 or localStorage cm_debug=1)
      this.debugEnabled = false;
      this.debugPrefix = `[CustomMeasurementsForm:${this.sectionId}]`;
      try {
        const params = new URLSearchParams(window.location.search || '');
        const flag = params.get('cm_debug');
        this.debugEnabled =
          flag === '1' || flag === 'true' || (window.localStorage && window.localStorage.getItem('cm_debug') === '1');
      } catch (e) {
        this.debugEnabled = false;
      }

      this.utils = new MeasurementUtils(this.config);
      this.validationService = new ValidationService(this.config, this.utils);
      this.buttonManager = new ButtonStateManager(`ProductSubmitButton-${sectionId}`, sectionId);
      this.measurementManager = new MeasurementManager(this.config, this.utils);
      this.categoryManager = new CategoryManager(this.config);

      this.currentUnit = 'in';
      this.selectedCategory = null;
      this.currentCategoryStore = null;
      this.hasInteractedWithForm = false;
      this.resetAfterAddToCartPending = false;

      this.measurementFields = Array.from(document.querySelectorAll('.measurement-field'));
      this.categoryInputs = Array.from(document.querySelectorAll('.category-option-input'));
      this.measurementInputs = Array.from(document.querySelectorAll('.measurement-input')).map((input) => {
        if (!input.dataset.originalName) {
          input.dataset.originalName = input.getAttribute('name');
        }
        return input;
      });

      this.harnessSection = document.getElementById('harness-details');
      this.harnessTypeSelector = document.getElementById('harness-type-selector');
      this.tagTypeSelector = document.getElementById('tag-type-selector');
      this.leatherColorSection = document.getElementById('leather-color-section');
      this.notesSection = document.getElementById('notes-section');
      this.associateSection = document.getElementById('associate-section');
      this.otherCategoryNotice = document.getElementById('other-category-notice');
      this.associateSelect = document.getElementById('associate-select');
      this.associateText = document.getElementById('associate-text');
      this.associateTextWrapper = document.getElementById('associate-text-wrapper');
      this.unitToggleInputs = document.querySelectorAll('#unitToggle input[type="radio"]');
      this.unitOfMeasureInput = document.getElementById('unitOfMeasure');

      this.productForm = this.findProductForm();
      this.harnessSelects = document.querySelectorAll('#harness-details select');
      this.harnessCustomTexts = document.querySelectorAll('#harness-details .custom-text');
      this.harnessTypeInputs = document.querySelectorAll('.harness-type-input');
      this.leatherColorRadios = document.querySelectorAll('.leather-color-radio');
      this.leatherColorText = document.getElementById('leather-color-text');
      this.leatherColorTextWrapper = document.getElementById('leather-color-text-wrapper');
      this.paymentToggleContainer = document.getElementById(`custom-measurements-payment-toggle-${this.sectionId}`);
      this.paymentPayNowRadio = document.getElementById(`payment-pay-now-${this.sectionId}`);
      this.paymentInvoiceLaterRadio = document.getElementById(`payment-invoice-later-${this.sectionId}`);
      this.paymentToggleHint = document.getElementById(`payment-timing-hint-${this.sectionId}`);
      if (!this.paymentToggleContainer && document.querySelector('.custom-measurements-payment-toggle')) {
        this.paymentToggleContainer = document.querySelector('.custom-measurements-payment-toggle');
        this.paymentPayNowRadio = this.paymentToggleContainer.querySelector('input[value="pay_now"]');
        this.paymentInvoiceLaterRadio = this.paymentToggleContainer.querySelector('input[value="invoice_later"]');
        this.paymentToggleHint = this.paymentToggleContainer.querySelector('.custom-measurements-payment-toggle__hint, [id^="payment-timing-hint-"]');
      }

      this.setupEventListeners();
      this.setupCustomProductLinkInterceptor();
      this.initialize();
    }

    debug(label, ...args) {
      if (!this.debugEnabled) return;
      try {
        const strArgs = args.map((a) =>
          a !== null && typeof a === 'object' && !(a instanceof Error)
            ? JSON.stringify(a, null, 2)
            : String(a)
        );
        const out = [this.debugPrefix, label, ...strArgs].join(' ');
        console.debug(out);
      } catch (e) {
        console.debug(this.debugPrefix, label, String(e));
      }
    }

    buildConfigFromDOM() {
      // Fallback: build config from DOM if window.customMeasurementsConfig is not available
      const categoryInputs = Array.from(document.querySelectorAll('.category-option-input'));
      const measurementFields = Array.from(document.querySelectorAll('.measurement-field'));
      const measurementNames = measurementFields.map((field) => field.dataset.measurement);

      const categoryConfigs = {};
      const harnessDetailCategories = [];

      categoryInputs.forEach((input) => {
        const categoryName = input.dataset.label;
        const requiredList = (input.dataset.required || '').split('|').filter(Boolean);
        const optionalList = (input.dataset.optional || '').split('|').filter(Boolean);
        categoryConfigs[categoryName] = {
          required: requiredList,
          optional: optionalList,
        };
        if (input.dataset.showHarness === 'true') {
          harnessDetailCategories.push(categoryName);
        }
      });

      const measurements = {};
      measurementNames.forEach((measName) => {
        const categoryInfo = {};
        Object.entries(categoryConfigs).forEach(([categoryName, categoryConfig]) => {
          if (categoryConfig.required.includes(measName)) {
            categoryInfo[categoryName] = { included: true, required: true };
          } else if (categoryConfig.optional.includes(measName)) {
            categoryInfo[categoryName] = { included: true, required: false };
          }
        });
        measurements[measName] = { categories: categoryInfo };
      });

      return {
        measurements,
        categories: {
          harness_details: harnessDetailCategories,
          notes_section: [],
          associate_section: [],
        },
        precision: 3,
        constants: {
          INCH_TO_CM: 2.54,
          CM_TO_INCH: 1 / 2.54,
        },
      };
    }

    findProductForm() {
      const productFormSelectors = [
        `#product-form-${this.sectionId}`,
        'form[action*="/cart/add"]',
        'form[id^="product-form"]',
      ];
      for (const selector of productFormSelectors) {
        const formCandidate = document.querySelector(selector);
        if (formCandidate) {
          return formCandidate;
        }
      }
      return null;
    }

    updateMeasurementVisibility() {
      this.measurementFields.forEach((field) => {
        const wrapper = field.querySelector('.measurement-input-wrapper');
        if (!wrapper) return;

        const inInput = wrapper.querySelector('.measurement-in');
        const cmInput = wrapper.querySelector('.measurement-cm');
        if (!inInput || !cmInput) return;

        if (this.currentUnit === 'in') {
          inInput.style.display = 'block';
          cmInput.style.display = 'none';
        } else {
          inInput.style.display = 'none';
          cmInput.style.display = 'block';
        }
      });
    }

    flagFormInteraction() {
      if (this.hasInteractedWithForm) return;
      this.hasInteractedWithForm = true;
      this.updateBannerEditingState(true);
    }

    clearAllErrorStates() {
      // Clear error states from all measurement fields
      document.querySelectorAll('.measurement-field--error').forEach((field) => {
        field.classList.remove('measurement-field--error');
      });
      document.querySelectorAll('.measurement-input--error').forEach((input) => {
        input.classList.remove('measurement-input--error');
      });
    }

    updateBannerEditingState(isEditing) {
      const eventName = isEditing ? 'custom-order:editing' : 'custom-order:editing-stop';
      try {
        window.dispatchEvent(new CustomEvent(eventName));
      } catch (error) {
        console.warn('Unable to dispatch banner editing event:', error);
      }
      if (window.CustomOrderBanner && typeof window.CustomOrderBanner.notifyEditing === 'function') {
        window.CustomOrderBanner.notifyEditing(isEditing);
      }
    }

    updateAddToCartButton() {
      // Trigger validation which will publish validation state via pub/sub
      // ButtonStateManager subscribes to the validation events
      this.validationService.validateRequiredFields(this.selectedCategory);
    }

    /**
     * Intercepts clicks on links to other custom product pages so we navigate with form state (measurements, options).
     * Use when switching types via links (e.g. on by-type pages or "Other options" blocks) instead of harness/tag radios.
     */
    setupCustomProductLinkInterceptor() {
      if (this._customProductLinkHandlerAttached) return;
      this._customProductLinkHandlerAttached = true;
      const pathToNorm = (path) => {
        const p = (path || '').trim();
        if (p.startsWith('http')) {
          try {
            return new URL(p).pathname.replace(/\/+$/, '') || '/';
          } catch (e) {
            return p.startsWith('/') ? p : '/products/' + p;
          }
        }
        return (p.startsWith('/') ? p : '/products/' + p).replace(/\/+$/, '') || '/';
      };
      const getPayNowPaths = () => {
        const urls = this.config?.productTypeToRedirectUrl;
        if (!urls) return [];
        return Object.values(urls)
          .filter(Boolean)
          .map(pathToNorm);
      };
      document.addEventListener(
        'click',
        (e) => {
          const anchor = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
          if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
          const href = (anchor.getAttribute('href') || '').trim();
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
          const targetPath = pathToNorm(href);
          const payNowPaths = getPayNowPaths();
          const isCustomProductLink =
            targetPath.startsWith('/products/custom-') &&
            payNowPaths.some((p) => pathToNorm(p) === targetPath);
          if (!isCustomProductLink) return;
          const currentPath = pathToNorm(window.location.pathname);
          if (targetPath === currentPath) return;
          e.preventDefault();
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
          }
          let typeOverride;
          const urlToType = this.config?.productTypeToRedirectUrl;
          if (urlToType) {
            for (const [type, url] of Object.entries(urlToType)) {
              if (url && pathToNorm(url) === targetPath) {
                typeOverride = type;
                break;
              }
            }
          }
          const fullBase = href.startsWith('http') || href.startsWith('//')
            ? (href.split('?')[0] || href)
            : (window.location.origin || '') + (targetPath.startsWith('/') ? targetPath : '/products/' + targetPath);
          const target = this.getUrlWithFormStateForNextPage(fullBase, { payNow: true, type: typeOverride });
          window.location.href = target;
        },
        true
      );
    }

    initialize() {
      this.hasInteractedWithForm = false;
      this.updateBannerEditingState(false);
      this.resetAfterAddToCartPending = false;

      this.debug('initialize:start', {
        pathname: window.location && window.location.pathname,
        search: window.location && window.location.search,
      });
      this.debug('initialize:config', {
        autoSelectedCategory: this.config && this.config.autoSelectedCategory,
        autoSelectedHarnessType: this.config && this.config.autoSelectedHarnessType,
        effectiveProductType: this.config && this.config.effectiveProductType,
        effectiveProductHandle: this.config && this.config.effectiveProductHandle,
      });

      if (this.unitOfMeasureInput) {
        this.unitOfMeasureInput.value = 'Inches';
      }

      this.selectedCategory = null;

      if (this.harnessSection) this.harnessSection.classList.remove('active');
      // Leather color section is always active, don't remove it
      if (this.notesSection) this.notesSection.classList.remove('active');
      if (this.associateSection) this.associateSection.classList.remove('active');

      this.measurementManager.clearAll();
      this.currentCategoryStore = null;

      this.measurementFields.forEach((field) => {
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');
        if (inInput) inInput.value = '';
        if (cmInput) cmInput.value = '';
        field.classList.remove('active');
        field.classList.remove('measurement-field--optional');

        const inputs = field.querySelectorAll('.measurement-input');
        inputs.forEach((input) => {
          if (input.dataset.originalName) {
            input.setAttribute('name', input.dataset.originalName);
          }
          input.removeAttribute('data-removed');
        });
      });

      // Reset "Other" option handlers
      if (this.associateOtherHandler) {
        this.associateOtherHandler.reset();
      }
      // Reset leather color
      if (this.leatherColorRadios && this.leatherColorTextWrapper && this.leatherColorText) {
        this.leatherColorRadios.forEach((radio) => {
          radio.checked = false;
        });
        this.leatherColorTextWrapper.style.display = 'none';
        this.leatherColorText.value = '';
      }
      if (this.harnessOtherHandlers) {
        this.harnessOtherHandlers.forEach((handler) => handler.reset());
      }

      // Reset all custom text wrappers (fallback for any not handled by classes)
      document.querySelectorAll('.custom-text-wrapper').forEach((wrapper) => {
        // Don't hide associate or leather color wrappers (they're managed by handlers)
        if (wrapper.id !== 'associate-text-wrapper' && wrapper.id !== 'leather-color-text-wrapper') {
          wrapper.style.display = 'none';
        }
        const input = wrapper.querySelector('.custom-text');
        if (input) input.value = '';
      });

      this.currentUnit = 'in';
      this.unitToggleInputs.forEach((input) => {
        input.checked = input.dataset.unit === 'in';
      });
      this.updateMeasurementVisibility();

      if (this.harnessSection) {
        this.harnessSection.querySelectorAll('select').forEach((select) => {
          select.selectedIndex = 0;
        });
        this.harnessSection.querySelectorAll('.custom-text-wrapper').forEach((wrapper) => {
          wrapper.style.display = 'none';
          const input = wrapper.querySelector('.custom-text');
          if (input) input.value = '';
        });
      }

      if (this.harnessTypeSelector) {
        this.harnessTypeSelector.querySelectorAll('input[type="radio"]').forEach((input) => {
          input.checked = false;
        });
      }

      if (this.tagTypeSelector) {
        this.tagTypeSelector.querySelectorAll('input[type="radio"]').forEach((input) => {
          input.checked = false;
        });
      }

      if (this.notesSection) {
        this.notesSection.querySelectorAll('textarea').forEach((textarea) => {
          textarea.value = '';
        });
      }

      if (this.associateSection) {
        this.associateSection.classList.add('active');
      }

      // Leather color section visibility is managed by updateSectionVisibility
      // Don't set it as always active here - let updateSectionVisibility handle it based on category

      // When URL has type/category params (edit link), apply them first so we don't default to first category/harness
      const urlParams =
        window.CustomOrderUtils && window.CustomOrderUtils.parseUrlParams
          ? window.CustomOrderUtils.parseUrlParams()
          : {};
      const appliedFromUrl = this.applyTypeAndCategoryFromUrlParams(urlParams);
      this.debug('initialize:urlParams', urlParams);
      this.debug('initialize:appliedFromUrl', appliedFromUrl, {
        selectedCategory: this.selectedCategory,
      });

      // If no type from URL: apply config (product-type page) or first category
      if (!appliedFromUrl) {
        if (this.config && this.config.autoSelectedCategory) {
          this.debug('initialize:branch', 'config:autoSelectedCategory');
          this.selectedCategory = this.config.autoSelectedCategory;
          this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);

          // Find and check the category input if it exists (may be hidden)
          const categoryInput = Array.from(this.categoryInputs).find(
            (input) => input.dataset.label === this.selectedCategory,
          );
          if (categoryInput) {
            categoryInput.checked = true;
          }

          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.tagTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection,
            this.otherCategoryNotice,
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.updateMeasurementOnUnitChange();
          this.categoryManager.updateMeasurementGroupVisibility();
          if (this.config.autoSelectedHarnessType && this.harnessTypeInputs.length) {
            const harnessType = this.config.autoSelectedHarnessType;
            const radio = Array.from(this.harnessTypeInputs).find(
              (input) => (input.value || '').trim().toLowerCase() === harnessType.trim().toLowerCase(),
            );
            if (radio) {
              radio.checked = true;
            }
          }
          // Apply tag type preselection from config when present (no new snippet params needed for new sub-types)
          if (this.config.autoSelectedTagType && this.tagTypeSelector) {
            const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
            const tagType = this.config.autoSelectedTagType;
            const radio = Array.from(tagTypeInputs).find(
              (input) => (input.value || '').trim().toLowerCase() === tagType.trim().toLowerCase(),
            );
            if (radio) {
              radio.checked = true;
            }
          }
        } else if (
          this.config?.effectiveProductType &&
          this.config.productTypeMap?.[this.config.effectiveProductType] &&
          this.categoryInputs.length > 0
        ) {
          this.debug('initialize:branch', 'config:effectiveProductType');
          // Fallback: derive category/harness from effectiveProductType when Liquid did not set autoSelectedCategory (e.g. type map key mismatch)
          const effectiveType = String(this.config.effectiveProductType).trim();
          const category = this.config.productTypeMap[effectiveType];
          const harnessType = this.config.productTypeToHarnessType?.[effectiveType];
          this.debug('initialize:effectiveProductType->category', { effectiveType, category, harnessType });
          const categoryInput = Array.from(this.categoryInputs).find(
            (input) => input.dataset.label === category,
          );
          if (categoryInput) {
            categoryInput.checked = true;
            this.selectedCategory = category;
            this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
            this.categoryManager.updateSectionVisibility(
              this.selectedCategory,
              this.harnessSection,
              this.harnessTypeSelector,
              this.tagTypeSelector,
              this.leatherColorSection,
              this.notesSection,
              this.associateSection,
              this.otherCategoryNotice,
            );
            this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
            this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
            this.updateMeasurementOnUnitChange();
            this.categoryManager.updateMeasurementGroupVisibility();
            if (harnessType) {
              if (category === 'Harness' && this.harnessTypeInputs?.length) {
                const radio = Array.from(this.harnessTypeInputs).find(
                  (input) => (input.value || '').trim().toLowerCase() === harnessType.trim().toLowerCase(),
                );
                if (radio) radio.checked = true;
              } else if (category === 'Tag' && this.tagTypeSelector) {
                const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
                const tagRadio = Array.from(tagTypeInputs).find(
                  (input) => (input.value || '').trim().toLowerCase() === harnessType.trim().toLowerCase(),
                );
                if (tagRadio) tagRadio.checked = true;
              }
            }
          }
        } else if (
          !this.config?.autoSelectedCategory &&
          this.config?.productTypeMap &&
          this.categoryInputs?.length > 0
        ) {
          this.debug('initialize:branch', 'handleFallback');
          // Fallback: derive type from product handle (e.g. custom-asymmetric-harness → Asymmetric Harness) when Liquid didn't set category
          const handle =
            (this.config.effectiveProductHandle && String(this.config.effectiveProductHandle).trim()) ||
            (typeof window !== 'undefined' &&
              window.location?.pathname &&
              (window.location.pathname.match(/\/products\/([^/]+)/) || [])[1]);
          const handleLower = handle ? String(handle).toLowerCase().trim() : '';
          this.debug('initialize:handleFallback:handle', { handle, handleLower });
          if (handleLower) {
            let effectiveType = null;
            let category = null;
            for (const [typeKey, catVal] of Object.entries(this.config.productTypeMap)) {
              const slug = String(typeKey).toLowerCase().replace(/\s+/g, '-');
              if (handleLower === slug || handleLower === 'custom-' + slug) {
                effectiveType = typeKey;
                category = catVal;
                break;
              }
            }
            this.debug('initialize:handleFallback:match', { effectiveType, category });
            if (effectiveType && category) {
              const harnessType = this.config.productTypeToHarnessType?.[effectiveType];
              this.debug('initialize:handleFallback:resolved', { effectiveType, category, harnessType });
              const categoryInput = Array.from(this.categoryInputs).find(
                (input) => input.dataset.label === category,
              );
              if (categoryInput) {
                categoryInput.checked = true;
                this.selectedCategory = category;
                this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
                this.categoryManager.updateSectionVisibility(
                  this.selectedCategory,
                  this.harnessSection,
                  this.harnessTypeSelector,
                  this.tagTypeSelector,
                  this.leatherColorSection,
                  this.notesSection,
                  this.associateSection,
                  this.otherCategoryNotice,
                );
                this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
                this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
                this.categoryManager.updateMeasurementGroupVisibility();
                if (harnessType) {
                  if (category === 'Harness' && this.harnessTypeInputs?.length) {
                    const radio = Array.from(this.harnessTypeInputs).find(
                      (input) =>
                        (input.value || '').trim().toLowerCase() === String(harnessType).trim().toLowerCase(),
                    );
                    if (radio) radio.checked = true;
                  } else if (category === 'Tag' && this.tagTypeSelector) {
                    const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
                    const tagRadio = Array.from(tagTypeInputs).find(
                      (input) =>
                        (input.value || '').trim().toLowerCase() === String(harnessType).trim().toLowerCase(),
                    );
                    if (tagRadio) tagRadio.checked = true;
                  }
                }
              }
            }
          }
        }
        if (!this.selectedCategory && this.categoryInputs.length > 0) {
          this.debug('initialize:branch', 'default:firstCategory');
          const firstInput = this.categoryInputs[0];
          firstInput.checked = true;
          this.selectedCategory = firstInput.dataset.label;
          this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.tagTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection,
            this.otherCategoryNotice,
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.updateMeasurementOnUnitChange();
          this.categoryManager.updateMeasurementGroupVisibility();
        }
      }

      this.selectFirstSubTypeIfNone();
      this.debug('initialize:afterSelectFirstSubTypeIfNone', {
        selectedCategory: this.selectedCategory,
        harnessTypeSelected: Array.from(this.harnessTypeInputs || []).find((i) => i.checked)?.value || null,
        tagTypeSelected: this.tagTypeSelector
          ? Array.from(this.tagTypeSelector.querySelectorAll('.tag-type-input')).find((i) => i.checked)?.value || null
          : null,
      });

      // Trigger validation which will publish events and update button state via pub/sub
      this.updateAddToCartButton();

      // Pre-fill form from URL parameters if present (for edit functionality)
      this.prefillFromUrlParams();
      this.selectFirstSubTypeIfNone();
      // Sync selection from DOM so Pay now state matches visible selection (e.g. Hats → no pay-now product → disabled)
      this.syncSelectionFromDOM();
      // Pay now / Invoice later: list of available pay-now products (type→URL) comes from config
      // (Liquid builds it from type→SKU and product source). Enable/disable Pay now based on current selection.
      this.updatePaymentToggleState();
      // If URL has pay_now=1 (or pay_now=true), auto-select Pay now so it matches the page we landed on
      this.applyPayNowFromUrlIfPresent();
    }

    /**
     * Syncs selectedCategory from the currently checked category input.
     * Ensures Pay now enable/disable matches what the user sees (e.g. Hats selected → no URL → disabled).
     */
    syncSelectionFromDOM() {
      const checkedCategory = Array.from(this.categoryInputs).find((input) => input.checked);
      const previousCategory = this.selectedCategory;
      if (checkedCategory && checkedCategory.dataset.label) {
        this.selectedCategory = checkedCategory.dataset.label;
        this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
      }
    }

    /**
     * When Harness or Tag is selected, default the sub-type to the first option if none is selected.
     * Harness → first harness type (e.g. Deluxe Harness); Tag → first tag type.
     */
    selectFirstSubTypeIfNone() {
      if (this.selectedCategory === 'Harness' && this.harnessTypeInputs && this.harnessTypeInputs.length > 0) {
        const checked = Array.from(this.harnessTypeInputs).find((input) => input.checked);
        if (!checked) {
          const first = this.harnessTypeInputs[0];
          if (first) {
            first.checked = true;
          }
        }
      }
      if (this.selectedCategory === 'Tag' && this.tagTypeSelector) {
        const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
        if (tagTypeInputs.length > 0) {
          const tagChecked = Array.from(tagTypeInputs).find((input) => input.checked);
          if (!tagChecked) {
            tagTypeInputs[0].checked = true;
          }
        }
      }
    }

    /**
     * Applies only type, category, and harness/tag sub-type from URL params.
     * Used at init so URL (edit link) wins over config/first-category when params are present.
     * @param {Object} urlParams - Parsed URL params from CustomOrderUtils.parseUrlParams()
     * @returns {boolean} - True if category/type was applied from URL
     */
    applyTypeAndCategoryFromUrlParams(urlParams) {
      if (!urlParams || !this.categoryInputs?.length) return false;
      this.debug('applyTypeAndCategoryFromUrlParams:start', {
        keys: Object.keys(urlParams || {}),
        type: urlParams && urlParams.type,
        selectedOption: urlParams && urlParams['Selected Option'],
        productType: urlParams && urlParams['Product Type'],
        subType: urlParams && urlParams['Sub type'],
      });
      const hasType =
        (urlParams.type && String(urlParams.type).trim()) ||
        (urlParams['Selected Option'] && String(urlParams['Selected Option']).trim()) ||
        (urlParams['Product Type'] && String(urlParams['Product Type']).trim()) ||
        (urlParams['Sub type'] && String(urlParams['Sub type']).trim());
      if (!hasType) return false;

      // Apply type param (category + harness from config)
      const typeParam = urlParams.type;
      if (typeParam) {
        const effectiveType = decodeURIComponent(String(typeParam)).trim();
        if (effectiveType && effectiveType.toLowerCase() !== 'custom order') {
          let category =
            this.config?.productTypeMap?.[effectiveType];
          const harnessType =
            this.config?.productTypeToHarnessType?.[effectiveType];
          this.debug('applyTypeAndCategoryFromUrlParams:type', { effectiveType, category, harnessType });
          if (!category && this.categoryInputs.length) {
            const categoryByLabel = Array.from(this.categoryInputs).find(
              (input) =>
                input.dataset.label &&
                input.dataset.label.trim().toLowerCase() === effectiveType.trim().toLowerCase(),
            );
            if (categoryByLabel?.dataset.label) category = categoryByLabel.dataset.label;
          }
          if (category) {
            const categoryInput = Array.from(this.categoryInputs).find(
              (input) => input.dataset.label === category,
            );
            if (categoryInput) {
              categoryInput.checked = true;
              this.selectedCategory = category;
              this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
              this.categoryManager.updateSectionVisibility(
                this.selectedCategory,
                this.harnessSection,
                this.harnessTypeSelector,
                this.tagTypeSelector,
                this.leatherColorSection,
                this.notesSection,
                this.associateSection,
                this.otherCategoryNotice,
              );
              this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.categoryManager.updateMeasurementGroupVisibility();
              this.debug('applyTypeAndCategoryFromUrlParams:type:appliedCategory', { category });
            }
          }
          if (harnessType && this.harnessTypeInputs?.length) {
            const radio = Array.from(this.harnessTypeInputs).find(
              (input) => (input.value || '').trim().toLowerCase() === harnessType.trim().toLowerCase(),
            );
            if (radio) radio.checked = true;
            this.debug('applyTypeAndCategoryFromUrlParams:type:appliedHarness', { harnessType, found: !!radio });
          }
        }
      }

      // Pre-fill category from Selected Option
      if (urlParams['Selected Option']) {
        const categoryValue = String(urlParams['Selected Option']).trim();
        const categoryInput = Array.from(this.categoryInputs).find(
          (input) => input.dataset.label === categoryValue,
        );
        if (categoryInput) {
          categoryInput.checked = true;
          this.selectedCategory = categoryValue;
          this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.tagTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection,
            this.otherCategoryNotice,
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.debug('applyTypeAndCategoryFromUrlParams:selectedOption:appliedCategory', { categoryValue });
        }
      }

      // Pre-fill harness/tag sub-type from Product Type or Sub type (trim + case-insensitive)
      const productTypeParamRaw =
        urlParams['Product Type'] ||
        urlParams['Sub type'] ||
        urlParams['Harness Type'] ||
        urlParams['Tag Type'];
      const productTypeParam = productTypeParamRaw ? String(productTypeParamRaw).trim() : '';
      if (productTypeParam) {
        // When URL has only Sub type / Product Type (no Selected Option or type), set category from sub-type so we don't fall back to first category
        if (!this.selectedCategory && this.categoryInputs?.length) {
          const isHarnessType =
            this.harnessTypeInputs?.length &&
            Array.from(this.harnessTypeInputs).some(
              (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase(),
            );
          const isTagType =
            this.tagTypeSelector &&
            Array.from(this.tagTypeSelector.querySelectorAll('.tag-type-input')).some(
              (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase(),
            );
          const categoryFromSubType = isHarnessType ? 'Harness' : isTagType ? 'Tag' : null;
          this.debug('applyTypeAndCategoryFromUrlParams:subType:inferCategory', {
            productTypeParam,
            isHarnessType,
            isTagType,
            categoryFromSubType,
          });
          if (categoryFromSubType) {
            const categoryInput = Array.from(this.categoryInputs).find(
              (input) => input.dataset.label === categoryFromSubType,
            );
            if (categoryInput) {
              categoryInput.checked = true;
              this.selectedCategory = categoryFromSubType;
              this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
              this.categoryManager.updateSectionVisibility(
                this.selectedCategory,
                this.harnessSection,
                this.harnessTypeSelector,
                this.tagTypeSelector,
                this.leatherColorSection,
                this.notesSection,
                this.associateSection,
                this.otherCategoryNotice,
              );
              this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.categoryManager.updateMeasurementGroupVisibility();
              this.debug('applyTypeAndCategoryFromUrlParams:subType:appliedCategory', { categoryFromSubType });
            }
          }
        }
        if (this.harnessTypeSelector && this.harnessTypeInputs?.length) {
          const radio = Array.from(this.harnessTypeInputs).find(
            (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase(),
          );
          if (radio) radio.checked = true;
          this.debug('applyTypeAndCategoryFromUrlParams:subType:applyHarness', {
            productTypeParam,
            found: !!radio,
          });
        }
        if (this.tagTypeSelector) {
          const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
          const tagRadio = Array.from(tagTypeInputs).find(
            (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase(),
          );
          if (tagRadio) tagRadio.checked = true;
          this.debug('applyTypeAndCategoryFromUrlParams:subType:applyTag', { productTypeParam, found: !!tagRadio });
        }
      }

      this.debug('applyTypeAndCategoryFromUrlParams:done', {
        selectedCategory: this.selectedCategory,
        harnessTypeSelected: Array.from(this.harnessTypeInputs || []).find((i) => i.checked)?.value || null,
        tagTypeSelected: this.tagTypeSelector
          ? Array.from(this.tagTypeSelector.querySelectorAll('.tag-type-input')).find((i) => i.checked)?.value || null
          : null,
      });
      return !!(this.selectedCategory && hasType);
    }

    prefillFromUrlParams() {
      if (!window.CustomOrderUtils || !window.CustomOrderUtils.parseUrlParams) {
        return;
      }

      const urlParams = window.CustomOrderUtils.parseUrlParams();
      if (!urlParams || Object.keys(urlParams).length === 0) {
        return;
      }

      // Apply type param first (category + harness from config) so other params can override
      const typeParam = urlParams.type;
      if (typeParam) {
        const effectiveType = decodeURIComponent(String(typeParam)).trim();
        if (effectiveType && effectiveType.toLowerCase() !== 'custom order') {
          let category =
            this.config && this.config.productTypeMap && this.config.productTypeMap[effectiveType];
          const harnessType =
            this.config &&
            this.config.productTypeToHarnessType &&
            this.config.productTypeToHarnessType[effectiveType];
          if (!category) {
            const categoryByLabel = Array.from(this.categoryInputs).find(
              (input) =>
                input.dataset.label &&
                input.dataset.label.trim().toLowerCase() === effectiveType.trim().toLowerCase(),
            );
            if (categoryByLabel && categoryByLabel.dataset.label) {
              category = categoryByLabel.dataset.label;
            }
          }
          if (category) {
            const categoryInput = Array.from(this.categoryInputs).find(
              (input) => input.dataset.label === category,
            );
            if (categoryInput) {
              categoryInput.checked = true;
              this.selectedCategory = category;
              this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
              this.categoryManager.updateSectionVisibility(
                this.selectedCategory,
                this.harnessSection,
                this.harnessTypeSelector,
                this.tagTypeSelector,
                this.leatherColorSection,
                this.notesSection,
                this.associateSection,
                this.otherCategoryNotice,
              );
              this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
              this.categoryManager.updateMeasurementGroupVisibility();
            }
          }
          if (harnessType && this.harnessTypeInputs.length) {
            const radio = Array.from(this.harnessTypeInputs).find(
              (input) => input.value.trim().toLowerCase() === harnessType.trim().toLowerCase(),
            );
            if (radio) {
              radio.checked = true;
            }
          }
        }
      }

      // Only show banner if URL contains edit-related parameters (not marketing/tracking params)
      // Wait for config to be available before checking
      if (window.CustomOrderUtils && window.CustomOrderUtils.hasEditRelatedParams) {
        window.CustomOrderUtils.hasEditRelatedParams()
          .then((hasEditParams) => {
            if (hasEditParams) {
              // If we have edit-related URL parameters, we're in edit mode - show banner immediately
              this.updateBannerEditingState(true);
            }
          })
          .catch((error) => {
            console.warn('Error checking edit params:', error);
          });
      }

      // Pre-fill category if present
      if (urlParams['Selected Option']) {
        const categoryValue = urlParams['Selected Option'];
        const categoryInput = Array.from(this.categoryInputs).find((input) => input.dataset.label === categoryValue);
        if (categoryInput) {
          categoryInput.checked = true;
          this.selectedCategory = categoryValue;
          this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.tagTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection,
            this.otherCategoryNotice,
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        }
      }

      // Pre-fill all property form controls from URL using exact keys (works for controls in form or form="product-form-xxx")
      const skipKeys = new Set([
        'type',
        'variant',
        'Selected Option',
        'Product Type',
        'Sub type',
        'Unit of Measure',
        'pay_now',
      ]);

      const runPropertyPrefill = () => {
        const namePrefix = 'properties[';
        const allPropertyControls = Array.from(
          document.querySelectorAll(
            'input[name^="properties["], select[name^="properties["], textarea[name^="properties["]'
          )
        ).filter((el) => (el.getAttribute('name') || '').startsWith(namePrefix));
        for (const [key, value] of Object.entries(urlParams)) {
          if (skipKeys.has(key)) continue;
          const strVal = value != null ? String(value).trim() : '';
          if (strVal === '') continue;
          const name = 'properties[' + key + ']';
          const matches = Array.from(allPropertyControls).filter((el) => el.getAttribute('name') === name);
          if (matches.length === 0) continue;
          const first = matches[0];
          if (first.tagName === 'SELECT') {
            first.value = value;
            continue;
          }
          if (first.type === 'radio') {
            matches.forEach((el) => {
              el.checked = el.value === value;
            });
            continue;
          }
          if (first.type === 'checkbox') {
            matches.forEach((el) => {
              el.checked = el.value === value;
            });
            continue;
          }
          first.value = value;
        }
      };

      const runMeasurementSync = () => {
        const measurementFieldsAfterPrefill = Array.from(document.querySelectorAll('.measurement-field'));
        measurementFieldsAfterPrefill.forEach((field) => {
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');
        if (!inInput) return;
        const inValue = inInput.value != null ? String(inInput.value).trim() : '';
        const cmValue =
          cmInput && cmInput.value != null ? String(cmInput.value).trim() : '';
        if (!inValue && !cmValue) return;
        const nameAttr = inInput.getAttribute('name');
        const keyMatch = nameAttr && nameAttr.match(/properties\[(.+)\]/);
        const fullKey = keyMatch ? keyMatch[1] : '';
        const measName =
          field.dataset.measurement ||
          fullKey.replace(/\s*\(in\)\s*$/i, '').replace(/\*$/, '').trim() ||
          '';
        if (!measName) return;
        if (inValue && !cmValue && cmInput) {
          const numValue = this.utils.parseValue(inValue);
          if (Number.isFinite(numValue)) {
            this.measurementManager.syncValues(measName, 'in', numValue, this.currentCategoryStore);
          }
        } else if (cmValue && !inValue && inInput) {
          const numValue = this.utils.parseValue(cmValue);
          if (Number.isFinite(numValue)) {
            this.measurementManager.syncValues(measName, 'cm', numValue, this.currentCategoryStore);
          }
        }
      });
      };

      const hasMeasurementParams = Object.keys(urlParams).some(
        (k) => k.endsWith(' (in)') || k.endsWith(' (cm)')
      );

      runPropertyPrefill();
      runMeasurementSync();
      this.measurementManager.mergeMeasurementsFromUrlParams(urlParams);
      this.updateAddToCartButton();
      if (hasMeasurementParams) {
        requestAnimationFrame(() => {
          runPropertyPrefill();
          runMeasurementSync();
          this.measurementManager.mergeMeasurementsFromUrlParams(urlParams);
          this.updateAddToCartButton();
        });
      }

      // Pre-fill associate
      if (urlParams['Associate']) {
        if (this.associateSelect) {
          const associateValue = urlParams['Associate'];
          const option = Array.from(this.associateSelect.options).find((opt) => opt.value === associateValue);
          if (option) {
            this.associateSelect.value = associateValue;
            if (associateValue === 'Other' && this.associateTextWrapper) {
              this.associateTextWrapper.style.display = 'flex';
            }
          } else if (this.associateTextWrapper && this.associateText) {
            // If not found in options, set as "Other" and fill text
            this.associateSelect.value = 'Other';
            this.associateTextWrapper.style.display = 'flex';
            this.associateText.value = associateValue;
          }
        }
      }

      // Pre-fill leather color
      if (urlParams['Leather Color']) {
        const leatherColorValue = urlParams['Leather Color'];
        const leatherColorRadio = Array.from(this.leatherColorRadios).find(
          (radio) => radio.value === leatherColorValue,
        );
        if (leatherColorRadio) {
          leatherColorRadio.checked = true;
          if (leatherColorValue === 'Other' && this.leatherColorTextWrapper) {
            this.leatherColorTextWrapper.style.display = 'flex';
            if (urlParams['Leather Color - Text'] && this.leatherColorText) {
              this.leatherColorText.value = urlParams['Leather Color - Text'];
            }
          }
        }
      }

      // Pre-fill sub-type (Product Type); support Product Type, Sub type, Harness Type, and Tag Type URL params for edit links (trim + case-insensitive match)
      const productTypeParamRaw =
        urlParams['Product Type'] ||
        urlParams['Sub type'] ||
        urlParams['Harness Type'] ||
        urlParams['Tag Type'];
      const productTypeParam = productTypeParamRaw ? String(productTypeParamRaw).trim() : '';
      if (productTypeParam) {
        if (this.harnessTypeSelector && this.harnessTypeInputs.length) {
          const harnessTypeInput = Array.from(this.harnessTypeInputs).find(
            (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase()
          );
          if (harnessTypeInput) harnessTypeInput.checked = true;
        }
        if (this.tagTypeSelector) {
          const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
          const tagTypeInput = Array.from(tagTypeInputs).find(
            (input) => (input.value || '').trim().toLowerCase() === productTypeParam.toLowerCase()
          );
          if (tagTypeInput) tagTypeInput.checked = true;
        }
      }

      // Pre-fill harness options
      const harnessOptions = ['Left Front Plate', 'Right Front Plate', 'Back Plate', 'Long Sliders'];
      harnessOptions.forEach((optionName) => {
        const optionValue = urlParams[optionName];
        if (optionValue) {
          const select = this.harnessSection?.querySelector(`select[name="properties[${optionName}]"]`);
          if (select) {
            const option = Array.from(select.options).find((opt) => opt.value === optionValue);
            if (option) {
              select.value = optionValue;
              if (optionValue === 'Other') {
                const textWrapper = select.closest('.select-wrapper')?.querySelector('.custom-text-wrapper');
                const textInput = textWrapper?.querySelector('.custom-text');
                if (textWrapper) textWrapper.style.display = 'flex';
                if (textInput && urlParams[`${optionName} - Text`]) {
                  textInput.value = urlParams[`${optionName} - Text`];
                }
              }
            }
          }
        }
      });

      // Pre-fill notes
      if (urlParams['Item Notes'] && this.notesSection) {
        const itemNotesTextarea = this.notesSection.querySelector('textarea[name="properties[Item Notes]"]');
        if (itemNotesTextarea) {
          itemNotesTextarea.value = urlParams['Item Notes'];
        }
      }
      if (urlParams['Event Notes'] && this.notesSection) {
        const eventNotesTextarea = this.notesSection.querySelector('textarea[name="properties[Event Notes]"]');
        if (eventNotesTextarea) {
          eventNotesTextarea.value = urlParams['Event Notes'];
        }
      }

      // Pre-fill unit of measure
      if (urlParams['Unit of Measure']) {
        const unitValue = urlParams['Unit of Measure'];
        if (unitValue.includes('Inches')) {
          this.currentUnit = 'in';
          this.unitToggleInputs.forEach((input) => {
            input.checked = input.dataset.unit === 'in';
          });
        } else if (unitValue.includes('Centimeters')) {
          this.currentUnit = 'cm';
          this.unitToggleInputs.forEach((input) => {
            input.checked = input.dataset.unit === 'cm';
          });
        }
        this.updateMeasurementVisibility();
        if (this.unitOfMeasureInput) {
          this.unitOfMeasureInput.value = unitValue;
        }
      }

      // Update button state after pre-filling
      this.updateAddToCartButton();

      // Sync URL to include Product Type and Sub type so the address bar has the full set of params (not just type)
      if (this.syncUrlToCurrentSelection) {
        this.syncUrlToCurrentSelection();
      }
    }

    updateMeasurementOnUnitChange() {
      const activeFields = document.querySelectorAll('.measurement-field.active');
      activeFields.forEach((field) => {
        const measName = field.dataset.measurement;
        const inInput = field.querySelector('.measurement-in');
        const cmInput = field.querySelector('.measurement-cm');

        if (!inInput || !cmInput) return;

        if (this.currentUnit === 'in') {
          const cmValue = this.utils.parseValue(cmInput.value);
          if (Number.isFinite(cmValue)) {
            this.measurementManager.syncValues(measName, 'cm', cmValue, this.currentCategoryStore);
          }
        } else {
          const inValue = this.utils.parseValue(inInput.value);
          if (Number.isFinite(inValue)) {
            this.measurementManager.syncValues(measName, 'in', inValue, this.currentCategoryStore);
          }
        }
      });

      this.updateMeasurementVisibility();
      this.updateAddToCartButton();
    }

    getSelectedHarnessType() {
      if (!this.harnessTypeInputs || !this.harnessTypeInputs.length) return null;
      const checked = Array.from(this.harnessTypeInputs).find((input) => input.checked);
      return checked ? checked.value.trim() : null;
    }

    getSelectedTagType() {
      if (!this.tagTypeSelector) return null;
      const checked = this.tagTypeSelector.querySelector('.tag-type-input:checked');
      return checked ? checked.value.trim() : null;
    }

    /**
     * Returns the effective product type for pay-now redirect and toggle state.
     * @param {Object} [options]
     * @param {boolean} [options.fromSelectionOnly=false] - If true, use only current form selection (category + harness/tag type).
     *        Use true when updating payment toggle after category/type change so we don't keep using the URL's type (e.g. on a
     *        pay-now product page, user changes harness type → effective type must be the new selection, not the URL type).
     * @returns {string|null}
     */
    getEffectiveProductType(options) {
      const fromSelectionOnly = options && options.fromSelectionOnly === true;
      if (!fromSelectionOnly) {
        const urlParams =
          window.CustomOrderUtils && window.CustomOrderUtils.parseUrlParams && window.CustomOrderUtils.parseUrlParams();
        if (urlParams && urlParams.type) {
          const t = decodeURIComponent(String(urlParams.type)).trim();
          if (t && t.toLowerCase() !== 'custom order') {
            return t;
          }
        }
      }
      const category = this.selectedCategory;
      const subType =
        category === 'Harness'
          ? this.getSelectedHarnessType()
          : category === 'Tag'
            ? this.getSelectedTagType()
            : null;
      if (
        category &&
        subType &&
        this.config &&
        this.config.productTypeMap &&
        this.config.productTypeToHarnessType
      ) {
        for (const type of Object.keys(this.config.productTypeMap)) {
          if (
            this.config.productTypeMap[type] === category &&
            this.config.productTypeToHarnessType[type] === subType
          ) {
            return type;
          }
        }
      }
      // Only use category-only fallback for categories that don't have a sub-type selector
      // (Harness and Tag need harness type / tag type to determine which pay-now product)
      const needsSubType = category === 'Harness' || category === 'Tag';
      if (!needsSubType && category && this.config && this.config.productTypeMap) {
        const hasPayNowUrl = (type) =>
          this.config.productTypeToRedirectUrl && this.config.productTypeToRedirectUrl[type];
        let firstMatch = null;
        for (const type of Object.keys(this.config.productTypeMap)) {
          if (this.config.productTypeMap[type] !== category) continue;
          if (!firstMatch) firstMatch = type;
          // Prefer a type that has a pay-now product so URL uses e.g. type=Hats not type=Muir+Cap
          if (hasPayNowUrl(type)) return type;
        }
        if (firstMatch) return firstMatch;
      }
      return null;
    }

    /**
     * Returns the path (no trailing slash) for the generic custom order URL, for comparison with location.pathname.
     * @param {string} customOrderUrl - Full or relative URL from config
     * @returns {string} Path e.g. /products/custom-order or ''
     */
    getGenericCustomOrderPath(customOrderUrl) {
      if (!customOrderUrl || typeof customOrderUrl !== 'string') return '';
      const trimmed = customOrderUrl.trim();
      if (trimmed.startsWith('http')) {
        try {
          return new URL(trimmed).pathname.replace(/\/+$/, '');
        } catch (e) {
          return '';
        }
      }
      if (trimmed.startsWith('/')) return trimmed.replace(/\/+$/, '');
      return '/products/' + trimmed.replace(/\/+$/, '');
    }

    /**
     * Returns true if the current page is a pay-now product page (so Invoice later should redirect to generic).
     * Uses config flag first; fallback: current path matches any productTypeToRedirectUrl (handles product.type mismatch).
     */
    isOnPayNowProductPage() {
      if (this.config && this.config.isChargeUpfrontProductPage) return true;
      const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
      if (!pathname) return false;
      const urls = this.config && this.config.productTypeToRedirectUrl
        ? Object.values(this.config.productTypeToRedirectUrl)
        : [];
      for (let i = 0; i < urls.length; i++) {
        let path = urls[i];
        if (!path || typeof path !== 'string') continue;
        if (path.startsWith('http')) {
          try {
            path = new URL(path).pathname;
          } catch (e) {
            continue;
          }
        } else if (!path.startsWith('/')) {
          path = '/products/' + path;
        }
        if (path === pathname) return true;
      }
      return false;
    }

    /**
     * Resolves redirect URL for Pay now from productTypeToRedirectUrl.
     * Uses exact key first, then case-insensitive match. Returns absolute URL.
     * @param {string|null} effectiveType - Product type from getEffectiveProductType()
     * @returns {string|null} Absolute URL or null
     */
    getRedirectUrlForType(effectiveType) {
      const map = this.config && this.config.productTypeToRedirectUrl;
      if (!map || !effectiveType) {
        return null;
      }
      let url = map[effectiveType] || null;
      let matchedBy = url ? 'exact' : null;
      if (!url && typeof effectiveType === 'string') {
        const lower = effectiveType.trim().toLowerCase();
        for (const key of Object.keys(map)) {
          if (key.trim().toLowerCase() === lower && map[key]) {
            url = map[key];
            matchedBy = 'caseInsensitive';
            break;
          }
        }
      }
      if (!url) {
        return null;
      }
      // Ensure absolute URL so navigation works from any context
      if (url.startsWith('/') && !url.startsWith('//')) {
        const origin = typeof window !== 'undefined' && window.location && window.location.origin;
        url = origin ? origin + url : url;
      }
      return url;
    }

    /**
     * Builds URL query string from current form state (measurements, category, options).
     * Used when redirecting to pay-now product page so state is preserved.
     * @returns {string} Query string (no leading '?')
     */
    getFormStateAsQueryString() {
      const params = new URLSearchParams();
      const effectiveType = this.getEffectiveProductType();
      if (effectiveType) {
        params.set('type', effectiveType);
        params.set('Product Type', effectiveType);
        params.set('Sub type', effectiveType);
      }
      if (this.selectedCategory) {
        params.set('Selected Option', this.selectedCategory);
      }

      // Always include Associate (and Associate - Text when "Other") from known refs so redirect preserves selection
      if (this.associateSelect) {
        const associateVal = (this.associateSelect.options[this.associateSelect.selectedIndex]?.value || '').trim();
        if (associateVal) {
          params.set('Associate', associateVal);
          if (associateVal === 'Other' && this.associateText && this.associateText.value) {
            const textVal = String(this.associateText.value).trim();
            if (textVal) params.set('Associate - Text', textVal);
          }
        }
      }

      // Flush current category measurements from inputs into store so we can include them even if form selector misses
      if (this.selectedCategory && this.measurementManager && this.measurementFields && this.measurementFields.length) {
        this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
      }

      if (this.productForm) {
        const formId = this.productForm.id || '';
        const selector =
          'input[name^="properties["], select[name^="properties["], textarea[name^="properties["]';
        const insideForm = this.productForm.querySelectorAll(selector);
        const byFormAttr = formId ? document.querySelectorAll(`[form="${formId}"]`) : [];
        const seen = new Set();
        const elements = [...insideForm];
        byFormAttr.forEach((el) => {
          if (el.matches && el.matches(selector) && !seen.has(el)) {
            seen.add(el);
            elements.push(el);
          }
        });

        elements.forEach((input) => {
          const name = input.getAttribute('name');
          if (!name) return;
          const match = name.match(/properties\[(.+?)\]/);
          if (!match) return;
          const key = match[1];
          if (key.charAt(0) === '_') return;
          if (key === 'Associate' || key === 'Associate - Text') return;

          let value = '';
          if (input.type === 'radio' || input.type === 'checkbox') {
            if (!input.checked) return;
            value = input.value || '';
          } else if (input.tagName === 'SELECT') {
            value = input.options[input.selectedIndex]?.value || '';
          } else {
            value = input.value || '';
          }
          const trimmed = String(value).trim();
          if (trimmed === '') return;
          params.set(key, trimmed);
        });
      }

      // Always add measurements from current category store so they are preserved (e.g. when redirecting Invoice later from pay-now page where form selector may miss inputs)
      if (this.selectedCategory && this.measurementManager && this.measurementFields && this.measurementFields.length) {
        const store = this.measurementManager.getCategoryStore(this.selectedCategory);
        const utils = this.measurementManager.utils;
        if (store && utils && typeof store.forEach === 'function') {
          store.forEach((val, measName) => {
            if (!val || typeof val !== 'object') return;
            if (Number.isFinite(val.in)) {
              params.set(`${measName} (in)`, utils.formatValue(val.in));
            }
            if (Number.isFinite(val.cm)) {
              params.set(`${measName} (cm)`, utils.formatValue(val.cm));
            }
          });
        }
      }

      return params.toString();
    }

    /**
     * Builds the URL to use for the next page load so form state (measurements, options) is preserved.
     * Call this when redirecting; the next page reads state via parseUrlParams() (URL or edit_ref).
     * Abstracts storage: uses query string when short enough, otherwise sessionStorage + edit_ref (same as edit links).
     * @param {string} baseUrl - Full URL or path for the destination (e.g. redirectUrl or generic custom order URL).
     * @param {{ payNow?: boolean, type?: string }} [options] - payNow: add pay_now=1; type: override type / Product Type / Sub type (e.g. for link interceptor target).
     * @returns {string} Full URL to assign to window.location.href.
     */
    getUrlWithFormStateForNextPage(baseUrl, options = {}) {
      const qs = this.getFormStateAsQueryString();
      const params = qs ? new URLSearchParams(qs) : new URLSearchParams();
      if (options.payNow) params.set('pay_now', '1');
      if (options.type != null && String(options.type).trim() !== '') {
        const t = String(options.type).trim();
        params.set('type', t);
        params.set('Product Type', t);
        params.set('Sub type', t);
      }
      const base = (baseUrl || '').replace(/\?.*$/, '').trim();
      const origin = typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '';
      const fullBase = base.startsWith('http') ? base : base.startsWith('/') ? origin + base : origin + (base ? '/products/' + base : '');
      const queryString = params.toString();
      const fullUrl = queryString ? `${fullBase}?${queryString}` : fullBase;
      const maxUrlLength = 2000;
      if (fullUrl.length <= maxUrlLength) return fullUrl;
      const paramObj = Object.fromEntries(params.entries());
      try {
        const editRef = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem('customOrderEdit_' + editRef, JSON.stringify(paramObj));
        const shortParams = new URLSearchParams({ edit_ref: editRef });
        if (options.payNow) shortParams.set('pay_now', '1');
        return fullBase + '?' + shortParams.toString();
      } catch (e) {
        return fullUrl;
      }
    }

    /**
     * When selection has a pay-now product URL, redirect to that product page with form state.
     * Called after category or harness/tag type change. When already on a pay-now product page,
     * redirects only if the new selection is a different product (so clicking another product
     * navigates to its page).
     */
    maybeRedirectToPayNowProduct() {
      // Only redirect to pay-now product when user has Pay now selected; leave Invoice later users on generic flow
      if (this.paymentInvoiceLaterRadio && this.paymentInvoiceLaterRadio.checked) {
        return;
      }
      if (this.selectedCategory === 'Harness' && !this.getSelectedHarnessType()) {
        return;
      }
      if (this.selectedCategory === 'Tag' && this.tagTypeSelector) {
        const tagChecked = this.tagTypeSelector.querySelector('.tag-type-input:checked');
        if (!tagChecked) {
          return;
        }
      }
      const effectiveType = this.getEffectiveProductType({ fromSelectionOnly: true });
      const redirectUrl = this.getRedirectUrlForType(effectiveType);
      if (!redirectUrl) {
        return;
      }
      // When already on a pay-now product page, only redirect if the new selection is a different product
      if (this.config && this.config.isChargeUpfrontProductPage) {
        if (effectiveType === this.config.effectiveProductType) {
          return;
        }
      }
      const target = this.getUrlWithFormStateForNextPage(redirectUrl, { payNow: true });
      window.location.href = target;
    }

    /**
     * Applies the type param (from URL) to the form: sets category selection and harness/tag type to match.
     * Called after syncUrlToCurrentSelection so the form stays in sync with the URL.
     * Handles both config product types (e.g. "Deluxe Bulldog Harness") and raw harness/tag type values (e.g. "Standard Harness").
     * @param {string} typeParam - The type query param value (may be product type or harness/tag type string)
     */
    applyTypeParamToSelection(typeParam) {
      if (!typeParam || !this.categoryInputs || !this.categoryInputs.length) return;
      const effectiveType = decodeURIComponent(String(typeParam)).trim();
      if (!effectiveType || effectiveType.toLowerCase() === 'custom order') return;

      const setCategoryAndVisibility = (category) => {
        const categoryInput = Array.from(this.categoryInputs).find(
          (input) => input.dataset.label === category,
        );
        if (!categoryInput) return;
        categoryInput.checked = true;
        this.selectedCategory = category;
        this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
        this.categoryManager.updateSectionVisibility(
          this.selectedCategory,
          this.harnessSection,
          this.harnessTypeSelector,
          this.tagTypeSelector,
          this.leatherColorSection,
          this.notesSection,
          this.associateSection,
          this.otherCategoryNotice,
        );
        this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        this.categoryManager.updateMeasurementGroupVisibility();
      };

      if (this.config) {
        let category = this.config.productTypeMap && this.config.productTypeMap[effectiveType];
        const harnessOrTagType =
          this.config.productTypeToHarnessType && this.config.productTypeToHarnessType[effectiveType];
        if (!category) {
          const categoryByLabel = Array.from(this.categoryInputs).find(
            (input) =>
              input.dataset.label &&
              input.dataset.label.trim().toLowerCase() === effectiveType.trim().toLowerCase(),
          );
          if (categoryByLabel && categoryByLabel.dataset.label) {
            category = categoryByLabel.dataset.label;
          }
        }
        if (category) {
          setCategoryAndVisibility(category);
          if (harnessOrTagType) {
            if (category === 'Harness' && this.harnessTypeInputs.length) {
              const radio = Array.from(this.harnessTypeInputs).find(
                (input) => input.value.trim().toLowerCase() === harnessOrTagType.trim().toLowerCase(),
              );
              if (radio) radio.checked = true;
            } else if (category === 'Tag' && this.tagTypeSelector) {
              const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
              const tagRadio = Array.from(tagTypeInputs).find(
                (input) => input.value.trim().toLowerCase() === harnessOrTagType.trim().toLowerCase(),
              );
              if (tagRadio) tagRadio.checked = true;
            }
          }
          return;
        }
      }

      const categoryByLabel = Array.from(this.categoryInputs).find(
        (input) =>
          input.dataset.label &&
          input.dataset.label.trim().toLowerCase() === effectiveType.trim().toLowerCase(),
      );
      if (categoryByLabel && categoryByLabel.dataset.label) {
        setCategoryAndVisibility(categoryByLabel.dataset.label);
        return;
      }

      const harnessRadio = Array.from(this.harnessTypeInputs || []).find(
        (input) => input.value.trim().toLowerCase() === effectiveType.toLowerCase(),
      );
      if (harnessRadio) {
        setCategoryAndVisibility('Harness');
        harnessRadio.checked = true;
        return;
      }

      if (this.tagTypeSelector) {
        const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
        const tagRadio = Array.from(tagTypeInputs).find(
          (input) => input.value.trim().toLowerCase() === effectiveType.toLowerCase(),
        );
        if (tagRadio) {
          setCategoryAndVisibility('Tag');
          tagRadio.checked = true;
        }
      }
    }

    /**
     * Returns the type string to use in the URL for the current selection.
     * Uses config product type when available; otherwise the selected harness/tag type so the URL always reflects the selection.
     */
    getTypeParamForCurrentSelection() {
      this.syncSelectionFromDOM();
      const effectiveType = this.getEffectiveProductType({ fromSelectionOnly: true });
      if (effectiveType) return effectiveType;
      const category = this.selectedCategory;
      if (category === 'Harness') return this.getSelectedHarnessType() || null;
      if (category === 'Tag') return this.getSelectedTagType() || null;
      return category || null;
    }

    /**
     * True when the current page is the generic custom order product (invoice later).
     * Used to decide whether to submit or inject Product Type (show) vs strip it (pay-now / by-type).
     */
    isOnGenericCustomOrderPage() {
      if (typeof window === 'undefined' || !window.location || !this.config) return false;
      const genericUrl = (this.config.customOrderProductUrl || '').trim();
      const genericPath = genericUrl
        ? genericUrl.replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase()
        : '';
      const currentPath = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
      return (
        (genericPath.length > 0 && currentPath === genericPath) ||
        currentPath === '/products/custom-order'
      );
    }

    /**
     * Updates the browser URL (type and pay_now params) to match current form selection without reload.
     * Call after category or harness/tag type change so the URL reflects the new type (e.g. type=Standard+Harness instead of stale type=Deluxe+Bulldog+Harness).
     * Always sets type when the user has a selection so the URL carries the current type.
     */
    syncUrlToCurrentSelection() {
      if (typeof window === 'undefined' || !window.location) return;
      this.syncSelectionFromDOM();
      const typeParam = this.getTypeParamForCurrentSelection();
      const params = new URLSearchParams(window.location.search);
      if (typeParam) {
        params.set('type', typeParam);
        params.set('Product Type', typeParam);
        params.set('Sub type', typeParam);
      } else {
        params.delete('type');
        params.delete('Product Type');
        params.delete('Sub type');
      }
      if (this.selectedCategory) {
        params.set('Selected Option', this.selectedCategory);
      } else {
        params.delete('Selected Option');
      }
      const effectiveType = this.getEffectiveProductType({ fromSelectionOnly: true });
      const redirectUrl = this.getRedirectUrlForType(effectiveType);
      const hasPayNowProduct =
        typeof redirectUrl === 'string' && redirectUrl.trim().length > 0;
      if (!hasPayNowProduct) {
        params.delete('pay_now');
      }
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
      window.history.replaceState(null, '', newUrl);
      if (typeParam) {
        this.applyTypeParamToSelection(typeParam);
      }
    }

    updatePaymentToggleState() {
      if (!this.paymentPayNowRadio || !this.paymentToggleHint) {
        return;
      }
      this.syncSelectionFromDOM();
      // Use current form selection only (ignore URL type) so that when user changes harness/tag type,
      // we evaluate Pay now availability for the NEW type, not the type in the URL (e.g. pay-now product page).
      const effectiveType = this.getEffectiveProductType({ fromSelectionOnly: true });
      const redirectUrl = this.getRedirectUrlForType(effectiveType);
      const hasRedirect =
        typeof redirectUrl === 'string' && redirectUrl.trim().length > 0;
      this.paymentPayNowRadio.disabled = !hasRedirect;
      this.paymentToggleHint.textContent = '';
      const wasPayNowChecked = this.paymentPayNowRadio.checked;
      if (wasPayNowChecked && !hasRedirect && this.paymentInvoiceLaterRadio) {
        this.paymentInvoiceLaterRadio.checked = true;
        // We're on a pay-now product page but the new selection has no pay-now product — go to generic page
        if (this.redirectToGenericCustomOrderPageIfNeeded()) {
          return;
        }
      }
    }

    /**
     * If not already on the generic custom order page, redirects there with current form state (pay_now removed).
     * Used when user selects Invoice later or when category/type change leaves Pay now selected but no product available.
     * @returns {boolean} true if a redirect was performed (navigation started), false if already on generic (no-op)
     */
    redirectToGenericCustomOrderPageIfNeeded() {
      const currentPath = (window.location && window.location.pathname || '').replace(/\/+$/, '');
      const norm = (p) => (p || '').replace(/\/+$/, '');
      const pathToNorm = (path) => {
        const p = (path || '').trim();
        if (p.startsWith('http')) {
          try { return norm(new URL(p).pathname); } catch (e) { return norm(p); }
        }
        return norm(p.startsWith('/') ? p : '/products/' + p);
      };
      const canonicalGeneric = '/products/custom-order';
      let genericUrl =
        (this.config && this.config.customOrderProductUrl) ||
        (window.customMeasurementsConfig && window.customMeasurementsConfig.customOrderProductUrl) ||
        canonicalGeneric;
      // Never use a pay-now product URL as the generic (e.g. if custom_order_product_sku points at a pay-now SKU)
      const payNowPaths = this.config && this.config.productTypeToRedirectUrl
        ? Object.values(this.config.productTypeToRedirectUrl).map((u) => pathToNorm(u))
        : [];
      if (payNowPaths.indexOf(pathToNorm(genericUrl)) !== -1) {
        genericUrl = canonicalGeneric;
      }
      let genericPathNorm = pathToNorm(genericUrl);
      const currentPathNorm = norm(currentPath);
      if (genericPathNorm === currentPathNorm) {
        genericUrl = canonicalGeneric;
        genericPathNorm = pathToNorm(genericUrl);
      }
      const alreadyOnGeneric = currentPathNorm === genericPathNorm;
      if (alreadyOnGeneric) return false;
      const path = (genericUrl || '').trim();
      const origin = window.location && window.location.origin || '';
      const base = path.startsWith('http') ? path : path.startsWith('/') ? origin + path : origin + '/products/' + path;
      const target = this.getUrlWithFormStateForNextPage(base);
      window.location.href = target;
      return true;
    }

    /**
     * Selects Pay now when it should match the page we landed on:
     * 1) URL has pay_now=1 (or pay_now=true) — e.g. coming from custom order page with Pay now chosen.
     * 2) We're on a pay-now product page with no URL param — e.g. direct load of /products/custom-deluxe-bulldog-harness.
     * Only applies when Pay now is enabled for the current selection (not disabled).
     */
    applyPayNowFromUrlIfPresent() {
      if (!this.paymentPayNowRadio || !this.paymentInvoiceLaterRadio) return;

      // On a pay-now product page (e.g. direct load of /products/custom-hat), always show Pay now
      // selected and enabled so the page state matches the product. Skip the disabled check so we
      // don't depend on category/toggle state having been set first.
      if (this.isOnPayNowProductPage()) {
        this.paymentPayNowRadio.checked = true;
        this.paymentInvoiceLaterRadio.checked = false;
        this.paymentPayNowRadio.disabled = false;
        return;
      }

      if (this.paymentPayNowRadio.disabled) return;

      const fromUrl =
        window.CustomOrderUtils &&
        window.CustomOrderUtils.parseUrlParams &&
        (() => {
          const urlParams = window.CustomOrderUtils.parseUrlParams();
          if (!urlParams || !urlParams.pay_now) return false;
          const payNowVal = String(urlParams.pay_now).trim().toLowerCase();
          return payNowVal === '1' || payNowVal === 'true';
        })();

      if (fromUrl) {
        this.paymentPayNowRadio.checked = true;
        this.paymentInvoiceLaterRadio.checked = false;
      }
    }

    /**
     * Handles payment timing option change (Invoice later | Pay now).
     * On Pay now: navigate to product URL if available (otherwise option is disabled).
     * On Invoice later: if already on the custom order page do nothing; otherwise redirect to
     * the custom order page with form state in the query string so the page prefills.
     * @param {HTMLInputElement} radio - The radio that was selected
     */
    handlePaymentTimingChange(radio) {
      if (radio.value === 'pay_now' && radio.checked) {
        this.syncSelectionFromDOM();
        const effectiveType = this.getEffectiveProductType();
        const redirectUrl = this.getRedirectUrlForType(effectiveType);
        const hasRedirect = typeof redirectUrl === 'string' && redirectUrl.trim().length > 0;
        if (hasRedirect) {
          const target = this.getUrlWithFormStateForNextPage(redirectUrl, { payNow: true });
          window.location.href = target;
        }
        // If no URL, Pay now radio is disabled by updatePaymentToggleState so this path should not run
      } else if (radio.value === 'invoice_later' && radio.checked) {
        const currentPath = (window.location && window.location.pathname || '').replace(/\/+$/, '');
        this.redirectToGenericCustomOrderPageIfNeeded();
      }
    }

    setupEventListeners() {
      // Category selection
      this.categoryInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          this.flagFormInteraction();
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
          }
          this.selectedCategory = input.dataset.label;
          this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);

          // Clear all error states when category changes
          this.clearAllErrorStates();

          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.tagTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection,
            this.otherCategoryNotice,
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.measurementManager.restoreMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.updateMeasurementOnUnitChange();
          this.categoryManager.updateMeasurementGroupVisibility();
          this.selectFirstSubTypeIfNone();
          this.syncUrlToCurrentSelection();
          this.updatePaymentToggleState();
          this.maybeRedirectToPayNowProduct();
          this.updateAddToCartButton();
        });
      });

      // Harness type selection: save measurements to store first so redirect carries them; then sync URL, update Pay now state, redirect
      this.harnessTypeInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
          }
          this.syncUrlToCurrentSelection();
          this.updatePaymentToggleState();
          this.maybeRedirectToPayNowProduct();
        });
      });

      // Tag type selection: save measurements to store first so redirect carries them; then sync URL, update Pay now state, redirect
      if (this.tagTypeSelector) {
        this.tagTypeSelector.querySelectorAll('.tag-type-input').forEach((input) => {
          input.addEventListener('change', () => {
            if (this.selectedCategory) {
              this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
            }
            this.syncUrlToCurrentSelection();
            this.updatePaymentToggleState();
            this.maybeRedirectToPayNowProduct();
          });
        });
      }

      // Unit toggle
      this.unitToggleInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          this.flagFormInteraction();
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(this.selectedCategory, this.measurementFields);
          }
          this.currentUnit = input.dataset.unit;

          if (this.unitOfMeasureInput) {
            const unitValue = this.currentUnit === 'in' ? 'Inches' : 'Centimeters';
            this.unitOfMeasureInput.value = unitValue;
            this.unitOfMeasureInput.setAttribute('value', unitValue);
          }

          this.updateMeasurementOnUnitChange();
        });
      });

      // Payment timing toggle: on click/change, load new URL if available; Pay now is disabled when no URL
      if (this.paymentToggleContainer) {
        const paymentRadios = this.paymentToggleContainer.querySelectorAll('input[name^="payment-timing-"]');
        paymentRadios.forEach((radio) => {
          radio.addEventListener('change', () => this.handlePaymentTimingChange(radio));
        });
        // On click: if Pay now has no URL (disabled), prevent selecting it and show hint
        this.paymentToggleContainer.addEventListener('click', (e) => {
          const payNowRadio = this.paymentPayNowRadio;
          if (!payNowRadio || !payNowRadio.disabled) return;
          const payNowLabel = payNowRadio.id
            ? document.querySelector(`label[for="${payNowRadio.id}"]`)
            : null;
          const clickedPayNowLabel = payNowLabel && (e.target === payNowLabel || payNowLabel.contains(e.target));
          if (clickedPayNowLabel) {
            e.preventDefault();
            e.stopPropagation();
            if (this.paymentToggleHint) {
              this.paymentToggleHint.focus({ preventScroll: true });
            }
          }
        });
      }

      // Measurement inputs
      this.measurementInputs.forEach((input) => {
        input.addEventListener('input', () => {
          this.flagFormInteraction();
          // Clear error state when user starts typing
          const field = input.closest('.measurement-field');
          if (field) {
            field.classList.remove('measurement-field--error');
            input.classList.remove('measurement-input--error');
            const otherInput =
              field.querySelector('.measurement-in') === input
                ? field.querySelector('.measurement-cm')
                : field.querySelector('.measurement-in');
            if (otherInput) otherInput.classList.remove('measurement-input--error');
          }
          this.updateAddToCartButton();
        });

        const normalizeMeasurementValue = () => {
          const field = input.closest('.measurement-field');
          if (!field) return;
          const measName = field.dataset.measurement;
          const unit = input.classList.contains('measurement-in') ? 'in' : 'cm';
          const numericValue = this.utils.parseValue(input.value);

          if (Number.isFinite(numericValue)) {
            this.measurementManager.syncValues(measName, unit, numericValue, this.currentCategoryStore);
          } else if (!this.measurementManager.isSyncingValues) {
            const targetInput =
              unit === 'in' ? field.querySelector('.measurement-cm') : field.querySelector('.measurement-in');
            if (targetInput) {
              targetInput.value = '';
            }
            if (this.currentCategoryStore) {
              this.currentCategoryStore.delete(measName);
            }
          }
          this.updateAddToCartButton();
        };

        input.addEventListener('blur', normalizeMeasurementValue);
        input.addEventListener('change', normalizeMeasurementValue);
      });

      // Custom text input (from validated-text-input component)
      // Note: validated-text-input.liquid has its own validation script that also manages the button
      // We coordinate by using a small delay on blur to let the input value settle
      const customTextInput = document.querySelector('input[name="properties[Custom Text]"]');
      if (customTextInput) {
        customTextInput.addEventListener('input', () => {
          this.flagFormInteraction();
          // Clear error state when user starts typing
          customTextInput.classList.remove('measurement-input--error');
          // Use setTimeout to let the input value update fully
          setTimeout(() => {
            this.updateAddToCartButton();
          }, 0);
        });
        customTextInput.addEventListener('blur', () => {
          // Use setTimeout to let the input value and any other handlers settle
          // This ensures we validate with the final value after all handlers run
          setTimeout(() => {
            this.updateAddToCartButton();
          }, 0);
        });
      }

      // Harness selects
      this.harnessSelects.forEach((select) => {
        select.addEventListener('change', () => {
          // Clear error state when user makes selection
          select.classList.remove('measurement-input--error');
          this.updateAddToCartButton();
          this.flagFormInteraction();
        });
      });

      // Harness custom texts
      this.harnessCustomTexts.forEach((input) => {
        input.addEventListener('input', () => {
          // Clear error state when user types
          input.classList.remove('measurement-input--error');
          this.flagFormInteraction();
          this.updateAddToCartButton();
        });
      });

      // Harness type inputs - clear error on selection
      if (this.harnessTypeSelector) {
        const harnessTypeInputs = this.harnessTypeSelector.querySelectorAll('.harness-type-input');
        harnessTypeInputs.forEach((input) => {
          input.addEventListener('change', () => {
            // Error state will be cleared by validation on next check
            this.flagFormInteraction();
            this.updateAddToCartButton();
          });
        });
      }

      // Tag type inputs - clear error on selection
      if (this.tagTypeSelector) {
        const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
        tagTypeInputs.forEach((input) => {
          input.addEventListener('change', () => {
            // Error state will be cleared by validation on next check
            this.flagFormInteraction();
            this.updateAddToCartButton();
          });
        });
      }

      // Initialize "Other" option handlers using utility class
      const onInteraction = () => {
        this.flagFormInteraction();
        this.updateAddToCartButton();
      };

      // Associate "Other" option handler
      if (this.associateSelect && this.associateTextWrapper && this.associateText) {
        this.associateOtherHandler = new OtherOptionHandler(
          'associate-select',
          'associate-text-wrapper',
          'associate-text',
          onInteraction,
        );
        // Clear error state on associate select change
        this.associateSelect.addEventListener('change', () => {
          this.associateSelect.classList.remove('measurement-input--error');
          if (this.associateText) {
            this.associateText.classList.remove('measurement-input--error');
          }
        });
        if (this.associateText) {
          this.associateText.addEventListener('input', () => {
            this.associateText.classList.remove('measurement-input--error');
          });
        }
      }

      // Leather color "Other" option handler (always available) - handles radio buttons
      if (this.leatherColorRadios.length > 0 && this.leatherColorTextWrapper && this.leatherColorText) {
        this.leatherColorRadios.forEach((radio) => {
          radio.addEventListener('change', () => {
            onInteraction();
            // Clear error state when user makes selection
            if (this.leatherColorText) {
              this.leatherColorText.classList.remove('measurement-input--error');
            }
            if (radio.value === 'Other' && radio.checked) {
              this.leatherColorTextWrapper.style.display = 'flex';
            } else if (radio.checked) {
              this.leatherColorTextWrapper.style.display = 'none';
              this.leatherColorText.value = '';
            }
          });
        });
        if (this.leatherColorText) {
          this.leatherColorText.addEventListener('input', () => {
            this.leatherColorText.classList.remove('measurement-input--error');
          });
        }
      }

      // Harness "Other" option handlers (plates and sliders only)
      const harnessOtherConfigs = [
        { select: 'left-front-plate-select', wrapper: 'left-front-plate-text-wrapper', text: 'left-front-plate-text' },
        {
          select: 'right-front-plate-select',
          wrapper: 'right-front-plate-text-wrapper',
          text: 'right-front-plate-text',
        },
        { select: 'back-plate-select', wrapper: 'back-plate-text-wrapper', text: 'back-plate-text' },
        { select: 'long-sliders-select', wrapper: 'long-sliders-text-wrapper', text: 'long-sliders-text' },
      ];

      this.harnessOtherHandlers = harnessOtherConfigs
        .map(({ select, wrapper, text }) => new OtherOptionHandler(select, wrapper, text, onInteraction))
        .filter((handler) => handler.selectEl !== null);

      // Harness type selection
      this.harnessTypeInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) {
            this.flagFormInteraction();
            this.updateAddToCartButton();
          }
        });
      });

      // Listen to variant changes to update button state
      if (
        typeof subscribe === 'function' &&
        typeof PUB_SUB_EVENTS !== 'undefined' &&
        PUB_SUB_EVENTS.optionValueSelectionChange
      ) {
        // Listen to variantChange (Dawn publishes this after updating button state)
        // This ensures we sync our validation state with Dawn's button state
        subscribe(PUB_SUB_EVENTS.variantChange, () => {
          // Variant changed, Dawn has already updated button state
          // Now update our validation state to combine with Dawn's state
          this.updateAddToCartButton();
        });
      }

      // Initialize collapsible sections using utility class
      const collapsibleToggles = document.querySelectorAll('.collapsible-toggle');
      this.collapsibleSections = Array.from(collapsibleToggles)
        .map((toggle) => new CollapsibleSection(toggle))
        .filter((section) => section.content !== null);

      // Initialize character counters for notes
      const noteTextareas = document.querySelectorAll('#notes-section textarea');
      this.characterCounters = Array.from(noteTextareas)
        .map((textarea) => {
          const counter = textarea.closest('.textarea-wrapper')?.querySelector('.character-count-text');
          return counter ? new CharacterCounter(textarea, counter, 500) : null;
        })
        .filter((counter) => counter !== null);

      // Form submission: use capture phase so we run BEFORE product-form.js builds FormData (inject Product Type for Gloves/Hat etc. in time)
      if (this.productForm) {
        this.productForm.addEventListener(
          'submit',
          (event) => {
          if (!this.validationService.validateRequiredFields(this.selectedCategory, false)) {
            event.preventDefault();
            alert('Please select a category and fill all required measurements.');
            this.resetAfterAddToCartPending = false;
            this.buttonManager.resetLoadingState();
            return false;
          }

          if (this.unitOfMeasureInput) {
            const unitValue = this.currentUnit === 'in' ? 'Inches' : 'Centimeters';
            this.unitOfMeasureInput.value = unitValue;
            this.unitOfMeasureInput.setAttribute('value', unitValue);
          }

          document.querySelectorAll('.measurement-field.active').forEach((field) => {
            const measName = field.dataset.measurement;
            const inInput = field.querySelector('.measurement-in');
            const cmInput = field.querySelector('.measurement-cm');
            const inValue = this.utils.parseValue(inInput ? inInput.value : '');
            const cmValue = this.utils.parseValue(cmInput ? cmInput.value : '');

            if (Number.isFinite(inValue) && !Number.isFinite(cmValue)) {
              this.measurementManager.syncValues(measName, 'in', inValue, this.currentCategoryStore);
            } else if (Number.isFinite(cmValue) && !Number.isFinite(inValue)) {
              this.measurementManager.syncValues(measName, 'cm', cmValue, this.currentCategoryStore);
            }
          });

          // Check if we're in product-type mode (customer-facing form)
          const isProductTypeMode =
            this.config?.autoSelectedCategory !== undefined && this.config?.autoSelectedCategory !== null;
          const isOnGenericCustomOrderPage = this.isOnGenericCustomOrderPage();

          // Filter all property inputs (measurements and other properties)
          // Remove name attribute to prevent them from being included in FormData
          // This MUST happen before product-form.js creates FormData
          const allPropertyInputs = this.productForm.querySelectorAll(
            'input[name^="properties["], select[name^="properties["], textarea[name^="properties["]',
          );
          allPropertyInputs.forEach((input) => {
            const name = input.getAttribute('name');
            if (!name) return;

            // Extract property name from name attribute
            const match = name.match(/properties\[(.+?)\]/);
            if (!match) return;

            const propertyName = match[1];

            // Remove "Selected Option" for customer-facing products (redundant UX)
            if (isProductTypeMode && propertyName === 'Selected Option') {
              input.removeAttribute('name');
              input.setAttribute('data-removed', 'true');
              return;
            }

            // Never submit Harness Type or Tag Type (replaced by Product Type)
            if (propertyName === 'Harness Type' || propertyName === 'Tag Type') {
              input.removeAttribute('name');
              input.setAttribute('data-removed', 'true');
              return;
            }

            // On pay-now product pages (not generic), type is in the product title — don't submit Product Type
            if (
              propertyName === 'Product Type' &&
              this.config?.isChargeUpfrontProductPage &&
              !isOnGenericCustomOrderPage
            ) {
              input.removeAttribute('name');
              input.setAttribute('data-removed', 'true');
              return;
            }

            let propertyValue = '';

            // Get value based on input type
            if (input.tagName === 'SELECT') {
              propertyValue = input.options[input.selectedIndex]?.value || '';
            } else if (input.tagName === 'TEXTAREA') {
              propertyValue = input.value || '';
            } else {
              propertyValue = input.value || '';
            }

            // Check if this is a measurement input that needs category-based filtering
            if (name.includes('(in)') || name.includes('(cm)')) {
              const measMatch = name.match(/properties\[(.+?)\s+\(in\)\]|properties\[(.+?)\s+\(cm\)\]/);
              if (measMatch) {
                const measName = measMatch[1] || measMatch[2];
                const measConfig = this.config.measurements[measName];
                const categoryInfo =
                  measConfig && measConfig.categories ? measConfig.categories[this.selectedCategory] : null;
                const isIncluded = categoryInfo && categoryInfo.included === true;

                // Remove if not included in category or if value is empty
                const trimmedValue = String(propertyValue || '').trim();
                if (!isIncluded || trimmedValue === '') {
                  // Remove name attribute - this prevents the property from being included in FormData
                  input.removeAttribute('name');
                  input.setAttribute('data-removed', 'true');
                  return;
                }
              }
            }

            // Use CustomOrderUtils to filter empty, zero, and internal properties
            // This will catch empty values, zero values, internal properties, and "- Text" properties
            if (window.CustomOrderUtils && window.CustomOrderUtils.shouldFilterProperty(propertyName, propertyValue)) {
              // Remove name attribute - this prevents the property from being included in FormData
              input.removeAttribute('name');
              input.setAttribute('data-removed', 'true');
            }
          });

          // On generic custom order only: inject Product Type when category has no sub-type selector (e.g. Gloves, Hat)
          const needsProductTypeInject =
            !isProductTypeMode &&
            isOnGenericCustomOrderPage &&
            this.selectedCategory &&
            this.selectedCategory !== 'Harness' &&
            this.selectedCategory !== 'Tag';
          if (needsProductTypeInject) {
            const hasChecked = this.productForm.querySelector(
              'input[name="properties[Product Type]"]:checked'
            );
            const hasHidden = Array.from(
              this.productForm.querySelectorAll('input[name="properties[Product Type]"]')
            ).some((el) => el.type === 'hidden' && el.value && String(el.value).trim() !== '');
            if (!hasChecked && !hasHidden) {
              const hidden = document.createElement('input');
              hidden.type = 'hidden';
              hidden.name = 'properties[Product Type]';
              hidden.value = this.selectedCategory;
              this.productForm.appendChild(hidden);
            }
          }

          this.resetAfterAddToCartPending = true;
          this.hasInteractedWithForm = false;
          this.updateBannerEditingState(false);
        },
          true
        );
      }
    }

    setResetAfterAddToCartPending(value) {
      this.resetAfterAddToCartPending = value;
    }

    setupCartUpdateSubscription() {
      if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined' && PUB_SUB_EVENTS.cartUpdate) {
        subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
          if (event.cartState || event.itemCount !== undefined) {
            this.hasInteractedWithForm = false;
            this.updateBannerEditingState(false);
            if (!this.resetAfterAddToCartPending) {
              return;
            }
            // Clear URL query parameters to reset to clean state
            if (window.location.search) {
              const cleanUrl = window.location.pathname + window.location.hash;
              window.history.replaceState({}, document.title, cleanUrl);
            }
            this.initialize();
            this.updateAddToCartButton();
            this.resetAfterAddToCartPending = false;
          }
          if (event.customOrderItemAdded) {
            // Clear URL query parameters to reset to clean state
            if (window.location.search) {
              const cleanUrl = window.location.pathname + window.location.hash;
              window.history.replaceState({}, document.title, cleanUrl);
            }
            this.resetAfterAddToCartPending = false;
            this.initialize();
            this.updateAddToCartButton();
          }
        });
      } else {
        setTimeout(() => this.setupCartUpdateSubscription(), 100);
      }
    }
  }

  // Initialize when DOM is ready
  function initializeForm() {
    // Try to get section ID from the form or use a default
    const productForm =
      document.querySelector('form[action*="/cart/add"]') || document.querySelector('form[id^="product-form"]');
    let sectionId = 'main';

    if (productForm) {
      const formId = productForm.id;
      // Ensure formId is a string before calling match
      if (formId && typeof formId === 'string' && formId.trim() !== '') {
        const match = formId.match(/product-form-(.+)/);
        if (match && match[1]) {
          sectionId = match[1];
        }
      }
    }

    // Check if custom measurements form or payment toggle exists (toggle alone is enough for Invoice later redirect)
    if (
      document.querySelector('.measurement-field') ||
      document.querySelector('.category-option-input') ||
      document.querySelector('.custom-measurements-payment-toggle')
    ) {
      window.customMeasurementsForm = new CustomMeasurementsForm(sectionId);

      // Set up cart update subscription
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          window.customMeasurementsForm.setupCartUpdateSubscription();
        });
      } else {
        window.customMeasurementsForm.setupCartUpdateSubscription();
      }

      // Handle page show (back/forward navigation)
      window.addEventListener('pageshow', () => {
        if (window.customMeasurementsForm) {
          window.customMeasurementsForm.initialize();
          window.customMeasurementsForm.updateAddToCartButton();
        }
      });
    }
  }

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
  } else {
    initializeForm();
  }
})();
