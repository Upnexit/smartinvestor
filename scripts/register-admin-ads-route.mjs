import fs from "node:fs";

const file = "src/routeTree.gen.ts";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. Add Import
const importTarget = `import { Route as AdminPackagesRouteImport } from './routes/admin.packages'`;
const importCode = `import { Route as AdminAdsRouteImport } from './routes/admin.ads'\n` + importTarget;

// 2. Add Route Definition
const routeTarget = `const AdminPackagesRoute = AdminPackagesRouteImport.update({
  id: '/admin/packages',
  path: '/packages',
  getParentRoute: () => AdminRoute,
} as any)`;

const routeCode = `const AdminAdsRoute = AdminAdsRouteImport.update({
  id: '/admin/ads',
  path: '/ads',
  getParentRoute: () => AdminRoute,
} as any)\n\n` + routeTarget;

// 3. Add to FileRoutesByFullPath
const fullPathTarget = `'/admin/packages': typeof AdminPackagesRoute`;
const fullPathCode = `'/admin/ads': typeof AdminAdsRoute\n  ` + fullPathTarget;

// 4. Add to FileRoutesByTo
const byToTarget = `'/admin/packages': typeof AdminPackagesRoute`;
const byToCode = `'/admin/ads': typeof AdminAdsRoute\n  ` + byToTarget;

// 5. Add to FileRoutesById
const byIdTarget = `'/admin/packages': typeof AdminPackagesRoute`;
const byIdCode = `'/admin/ads': typeof AdminAdsRoute\n  ` + byIdTarget;

// 6. Add to FileRouteTypes
const typesTarget = `| '/admin/packages'`;
const typesCode = `| '/admin/ads'\n    ` + typesTarget;

// 7. Add to routeManifest
const manifestTarget = `'/admin/packages': {
      id: '/admin/packages'`;

const manifestCode = `'/admin/ads': {
      id: '/admin/ads'
      path: '/ads'
      fullPath: '/admin/ads'
      preLoaderRoute: typeof AdminAdsRouteImport
      parentRoute: typeof AdminRoute
    }
    ` + manifestTarget;

// 8. Add to AdminRouteChildren
const childrenTarget = `AdminRouteChildren = {
  AdminIndexRoute: AdminIndexRoute,`;

const childrenCode = `AdminRouteChildren = {
  AdminAdsRoute: AdminAdsRoute,
  AdminIndexRoute: AdminIndexRoute,`;

// Apply updates
content = content.replace(importTarget, importCode);
content = content.replace(routeTarget, routeCode);
content = content.replace(fullPathTarget, fullPathCode);
content = content.replace(byToTarget, byToCode);
content = content.replace(byIdTarget, byIdCode);
content = content.replaceAll(typesTarget, typesCode);
content = content.replace(manifestTarget, manifestCode);
content = content.replace(childrenTarget, childrenCode);

fs.writeFileSync(file, content, "utf-8");
console.log("Registered /admin/ads into routeTree.gen.ts successfully!");

