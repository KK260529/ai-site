(function () {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const clearBtn = document.getElementById("clearFilters");
  const grid = document.getElementById("articleGrid");
  const cards = grid ? [...grid.querySelectorAll(".card")] : [];

  function filter() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const cat = categoryFilter?.value || "";
    let visible = 0;

    cards.forEach((card) => {
      const title = card.querySelector(".card__title")?.textContent.toLowerCase() || "";
      const summary = card.querySelector(".card__summary")?.textContent.toLowerCase() || "";
      const category = card.dataset.category || "";
      const tags = (card.dataset.tags || "").toLowerCase();

      const matchQ = !q || title.includes(q) || summary.includes(q) || tags.includes(q);
      const matchCat = !cat || category === cat;

      const show = matchQ && matchCat;
      card.hidden = !show;
      if (show) visible += 1;
    });

    const countEl = document.getElementById("articleCount");
    if (countEl) countEl.textContent = String(visible);
  }

  searchInput?.addEventListener("input", filter);
  categoryFilter?.addEventListener("change", filter);
  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "";
    filter();
  });

  const params = new URLSearchParams(location.search);
  const tag = params.get("tag");
  if (tag && searchInput) {
    searchInput.value = tag;
    filter();
  }
})();
