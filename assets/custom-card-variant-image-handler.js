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
        // Store the first (main) image as default - both images typically have same initial state
        const cardMedia = this.card.querySelector('.card__media');
        const firstImage = cardMedia ? cardMedia.querySelector('img') : null;

        if (firstImage) {
          this.defaultImage = {
            srcset: firstImage.getAttribute('srcset') || '',
            src: firstImage.getAttribute('src') || '',
            alt: firstImage.getAttribute('alt') || '',
            width: firstImage.getAttribute('width') || '',
            height: firstImage.getAttribute('height') || '',
          };

          if (DEBUG.image) {
            console.log('[ImageHandler] Stored default image:', {
              src: this.defaultImage.src,
              srcset: this.defaultImage.srcset ? 'set' : 'not set',
            });
          }
        }
      }

      updateImage(colorValue, isHover) {
        // Guard: Check if card is still in DOM (prevents errors during cart updates)
        if (!this.card || !document.body.contains(this.card)) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] Card no longer in DOM, skipping image update');
          }
          return;
        }

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

        // Find all card images - Dawn uses two images for hover effect
        // First image: main/featured image (no loading="lazy")
        // Second image: hover/secondary image (has loading="lazy")
        const cardMedia = this.card.querySelector('.card__media');
        const images = cardMedia ? cardMedia.querySelectorAll('img') : [];

        if (images.length === 0) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] No card images found');
            console.groupEnd();
          }
          return;
        }

        // Update all images (main and hover) to use the variant image
        // This ensures both the main display and hover effect show the correct variant
        const imagesToUpdate = Array.from(images);

        if (DEBUG.image) {
          console.log(`[ImageHandler] Found ${imagesToUpdate.length} image(s) to update`);
          imagesToUpdate.forEach((img, index) => {
            console.log(`[ImageHandler] Image ${index + 1}:`, {
              src: img.getAttribute('src'),
              loading: img.getAttribute('loading'),
              isMain: index === 0,
            });
          });
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
          console.log('[ImageHandler] Updating images:');
          console.log('  src:', srcUrl);
          console.log('  srcset:', finalSrcset);
          console.log('  images to update:', imagesToUpdate.length);
        }

        // Update all images (main and hover) with the variant image
        // This ensures both the main display and hover effect show the correct variant
        imagesToUpdate.forEach((img, index) => {
          img.setAttribute('src', srcUrl);

          // Use existing srcset if available, otherwise use built one
          if (imageData.srcset) {
            img.setAttribute('srcset', imageData.srcset);
          } else if (srcsetParts.length > 0) {
            img.setAttribute('srcset', srcsetParts.join(', '));
          }

          if (imageData.alt) {
            img.setAttribute('alt', imageData.alt);
          }

          if (DEBUG.image) {
            console.log(`[ImageHandler] Updated image ${index + 1}:`, {
              src: img.getAttribute('src'),
              srcset: img.getAttribute('srcset') ? 'set' : 'not set',
            });
          }
        });

        if (DEBUG.image) {
          console.log('[ImageHandler] All images updated successfully');
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
        // Guard: Check if card is still in DOM (prevents errors during cart updates)
        if (!this.card || !document.body.contains(this.card)) {
          if (DEBUG.image) {
            console.warn('[ImageHandler] Card no longer in DOM, skipping restore');
          }
          return;
        }

        if (!this.defaultImage) return;

        const cardMedia = this.card.querySelector('.card__media');
        const images = cardMedia ? cardMedia.querySelectorAll('img') : [];

        if (images.length === 0) return;

        // Restore all images (main and hover) to default
        Array.from(images).forEach((img) => {
          if (this.defaultImage.srcset) {
            img.setAttribute('srcset', this.defaultImage.srcset);
          }
          if (this.defaultImage.src) {
            img.setAttribute('src', this.defaultImage.src);
          }
          if (this.defaultImage.alt) {
            img.setAttribute('alt', this.defaultImage.alt);
          }
          if (this.defaultImage.width) {
            img.setAttribute('width', this.defaultImage.width);
          }
          if (this.defaultImage.height) {
            img.setAttribute('height', this.defaultImage.height);
          }
        });

        if (DEBUG.image) {
          console.log('[ImageHandler] Restored default image for all images');
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
