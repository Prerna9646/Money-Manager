const categoryColors = {
  Dining: "#a6bf87",
  Shopping: "#d0b789",
  Transport: "#9bbabb",
  Bills: "#c5a99d",
  Travel: "#aaa6c7",
  Other: "#bdc5bb",
};
const state = {
  expenses: [],
  page: "overview",
  query: "",
  category: "all",
  showAll: false,
};

const elements = {
  average: document.querySelector("#average-expense"),
  backdrop: document.querySelector("#modal-backdrop"),
  body: document.querySelector("#transactions-body"),
  categoryFilter: document.querySelector("#category-filter"),
  categoryList: document.querySelector("#category-list"),
  categoryTotal: document.querySelector("#category-total"),
  chartBars: document.querySelector("#chart-bars"),
  date: document.querySelector("#expense-date"),
  description: document.querySelector("#expense-description"),
  emptyState: document.querySelector("#empty-state"),
  errorBanner: document.querySelector("#error-banner"),
  errorDismiss: document.querySelector("#error-dismiss"),
  errorMessage: document.querySelector("#error-message"),
  form: document.querySelector("#expense-form"),
  formError: document.querySelector("#form-error"),
  pageTitle: document.querySelector("#page-title"),
  tableCount: document.querySelector("#table-count"),
  tableFooterCopy: document.querySelector("#table-footer-copy"),
  toast: document.querySelector("#toast"),
  total: document.querySelector("#total-expenses"),
  transactionCaption: document.querySelector("#transaction-caption"),
  transactionCount: document.querySelector("#transaction-count"),
  transactionHeading: document.querySelector("#transactions-heading"),
  navCount: document.querySelector("#nav-count"),
  resetButton: document.querySelector("#reset-button"),
  search: document.querySelector("#search-input"),
  summary: document.querySelector(".summary-grid"),
  insights: document.querySelector(".insights-grid"),
  transactionsPanel: document.querySelector(".transactions-panel"),
  trendBadge: document.querySelector("#trend-badge"),
  trendTotal: document.querySelector("#trend-total"),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function amountInCents(amount) {
  return Math.round(amount * 100);
}

function sumInCurrency(expenses) {
  return expenses.reduce((sum, expense) => sum + amountInCents(expense.amount), 0) / 100;
}

function formatMoney(amount, compact = false) {
  if (compact && amount >= 1_000_000) {
    return `₹${(amount / 1_000_000).toFixed(1)}m`;
  }
  if (compact && amount >= 100_000) {
    return `₹${(amount / 1_000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toLocalDate(dateString) {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateString);
  if (!parts) {
    return null;
  }
  const date = new Date(Number(parts[3]), Number(parts[1]) - 1, Number(parts[2]));
  if (
    date.getFullYear() !== Number(parts[3]) ||
    date.getMonth() !== Number(parts[1]) - 1 ||
    date.getDate() !== Number(parts[2])
  ) {
    return null;
  }
  return date;
}

function categoryFor(description) {
  const value = ` ${String(description).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const matches = (pattern) => pattern.test(value);

  if (matches(/\b(?:lunch|dinner|breakfast|brunch|food|restaurant|cafe|coffee|tea|chocolate|snack|dining|grocery|groceries|supermarket|bakery|sushi|pata|adobo|mcdonalds?|greenwich|kyoto|conti|yoshinoya|romeos|foodpanda|swiggy|zomato|doordash)\b/)) {
    return "Dining";
  }
  if (matches(/\b(?:transport|transportation|commute|commuting|transit|bus|train|metro|subway|tram|ferry|taxi|cab|uber|lyft|grab|ride|fuel|gas|gasoline|petrol|diesel|parking|toll|bike|bicycle|motorcycle|scooter|car|vehicle|mechanic|garage|tyre|tire|fare|oil change|fan belt)\b/)) {
    return "Transport";
  }
  if (matches(/\b(?:rent|mortgage|water|electric|electricity|utility|utilities|bill|bills|internet|wifi|broadband|phone bill|mobile bill|phone plan|office 365|subscription|insurance)\b/)) {
    return "Bills";
  }
  if (matches(/\b(?:shop|shops|shopping|shoping|store|purchase|gift|jacket|hoodie|perfume|laptop|computer|phone|smartphone|shoe|shoes|bag|clothing|clothes|apparel|electronics|cosmetic|cosmetics|book|books|game|console|photography|wedding coat)\b/)) {
    return "Shopping";
  }
  if (matches(/\b(?:airfare|flight|airline|airport|hotel|travel|trip|vacation|holiday|resort|tour|booking|cruise|passport|visa|airbnb|japan)\b/)) {
    return "Travel";
  }
  return "Other";
}

function sortedExpenses() {
  return [...state.expenses].sort((first, second) => {
    const dateDifference = (toLocalDate(second.date)?.getTime() || 0) -
      (toLocalDate(first.date)?.getTime() || 0);
    return dateDifference || second.id - first.id;
  });
}

function formatDate(dateString) {
  const date = toLocalDate(dateString);
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
    : dateString;
}

function selectedExpenses() {
  const normalizedQuery = state.query.trim().toLowerCase();
  return sortedExpenses().filter((expense) => {
    const matchesCategory =
      state.category === "all" || categoryFor(expense.description) === state.category;
    const matchesQuery =
      !normalizedQuery ||
      `${expense.description} ${expense.date} ${categoryFor(expense.description)}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorBanner.hidden = false;
}

function dismissError() {
  elements.errorBanner.hidden = true;
}

async function fetchExpenses() {
  dismissError();
  const response = await fetch("/api/expenses", { headers: { Accept: "application/json" } });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Could not load expenses.");
  }
  if (!Array.isArray(result)) {
    throw new Error("The expense service returned an invalid response.");
  }
  state.expenses = result;
  render();
}

function renderSummary() {
  const total = sumInCurrency(state.expenses);
  const average = state.expenses.length ? Math.round(total * 100 / state.expenses.length) / 100 : 0;
  elements.total.textContent = formatMoney(total);
  elements.average.textContent = formatMoney(average);
  elements.transactionCount.textContent = state.expenses.length.toLocaleString("en-US");
  elements.navCount.textContent = state.expenses.length.toLocaleString("en-US");
  elements.transactionCaption.textContent =
    `${state.expenses.length.toLocaleString("en-IN")} expense${state.expenses.length === 1 ? "" : "s"}`;
  document.querySelector("#today-label").textContent =
    new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function renderTrend() {
  const months = new Map();
  for (const expense of state.expenses) {
    const date = toLocalDate(expense.date);
    if (!date) {
      continue;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) || 0) + amountInCents(expense.amount));
  }
  const recentMonths = [...months.entries()].sort(([first], [second]) => first.localeCompare(second)).slice(-6);
  const maximum = Math.max(...recentMonths.map(([, amount]) => amount), 0);
  const total = recentMonths.reduce((sum, [, amount]) => sum + amount, 0) / 100;
  elements.trendTotal.textContent = formatMoney(total, true);
  elements.trendBadge.textContent = recentMonths.length ? `Last ${recentMonths.length} active months` : "No recorded months";
  elements.chartBars.setAttribute(
    "aria-label",
    recentMonths.length
      ? `Monthly spending for ${recentMonths.length} most recent active months`
      : "No monthly expense data yet",
  );
  elements.chartBars.innerHTML = recentMonths.length
    ? recentMonths.map(([key, amount]) => {
      const [year, month] = key.split("-");
      const height = maximum > 0 ? Math.max(4, (amount / maximum) * 100) : 0;
      const label = new Intl.DateTimeFormat("en-US", { month: "short" })
        .format(new Date(Number(year), Number(month) - 1, 1));
      const accessibleAmount = escapeHtml(formatMoney(amount / 100));
      return `<div class="chart-column" title="${escapeHtml(label)} ${year}: ${accessibleAmount}"><div class="chart-bar-track"><div class="chart-bar" style="height:${height}%"></div></div><span class="chart-month">${escapeHtml(label)}</span></div>`;
    }).join("")
    : '<div class="category-empty">No monthly data.</div>';
}

function renderCategories() {
  const totals = new Map();
  for (const expense of state.expenses) {
    const category = categoryFor(expense.description);
    const previous = totals.get(category) || 0;
    totals.set(category, previous + amountInCents(expense.amount));
  }
  const categories = [...totals.entries()].sort((first, second) => second[1] - first[1]);
  const total = categories.reduce((sum, [, amount]) => sum + amount, 0) / 100;
  elements.categoryTotal.textContent = formatMoney(total, true);
  elements.categoryList.innerHTML = categories.length
    ? categories.slice(0, 4).map(([category, amount]) => {
      const percentage = total ? (amount / 100 / total) * 100 : 0;
      return `<div class="category-row"><div class="category-row-label"><span class="category-dot" style="background:${categoryColors[category]}"></span><span>${escapeHtml(category)}</span></div><span class="category-row-value">${Math.round(percentage)}%</span><div class="category-progress"><span style="width:${percentage}%"></span></div></div>`;
    }).join("")
    : '<div class="category-empty">No category data.</div>';

  const currentFilter = elements.categoryFilter.value;
  const options = ['<option value="all">All categories</option>'];
  for (const [category] of categories) {
    options.push(`<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
  }
  elements.categoryFilter.innerHTML = options.join("");
  elements.categoryFilter.value = categories.some(([category]) => category === currentFilter)
    ? currentFilter
    : "all";
}

function renderTable() {
  const expenses = selectedExpenses();
  const visible = state.showAll || state.page === "transactions" ? expenses : expenses.slice(0, 7);
  const count = expenses.length;
  elements.tableCount.textContent = count.toLocaleString("en-US");
  elements.transactionHeading.textContent =
    state.page === "transactions" ? "All transactions" : "Recent transactions";
  elements.body.innerHTML = visible.map((expense) => {
    const category = categoryFor(expense.description);
    const shortDescription = escapeHtml(expense.description);
    const mark = escapeHtml(expense.description.trim().charAt(0).toUpperCase() || "•");
    const id = escapeHtml(expense.id);
    return `<tr><td><div class="description-cell"><span class="transaction-mark" aria-hidden="true">${mark}</span><div style="min-width:0"><div class="description-copy" title="${shortDescription}">${shortDescription}</div><div class="description-note">INR · ${escapeHtml(expense.time)}</div></div></div></td><td><span class="category-pill">${escapeHtml(category)}</span></td><td class="date-cell">${escapeHtml(formatDate(expense.date))}</td><td class="amount-cell">${escapeHtml(formatMoney(expense.amount))}</td><td><button class="delete-button" type="button" data-delete-id="${id}" aria-label="Delete ${shortDescription}" title="Delete expense"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16m-10 4v6m4-6v6M6.5 7l1 13h9l1-13M9 7V4h6v3" /></svg></button></td></tr>`;
  }).join("");
  elements.emptyState.hidden = visible.length > 0;
  elements.body.hidden = visible.length === 0;
  elements.resetButton.hidden = state.expenses.length === 0;
  if (count === 0) {
    elements.tableFooterCopy.textContent = "No transactions to display";
  } else if (count > visible.length) {
    elements.tableFooterCopy.textContent = `Showing ${visible.length} of ${count} transactions`;
  } else {
    elements.tableFooterCopy.textContent = `Showing all ${count} transaction${count === 1 ? "" : "s"}`;
  }
  const viewAllButton = document.querySelector("#view-all-button");
  viewAllButton.hidden = count <= 7 && state.page !== "transactions";
  viewAllButton.innerHTML =
    state.page === "transactions" ? 'Overview <span aria-hidden="true">→</span>' : 'View all <span aria-hidden="true">→</span>';
}

function renderPage() {
  const isTransactions = state.page === "transactions";
  elements.summary.hidden = isTransactions;
  elements.insights.hidden = isTransactions;
  elements.transactionsPanel.setAttribute(
    "aria-label",
    isTransactions ? "All transactions" : "Recent transactions",
  );
  document.querySelectorAll(".nav-link").forEach((button) => {
    const active = button.dataset.page === state.page;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  elements.pageTitle.textContent = isTransactions ? "Transactions" : "Overview";
  document.querySelector("#view-all-button").hidden =
    isTransactions || selectedExpenses().length <= 7;
}

function render() {
  renderSummary();
  renderTrend();
  renderCategories();
  renderPage();
  renderTable();
}

function openModal() {
  elements.form.reset();
  const today = new Date();
  elements.date.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  elements.formError.hidden = true;
  elements.backdrop.hidden = false;
  elements.description.focus();
}

function closeModal() {
  elements.backdrop.hidden = true;
}

let toastTimeout;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

async function saveExpense(event) {
  event.preventDefault();
  elements.formError.hidden = true;
  const submitButton = document.querySelector("#save-button");
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        date: elements.date.value,
        amount: elements.form.elements.amount.value,
        description: elements.description.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not save that expense.");
    }
    state.expenses.push(result);
    state.query = "";
    state.category = "all";
    state.showAll = false;
    state.page = "overview";
    elements.search.value = "";
    closeModal();
    render();
    showToast("Expense saved to your tracker.");
  } catch (error) {
    elements.formError.textContent = error.message || "Could not save that expense.";
    elements.formError.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense || !window.confirm(`Delete "${expense.description}"?`)) {
    return;
  }
  try {
    const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not delete that expense.");
    }
    await fetchExpenses();
    showToast("Expense removed from your tracker.");
  } catch (error) {
    showError(error.message || "Could not delete that expense.");
  }
}

async function resetExpenses() {
  const count = state.expenses.length;
  if (!count || !window.confirm(`Delete all ${count} expenses? This cannot be undone.`)) {
    return;
  }
  try {
    const response = await fetch("/api/expenses", {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not reset expenses.");
    }
    if (!Number.isSafeInteger(result.deletedCount) || result.deletedCount < 0) {
      throw new Error("The expense service returned an invalid reset response.");
    }
    state.expenses = [];
    state.query = "";
    state.category = "all";
    state.showAll = false;
    state.page = "overview";
    elements.search.value = "";
    render();
    showToast(`Reset complete. ${result.deletedCount} expense${result.deletedCount === 1 ? "" : "s"} deleted.`);
  } catch (error) {
    showError(error.message || "Could not reset expenses.");
  }
}

function changePage(page) {
  state.page = page;
  state.showAll = page === "transactions";
  render();
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => changePage(button.dataset.page));
});
document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", openModal);
});
document.querySelector("#modal-close").addEventListener("click", closeModal);
document.querySelector("#cancel-button").addEventListener("click", closeModal);
elements.backdrop.addEventListener("click", (event) => {
  if (event.target === elements.backdrop) {
    closeModal();
  }
});
elements.form.addEventListener("submit", saveExpense);
elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  state.showAll = true;
  renderTable();
});
elements.categoryFilter.addEventListener("change", () => {
  state.category = elements.categoryFilter.value;
  state.showAll = true;
  renderTable();
});
elements.body.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (button) {
    deleteExpense(Number(button.dataset.deleteId));
  }
});
elements.resetButton.addEventListener("click", resetExpenses);
document.querySelector("#view-all-button").addEventListener("click", () => {
  changePage(state.page === "transactions" ? "overview" : "transactions");
});
document.querySelector("#refresh-button").addEventListener("click", async () => {
  try {
    await fetchExpenses();
    showToast("Your expenses are up to date.");
  } catch (error) {
    showError(error.message || "Could not refresh expenses.");
  }
});
elements.errorDismiss.addEventListener("click", dismissError);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.backdrop.hidden) {
    closeModal();
  }
});

fetchExpenses().catch((error) => {
  elements.body.hidden = true;
  elements.emptyState.hidden = true;
  showError(error.message || "Could not load your expense data.");
});
