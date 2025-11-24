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

    validateRequiredFields(selectedCategory, harnessSection) {
      if (!selectedCategory || !this.config.measurements) return false;

      const activeFields = document.querySelectorAll('.measurement-field.active');
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
          return false;
        }
      }

      // Validate associate field
      const associateSelect = document.getElementById('associate-select');
      if (associateSelect) {
        const selectedValue = associateSelect.value;
        if (!selectedValue || selectedValue === '') {
          return false;
        }
        if (selectedValue === 'Other') {
          const associateText = document.getElementById('associate-text');
          if (!associateText || !associateText.value || associateText.value.trim() === '') {
            return false;
          }
        }
      }

      // Validate leather color (always required)
      const leatherColorSelect = document.getElementById('leather-color-select');
      if (leatherColorSelect) {
        const selectedOption = leatherColorSelect.options[leatherColorSelect.selectedIndex];
        const hasSelectValue =
          selectedOption &&
          selectedOption.value !== '' &&
          selectedOption.value !== null &&
          selectedOption.value !== 'Select one' &&
          selectedOption.value !== 'Other';

        const leatherColorText = document.getElementById('leather-color-text');
        const hasCustomText = leatherColorText && leatherColorText.value && leatherColorText.value.trim() !== '';

        if (!hasSelectValue && !hasCustomText) {
          return false;
        }
      }

      if (harnessSection && harnessSection.classList.contains('active')) {
        // Validate harness type selection
        const harnessTypeInputs = document.querySelectorAll('.harness-type-input');
        let hasHarnessType = false;
        harnessTypeInputs.forEach((input) => {
          if (input.checked) {
            hasHarnessType = true;
          }
        });
        if (!hasHarnessType) {
          return false;
        }

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
            return false;
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
            this.button.addEventListener('click', () => {
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
        const baseLabel = field.dataset.labelBase || measName;
        const labelElement = field.querySelector('label');

        if (categoryInfo && categoryInfo.included) {
          field.classList.add('active');
          const isOptional = categoryInfo.required === false;
          field.classList.toggle('measurement-field--optional', isOptional);
          field.dataset.optional = isOptional ? 'true' : 'false';
          if (labelElement) {
            labelElement.textContent = isOptional ? `${baseLabel} *` : baseLabel;
          }
          if (inInput) inInput.value = '';
          if (cmInput) cmInput.value = '';
        } else {
          field.classList.remove('active');
          field.classList.remove('measurement-field--optional');
          field.removeAttribute('data-optional');
          if (labelElement) {
            labelElement.textContent = baseLabel;
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

    updateSectionVisibility(category, harnessSection, harnessTypeSelector, leatherColorSection, notesSection, associateSection) {
      // Leather color is always available
      if (leatherColorSection) {
        leatherColorSection.classList.add('active');
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
        harnessTypeSelector.style.display = showHarnessType ? 'block' : 'none';
        if (!showHarnessType) {
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
      this.leatherColorSection = document.getElementById('leather-color-section');
      this.notesSection = document.getElementById('notes-section');
      this.associateSection = document.getElementById('associate-section');
      this.associateSelect = document.getElementById('associate-select');
      this.associateText = document.getElementById('associate-text');
      this.associateTextWrapper = document.getElementById('associate-text-wrapper');
      this.unitToggleInputs = document.querySelectorAll('#unitToggle input[type="radio"]');
      this.unitOfMeasureInput = document.getElementById('unitOfMeasure');

      this.productForm = this.findProductForm();
      this.harnessSelects = document.querySelectorAll('#harness-details select');
      this.harnessCustomTexts = document.querySelectorAll('#harness-details .custom-text');
      this.harnessTypeInputs = document.querySelectorAll('.harness-type-input');
      this.leatherColorSelect = document.getElementById('leather-color-select');
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
      if (this.leatherColorOtherHandler) {
        this.leatherColorOtherHandler.reset();
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

      if (this.notesSection) {
        this.notesSection.querySelectorAll('textarea').forEach((textarea) => {
          textarea.value = '';
        });
      }

      if (this.associateSection) {
        this.associateSection.classList.add('active');
      }

      // Leather color section is always active
      if (this.leatherColorSection) {
        this.leatherColorSection.classList.add('active');
      }

      if (this.categoryInputs.length > 0) {
        const firstInput = this.categoryInputs[0];
        firstInput.checked = true;
        this.selectedCategory = firstInput.dataset.label;
        this.currentCategoryStore = this.measurementManager.getCategoryStore(this.selectedCategory);
          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection
          );
        this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
        this.measurementManager.restoreMeasurementsForCategory(
          this.selectedCategory,
          this.measurementFields
        );
        this.updateMeasurementOnUnitChange();
      }

      const button = this.buttonManager.resolveButton();
      if (button) {
        button.disabled = true;
        button.style.opacity = '0.5';
      }
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
          this.categoryManager.updateSectionVisibility(
            this.selectedCategory,
            this.harnessSection,
            this.harnessTypeSelector,
            this.leatherColorSection,
            this.notesSection,
            this.associateSection
          );
          this.categoryManager.updateMeasurementsForCategory(this.selectedCategory, this.measurementFields);
          this.measurementManager.restoreMeasurementsForCategory(
            this.selectedCategory,
            this.measurementFields
          );
          this.updateMeasurementOnUnitChange();
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
          this.updateAddToCartButton();
          this.flagFormInteraction();
        });
      });

      // Harness custom texts
      this.harnessCustomTexts.forEach((input) => {
        input.addEventListener('input', () => {
          this.flagFormInteraction();
          this.updateAddToCartButton();
        });
      });

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
      }

      // Leather color "Other" option handler (always available)
      if (this.leatherColorSelect && this.leatherColorTextWrapper && this.leatherColorText) {
        this.leatherColorOtherHandler = new OtherOptionHandler(
          'leather-color-select',
          'leather-color-text-wrapper',
          'leather-color-text',
          onInteraction
        );
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
          if (!this.validationService.validateRequiredFields(this.selectedCategory, this.harnessSection)) {
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

          if (this.selectedCategory && this.config.measurements) {
            const measurementInputsForSubmit = this.productForm.querySelectorAll('input[name^="properties["]');
            measurementInputsForSubmit.forEach((input) => {
              const name = input.getAttribute('name');
              if (!name || (!name.includes('(in)') && !name.includes('(cm)'))) return;

              const match = name.match(/properties\[(.+?)\s+\(in\)\]|properties\[(.+?)\s+\(cm\)\]/);
              if (!match) return;

              const measName = match[1] || match[2];
              const measConfig = this.config.measurements[measName];
              const categoryInfo =
                measConfig && measConfig.categories
                  ? measConfig.categories[this.selectedCategory]
                  : null;
              const isIncluded = categoryInfo && categoryInfo.included === true;
              const value = input.value && input.value.trim() !== '' ? input.value : '';

              if (!isIncluded || value === '') {
                input.removeAttribute('name');
                input.setAttribute('data-removed', 'true');
              }
            });
          }

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

