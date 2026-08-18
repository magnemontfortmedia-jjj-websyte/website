// ============================================
// MAGNE MONTFORT — Snipcart Integration Layer
// Replaces the old custom cart system with Snipcart SDK
// ============================================

const MagneCart = (() => {

  // ---------- Product Catalog ----------
  // Kept for product page rendering (sizes, colors, images, descriptions).
  // Prices are validated server-side by Snipcart's crawler.
  const PRODUCTS = {
    bomber: {
      id: 'bomber',
      name: 'Shearling Bomber Jacket',
      price: 500,
      category: 'Outerwear',
      description: 'A commanding presence in premium shearling leather. The Magne Montfort Bomber features a plush wool collar, antique brass hardware, and our signature fleur-de-lis embroidery — a piece built for those who lead.',
      details: [
        'Premium shearling leather exterior',
        'Natural wool shearling lining and collar',
        'Antique brass YKK zipper and snap buttons',
        'Embroidered fleur-de-lis chest detail',
        'Adjustable belt buckle hem',
        'Two front welt pockets',
        'Made in Europe'
      ],
      images: [
        'assets/images/bomber.png'
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    cable_knit: {
      id: 'cable_knit',
      name: 'Cable Knit Sweater',
      price: 300,
      category: 'Knitwear',
      description: 'The cornerstone of the Magne Montfort collection. Each sweater is crafted from the finest Merino wool, featuring our signature cable pattern inspired by mediaeval heraldic motifs — a quiet hallmark of refined taste.',
      details: [
        '100% extra-fine Merino wool',
        'Signature cable knit pattern',
        'Embroidered fleur-de-lis chest emblem',
        'Ribbed crew neckline, cuffs and hem',
        'Regular fit',
        'Hand-finished detailing',
        'Made in Europe'
      ],
      images: [
        'assets/images/cable_knit.png'
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    trousers: {
      id: 'trousers',
      name: 'Tailored Trousers',
      price: 200,
      category: 'Trousers',
      description: 'Impeccably tailored from heavyweight wool-blend cloth. Featuring double forward pleats, side adjusters with our engraved buckles, and a clean tapered silhouette — the foundation of every considered wardrobe.',
      details: [
        'Heavyweight wool-blend fabric',
        'Double forward pleats',
        'Side adjuster buckles with fleur-de-lis engraving',
        'Tapered leg with turn-up hem',
        'Concealed hook and bar closure',
        'Branded woven label',
        'Made in Europe'
      ],
      colors: [
        { name: 'Navy', id: 'navy', image: 'assets/images/trousers_navy.png' },
        { name: 'Brown', id: 'brown', image: 'assets/images/trousers_brown.png' }
      ],
      images: [
        'assets/images/trousers_navy.png'
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    }
  };

  // ---------- Snipcart Cart Helpers ----------

  /**
   * Add an item to the Snipcart cart via the SDK API.
   * Falls back to programmatic button click if SDK isn't ready.
   */
  function addToCart(productId, size, qty = 1, color = null) {
    const product = PRODUCTS[productId];
    if (!product) return;

    // Determine image — use color variant image if applicable
    let image = product.images[0];
    if (color && product.colors) {
      const colorVariant = product.colors.find(c => c.id === color);
      if (colorVariant) image = colorVariant.image;
    }

    // Build a unique item ID that includes size + color so variants stack separately
    const uniqueId = color
      ? `${productId}-${size}-${color}`
      : `${productId}-${size}`;

    const colorLabel = color
      ? ` — ${color.charAt(0).toUpperCase() + color.slice(1)}`
      : '';

    // Build custom fields array
    const customFields = [
      { name: 'Size', options: product.sizes.join('|'), value: size }
    ];

    if (color && product.colors) {
      const colorOptions = product.colors.map(c => c.name).join('|');
      const colorName = color.charAt(0).toUpperCase() + color.slice(1);
      customFields.push({ name: 'Colour', options: colorOptions, value: colorName });
    }

    // Use Snipcart's JS SDK to add the item
    if (window.Snipcart) {
      window.Snipcart.api.cart.items.add({
        id: uniqueId,
        name: product.name,
        price: product.price,
        url: window.location.href.split('#')[0],
        description: `Size: ${size}${colorLabel}`,
        image: image.startsWith('http') ? image : `${window.location.origin}${window.location.pathname.replace(/\\/[^/]*$/, '')}/${image}`,
        quantity: qty,
        customFields: customFields
      }).catch(err => {
        console.error('Snipcart add to cart error:', err);
      });
    }
  }

  /**
   * Open the Snipcart cart drawer
   */
  function openDrawer() {
    if (window.Snipcart) {
      window.Snipcart.api.theme.cart.open();
    }
  }

  /**
   * Close the Snipcart cart drawer
   */
  function closeDrawer() {
    if (window.Snipcart) {
      window.Snipcart.api.theme.cart.close();
    }
  }

  /**
   * Get cart item count from Snipcart
   */
  function getCartCount() {
    if (window.Snipcart) {
      return window.Snipcart.store.getState().cart.items.count || 0;
    }
    return 0;
  }

  /**
   * Get cart total from Snipcart
   */
  function getCartTotal() {
    if (window.Snipcart) {
      return window.Snipcart.store.getState().cart.total || 0;
    }
    return 0;
  }

  /**
   * Clear all items from cart
   */
  function clearCart() {
    if (window.Snipcart) {
      const items = window.Snipcart.store.getState().cart.items.items;
      if (items) {
        items.forEach(item => {
          window.Snipcart.api.cart.items.remove(item.uniqueId);
        });
      }
    }
  }

  /**
   * Update the custom cart badge (nav bag icon) from Snipcart state
   */
  function updateBadge() {
    const count = getCartCount();
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.add('cart-badge--visible');
      } else {
        badge.classList.remove('cart-badge--visible');
        badge.textContent = '';
      }
    });
  }

  // ---------- Init ----------
  function init() {
    // Wire up bag icon to open Snipcart cart
    const bagBtn = document.getElementById('nav-bag');
    if (bagBtn) {
      bagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    }

    // Listen for Snipcart ready event to sync badge
    document.addEventListener('snipcart.ready', () => {
      updateBadge();

      // Subscribe to store changes for real-time badge updates
      window.Snipcart.store.subscribe(() => {
        updateBadge();
      });
    });
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    PRODUCTS,
    addToCart,
    openDrawer,
    closeDrawer,
    getCartCount,
    getCartTotal,
    clearCart,
    updateBadge
  };
})();
