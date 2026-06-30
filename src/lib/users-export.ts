import * as XLSX from "xlsx";

export type ExportUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  locked_balance: number;
  total_earned: number;
  tasks_completed: number;
  referral_code: string | null;
  status?: string | null;
  payment_method?: string | null;
  payment_number?: string | null;
  created_at: string;
};

export type Brand = {
  site_name: string;
  tagline: string;
  logo_url: string;
};

const HEADERS = [
  "#",
  "নাম",
  "ইমেইল",
  "ফোন",
  "ব্যালেন্স (৳)",
  "লকড (৳)",
  "মোট আর্নিং (৳)",
  "টাস্ক",
  "রেফারেল",
  "পেমেন্ট",
  "নম্বর",
  "স্ট্যাটাস",
  "জয়েন",
];

function row(u: ExportUser, i: number) {
  return [
    i + 1,
    u.full_name ?? "—",
    u.email ?? "—",
    u.phone ?? "—",
    Number(u.balance ?? 0),
    Number(u.locked_balance ?? 0),
    Number(u.total_earned ?? 0),
    Number(u.tasks_completed ?? 0),
    u.referral_code ?? "—",
    u.payment_method ?? "—",
    u.payment_number ?? "—",
    u.status ?? "active",
    new Date(u.created_at).toLocaleDateString("en-GB"),
  ];
}

/* ============ EXCEL ============ */
export function exportExcel(users: ExportUser[], brand: Brand) {
  const wb = XLSX.utils.book_new();
  const aoa: (string | number)[][] = [
    [brand.site_name + " — User Report"],
    [brand.tagline],
    [`Generated: ${new Date().toLocaleString("en-GB")}    Total Users: ${users.length}`],
    [],
    HEADERS,
    ...users.map(row),
    [],
    [
      "",
      "TOTAL",
      "",
      "",
      users.reduce((s, u) => s + Number(u.balance || 0), 0),
      users.reduce((s, u) => s + Number(u.locked_balance || 0), 0),
      users.reduce((s, u) => s + Number(u.total_earned || 0), 0),
      users.reduce((s, u) => s + Number(u.tasks_completed || 0), 0),
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
  ];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADERS.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: HEADERS.length - 1 } },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 5 };
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, `${brand.site_name.replace(/\s+/g, "_")}_Users_${Date.now()}.xlsx`);
}

/* ============ CSV ============ */
export function exportCsv(users: ExportUser[], brand: Brand) {
  const rows = users.map((u, i) =>
    row(u, i)
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = HEADERS.join(",") + "\n" + rows.join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${brand.site_name.replace(/\s+/g, "_")}_Users_${Date.now()}.csv`;
  a.click();
}

/* ============ PRINT / PDF — branded HTML ============ */
function buildHtml(users: ExportUser[], brand: Brand, mode: "print" | "pdf"): string {
  const totals = {
    balance: users.reduce((s, u) => s + Number(u.balance || 0), 0),
    locked: users.reduce((s, u) => s + Number(u.locked_balance || 0), 0),
    earned: users.reduce((s, u) => s + Number(u.total_earned || 0), 0),
    tasks: users.reduce((s, u) => s + Number(u.tasks_completed || 0), 0),
  };
  const fmt = (n: number) => "৳" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const esc = (s: unknown) =>
    String(s ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

  const logo = brand.logo_url
    ? `<img src="${esc(brand.logo_url)}" alt="logo" />`
    : `<div class="logo-fallback">${esc(brand.site_name.slice(0, 1))}</div>`;

  const trs = users
    .map(
      (u, i) => `
    <tr class="${u.status === "suspended" ? "suspended" : ""}">
      <td class="num">${i + 1}</td>
      <td><b>${esc(u.full_name)}</b><div class="sub">${esc(u.referral_code)}</div></td>
      <td>${esc(u.email)}</td>
      <td class="mono">${esc(u.phone)}</td>
      <td class="money pos">${fmt(Number(u.balance || 0))}</td>
      <td class="money lock">${fmt(Number(u.locked_balance || 0))}</td>
      <td class="money earn">${fmt(Number(u.total_earned || 0))}</td>
      <td class="num">${u.tasks_completed ?? 0}</td>
      <td><span class="pill ${esc(u.payment_method)}">${esc(u.payment_method)}</span><div class="sub mono">${esc(u.payment_number)}</div></td>
      <td><span class="status ${u.status === "suspended" ? "s-bad" : "s-ok"}">${u.status === "suspended" ? "Suspended" : "Active"}</span></td>
      <td class="mono">${new Date(u.created_at).toLocaleDateString("en-GB")}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="bn"><head><meta charset="utf-8" />
<title>${esc(brand.site_name)} — Users Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;700;800&family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:'Inter','Baloo Da 2',system-ui,sans-serif;color:#0f172a;background:#f1f5f9}
  .page{max-width:1180px;margin:0 auto;padding:24px;background:#fff;box-shadow:0 10px 40px -10px rgba(15,23,42,.15);border-radius:16px}
  .toolbar{position:sticky;top:0;z-index:20;display:flex;gap:8px;justify-content:flex-end;padding:10px;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0;margin:-24px -24px 16px}
  .toolbar button{font:inherit;font-weight:700;border:0;cursor:pointer;border-radius:10px;padding:8px 16px;color:#fff;background:linear-gradient(135deg,#0ea5e9,#4f46e5);box-shadow:0 6px 18px -6px rgba(14,165,233,.6)}
  .toolbar button.ghost{background:#f1f5f9;color:#334155;box-shadow:none}
  header.brand{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:3px solid transparent;border-image:linear-gradient(90deg,#f59e0b,#10b981,#0ea5e9) 1}
  header.brand img,header.brand .logo-fallback{width:58px;height:58px;border-radius:14px;object-fit:cover;box-shadow:0 8px 22px -8px rgba(15,23,42,.35)}
  header.brand .logo-fallback{display:grid;place-items:center;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:800;font-size:28px;font-family:'Baloo Da 2'}
  header.brand h1{margin:0;font-family:'Baloo Da 2';font-size:24px;letter-spacing:-.01em;background:linear-gradient(90deg,#0f172a,#475569);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  header.brand p{margin:2px 0 0;font-size:12px;color:#64748b;font-weight:600}
  .meta{margin-left:auto;text-align:right;font-size:11px;color:#64748b;font-weight:600}
  .meta b{display:block;font-size:18px;color:#0f172a}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
  .summary .card{padding:12px 14px;border-radius:12px;color:#fff;position:relative;overflow:hidden}
  .summary .card span{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.9}
  .summary .card b{display:block;margin-top:4px;font-size:18px;font-family:'Baloo Da 2'}
  .c1{background:linear-gradient(135deg,#10b981,#0d9488)}
  .c2{background:linear-gradient(135deg,#f59e0b,#ea580c)}
  .c3{background:linear-gradient(135deg,#0ea5e9,#4f46e5)}
  .c4{background:linear-gradient(135deg,#ec4899,#e11d48)}
  table{width:100%;border-collapse:separate;border-spacing:0;font-size:11px;margin-top:6px}
  thead th{background:linear-gradient(180deg,#1e293b,#0f172a);color:#fff;text-align:left;padding:9px 8px;font-weight:700;font-size:10px;letter-spacing:.05em;text-transform:uppercase;border-right:1px solid #334155}
  thead th:first-child{border-top-left-radius:10px}
  thead th:last-child{border-top-right-radius:10px;border-right:0}
  tbody td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
  tbody tr:nth-child(even){background:#f8fafc}
  tbody tr.suspended{background:#fef2f2}
  .num{text-align:center;color:#64748b;font-weight:700}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;color:#475569}
  .sub{font-size:9.5px;color:#94a3b8;margin-top:1px}
  .money{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
  .money.pos{color:#059669}
  .money.lock{color:#d97706}
  .money.earn{color:#4f46e5}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:800;text-transform:uppercase;background:#fef3c7;color:#92400e}
  .pill.nagad{background:#fce7f3;color:#9d174d}
  .pill.rocket{background:#ede9fe;color:#5b21b6}
  .status{display:inline-block;padding:3px 9px;border-radius:6px;font-size:9.5px;font-weight:800;text-transform:uppercase}
  .s-ok{background:#dcfce7;color:#166534}
  .s-bad{background:#fee2e2;color:#991b1b}
  tfoot td{padding:11px 8px;background:linear-gradient(90deg,#f1f5f9,#e0e7ff);font-weight:800;color:#0f172a;border-top:2px solid #4f46e5}
  tfoot td.money{font-size:12.5px}
  footer{margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10.5px;color:#94a3b8;font-weight:600}
  footer b{color:#475569}
  @page{size:A4 landscape;margin:10mm}
  @media print{
    body{background:#fff}
    .page{box-shadow:none;border-radius:0;max-width:none;padding:0}
    .toolbar{display:none !important}
    thead{display:table-header-group}
    tr{page-break-inside:avoid}
  }
</style></head><body>
<div class="page">
  <div class="toolbar">
    <button class="ghost" onclick="window.close()">Close</button>
    <button onclick="window.print()">${mode === "pdf" ? "Save as PDF" : "Print"}</button>
  </div>
  <header class="brand">
    ${logo}
    <div>
      <h1>${esc(brand.site_name)} — Users Report</h1>
      <p>${esc(brand.tagline)}</p>
    </div>
    <div class="meta">
      <b>${users.length.toLocaleString("en-IN")}</b>
      Total Users<br/>
      ${new Date().toLocaleString("en-GB")}
    </div>
  </header>

  <div class="summary">
    <div class="card c1"><span>Total Balance</span><b>${fmt(totals.balance)}</b></div>
    <div class="card c2"><span>Locked</span><b>${fmt(totals.locked)}</b></div>
    <div class="card c3"><span>Total Earned</span><b>${fmt(totals.earned)}</b></div>
    <div class="card c4"><span>Tasks Done</span><b>${totals.tasks.toLocaleString("en-IN")}</b></div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Name / Referral</th><th>Email</th><th>Phone</th>
      <th style="text-align:right">Balance</th><th style="text-align:right">Locked</th><th style="text-align:right">Earned</th>
      <th>Tasks</th><th>Payment</th><th>Status</th><th>Joined</th>
    </tr></thead>
    <tbody>${trs}</tbody>
    <tfoot><tr>
      <td colspan="4" style="text-align:right">TOTALS</td>
      <td class="money pos">${fmt(totals.balance)}</td>
      <td class="money lock">${fmt(totals.locked)}</td>
      <td class="money earn">${fmt(totals.earned)}</td>
      <td class="num">${totals.tasks}</td>
      <td colspan="3"></td>
    </tr></tfoot>
  </table>

  <footer>
    <div>© ${new Date().getFullYear()} <b>${esc(brand.site_name)}</b> — Confidential</div>
    <div>Generated by Admin Control Panel</div>
  </footer>
</div>
<script>
  ${mode === "pdf" ? "setTimeout(() => window.print(), 400);" : ""}
</script>
</body></html>`;
}

function openWindow(html: string) {
  const w = window.open("", "_blank", "width=1200,height=850");
  if (!w) {
    alert("পপআপ ব্লক হয়েছে — ব্রাউজার সেটিং থেকে অনুমতি দিন");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function exportPrint(users: ExportUser[], brand: Brand) {
  openWindow(buildHtml(users, brand, "print"));
}

export function exportPdf(users: ExportUser[], brand: Brand) {
  openWindow(buildHtml(users, brand, "pdf"));
}
