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

    validateRequiredFields(selectedCategory, harnessSection, shouldScroll = false) {
      if (!selectedCategory || !this.config.measurements) return false;

      const activeFields = document.querySelectorAll('.measurement-field.active');
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
            return false;
          } else {
            // Remove error class on valid fields
            field.classList.remove('measurement-field--error');
            if (inInput) inInput.classList.remove('measurement-input--error');
            if (cmInput) cmInput.classList.remove('measurement-input--error');
          }
        }
      }

      // Validate associate field
      const associateSelect = document.getElementById('associate-select');
      if (associateSelect) {
        const selectedValue = associateSelect.value;
        if (!selectedValue || selectedValue === '') {
          associateSelect.classList.add('measurement-input--error');
          if (shouldScroll) {
            associateSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return false;
        }
        if (selectedValue === 'Other') {
          const associateText = document.getElementById('associate-text');
          if (!associateText || !associateText.value || associateText.value.trim() === '') {
            associateText.classList.add('measurement-input--error');
            if (shouldScroll) {
              associateText.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
          }
        }
        associateSelect.classList.remove('measurement-input--error');
      }

      // Validate leather color (required for all categories except Tag)
      if (selectedCategory !== 'Tag') {
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
          return false;
        }
        if (leatherColorText) leatherColorText.classList.remove('measurement-input--error');
      }

      if (harnessSection && harnessSection.classList.contains('active')) {
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
          return false;
        }
      }

      // Validate tag type selection (if Tag category is selected)
      const tagTypeSelector = document.getElementById('tag-type-selector');
      if (tagTypeSelector && tagTypeSelector.style.display !== 'none') {
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
          return false;
        }
      }

      if (harnessSection && harnessSection.classList.contains('active')) {
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
            return false;
          } else {
            select.classList.remove('measurement-input--error');
          }
        }
      }

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
          if (!this.listenerAttached) {
            // Attach handlers directly to the button using mousedown/pointerdown
            // These events fire even on disabled buttons, unlike click events
            const handleDisabledButton = (event) => {
              // If button is disabled, run validation with scrolling and prevent submission
              if (this.button.disabled || this.button.hasAttribute('disabled') || this.button.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (window.customMeasurementsForm && window.customMeasurementsForm.validationService) {
                  window.customMeasurementsForm.validationService.validateRequiredFields(
                    window.customMeasurementsForm.selectedCategory,
                    window.customMeasurementsForm.harnessSection,
                    true // Enable scrolling when clicking disabled button
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
              if (this.button.disabled || this.button.hasAttribute('disabled') || this.button.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                event.stopPropagation();
                if (window.customMeasurementsForm && window.customMeasurementsForm.validationService) {
                  window.customMeasurementsForm.validationService.validateRequiredFields(
                    window.customMeasurementsForm.selectedCategory,
                    window.customMeasurementsForm.harnessSection,
                    true
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

      if (!isValid) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.setAttribute('disabled', 'disabled');
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Please select a category and fill all required measurements';
      } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.removeAttribute('disabled');
        button.removeAttribute('aria-disabled');
        button.removeAttribute('title');
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

  // Measurement manager
  class MeasurementManager {
    constructor(config, utils) {
      this.config = config;
      this.utils = utils;
      this.measurementValuesByCategory = new Map();
      this.isSyncingValues = false;
    }

    getCategoryStore(category) {
      if (!category) return null;
      if (!this.measurementValuesByCategory.has(category)) {
        this.measurementValuesByCategory.set(category, new Map());
      }
      return this.measurementValuesByCategory.get(category);
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

    saveCategoryMeasurements(category, measurementFields) {
      if (!category) return;
      const store = this.getCategoryStore(category);
      store.clear();

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

    restoreMeasurementsForCategory(category, measurementFields) {
      const store = this.getCategoryStore(category);
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

    clearAll() {
      this.measurementValuesByCategory.clear();
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

    updateSectionVisibility(category, harnessSection, harnessTypeSelector, tagTypeSelector, leatherColorSection, notesSection, associateSection, otherCategoryNotice) {
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

      this.setupEventListeners();
      this.initialize();
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
      const isValid = this.validationService.validateRequiredFields(
        this.selectedCategory,
        this.harnessSection
      );
      this.buttonManager.update(isValid);
    }

    initialize() {
      this.hasInteractedWithForm = false;
      this.updateBannerEditingState(false);
      this.resetAfterAddToCartPending = false;

      if (this.unitOfMeasureInput) {
        this.unitOfMeasureInput.value = 'Measured in Inches';
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

      if (this.categoryInputs.length > 0) {
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
            this.otherCategoryNotice
          );
        this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        this.measurementManager.restoreMeasurementsForCategory(
          this.selectedCategory,
          this.measurementFields
        );
        this.updateMeasurementOnUnitChange();
        this.categoryManager.updateMeasurementGroupVisibility();
      }

      const button = this.buttonManager.resolveButton();
      if (button) {
        button.disabled = true;
        button.style.opacity = '0.5';
      }
      this.updateAddToCartButton();

      // Pre-fill form from URL parameters if present (for edit functionality)
      this.prefillFromUrlParams();
    }

    prefillFromUrlParams() {
      if (!window.CustomOrderUtils || !window.CustomOrderUtils.parseUrlParams) {
        return;
      }

      const urlParams = window.CustomOrderUtils.parseUrlParams();
      if (!urlParams || Object.keys(urlParams).length === 0) {
        return;
      }

      // If we have URL parameters, we're in edit mode - show banner immediately
      this.updateBannerEditingState(true);

      // Pre-fill category if present
      if (urlParams['Selected Option']) {
        const categoryValue = urlParams['Selected Option'];
        const categoryInput = Array.from(this.categoryInputs).find(
          (input) => input.dataset.label === categoryValue
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
            this.otherCategoryNotice
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        }
      }

      // Pre-fill measurement fields
      this.measurementFields.forEach((field) => {
        const measName = field.dataset.measurement;
        if (!measName) return;

        // Check for both (in) and (cm) versions
        const inValue = urlParams[`${measName} (in)`];
        const cmValue = urlParams[`${measName} (cm)`];

        if (inValue || cmValue) {
          const inInput = field.querySelector('.measurement-in');
          const cmInput = field.querySelector('.measurement-cm');

          if (inValue && inInput) {
            inInput.value = inValue;
          }
          if (cmValue && cmInput) {
            cmInput.value = cmValue;
          }

          // Sync values if one is missing
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
        }
      });

      // Pre-fill associate
      if (urlParams['Associate']) {
        if (this.associateSelect) {
          const associateValue = urlParams['Associate'];
          const option = Array.from(this.associateSelect.options).find(
            (opt) => opt.value === associateValue
          );
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
          (radio) => radio.value === leatherColorValue
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

      // Pre-fill harness type
      if (urlParams['Harness Type'] && this.harnessTypeSelector) {
        const harnessTypeValue = urlParams['Harness Type'];
        const harnessTypeInput = Array.from(this.harnessTypeInputs).find(
          (input) => input.value === harnessTypeValue
        );
        if (harnessTypeInput) {
          harnessTypeInput.checked = true;
        }
      }

      // Pre-fill tag type
      if (urlParams['Tag Type'] && this.tagTypeSelector) {
        const tagTypeValue = urlParams['Tag Type'];
        const tagTypeInputs = this.tagTypeSelector.querySelectorAll('.tag-type-input');
        const tagTypeInput = Array.from(tagTypeInputs).find(
          (input) => input.value === tagTypeValue
        );
        if (tagTypeInput) {
          tagTypeInput.checked = true;
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

    setupEventListeners() {
      // Category selection
      this.categoryInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          this.flagFormInteraction();
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(
              this.selectedCategory,
              this.measurementFields
            );
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
            this.otherCategoryNotice
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.measurementManager.restoreMeasurementsForCategory(
            this.selectedCategory,
            this.measurementFields
          );
          this.updateMeasurementOnUnitChange();
          this.categoryManager.updateMeasurementGroupVisibility();
          this.updateAddToCartButton();
        });
      });

      // Unit toggle
      this.unitToggleInputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          this.flagFormInteraction();
          if (this.selectedCategory) {
            this.measurementManager.saveCategoryMeasurements(
              this.selectedCategory,
              this.measurementFields
            );
          }
          this.currentUnit = input.dataset.unit;

          if (this.unitOfMeasureInput) {
            const unitValue =
              this.currentUnit === 'in' ? 'Measured in Inches' : 'Measured in Centimeters';
            this.unitOfMeasureInput.value = unitValue;
            this.unitOfMeasureInput.setAttribute('value', unitValue);
          }

          this.updateMeasurementOnUnitChange();
        });
      });

      // Measurement inputs
      this.measurementInputs.forEach((input) => {
        input.addEventListener('input', () => {
          this.flagFormInteraction();
          // Clear error state when user starts typing
          const field = input.closest('.measurement-field');
          if (field) {
            field.classList.remove('measurement-field--error');
            input.classList.remove('measurement-input--error');
            const otherInput = field.querySelector('.measurement-in') === input
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
          onInteraction
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
        { select: 'right-front-plate-select', wrapper: 'right-front-plate-text-wrapper', text: 'right-front-plate-text' },
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

      // Form submission
      if (this.productForm) {
        this.productForm.addEventListener('submit', (event) => {
          if (!this.validationService.validateRequiredFields(this.selectedCategory, this.harnessSection, false)) {
            event.preventDefault();
            alert('Please select a category and fill all required measurements.');
            this.resetAfterAddToCartPending = false;
            this.buttonManager.resetLoadingState();
            return false;
          }

          if (this.unitOfMeasureInput) {
            const unitValue =
              this.currentUnit === 'in' ? 'Measured in Inches' : 'Measured in Centimeters';
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

          // Filter all property inputs (measurements and other properties)
          const allPropertyInputs = this.productForm.querySelectorAll('input[name^="properties["], select[name^="properties["], textarea[name^="properties["]');
          allPropertyInputs.forEach((input) => {
            const name = input.getAttribute('name');
            if (!name) return;

            // Extract property name from name attribute
            const match = name.match(/properties\[(.+?)\]/);
            if (!match) return;

            const propertyName = match[1];
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
                  measConfig && measConfig.categories
                    ? measConfig.categories[this.selectedCategory]
                    : null;
                const isIncluded = categoryInfo && categoryInfo.included === true;

                // Remove if not included in category or if value is empty
                if (!isIncluded || !propertyValue || propertyValue.trim() === '') {
                  input.removeAttribute('name');
                  input.setAttribute('data-removed', 'true');
                  return;
                }
              }
            }

            // Use CustomOrderUtils to filter empty, zero, and internal properties
            if (window.CustomOrderUtils && window.CustomOrderUtils.shouldFilterProperty(propertyName, propertyValue)) {
              input.removeAttribute('name');
              input.setAttribute('data-removed', 'true');
            }
          });

          this.resetAfterAddToCartPending = true;
          this.hasInteractedWithForm = false;
          this.updateBannerEditingState(false);
        });
      }
    }

    setResetAfterAddToCartPending(value) {
      this.resetAfterAddToCartPending = value;
    }

    setupCartUpdateSubscription() {
      if (
        typeof subscribe === 'function' &&
        typeof PUB_SUB_EVENTS !== 'undefined' &&
        PUB_SUB_EVENTS.cartUpdate
      ) {
        subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
          if (event.cartState || event.itemCount !== undefined) {
            this.hasInteractedWithForm = false;
            this.updateBannerEditingState(false);
            if (!this.resetAfterAddToCartPending) {
              return;
            }
            this.initialize();
            this.updateAddToCartButton();
            this.resetAfterAddToCartPending = false;
          }
          if (event.customOrderItemAdded) {
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
    const productForm = document.querySelector('form[action*="/cart/add"]') || document.querySelector('form[id^="product-form"]');
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

    // Check if custom measurements form exists
    if (document.querySelector('.measurement-field') || document.querySelector('.category-option-input')) {
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

