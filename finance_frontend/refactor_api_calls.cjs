const fs = require('fs');
const path = require('path');

function replaceWithAxios(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace import
  content = content.replace(/import \{ fetchAPI \} from ["']@\/lib\/api["'];?/, `import { apiClient } from "@/lib/api";`);

  // Replace getActualRevenue / getBudgetRevenue / etc.
  // Pattern: return fetchAPI(`/actual/revenue-direct-expense?year=${financialYear}`);
  // To: const response = await apiClient.get(`/actual/revenue-direct-expense?year=${financialYear}`); return response.data;
  content = content.replace(/return fetchAPI\((`[^`]+`|'[^']+'|"[^"]+")\);/g, (match, url) => {
    return `const response = await apiClient.get(${url});\n  return response.data;`;
  });

  // Replace saveActualRevenue / saveBudgetRevenue / etc.
  // Pattern: return fetchAPI('/actual/...', { method: 'POST', body: JSON.stringify({ year: financialYear, groups }) });
  // To: const response = await apiClient.post('/actual/...', { year: financialYear, groups }); return response.data;
  content = content.replace(/return fetchAPI\(([^,]+),\s*\{\s*method:\s*['"]POST['"],\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\s*\);/g, (match, url, payload) => {
    return `const response = await apiClient.post(${url}, ${payload});\n  return response.data;`;
  });

  fs.writeFileSync(filePath, content);
  console.log(`Refactored API calls in ${filePath}`);
}

const budgetServicePath = path.join(__dirname, 'src/features/budgeting/api/budgetService.ts');
const actualServicePath = path.join(__dirname, 'src/features/actual/api/actualService.ts');

if (fs.existsSync(budgetServicePath)) replaceWithAxios(budgetServicePath);
if (fs.existsSync(actualServicePath)) replaceWithAxios(actualServicePath);

