/**
 * Image Handler Module
 * Handles product image updates on hover and selection
 */

if (typeof CustomCardVariantImageHandler === 'undefined') {
  window.CustomCardVariantImageHandler = (function () {
    'use strict';

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
        if (!colorValue) {
          if (!isHover) this.restoreDefaultImage();
          return;
        }

        // Find card image - try multiple selectors
        let cardImage = this.card.querySelector('.card__media img');
        if (!cardImage) {
          cardImage = this.card.querySelector('.media img');
        }
        if (!cardImage) {
          cardImage = this.card.querySelector('img');
        }

        if (!cardImage) {
          console.warn('[ImageHandler] No card image found');
          return;
        }

        // Find variant with this color
        const variant = this.findVariantByColor(colorValue);
        if (!variant) {
          console.warn('[ImageHandler] No variant found for color:', colorValue);
          if (!isHover) this.restoreDefaultImage();
          return;
        }

        // Get variant image
        const imageData = this.getVariantImage(variant);
        if (!imageData || !imageData.src) {
          console.warn('[ImageHandler] No image data for variant:', variant.id);
          if (!isHover) this.restoreDefaultImage();
          return;
        }

        // Update image
        const baseUrl = imageData.src.split('?')[0];
        const srcUrl = `${baseUrl}?width=533`;
        cardImage.setAttribute('src', srcUrl);

        if (imageData.srcset) {
          cardImage.setAttribute('srcset', imageData.srcset);
        } else {
          const srcset = this.buildImageSrcset(baseUrl, imageData.width);
          if (srcset) {
            cardImage.setAttribute('srcset', srcset);
          }
        }

        if (imageData.alt) {
          cardImage.setAttribute('alt', imageData.alt);
        }

        console.log('[ImageHandler] Updated image for color:', colorValue, 'URL:', srcUrl);
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
