// ============================================
// MAGNE MONTFORT — Cart System
// localStorage-powered shopping cart
// ============================================

const MagneCart = (() => {
  const STORAGE_KEY = 'magne_montfort_cart';

  // ---------- Product Catalog ----------
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

  // ---------- Cart Data ----------
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
    renderDrawer();
  }

  function addToCart(productId, size, qty = 1, color = null) {
    const cart = getCart();
    const existing = cart.find(
      item => item.productId === productId && item.size === size && item.color === color
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, size, qty, color });
    }

    saveCart(cart);
    openDrawer();
  }

  function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }

  function updateQuantity(index, newQty) {
    const cart = getCart();
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].qty = newQty;
    }
    saveCart(cart);
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function getCartTotal() {
    return getCart().reduce((sum, item) => {
      const product = PRODUCTS[item.productId];
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateBadge();
    renderDrawer();
  }

  // ---------- UI: Badge ----------
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

  // ---------- UI: Drawer ----------
  function openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
      drawer.classList.add('cart-drawer--open');
      overlay.classList.add('cart-overlay--visible');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
      drawer.classList.remove('cart-drawer--open');
      overlay.classList.remove('cart-overlay--visible');
      document.body.style.overflow = '';
    }
  }

  function renderDrawer() {
    const container = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');

    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    container.innerHTML = cart.map((item, index) => {
      const product = PRODUCTS[item.productId];
      if (!product) return '';

      let image = product.images[0];
      // If this product has color variants, use the correct color image
      if (item.color && product.colors) {
        const colorVariant = product.colors.find(c => c.id === item.color);
        if (colorVariant) image = colorVariant.image;
      }

      const colorLabel = item.color ? ` — ${item.color.charAt(0).toUpperCase() + item.color.slice(1)}` : '';

      return `
        <div class="cart-item">
          <div class="cart-item__image">
            <img src="${image}" alt="${product.name}">
          </div>
          <div class="cart-item__info">
            <p class="cart-item__name">${product.name}</p>
            <p class="cart-item__meta">Size: ${item.size}${colorLabel}</p>
            <p class="cart-item__price">$${product.price}</p>
            <div class="cart-item__qty">
              <button class="cart-item__qty-btn" onclick="MagneCart.updateQuantity(${index}, ${item.qty - 1})">−</button>
              <span class="cart-item__qty-value">${item.qty}</span>
              <button class="cart-item__qty-btn" onclick="MagneCart.updateQuantity(${index}, ${item.qty + 1})">+</button>
            </div>
          </div>
          <button class="cart-item__remove" onclick="MagneCart.removeFromCart(${index})" aria-label="Remove item">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    if (subtotalEl) {
      subtotalEl.textContent = `$${getCartTotal().toLocaleString()}`;
    }
  }

  // ---------- Stripe Checkout ----------
  const SUPABASE_URL = 'https://qtnhluqbwfoejukhgkcq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmhsdXFid2ZvZWp1a2hna2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjA1NzEsImV4cCI6MjEwMDk5NjU3MX0.QjprXidz7rXnUfopuV2ujSzOBDQ4ZHj0s8QnJDxlMwE';

  const CHECKOUT_SESSION_KEY = 'magne_montfort_checkout_session';

  async function checkout() {
    const cart = getCart();
    if (cart.length === 0) return;

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.textContent = 'Processing...';
      checkoutBtn.disabled = true;
    }

    try {
      // Determine the base URL for redirect URLs
      const baseUrl = window.location.origin;
      const cartHash = JSON.stringify(cart);
      
      // Check for existing session in localStorage
      const existingSessionStr = localStorage.getItem(CHECKOUT_SESSION_KEY);
      let previousSessionId = null;
      
      if (existingSessionStr) {
        try {
          const existing = JSON.parse(existingSessionStr);
          // If cart hasn't changed and session hasn't expired (give a 5 min buffer to the 30 min max)
          if (existing.cartHash === cartHash && Date.now() < existing.expiresAt - 5 * 60000) {
            // Smart Re-use: Cart is identical, send them back to the exact same Stripe session
            window.location.href = existing.url;
            return;
          }
          // Cart changed, we need to explicitly expire the old session to free its stock
          previousSessionId = existing.sessionId;
        } catch (e) {
          // Ignore parse errors
        }
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          items: cart,
          success_url: `${baseUrl}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/index.html`,
          previous_session_id: previousSessionId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Save the new session to prevent cart hoarding on refresh
        localStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify({
          sessionId: data.sessionId,
          url: data.url,
          cartHash: cartHash,
          expiresAt: Date.now() + 30 * 60000 // 30 minutes
        }));
        
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.out_of_stock) {
        // Stock reservation failed — show friendly message
        alert(data.error);
        if (checkoutBtn) {
          checkoutBtn.textContent = 'Checkout';
          checkoutBtn.disabled = false;
        }
      } else {
        console.error('Checkout error:', data);
        alert('Something went wrong. Please try again.');
        if (checkoutBtn) {
          checkoutBtn.textContent = 'Checkout';
          checkoutBtn.disabled = false;
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
      if (checkoutBtn) {
        checkoutBtn.textContent = 'Checkout';
        checkoutBtn.disabled = false;
      }
    }
  }

  // ---------- Init ----------
  function init() {
    updateBadge();
    renderDrawer();

    // Wire up bag icon to open drawer
    const bagBtn = document.getElementById('nav-bag');
    if (bagBtn) {
      bagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    }

    // Wire up close button
    const closeBtn = document.getElementById('cartClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Wire up overlay click to close
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
      overlay.addEventListener('click', closeDrawer);
    }

    // Wire up checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', checkout);
    }
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
    getCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartCount,
    getCartTotal,
    clearCart,
    openDrawer,
    closeDrawer,
    updateBadge,
    renderDrawer,
    checkout
  };
})();

