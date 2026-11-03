# Money Manager

Money Manager is a personal-expense app with a browser dashboard and the project's original C++ console and Qt versions. All current app entries and totals use Indian rupees (INR).

## Run the browser app

Requirements: Node.js 18 or newer. No npm packages are required.

From the workspace folder, run:

```powershell
node .\ExpenseTrackerProject-master\web\server.js
```

Open [http://localhost:8080](http://localhost:8080). In VS Code, press **F5** and choose **Launch Chrome against localhost**; the launch configuration starts the server automatically.

The dashboard reads and writes `ExpenseTrackerProject-master\src\source-file.csv`. It supports adding and deleting individual expenses, resetting all expenses after confirmation, searching and filtering transactions, and viewing INR totals, monthly spending, and estimated categories. The category labels are inferred from expense descriptions.

The web server binds to `127.0.0.1`; it is intended for local use, not public hosting.

## INR data conversion

The original CSV files were denominated in Philippine pesos (`Php`). On **29 October 2026**, every monetary amount in the project's four saved CSV datasets was converted using the latest available reference rate of **1 PHP = INR 1.4923** from [Frankfurter](https://api.frankfurter.dev/v1/latest?base=PHP&symbols=INR). Each amount was rounded to the nearest paise, with half-paise amounts rounded up. For the credit-card dataset, the expense amount, cash payment, and signed credit balance were all converted.

This is a one-rate conversion, as requested, not historical FX accounting: the same rate was applied to expenses recorded in different years. Totals can vary slightly from converting a summed PHP balance because each source amount is rounded independently.

The original, unconverted CSVs are preserved in the workspace-level `backups` folder. The browser app and the console, Qt, and cash/credit source versions now use INR for new and existing entries.

## Project layout

- `web` — local Node.js server and browser dashboard.
- `currency-migration.json` — INR conversion details for the CSV datasets.
- `src` — base C++ console app and its CSV data.
- `inc` — base C++ headers and test sequences.
- `qtgui` — Qt Widgets app and its CSV data.
- `update` — cash/credit C++ app and its CSV data.
