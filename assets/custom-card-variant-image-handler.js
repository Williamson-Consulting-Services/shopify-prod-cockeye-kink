/**
 * Image Handler Module
 * Handles product image updates on hover and selection
 */

if (typeof CustomCardVariantImageHandler === 'undefined') {
  window.CustomCardVariantImageHandler = (function () {
    'use strict';

    // Debug configuration - enable/disable specific feature logging
    const DEBUG = {
      image: true, // Image handler updates (enabled for debugging)
      availability: false, // Availability matrix and option availability
      variant: false, // Variant matching and selection
      cart: false, // Add to cart functionality
      general: false, // General operations
    };

    class ImageHandler {
      constructor(card, variants, product, config) {
        this.card = card;
        this.variants = variants || [];
        this.product = product;
        this.config = config;
        this.defaultImage = null;
        this.storeDefaultImage();
      }

      storeDefaultImage() {
        const cardImage = this.card.querySelector('.card__media img');
        if (cardImage) {
          this.defaultImage = {
            srcset: cardImage.getAttribute('srcset') || '',
            src: cardImage.getAttribute('src') || '',
            alt: cardImage.getAttribute('alt') || '',
            width: cardImage.getAttribute('width') || '',
            height: cardImage.getAttribute('height') || '',
          };
        }
      }

      updateImage(colorValue, isHover) {
        if (DEBUG.image) {
          console.group('[ImageHandler] updateImage');
          console.log('Color Value:', colorValue);
          console.log('Is Hover:', isHover);
          console.log('Card:', this.card);
          console.log('Variants Count:', this.variants ? this.variants.length : 0);
          console.log('Product:', this.product ? 'Loaded' : 'Not loaded');
        }

        if (!colorValue) {
          if (!isHover) this.restoreDefaultImage();
          if (DEBUG.image) console.groupEnd();
          return;
        }

        // Find card image - target the FIRST image in card__media (main image, not hover effect)
        const cardMedia = this.card.querySelector('.card__media');
        let cardImage = null;

        if (cardMedia) {
          // Get the first img element (main image, not the hover effect one)
          const images = cardMedia.querySelectorAll('img');
          if (images.length > 0) {
            cardImage = images[0]; // First image is the main one
            if (DEBUG.image) console.log('[ImageHandler] Found main image (first in card__media)');
          }
        }

        // Fallback selectors
        if (!cardImage) {
          cardImage = this.card.querySelector('.card__media .media img');
          if (cardImage && DEBUG.image) console.log('[ImageHandler] Found image via .card__media .media img');
        }
        if (!cardImage) {
          cardImage = this.card.querySelector('.media img');
          if (cardImage && DEBUG.image) console.log('[ImageHandler] Found image via .media img');
        }
        if (!cardImage) {
          cardImage = this.card.querySelector('.card__inner img');
          if (cardImage && DEBUG.image) console.log('[ImageHandler] Found image via .card__inner img');
        }
        if (!cardImage) {
          cardImage = this.card.querySelector('img');
          if (cardImage && DEBUG.image) console.log('[ImageHandler] Found image via img (fallback)');
        }

        if (!cardImage) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] No card image found');
            console.groupEnd();
          }
          return;
        }

        if (DEBUG.image) {
          console.log('[ImageHandler] Image element found:', cardImage);
          console.log('[ImageHandler] Current image src:', cardImage.getAttribute('src'));
          console.log('[ImageHandler] Current image srcset:', cardImage.getAttribute('srcset'));
        }

        // Find variant with this color
        const variant = this.findVariantByColor(colorValue);
        if (!variant) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] No variant found for color:', colorValue);
            console.log(
              '[ImageHandler] Available variants:',
              this.variants.map((v) => ({
                id: v.id,
                option1: v.option1,
                option2: v.option2,
                option3: v.option3,
              })),
            );
            console.groupEnd();
          }
          if (!isHover) this.restoreDefaultImage();
          return;
        }

        if (DEBUG.image) {
          console.log('[ImageHandler] Found variant:', {
            id: variant.id,
            sku: variant.sku || 'N/A',
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            featured_media: variant.featured_media ? { id: variant.featured_media.id } : null,
            featured_image: variant.featured_image ? 'exists' : null,
          });
        }

        // Get variant image (same approach as product page)
        const imageData = this.getVariantImage(variant);
        if (!imageData || !imageData.src) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] No image data for variant:', variant.id);
            console.log('[ImageHandler] Image data result:', imageData);
            console.groupEnd();
          }
          if (!isHover) this.restoreDefaultImage();
          return;
        }

        if (DEBUG.image) {
          console.log('[ImageHandler] Image data retrieved:', {
            src: imageData.src,
            srcset: imageData.srcset ? 'exists' : 'null',
            width: imageData.width,
            height: imageData.height,
            alt: imageData.alt,
          });
        }

        // Update image with proper srcset (matching product card format)
        const baseUrl = imageData.src.split('?')[0];
        if (DEBUG.image) console.log('[ImageHandler] Base URL:', baseUrl);

        // Build srcset matching card-product.liquid format
        const widths = [165, 360, 533, 720, 940, 1066];
        const srcsetParts = [];
        widths.forEach((width) => {
          if (!imageData.width || imageData.width >= width) {
            srcsetParts.push(`${baseUrl}?width=${width} ${width}w`);
          }
        });

        // Set primary src (533w for cards) - use full srcset if available, otherwise build it
        const srcUrl = `${baseUrl}?width=533`;
        const finalSrcset = imageData.srcset || (srcsetParts.length > 0 ? srcsetParts.join(', ') : null);

        if (DEBUG.image) {
          console.log('[ImageHandler] Updating image:');
          console.log('  src:', srcUrl);
          console.log('  srcset:', finalSrcset);
        }

        cardImage.setAttribute('src', srcUrl);

        // Use existing srcset if available, otherwise use built one
        if (imageData.srcset) {
          cardImage.setAttribute('srcset', imageData.srcset);
        } else if (srcsetParts.length > 0) {
          cardImage.setAttribute('srcset', srcsetParts.join(', '));
        }

        if (imageData.alt) {
          cardImage.setAttribute('alt', imageData.alt);
        }

        if (DEBUG.image) {
          console.log('[ImageHandler] Image updated successfully');
          console.log('[ImageHandler] New image src:', cardImage.getAttribute('src'));
          console.log('[ImageHandler] New image srcset:', cardImage.getAttribute('srcset'));
          console.groupEnd();
        }
      }

      findVariantByColor(colorValue) {
        if (!this.variants.length || !colorValue || !this.config.colorPosition) return null;

        const normalizedColor = String(colorValue).trim().toLowerCase();

        return this.variants.find((variant) => {
          const variantColor = String(this.getVariantOptionValue(variant, this.config.colorPosition))
            .trim()
            .toLowerCase();
          return variantColor === normalizedColor;
        });
      }

      getVariantOptionValue(variant, position) {
        if (position === 1) return variant.option1 || '';
        if (position === 2) return variant.option2 || '';
        if (position === 3) return variant.option3 || '';
        return '';
      }

      getVariantImage(variant) {
        if (!variant) return null;

        // Method 1: Check variant.featured_media (primary method)
        if (variant.featured_media && variant.featured_media.id && this.product && this.product.media) {
          const featuredMedia = this.product.media.find((media) => media.id === variant.featured_media.id);
          if (featuredMedia && featuredMedia.preview_image) {
            const previewImage = featuredMedia.preview_image;
            let imageSrc = '';
            if (typeof previewImage === 'string') {
              imageSrc = previewImage;
            } else if (previewImage.src) {
              imageSrc = previewImage.src;
            } else if (previewImage.url) {
              imageSrc = previewImage.url;
            }

            if (imageSrc) {
              return {
                src: imageSrc,
                srcset: previewImage.srcset || null,
                width: previewImage.width || null,
                height: previewImage.height || null,
                alt: featuredMedia.alt || variant.title || '',
              };
            }
          }
        }

        // Method 2: Check variant.featured_image (fallback)
        if (variant.featured_image) {
          const imageUrl =
            typeof variant.featured_image === 'string'
              ? variant.featured_image
              : variant.featured_image.src || variant.featured_image;

          if (imageUrl) {
            return {
              src: imageUrl,
              width: variant.featured_image_width || null,
              height: variant.featured_image_height || null,
              alt: variant.title || '',
            };
          }
        }

        // Method 3: Find by color in media alt text
        if (this.product && this.product.media && this.config.colorPosition) {
          const colorValue = this.getVariantOptionValue(variant, this.config.colorPosition);
          const colorLower = String(colorValue).toLowerCase();

          const matchingMedia = this.product.media.find((media) => {
            if (media.media_type !== 'image') return false;
            if (media.alt && media.alt.toLowerCase().includes(colorLower)) return true;
            return false;
          });

          if (matchingMedia && matchingMedia.preview_image) {
            const previewImage = matchingMedia.preview_image;
            let imageSrc = '';
            if (typeof previewImage === 'string') {
              imageSrc = previewImage;
            } else if (previewImage.src) {
              imageSrc = previewImage.src;
            } else if (previewImage.url) {
              imageSrc = previewImage.url;
            }

            if (imageSrc) {
              return {
                src: imageSrc,
                srcset: previewImage.srcset || null,
                width: previewImage.width || null,
                height: previewImage.height || null,
                alt: matchingMedia.alt || variant.title || '',
              };
            }
          }

          // Fallback: first product image
          const firstImage = this.product.media.find((media) => media.media_type === 'image');
          if (firstImage && firstImage.preview_image) {
            const previewImage = firstImage.preview_image;
            let imageSrc = '';
            if (typeof previewImage === 'string') {
              imageSrc = previewImage;
            } else if (previewImage.src) {
              imageSrc = previewImage.src;
            } else if (previewImage.url) {
              imageSrc = previewImage.url;
            }

            if (imageSrc) {
              return {
                src: imageSrc,
                srcset: previewImage.srcset || null,
                width: previewImage.width || null,
                height: previewImage.height || null,
                alt: firstImage.alt || variant.title || '',
              };
            }
          }
        }

        return null;
      }

      buildImageSrcset(imageSrc, imageWidth) {
        if (!imageSrc) return '';
        const widths = [165, 360, 533, 720, 940, 1066];
        const baseUrl = imageSrc.split('?')[0];
        const srcsetParts = [];

        widths.forEach((width) => {
          if (!imageWidth || imageWidth >= width) {
            srcsetParts.push(`${baseUrl}?width=${width} ${width}w`);
          }
        });

        return srcsetParts.join(', ');
      }

      restoreDefaultImage() {
        if (!this.defaultImage) return;

        const cardImage = this.card.querySelector('.card__media img');
        if (!cardImage) return;

        if (this.defaultImage.srcset) {
          cardImage.setAttribute('srcset', this.defaultImage.srcset);
        }
        if (this.defaultImage.src) {
          cardImage.setAttribute('src', this.defaultImage.src);
        }
        if (this.defaultImage.alt) {
          cardImage.setAttribute('alt', this.defaultImage.alt);
        }
        if (this.defaultImage.width) {
          cardImage.setAttribute('width', this.defaultImage.width);
        }
        if (this.defaultImage.height) {
          cardImage.setAttribute('height', this.defaultImage.height);
        }
      }

      updateVariants(variants) {
        this.variants = variants || [];
      }

      updateProduct(product) {
        this.product = product;
      }
    }

    return ImageHandler;
  })();
}
