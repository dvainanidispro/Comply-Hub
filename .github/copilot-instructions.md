# copilot-instructions.md

## Γενικές Οδηγίες
Το όνομά μου είναι Δημήτρης. Να μου μιλάς στον ενικό και στα ελληνικά. Μην επεξεργάζεσαι πολλά αρχεία χωρίς έγκριση από μένα. Όταν θέλεις να επεξεργαστείς ένα αρχείο που δεν σου έχω επισημάνει και θέλεις να το επεξεργαστείς, ζήτα την έγκρισή μου πρώτα. Αν σου το έχω επισημάνει στο prompt, επεξεργάσου το χωρίς έγκριση. Μην ξεκινάς κάποιο server μετά από κάποια αλλαγή διότι ο server τρέχει τοπικά στον υπολογιστή μου - Ζήτησέ μου να ελέγξω εγώ αν κάτι δουλεύει ή όχι. Μην υλοποιήσεις κώδικα για testing.

## General Style
- The project uses `node.js/express` 
- Use `express` and `express-handlebars`. The handlebar helpers are defined in `config/handlebars.js`. 
- Use modern JavaScript (ES6+).
- Use `import`/`export` syntax. Do not use `require` or `module.exports`.
- Prefer concise and clean code, with clear structure over clever one-liners.
- Avoid over-engineering and unnecessary abstraction.

## Project Structure
- Entry point of the app is `server.js`, not `index.js`.
- Follow MVC architecture.
- Directory structure includes:
  - `public/` for static assets.
  - `views/` with subfolder `partials/` for handlebars partials (e.g., header, footer) and `layouts/` for main layout files.
  - `routes/` for route definitions. Prefer one router file per resource (e.g., users.js, roles.js). Prefer writing the logic in routes instead of controllers unless the logic is too complex.
  - `controllers/` for middleware logic. Write controller logic here only if it is too complex to be handled in routes.
  - `models/` for Sequelize models (one model per file). Use `models/models.js` to import all other models, define associations, `sync` using `{alter: JSON.parse(process.env.SYNCMODELS)}`, and export all as `Models`.
  - `config/` for configuration files (e.g., handlebars.js, database.js, security.js, mail.js, .env).
  - `services/` for scripts that run tasks, for example cron jobs, using `npm run <script>` commands. For a job, create a separate file (in `services` or `controllers`) with the function and import it into the script file. The script file should only execute the function. So, the function can be reused elsewhere if needed.
  - `storage/` for uploaded files if needed.
  - `public/storage/` for serving publicly available uploaded files if needed.


## Database
- Use `Sequelize` with `PostgreSQL`.
- Define each model in a separate file in the `models/` folder.
- Relationships and `sequelize.sync()` logic go into `models.js` not into each model file.
- Export a unified `Models` object from `models.js` (e.g., `Models.User`, `Models.Organization`).
- Τα indexes να δηλώνονται στο πεδίο `indexes` του model, όχι σε κάθε πεδίο ξεχωριστά. Μην ξεχνάς, όταν βάζεις σύνθετο index, να του δίνεις name, διότι σε κάθε `db.sync()` θα δημιουργείται επιπλέον duplicate index. 
- Υπάρχει ένα "model" `Cache` με πρόσβαση μέσω `await Cache.table.ModelName` (επιστρέφει array με records), `await Cache.map.ModelName` (επιστρέφει `Map<id, record>` για γρήγορη αναζήτηση), και `Cache.refresh(modelName)` για ανανέωση του cache. Αν το model έχει πεδίο `active`, τότε επιστρέφονται μόνο τα active records. Χρησιμοποίησε το για δεδομένα που δεν αλλάζουν συχνά και εμφανίζονται σε πολλές σελίδες (πχ Departments, Users) για παράδειγμα ως dropdown lists. Μην χρησιμοποιείς cache στις σελίδες διαχείρισης των ίδιων των δεδομένων (πχ /admin/departments, /admin/users/) ώστε σε αυτές να εμφανίζονται και τα inactive records. Το `Cache` είναι το μόνο που γίνεται απευθείας import από το `models/cache.js` και όχι μέσω του `models/models.js`.

## Coding Practices
- Use `async`/`await` for asynchronous operations.
- Use custom logger function defined in `utils/logger.js` for logging instead of `console.log`. Have in mind that this logger takes only one argument (so use template literals for multiple values).
- Use single quotes for strings that are critical to the code’s logic (e.g., object keys, SQL queries). Use double quotes for strings that can be changed freely without affecting functionality (e.g., UI text, log messages).
- Avoid checking for null/undefined before accessing object properties. Use optional chaining (`obj?.prop`) if possible.
- Avoid cheking for object types or existance before using them. Assume the data is correct unless there is a specific reason to validate it. For example, DO NOT use `if (typeof varName === 'string')` or `if (typeof confetti === 'undefined')` or `if (Array.isArray(varName))`. Instead, you can use `if (myArray.length)` or other checks that verify the content, not the type.

## Naming Conventions
- Use `camelCase` for variables and functions. Maybe use `PascalCase` for very impotant objects.
- Use `PascalCase` for class names and Sequelize models.

## Code Formatting
- Use semicolons at the end of statements.
- Use four spaces for indentation.
- Use trailing commas in multi-line objects and arrays.

## Frontend
- Use `Adminator` that uses `Bootstrap 5`.
- Use CSS layers. Import Adminator CSS in the `framework` layer. 
- Avoid inline CSS. Use external CSS files in `public/css/`. Prefer element classes from Adminator and Bootstrap, if possible.
- Prefer reusing the same custom CSS classes for similar elements. Do not create multiple similar classes for different elements; If needed (different margin for example), modify them with additional utility classes.
- Use `Alpine.js` only when interactivity is needed. Do not use heavy JS frameworks like React.
- You can use inline JavaScript in `<script type="module">` tags within Handlebars views, at the end of the view file, if the logic is applied only to a specific view. Use <script> without `type="module"` for Alpine.js logic, so it is available when alpine initalizes. 
- Keep frontend logic simple and enhance progressively only when necessary.

## Frontend Design
- Follow the existing design patterns of Adminator and Bootstrap 5.
- There are 2 main types of content in views. Tables for showing multiple records and Forms for creating/editing single records.
- When creating a new view, look for similar existing views (with the appropriate type, table type or form type) and follow their structure and design.
- In tables, use dimtables.js, defined in `public/js/dimtables.js`, for table interactivity (search, pagination, sorting). 

## Comments & Documentation
- Use `JSDoc` comments for all exported functions, classes, and objects.
- For internal-only functions, use a short inline comment to describe the purpose.
- Write comments in Greek.
- Comment blocks of code, not single lines.
- Do not add comments when you make a correction or add something new and the modification is only a few lines different. Add comment only if you add a whole new block of logic. 
- Prefer self-documenting code over verbose comments.
- Do not overcomment obvious logic.

## Don'ts
- Don't use `require`.
- Don't use frontend frameworks (React, Vue, etc.).
- Don't define model relationships inside individual model files.
- Don't add routes or controller logic directly inside `server.js` for large apps.