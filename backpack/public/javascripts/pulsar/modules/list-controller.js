// Shared list controller for client-side search, filter, and pagination
// Usage:
//   import { initListController } from '/javascripts/pulsar/modules/list-controller.js'
//   initListController({ ...options })

function qs(target) {
  if (!target) return null;
  if (typeof target === 'string') return document.querySelector(target);
  return target;
}

function qsaWithin(container, selector) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(selector));
}

function coerceNumber(n, fallback) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function buildPageList(currentPage, totalPages) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
  }
  return pages;
}

export function initListController(options) {
  if (!options) return;

  const container = options.container === document ? document : qs(options.container) || document;
  const rowSelector = options.rowSelector || '.row';
  const searchInput = qs(options.searchInput);
  const filterContainer = qs(options.filterContainer);
  const paginationContainer = qs(options.paginationContainer);
  const perPage = coerceNumber(options.perPage, 10);
  const onFilter = typeof options.onFilter === 'function' ? options.onFilter : () => true;
  const onSearch = typeof options.onSearch === 'function' ? options.onSearch : () => true;
  const onUpdateCounters = typeof options.onUpdateCounters === 'function' ? options.onUpdateCounters : null;

  // Collect rows up-front
  const allRows = qsaWithin(container, rowSelector);

  // If critical pieces are missing, bail gracefully
  if (!allRows.length) return;

  let currentPage = 1;
  let currentFilter = 'all';
  let searchQuery = '';

  function getVisibleRows() {
    return allRows.filter((row) => onFilter(row, currentFilter) && onSearch(row, searchQuery));
  }

  function renderPagination(totalPages) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    prevLi.innerHTML = `<a class="page-link" href="#" tabindex="-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="15 6 9 12 15 18" /></svg>
      prev
    </a>`;
    if (currentPage > 1) {
      prevLi.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        currentPage--;
        render();
      });
    }
    paginationContainer.appendChild(prevLi);

    // Numbered + ellipsis
    const visiblePages = buildPageList(currentPage, totalPages);
    visiblePages.forEach((p) => {
      const li = document.createElement('li');
      if (p === '...') {
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link">…</span>';
      } else {
        li.className = 'page-item' + (p === currentPage ? ' active' : '');
        li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
        li.querySelector('a').addEventListener('click', (e) => {
          e.preventDefault();
          currentPage = p;
          render();
        });
      }
      paginationContainer.appendChild(li);
    });

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    nextLi.innerHTML = `<a class="page-link" href="#">
      next
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="9 6 15 12 9 18" /></svg>
    </a>`;
    if (currentPage < totalPages) {
      nextLi.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        currentPage++;
        render();
      });
    }
    paginationContainer.appendChild(nextLi);
  }

  function render() {
    const visibleRows = getVisibleRows();
    const total = allRows.length;
    const visible = visibleRows.length;
    const totalPages = Math.max(1, Math.ceil(visible / perPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * perPage;
    const endIdx = startIdx + perPage;
    const pageRows = visibleRows.slice(startIdx, endIdx);

    // Toggle visibility
    allRows.forEach((row) => (row.style.display = 'none'));
    pageRows.forEach((row) => (row.style.display = ''));

    // Counters
    if (onUpdateCounters) {
      onUpdateCounters({
        total,
        visible,
        pageStart: visible > 0 ? startIdx + 1 : 0,
        pageEnd: Math.min(endIdx, visible),
        currentPage,
        totalPages,
      });
    }

    // Pagination controls
    renderPagination(totalPages);
  }

  // Listeners
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches('button,[data-filter]')) {
        e.preventDefault();
        const btn = target.closest('[data-filter]');
        if (!btn) return;
        const nextFilter = btn.getAttribute('data-filter') || 'all';
        currentFilter = nextFilter;
        currentPage = 1;

        // Toggle active state within container
        filterContainer.querySelectorAll('[data-filter]').forEach((el) => {
          el.classList.remove('active');
        });
        btn.classList.add('active');
        render();
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value ? String(searchInput.value).trim() : '';
      currentPage = 1;
      render();
    });
  }

  // Initial render
  render();
}

export default { initListController };
