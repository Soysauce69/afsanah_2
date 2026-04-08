

const API_URL = "https://fakestoreapi.com/products";




const state = {
  allProducts: [],        // master list fetched from API — never mutated
  favorites:   new Set(), // Set of product IDs the user has favourited
  filters: {
    search:   "",         // live search query
    category: "All",      // dropdown: category
    sort:     "default"   // dropdown: sort order
  }
};


// ──────────────────────────────────────────────────────────────
//  FETCH — Fake Store API
// ──────────────────────────────────────────────────────────────

/**
 * fetchProducts()
 * ---------------
 * 1. Shows shimmer skeleton while loading
 * 2. Calls Fake Store API with fetch()
 * 3. Normalises the response shape with .map()
 * 4. Populates category dropdown, then renders
 * 5. Shows a friendly error banner on failure
 */
async function fetchProducts() {
  showLoading();
  hideError();

  try {
    const response = await fetch(API_URL);

    // Throw for HTTP-level errors (4xx, 5xx)
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status} — ${response.statusText}`);
    }

    const data = await response.json();

    // Normalise API fields → our consistent shape using .map()
    // Fake Store fields: id, title, price, category, image, description, rating:{rate,count}
    state.allProducts = data.map(item => ({
      id:          item.id,
      name:        item.title,
      price:       Number(item.price),
      category:    item.category,
      image:       item.image,
      description: item.description,
      rating:      item.rating   // { rate: Number, count: Number }
    }));

    populateCategoryFilter(); // build <select> options from live data
    applyAndRender();         // run the full pipeline and draw cards

  } catch (err) {
    showError(err.message);
  }
}


// ──────────────────────────────────────────────────────────────
//  PIPELINE  search → filter → sort → render
//  Every step uses only HOFs. Zero for/while loops.
// ──────────────────────────────────────────────────────────────

/**
 * applyAndRender()
 * ----------------
 * Chains the three transformation steps and renders the result.
 * Called every time any control changes.
 */
function applyAndRender() {
  const result = sortProducts(
    filterProducts(
      searchProducts(state.allProducts)
    )
  );
  renderProducts(result);
  updateResultCount(result.length);
}

// ── Step 1: SEARCH ───────────────────────────────────────────

/**
 * searchProducts(products)
 * ------------------------
 * Filters by search query across name AND category.
 * Case-insensitive. Uses .filter() — no loops.
 */
function searchProducts(products) {
  const query = state.filters.search.trim().toLowerCase();
  if (!query) return products;

  return products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query)
  );
}

// ── Step 2: FILTER ───────────────────────────────────────────

/**
 * filterProducts(products)
 * ------------------------
 * Filters by selected category.
 * "All" → skip, return everything. Uses .filter() — no loops.
 */
function filterProducts(products) {
  if (state.filters.category === "All") return products;

  return products.filter(p => p.category === state.filters.category);
}

// ── Step 3: SORT ─────────────────────────────────────────────

/**
 * sortProducts(products)
 * ----------------------
 * Sorts by name (A-Z, Z-A) or price (low-high, high-low).
 * .slice() makes a copy first so state.allProducts is never mutated.
 * Uses .sort() — no loops.
 */
function sortProducts(products) {
  const copy = products.slice(); // shallow copy — never mutate the master list

  const comparators = {
    "name-asc":   (a, b) => a.name.localeCompare(b.name),
    "name-desc":  (a, b) => b.name.localeCompare(a.name),
    "price-asc":  (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "default":    ()     => 0
  };

  const fn = comparators[state.filters.sort] || comparators["default"];
  return copy.sort(fn);
}


// ──────────────────────────────────────────────────────────────
//  RENDER — builds the DOM from data using .map()
// ──────────────────────────────────────────────────────────────

/**
 * renderProducts(products)
 * ------------------------
 * Clears #product-grid and rebuilds it.
 * Uses .map() to build an HTML string array → joined → set as innerHTML.
 * Then uses .map() again to attach event listeners.
 * Handles empty-state gracefully.
 */
function renderProducts(products) {
  const grid = document.getElementById("product-grid");

  // ── Empty state ──────────────────────────────────────────
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try a different search term or reset your filters.</p>
        <button class="btn-reset" onclick="resetAll()">↺ Clear all filters</button>
      </div>`;
    return;
  }

  // ── Build all cards with .map() ──────────────────────────
  grid.innerHTML = products.map(p => buildCard(p)).join("");

  // ── Attach event listeners with .map() (no for loop) ────
  products.map(p => {
    const card    = document.getElementById(`card-${p.id}`);
    const favBtn  = document.getElementById(`fav-${p.id}`);
    const moreBtn = document.getElementById(`more-${p.id}`);

    // Click anywhere on card (not on a button) → open modal
    if (card) {
      card.addEventListener("click", e => {
        if (!e.target.closest("button")) openModal(p.id);
      });
      // Keyboard: Enter key also opens modal
      card.addEventListener("keydown", e => {
        if (e.key === "Enter") openModal(p.id);
      });
    }

    // Heart button → toggle favourite
    if (favBtn) {
      favBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleFavorite(p.id);
      });
    }

    // "View Details" button → open modal
    if (moreBtn) {
      moreBtn.addEventListener("click", e => {
        e.stopPropagation();
        openModal(p.id);
      });
    }
  });
}

/**
 * buildCard(p)
 * ------------
 * Pure function: takes a product object, returns an HTML string.
 * Called inside .map() — no loops needed.
 */
function buildCard(p) {
  const isFav       = state.favorites.has(p.id);
  const priceStr    = `$${p.price.toFixed(2)}`;
  const stars       = p.rating ? renderStars(p.rating.rate) : "";
  const ratingCount = p.rating ? `(${p.rating.count})` : "";
  const catLabel    = capitalise(p.category);

  return `
    <article class="product-card" id="card-${p.id}" tabindex="0" role="listitem" aria-label="${p.name}">

      <div class="card-img-wrap">
        <img
          src="${p.image}"
          alt="${p.name}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
        />
        <button
          class="btn-fav ${isFav ? "active" : ""}"
          id="fav-${p.id}"
          aria-label="${isFav ? "Remove from favourites" : "Add to favourites"}"
        >${isFav ? "♥" : "♡"}</button>
      </div>

      <div class="card-body">
        <div class="card-meta">
          <span class="card-category">${catLabel}</span>
          ${stars ? `<span class="card-stars">${stars} <small>${ratingCount}</small></span>` : ""}
        </div>
        <h3 class="card-name">${p.name}</h3>
        <div class="card-footer">
          <span class="card-price">${priceStr}</span>
          <button class="btn-more" id="more-${p.id}">View Details</button>
        </div>
      </div>

    </article>`;
}


// ──────────────────────────────────────────────────────────────
//  MODAL — product detail view
// ──────────────────────────────────────────────────────────────

/**
 * openModal(id)
 * -------------
 * Finds the product using .find() (required HOF).
 * Populates all modal fields, then shows the modal.
 */
function openModal(id) {
  // .find() — locates the one matching product, no loop needed
  const p = state.allProducts.find(prod => prod.id === id);
  if (!p) return;

  const isFav = state.favorites.has(p.id);

  // Populate image
  document.getElementById("modal-img").src = p.image;
  document.getElementById("modal-img").alt = p.name;

  // Badge = category label
  const badge = document.getElementById("modal-badge");
  badge.textContent    = capitalise(p.category);
  badge.style.display  = "inline-flex";

  // Text fields
  document.getElementById("modal-name").textContent     = p.name;
  document.getElementById("modal-price").textContent    = `$${p.price.toFixed(2)}`;
  document.getElementById("modal-category").textContent = capitalise(p.category);
  document.getElementById("modal-desc").textContent     = p.description || "No description available.";

  // Rating
  const ratingEl = document.getElementById("modal-rating");
  ratingEl.textContent = p.rating
    ? `${renderStars(p.rating.rate)} ${p.rating.rate}/5 · ${p.rating.count} reviews`
    : "";

  // Favourite button
  const favBtn = document.getElementById("modal-fav");
  favBtn.textContent = isFav ? "♥ Favourited" : "♡ Favourite";
  favBtn.classList.toggle("active", isFav);
  favBtn.onclick = () => toggleFavorite(p.id, true);

  // Show modal, lock background scroll
  document.getElementById("product-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

/**
 * closeModal()
 * ------------
 * Hides the modal and restores scroll.
 * Called by: ✕ button, backdrop click, Escape key, secondary close button.
 */
function closeModal() {
  document.getElementById("product-modal").classList.remove("open");
  document.body.style.overflow = "";
}


// ──────────────────────────────────────────────────────────────
//  FAVOURITES
// ──────────────────────────────────────────────────────────────

/**
 * toggleFavorite(id, fromModal)
 * -----------------------------
 * Adds or removes a product from the favorites Set.
 * Updates the card heart button and modal button in-place
 * — no need to re-render the whole grid.
 */
function toggleFavorite(id, fromModal = false) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }

  const isFav = state.favorites.has(id);

  // Update card button
  const cardBtn = document.getElementById(`fav-${id}`);
  if (cardBtn) {
    cardBtn.textContent = isFav ? "♥" : "♡";
    cardBtn.classList.toggle("active", isFav);
    cardBtn.setAttribute("aria-label", isFav ? "Remove from favourites" : "Add to favourites");
  }

  // Update modal button if this came from the modal
  if (fromModal) {
    const modalBtn = document.getElementById("modal-fav");
    if (modalBtn) {
      modalBtn.textContent = isFav ? "♥ Favourited" : "♡ Favourite";
      modalBtn.classList.toggle("active", isFav);
    }
  }

  updateFavCount();
}

/** Updates the ♥ counter in the nav pill */
function updateFavCount() {
  const el = document.getElementById("fav-count");
  if (el) el.textContent = state.favorites.size > 0 ? state.favorites.size : "";
}


// ──────────────────────────────────────────────────────────────
//  LOADING STATE — shimmer skeleton
// ──────────────────────────────────────────────────────────────

/**
 * showLoading()
 * -------------
 * Renders 8 skeleton cards while the API fetch is in flight.
 * Uses Array.from + .map() — no loops.
 */
function showLoading() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img shimmer"></div>
      <div class="skeleton-body">
        <div class="skeleton-line shimmer" style="width:42%"></div>
        <div class="skeleton-line shimmer" style="width:88%"></div>
        <div class="skeleton-line shimmer" style="width:65%"></div>
        <div class="skeleton-line shimmer" style="width:32%"></div>
      </div>
    </div>`).join("");
}


// ──────────────────────────────────────────────────────────────
//  ERROR STATE
// ──────────────────────────────────────────────────────────────

function showError(message) {
  const banner = document.getElementById("error-banner");
  const msgEl  = document.getElementById("error-message");
  const grid   = document.getElementById("product-grid");

  if (msgEl)  msgEl.textContent = `⚠️ Could not load products: ${message}`;
  if (banner) banner.style.display = "flex";

  grid.innerHTML = ""; // clear skeleton
}

function hideError() {
  const banner = document.getElementById("error-banner");
  if (banner) banner.style.display = "none";
}


// ──────────────────────────────────────────────────────────────
//  CATEGORY FILTER — built from live API data
// ──────────────────────────────────────────────────────────────

/**
 * populateCategoryFilter()
 * ------------------------
 * Builds <option> elements for the category <select>
 * from the actual categories in the fetched data.
 * Uses .map() on a de-duped array — no loops.
 */
function populateCategoryFilter() {
  const uniqueCategories = ["All", ...new Set(state.allProducts.map(p => p.category))];

  const select = document.getElementById("filter-category");
  select.innerHTML = uniqueCategories.map(c =>
    `<option value="${c}">${capitalise(c)}</option>`
  ).join("");
}


// ──────────────────────────────────────────────────────────────
//  RESULT COUNT
// ──────────────────────────────────────────────────────────────

function updateResultCount(count) {
  const el = document.getElementById("result-count");
  if (!el) return;
  el.textContent = count === 0
    ? "No products found"
    : `Showing ${count} ${count === 1 ? "product" : "products"}`;
}


// ──────────────────────────────────────────────────────────────
//  RESET ALL
// ──────────────────────────────────────────────────────────────

function resetAll() {
  state.filters.search   = "";
  state.filters.category = "All";
  state.filters.sort     = "default";

  document.getElementById("search-input").value    = "";
  document.getElementById("filter-category").value = "All";
  document.getElementById("sort-select").value     = "default";

  applyAndRender();
}


// ──────────────────────────────────────────────────────────────
//  UTILITIES
// ──────────────────────────────────────────────────────────────

/**
 * debounce(fn, delay)
 * -------------------
 * Delays calling fn until delay ms after the last call.
 * Used on the search input to avoid re-rendering on every keypress.
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * renderStars(rate)
 * -----------------
 * Converts a 0–5 rating into filled/empty star characters.
 * Uses Array.from + .map() — no loops.
 */
function renderStars(rate) {
  return Array.from({ length: 5 }).map((_, i) =>
    i < Math.round(rate) ? "★" : "☆"
  ).join("");
}

/**
 * capitalise(str)
 * ---------------
 * "men's clothing" → "Men's Clothing"
 * Uses .split + .map + .join — no loops.
 */
function capitalise(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}


// ──────────────────────────────────────────────────────────────
//  EVENT LISTENERS
// ──────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // Search — debounced so it doesn't fire on every keystroke
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(e => {
      state.filters.search = e.target.value;
      applyAndRender();
    }, 300));
  }

  // Category filter dropdown
  const catSelect = document.getElementById("filter-category");
  if (catSelect) {
    catSelect.addEventListener("change", e => {
      state.filters.category = e.target.value;
      applyAndRender();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", e => {
      state.filters.sort = e.target.value;
      applyAndRender();
    });
  }

  // Reset button
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetAll);

  // Modal: ✕ close button
  const modalClose = document.getElementById("modal-close");
  if (modalClose) modalClose.addEventListener("click", closeModal);

  // Modal: click outside the card (on the backdrop) to close
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target.id === "product-modal") closeModal();
    });
  }

  // Modal: Escape key to close
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // ── Kick off! ──────────────────────────────────────────────
  fetchProducts();
});
