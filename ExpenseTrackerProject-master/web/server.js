const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.env.PORT || 8080);
const currency = "INR";
const csvPath =
  process.env.EXPENSE_CSV_PATH ||
  path.join(
    __dirname,
    "..",
    "src",
    "source-file.csv",
  );
const publicFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);
const maximumRequestSize = 16 * 1024;
let updateQueue = Promise.resolve();

function parseCsvRow(line) {
  const fields = [];
  let start = 0;

  for (let index = 0; index < 5; index += 1) {
    const comma = line.indexOf(",", start);
    if (comma === -1) {
      return null;
    }
    fields.push(line.slice(start, comma));
    start = comma + 1;
  }

  fields.push(line.slice(start));
  const [date, time, weekday, rowCurrency, rawAmount, description] = fields;
  const amount = Number(rawAmount);
  if (
    !date ||
    !time ||
    !weekday ||
    !rowCurrency ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return { date, time, weekday, currency: rowCurrency, amount, description };
}

async function readExpenses() {
  const contents = await fs.readFile(csvPath, "utf8");
  return contents
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvRow)
    .map((expense, index) => {
      if (!expense || expense.currency !== currency) {
        throw new Error(`Invalid expense data on CSV line ${index + 1}.`);
      }
      return { id: index, ...expense };
    });
}

async function writeExpenses(expenses) {
  const lines = expenses.map((expense) =>
    [
      expense.date,
      expense.time,
      expense.weekday,
      expense.currency,
      expense.amount.toFixed(2),
      expense.description,
    ].join(","),
  );
  await fs.writeFile(csvPath, lines.length ? `${lines.join("\n")}\n` : "", "utf8");
}

function updateExpenses(change) {
  const operation = updateQueue.then(async () => {
    const expenses = await readExpenses();
    const result = change(expenses);
    await writeExpenses(expenses);
    return result;
  });
  updateQueue = operation.then(
    () => undefined,
    (error) => {
      console.error("Could not save expense data:", error);
    },
  );
  return operation;
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maximumRequestSize) {
        reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function createExpense(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Provide an expense object."), { status: 400 });
  }

  if (input.currency !== undefined && input.currency !== currency) {
    throw Object.assign(new Error("Money Manager only accepts INR."), {
      status: 400,
    });
  }

  const dateParts =
    typeof input.date === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date) : null;
  if (!dateParts) {
    throw Object.assign(new Error("Choose a valid expense date."), { status: 400 });
  }

  const year = Number(dateParts[1]);
  const month = Number(dateParts[2]);
  const day = Number(dateParts[3]);
  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw Object.assign(new Error("Choose a valid expense date."), { status: 400 });
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    throw Object.assign(new Error("Enter an amount greater than zero."), {
      status: 400,
    });
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (!description || description.length > 160 || /[\r\n]/.test(description)) {
    throw Object.assign(
      new Error("Enter a description of 1 to 160 characters on a single line."),
      { status: 400 },
    );
  }

  const now = new Date();
  return {
    date: `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
    weekday: parsedDate.toLocaleDateString("en-US", { weekday: "long" }),
    currency,
    amount: Math.round(amount * 100) / 100,
    description,
  };
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");

  if (request.method === "GET" && requestUrl.pathname === "/api/expenses") {
    sendJson(response, 200, await readExpenses());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/expenses") {
    const body = await readRequestBody(request);
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      throw Object.assign(new Error("Request body must be valid JSON."), {
        status: 400,
      });
    }
    const created = createExpense(input);
    const saved = await updateExpenses((expenses) => {
      expenses.push(created);
      return { id: expenses.length - 1, ...created };
    });
    sendJson(response, 201, saved);
    return;
  }

  if (request.method === "DELETE" && requestUrl.pathname === "/api/expenses") {
    const result = await updateExpenses((expenses) => {
      const deletedCount = expenses.length;
      expenses.length = 0;
      return { deletedCount };
    });
    sendJson(response, 200, result);
    return;
  }

  const deleteMatch = /^\/api\/expenses\/(\d+)$/.exec(requestUrl.pathname);
  if (request.method === "DELETE" && deleteMatch) {
    const id = Number(deleteMatch[1]);
    const deleted = await updateExpenses((expenses) => {
      if (!Number.isSafeInteger(id) || id >= expenses.length) {
        throw Object.assign(new Error("That expense no longer exists."), {
          status: 404,
        });
      }
      return expenses.splice(id, 1)[0];
    });
    sendJson(response, 200, deleted);
    return;
  }

  if (request.method === "GET" && publicFiles.has(requestUrl.pathname)) {
    const [fileName, contentType] = publicFiles.get(requestUrl.pathname);
    const contents = await fs.readFile(path.join(__dirname, fileName));
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    response.end(contents);
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Expense tracker request failed:", error);
    if (!response.headersSent) {
      sendJson(response, error.status || 500, {
        error: error.status ? error.message : "The request could not be completed.",
      });
    } else {
      response.destroy(error);
    }
  });
});

server.on("error", (error) => {
  console.error("Expense tracker server failed to start:", error);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Money Manager listening on http://localhost:${port}`);
});
