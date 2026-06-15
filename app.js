
const { useState, useEffect, useRef } = React;


/* ============================================================
   ค่าคงที่ / ข้อมูลตั้งต้น
   ============================================================ */

const STORAGE_KEYS = {
  categories: "ktr-categories",
  menu: "ktr-menu-items",
  tables: "ktr-tables",
  history: "ktr-history",
};

const SPICE_LEVELS = [
  { id: "normal", label: "เผ็ดปกติ", chili: 1 },
  { id: "mild", label: "เผ็ดน้อย", chili: 1 },
  { id: "hot", label: "เผ็ดมาก", chili: 2 },
  { id: "extra", label: "เผ็ดสุดๆ", chili: 3 },
  { id: "none", label: "ไม่เผ็ด", chili: 0 },
];

const DEFAULT_CATEGORIES = [
  { id: "cat-noodle", name: "ก๋วยเตี๋ยวเรือ" },
  { id: "cat-extra", name: "เกาเหลา / เพิ่มเครื่อง" },
  { id: "cat-snack", name: "ของทานเล่น" },
  { id: "cat-drink", name: "เครื่องดื่ม" },
];

const DEFAULT_MENU = [
  { id: "m1", name: "ก๋วยเตี๋ยวเรือหมู เส้นเล็ก", categoryId: "cat-noodle", price: 15, isNoodle: true },
  { id: "m2", name: "ก๋วยเตี๋ยวเรือหมู เส้นใหญ่", categoryId: "cat-noodle", price: 15, isNoodle: true },
  { id: "m3", name: "ก๋วยเตี๋ยวเรือเนื้อ", categoryId: "cat-noodle", price: 20, isNoodle: true },
  { id: "m4", name: "บะหมี่เกี๊ยวหมู", categoryId: "cat-noodle", price: 20, isNoodle: true },
  { id: "m5", name: "เกาเหลาหมู (ไม่ใส่เส้น)", categoryId: "cat-extra", price: 25, isNoodle: true },
  { id: "m6", name: "เกาเหลาเนื้อ (ไม่ใส่เส้น)", categoryId: "cat-extra", price: 30, isNoodle: true },
  { id: "m7", name: "เพิ่มลูกชิ้นหมู", categoryId: "cat-extra", price: 10, isNoodle: false },
  { id: "m8", name: "เพิ่มเนื้อเปื่อย", categoryId: "cat-extra", price: 20, isNoodle: false },
  { id: "m9", name: "เพิ่มเลือดหมู", categoryId: "cat-extra", price: 10, isNoodle: false },
  { id: "m10", name: "ปาท่องโก๋", categoryId: "cat-snack", price: 10, isNoodle: false },
  { id: "m11", name: "กากหมูทอด", categoryId: "cat-snack", price: 20, isNoodle: false },
  { id: "m12", name: "น้ำเปล่า", categoryId: "cat-drink", price: 10, isNoodle: false },
  { id: "m13", name: "ชาเย็น", categoryId: "cat-drink", price: 20, isNoodle: false },
  { id: "m14", name: "โค้ก / เป๊ปซี่", categoryId: "cat-drink", price: 15, isNoodle: false },
];

function makeDefaultTables() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `โต๊ะ ${i + 1}`,
    status: "empty", // empty | open
    openedAt: null,
    note: "",
    items: [],
    discount: { type: "amount", value: 0 },
    surcharge: { type: "amount", value: 0 },
    paymentMethod: "cash",
  }));
}

/* ============================================================
   ฟังก์ชันช่วย
   ============================================================ */

function uid() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function baht(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString("th-TH", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }) + " บาท";
}

function spiceLabel(id) {
  const s = SPICE_LEVELS.find((x) => x.id === id);
  return s ? s.label : "";
}

function spiceChili(id) {
  const s = SPICE_LEVELS.find((x) => x.id === id);
  if (!s) return "";
  if (s.chili === 0) return "";
  return "🌶️".repeat(s.chili);
}

async function loadKey(key, fallback, shared) {
  try {
    const res = await window.storage.get(key, shared);
    if (res && typeof res.value === "string") {
      return JSON.parse(res.value);
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

async function saveKey(key, value, shared) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
  } catch (e) {
    console.error("Storage save error", key, e);
  }
}

function tableTotal(table) {
  return table.items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function calcBill(table) {
  const subtotal = tableTotal(table);
  const dVal = Number(table.discount?.value) || 0;
  const sVal = Number(table.surcharge?.value) || 0;
  const discountAmt =
    table.discount?.type === "percent" ? (subtotal * dVal) / 100 : dVal;
  const surchargeAmt =
    table.surcharge?.type === "percent" ? (subtotal * sVal) / 100 : sVal;
  const total = Math.max(0, subtotal - discountAmt + surchargeAmt);
  return { subtotal, discountAmt, surchargeAmt, total };
}

/* ============================================================
   CSS
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Mitr:wght@500;600;700&family=Sarabun:wght@400;500;600;700&display=swap');

.ktr-app{
  --bg:#FBF1E2;
  --bg-card:#FFFDF7;
  --bg-soft:#F3E4CC;
  --broth:#4A2A1A;
  --broth-deep:#301A0F;
  --accent:#C1442A;
  --accent-dark:#9E351E;
  --gold:#E3A23A;
  --green:#5FA84A;
  --green-dark:#447E36;
  --text:#33231A;
  --muted:#A18A72;
  --border:#EAD9C2;
  font-family:'Sarabun',sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  padding-bottom:48px;
  -webkit-font-smoothing:antialiased;
}
.ktr-app *{ box-sizing:border-box; }
.ktr-app button{ font-family:inherit; cursor:pointer; }
.ktr-app input, .ktr-app select, .ktr-app textarea{ font-family:inherit; }

/* ---------- Header ---------- */
.ktr-header{
  background:linear-gradient(135deg, var(--broth) 0%, var(--broth-deep) 100%);
  color:#FBF1E2;
  padding:14px 18px;
  display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  position:sticky; top:0; z-index:30;
  box-shadow:0 3px 10px rgba(0,0,0,.18);
}
.ktr-header .title-row{ display:flex; align-items:center; gap:10px; }
.ktr-header h1{ font-family:'Mitr',sans-serif; font-size:1.15rem; margin:0; font-weight:600; letter-spacing:.3px; }
.ktr-header .sub{ font-size:.75rem; opacity:.75; }
.ktr-back{
  background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); color:#fff;
  border-radius:10px; padding:7px 12px; font-size:.85rem; font-weight:600;
}
.ktr-back:hover{ background:rgba(255,255,255,.2); }
.ktr-nav{ display:flex; gap:6px; flex-wrap:wrap; }
.ktr-nav button{
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#FBF1E2;
  border-radius:10px; padding:8px 14px; font-size:.85rem; font-weight:600; transition:.15s;
}
.ktr-nav button:hover{ background:rgba(255,255,255,.18); }
.ktr-nav button.active{ background:var(--gold); color:var(--broth-deep); border-color:var(--gold); }

/* ---------- Layout ---------- */
.ktr-main{ max-width:1180px; margin:0 auto; padding:18px; }
.ktr-section-title{ font-family:'Mitr',sans-serif; font-size:1.05rem; font-weight:600; margin:0 0 12px; color:var(--broth); }

/* ---------- Table grid ---------- */
.table-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:14px; }
.table-card{
  background:var(--bg-card); border:2px solid var(--border); border-radius:16px;
  padding:16px 14px; text-align:left; display:flex; flex-direction:column; gap:8px;
  box-shadow:0 2px 6px rgba(74,42,26,.06); transition:.15s; position:relative; overflow:hidden;
}
.table-card:hover{ transform:translateY(-2px); box-shadow:0 6px 14px rgba(74,42,26,.12); }
.table-card.open{ border-color:var(--accent); background:linear-gradient(160deg,#FFF7EE 0%, #FCEBDD 100%); }
.table-card .t-name{ font-family:'Mitr',sans-serif; font-size:1.15rem; font-weight:700; color:var(--broth); }
.t-status{ display:inline-flex; align-items:center; gap:5px; font-size:.78rem; font-weight:600; border-radius:999px; padding:3px 10px; width:fit-content; }
.t-status.empty{ background:#E7F3E2; color:var(--green-dark); }
.t-status.open{ background:#FBE3D7; color:var(--accent-dark); }
.t-meta{ font-size:.8rem; color:var(--muted); }
.t-total{ font-family:'Mitr',sans-serif; font-weight:700; color:var(--accent); font-size:1.05rem; }

/* ---------- Category tabs ---------- */
.cat-tabs{ display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; margin-bottom:14px; -webkit-overflow-scrolling:touch;}
.cat-tabs button{
  flex:0 0 auto; background:var(--bg-card); border:1.5px solid var(--border); color:var(--broth);
  border-radius:999px; padding:8px 16px; font-size:.88rem; font-weight:600; white-space:nowrap;
}
.cat-tabs button.active{ background:var(--accent); border-color:var(--accent); color:#fff; }

/* ---------- Order layout ---------- */
.order-layout{ display:grid; grid-template-columns:1fr; gap:18px; }
@media (min-width:920px){ .order-layout{ grid-template-columns: 1fr 340px; align-items:start; } }

.menu-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:12px; }
.menu-card{
  background:var(--bg-card); border:1.5px solid var(--border); border-radius:14px;
  padding:14px 12px; text-align:left; display:flex; flex-direction:column; gap:8px; min-height:88px;
  position:relative; transition:.12s;
}
.menu-card:hover{ border-color:var(--accent); box-shadow:0 4px 10px rgba(74,42,26,.08); }
.menu-card .m-name{ font-size:.92rem; font-weight:600; line-height:1.3; color:var(--text); flex:1; }
.menu-card .m-bottom{ display:flex; align-items:center; gap:8px; }
.menu-card .m-price{ font-family:'Mitr',sans-serif; font-weight:700; color:var(--accent); font-size:.95rem; }
.menu-card .m-noodle-tag{ font-size:.68rem; color:var(--green-dark); background:#EAF6E5; border-radius:6px; padding:1px 6px; width:fit-content; }
.qty-badge{
  display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px; padding:0 6px;
  border-radius:999px; background:var(--green); color:#fff; font-size:.78rem; font-weight:700;
  box-shadow:0 0 0 2px #fff, 0 1px 4px rgba(95,168,74,.5);
}

/* ---------- Order summary card (sidebar) ---------- */
.summary-card{
  background:var(--bg-card); border:1.5px solid var(--border); border-radius:16px; padding:16px;
  position:sticky; top:84px; display:flex; flex-direction:column; gap:10px;
}
.summary-card h3{ margin:0; font-family:'Mitr',sans-serif; font-size:1rem; color:var(--broth); }
.summary-line{ display:flex; justify-content:space-between; font-size:.85rem; color:var(--text); gap:8px; }
.summary-line .sl-name{ flex:1; }
.summary-line .sl-muted{ color:var(--muted); font-size:.75rem; }
.summary-empty{ color:var(--muted); font-size:.85rem; text-align:center; padding:14px 0; }
.summary-total-row{ display:flex; justify-content:space-between; align-items:baseline; border-top:1.5px dashed var(--border); padding-top:10px; }
.summary-total-row .label{ font-size:.9rem; font-weight:600; }
.summary-total-row .value{ font-family:'Mitr',sans-serif; font-weight:700; font-size:1.2rem; color:var(--accent); }

/* ---------- Buttons ---------- */
.btn{ border-radius:10px; padding:10px 16px; font-size:.9rem; font-weight:600; border:1.5px solid transparent; transition:.12s; }
.btn-primary{ background:var(--accent); color:#fff; }
.btn-primary:hover{ background:var(--accent-dark); }
.btn-secondary{ background:var(--bg-soft); color:var(--broth); border-color:var(--border); }
.btn-secondary:hover{ background:#EADBC4; }
.btn-ghost{ background:transparent; color:var(--broth); border-color:var(--border); }
.btn-ghost:hover{ background:var(--bg-soft); }
.btn-danger{ background:#fff; color:var(--accent); border-color:var(--accent); }
.btn-danger:hover{ background:#FCEBE6; }
.btn-block{ width:100%; }
.btn-sm{ padding:6px 10px; font-size:.78rem; border-radius:8px; }
.btn:disabled{ opacity:.45; cursor:not-allowed; }

/* ---------- Order list ---------- */
.order-note{ background:var(--bg-card); border:1.5px solid var(--border); border-radius:14px; padding:12px 14px; margin-bottom:14px; }
.order-note label{ font-size:.82rem; font-weight:600; color:var(--broth); display:block; margin-bottom:6px; }
.order-note textarea{ width:100%; border:1.5px solid var(--border); border-radius:10px; padding:8px 10px; font-size:.88rem; resize:vertical; min-height:42px; background:#fff; }

.order-group-label{ font-size:.8rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:14px 0 8px; }
.order-row{
  background:var(--bg-card); border:1.5px solid var(--border); border-radius:14px; padding:12px 14px;
  display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;
}
.order-row.served{ opacity:.55; background:var(--bg-soft); }
.order-row .or-info{ flex:1; min-width:0; }
.order-row .or-name{ font-weight:600; font-size:.95rem; }
.order-row.served .or-name{ text-decoration:line-through; }
.order-row .or-tags{ display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
.or-tag{ font-size:.72rem; border-radius:6px; padding:2px 7px; background:#FBE3D7; color:var(--accent-dark); font-weight:600; }
.or-note{ font-size:.78rem; color:var(--muted); font-style:italic; margin-top:4px; }
.or-price{ font-size:.85rem; color:var(--muted); margin-top:4px; }
.order-row .or-actions{ display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
.qty-stepper{ display:flex; align-items:center; gap:6px; }
.qty-stepper button{ width:28px; height:28px; border-radius:8px; border:1.5px solid var(--border); background:#fff; font-weight:700; font-size:1rem; line-height:1; }
.qty-stepper .qv{ min-width:24px; text-align:center; font-weight:700; }
.serve-btn{ font-size:.75rem; font-weight:700; border-radius:999px; padding:5px 12px; border:1.5px solid var(--green); color:var(--green-dark); background:#fff; }
.serve-btn.done{ background:var(--green); color:#fff; border-color:var(--green); }
.del-btn{ font-size:.75rem; color:var(--accent); background:none; border:none; text-decoration:underline; padding:0; }

.order-footer{
  position:sticky; bottom:0; background:var(--bg-card); border:1.5px solid var(--border); border-radius:16px;
  padding:14px 16px; margin-top:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  box-shadow:0 -4px 12px rgba(74,42,26,.06);
}
.order-footer .of-total{ font-family:'Mitr',sans-serif; font-weight:700; font-size:1.25rem; color:var(--accent); }
.order-footer .of-label{ font-size:.8rem; color:var(--muted); }

/* ---------- Modal ---------- */
.modal-overlay{
  position:fixed; inset:0; background:rgba(48,26,15,.45); display:flex; align-items:center; justify-content:center;
  z-index:100; padding:16px; backdrop-filter:blur(2px);
}
.modal-card{
  background:var(--bg-card); border-radius:18px; padding:22px; max-width:440px; width:100%;
  max-height:90vh; overflow-y:auto; box-shadow:0 12px 40px rgba(0,0,0,.25);
}
.modal-card h2{ font-family:'Mitr',sans-serif; margin:0 0 4px; font-size:1.1rem; color:var(--broth); }
.modal-card .modal-price{ color:var(--accent); font-weight:700; margin-bottom:14px; }
.modal-card .field{ margin-bottom:14px; }
.modal-card .field label{ font-size:.82rem; font-weight:600; color:var(--broth); display:block; margin-bottom:6px; }
.modal-card .field input, .modal-card .field select, .modal-card .field textarea{
  width:100%; border:1.5px solid var(--border); border-radius:10px; padding:9px 11px; font-size:.9rem; background:#fff;
}
.modal-actions{ display:flex; gap:10px; margin-top:6px; }
.modal-actions .btn{ flex:1; }
.spice-options{ display:flex; gap:8px; flex-wrap:wrap; }
.spice-chip{
  border:1.5px solid var(--border); border-radius:999px; padding:7px 13px; font-size:.82rem; font-weight:600;
  background:#fff; color:var(--text);
}
.spice-chip.active{ background:var(--accent); color:#fff; border-color:var(--accent); }
.modal-stepper{ display:flex; align-items:center; gap:14px; }
.modal-stepper button{ width:38px; height:38px; border-radius:10px; border:1.5px solid var(--border); background:#fff; font-size:1.2rem; font-weight:700; }
.modal-stepper .mqv{ font-family:'Mitr',sans-serif; font-size:1.3rem; font-weight:700; min-width:30px; text-align:center; }

/* ---------- Checkout modal ---------- */
.bill-list{ max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:10px; padding:8px 10px; margin-bottom:12px; background:#fff; }
.bill-line{ display:flex; justify-content:space-between; font-size:.85rem; padding:4px 0; gap:8px; }
.bill-line .bl-name{ flex:1; color:var(--text); }
.bill-line .bl-amt{ font-weight:600; }
.calc-row{ display:flex; justify-content:space-between; font-size:.9rem; padding:4px 0; }
.calc-row.grand{ border-top:1.5px dashed var(--border); margin-top:6px; padding-top:10px; font-family:'Mitr',sans-serif; font-size:1.25rem; font-weight:700; color:var(--accent); }
.adjust-row{ display:flex; gap:8px; align-items:center; }
.adjust-row select{ border:1.5px solid var(--border); border-radius:10px; padding:9px 8px; font-size:.85rem; background:#fff; }
.adjust-row input{ flex:1; border:1.5px solid var(--border); border-radius:10px; padding:9px 11px; font-size:.9rem; background:#fff; }
.pay-options{ display:flex; gap:10px; }
.pay-options button{
  flex:1; border:1.5px solid var(--border); border-radius:12px; padding:14px 8px; background:#fff;
  font-weight:700; font-size:.92rem; display:flex; flex-direction:column; align-items:center; gap:6px;
}
.pay-options button.active{ border-color:var(--accent); background:#FBE3D7; color:var(--accent-dark); }

/* ---------- Menu manage ---------- */
.manage-grid{ display:grid; grid-template-columns:1fr; gap:20px; }
@media (min-width:880px){ .manage-grid{ grid-template-columns:300px 1fr; } }
.manage-card{ background:var(--bg-card); border:1.5px solid var(--border); border-radius:16px; padding:16px; }
.manage-card h3{ margin:0 0 12px; font-family:'Mitr',sans-serif; color:var(--broth); font-size:1rem; }
.cat-row{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.cat-row input{ flex:1; border:1.5px solid var(--border); border-radius:8px; padding:7px 9px; font-size:.88rem; background:#fff; }
.add-form{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.add-form input, .add-form select{ border:1.5px solid var(--border); border-radius:8px; padding:7px 9px; font-size:.85rem; background:#fff; }
.menu-manage-table{ width:100%; border-collapse:collapse; font-size:.86rem; }
.menu-manage-table th{ text-align:left; color:var(--muted); font-weight:600; font-size:.75rem; text-transform:uppercase; padding:6px 8px; border-bottom:1.5px solid var(--border); }
.menu-manage-table td{ padding:8px; border-bottom:1px solid var(--border); vertical-align:middle; }
.menu-manage-table input[type=text], .menu-manage-table input[type=number]{ width:100%; border:1.5px solid var(--border); border-radius:8px; padding:6px 8px; font-size:.85rem; background:#fff; }
.menu-manage-table select{ border:1.5px solid var(--border); border-radius:8px; padding:6px 6px; font-size:.85rem; background:#fff; }
.menu-manage-table td.actions{ white-space:nowrap; }
.row-error{ color:var(--accent); font-size:.78rem; margin-top:6px; }

/* ---------- Summary view ---------- */
.summary-stats{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:18px; }
.stat-card{ background:var(--bg-card); border:1.5px solid var(--border); border-radius:14px; padding:14px; }
.stat-card .stat-label{ font-size:.78rem; color:var(--muted); font-weight:600; }
.stat-card .stat-value{ font-family:'Mitr',sans-serif; font-size:1.4rem; font-weight:700; color:var(--broth); margin-top:4px; }
.history-table{ width:100%; border-collapse:collapse; font-size:.85rem; background:var(--bg-card); border-radius:14px; overflow:hidden; border:1.5px solid var(--border); }
.history-table th{ text-align:left; padding:10px 12px; background:var(--bg-soft); color:var(--broth); font-weight:700; font-size:.78rem; text-transform:uppercase; }
.history-table td{ padding:10px 12px; border-top:1px solid var(--border); }
.pay-tag{ font-size:.72rem; font-weight:700; border-radius:6px; padding:2px 8px; }
.pay-tag.cash{ background:#EAF6E5; color:var(--green-dark); }
.pay-tag.transfer{ background:#E4EEF9; color:#2C5C8F; }

.empty-state{ text-align:center; color:var(--muted); padding:40px 10px; font-size:.92rem; }
.shared-note{ text-align:center; font-size:.72rem; color:var(--muted); margin-top:30px; }
`;

/* ============================================================
   App หลัก
   ============================================================ */

function App() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU);
  const [tables, setTables] = useState(makeDefaultTables());
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState("tables"); // tables | order | orderlist | menu | summary
  const [activeTableId, setActiveTableId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORIES[0]?.id || null);
  const [modalMenuItem, setModalMenuItem] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // โหลดข้อมูล
  useEffect(() => {
    (async () => {
      const [cats, menu, tbls, hist] = await Promise.all([
        loadKey(STORAGE_KEYS.categories, DEFAULT_CATEGORIES, true),
        loadKey(STORAGE_KEYS.menu, DEFAULT_MENU, true),
        loadKey(STORAGE_KEYS.tables, makeDefaultTables(), true),
        loadKey(STORAGE_KEYS.history, [], true),
      ]);
      setCategories(cats);
      setMenuItems(menu);
      // ป้องกันจำนวนโต๊ะผิดเพี้ยน หากข้อมูลเก่าเสียหาย
      setTables(Array.isArray(tbls) && tbls.length ? tbls : makeDefaultTables());
      setHistory(Array.isArray(hist) ? hist : []);
      if (cats.length) setActiveCategory(cats[0].id);
      setLoaded(true);
    })();
  }, []);

  // บันทึกข้อมูล (shared = true เพื่อให้ทุกอุปกรณ์เห็นข้อมูลตรงกัน)
  useEffect(() => { if (loaded) saveKey(STORAGE_KEYS.categories, categories, true); }, [categories, loaded]);
  useEffect(() => { if (loaded) saveKey(STORAGE_KEYS.menu, menuItems, true); }, [menuItems, loaded]);
  useEffect(() => { if (loaded) saveKey(STORAGE_KEYS.tables, tables, true); }, [tables, loaded]);
  useEffect(() => { if (loaded) saveKey(STORAGE_KEYS.history, history, true); }, [history, loaded]);

  const activeTable = tables.find((t) => t.id === activeTableId) || null;

  function updateTable(tableId, updater) {
    setTables((prev) => prev.map((t) => (t.id === tableId ? updater(t) : t)));
  }

  // ---- การจัดการโต๊ะ ----
  function openTable(table) {
    if (table.status === "empty") {
      updateTable(table.id, (t) => ({ ...t, status: "open", openedAt: Date.now() }));
    }
    setActiveTableId(table.id);
    setActiveCategory(categories[0]?.id || null);
    setView("order");
  }

  function closeTableNoOrder(table) {
    if (!window.confirm(`ปิดโต๊ะ "${table.name}" โดยไม่มีรายการสั่ง?`)) return;
    updateTable(table.id, (t) => ({
      ...t,
      status: "empty",
      openedAt: null,
      note: "",
      items: [],
      discount: { type: "amount", value: 0 },
      surcharge: { type: "amount", value: 0 },
      paymentMethod: "cash",
    }));
    setView("tables");
    setActiveTableId(null);
  }

  // ---- การจัดการรายการสั่ง ----
  function addItemToOrder(menuItem, qty, spice, note) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({
      ...t,
      status: "open",
      openedAt: t.openedAt || Date.now(),
      items: [
        ...t.items,
        {
          lineId: uid(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty,
          spice: menuItem.isNoodle ? spice : null,
          note: note.trim(),
          served: false,
          addedAt: Date.now(),
        },
      ],
    }));
  }

  function changeQty(lineId, delta) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({
      ...t,
      items: t.items
        .map((it) => (it.lineId === lineId ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0),
    }));
  }

  function toggleServed(lineId) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({
      ...t,
      items: t.items.map((it) => (it.lineId === lineId ? { ...it, served: !it.served } : it)),
    }));
  }

  function removeItem(lineId) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({ ...t, items: t.items.filter((it) => it.lineId !== lineId) }));
  }

  function setTableNote(note) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({ ...t, note }));
  }

  function setDiscount(discount) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({ ...t, discount }));
  }
  function setSurcharge(surcharge) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({ ...t, surcharge }));
  }
  function setPaymentMethod(paymentMethod) {
    if (!activeTable) return;
    updateTable(activeTable.id, (t) => ({ ...t, paymentMethod }));
  }

  function confirmPayment() {
    if (!activeTable) return;
    const bill = calcBill(activeTable);
    const entry = {
      id: uid(),
      tableId: activeTable.id,
      tableName: activeTable.name,
      items: activeTable.items,
      note: activeTable.note,
      subtotal: bill.subtotal,
      discount: activeTable.discount,
      discountAmt: bill.discountAmt,
      surcharge: activeTable.surcharge,
      surchargeAmt: bill.surchargeAmt,
      total: bill.total,
      paymentMethod: activeTable.paymentMethod,
      paidAt: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, 500));
    updateTable(activeTable.id, (t) => ({
      ...t,
      status: "empty",
      openedAt: null,
      note: "",
      items: [],
      discount: { type: "amount", value: 0 },
      surcharge: { type: "amount", value: 0 },
      paymentMethod: "cash",
    }));
    setCheckoutOpen(false);
    setView("tables");
    setActiveTableId(null);
  }

  // ---- การจัดการหมวดหมู่ / เมนู ----
  function addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => [...prev, { id: "cat-" + uid(), name: trimmed }]);
  }
  function renameCategory(id, name) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }
  function deleteCategory(id) {
    const used = menuItems.some((m) => m.categoryId === id);
    if (used) {
      window.alert("ไม่สามารถลบหมวดหมู่นี้ได้ เพราะยังมีเมนูอยู่ในหมวดนี้ กรุณาย้ายหรือลบเมนูก่อน");
      return;
    }
    if (categories.length <= 1) {
      window.alert("ต้องมีหมวดหมู่อย่างน้อย 1 หมวด");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function addMenuItem(data) {
    setMenuItems((prev) => [...prev, { id: "m-" + uid(), ...data }]);
  }
  function updateMenuItem(id, data) {
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
  }
  function deleteMenuItem(id) {
    if (!window.confirm("ลบเมนูนี้หรือไม่?")) return;
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  }

  // ---- หาจำนวนที่สั่งของเมนูนี้ในออเดอร์ปัจจุบัน ----
  function orderedQty(menuItemId) {
    if (!activeTable) return 0;
    return activeTable.items
      .filter((it) => it.menuItemId === menuItemId)
      .reduce((s, it) => s + it.qty, 0);
  }

  const unservedCount = activeTable ? activeTable.items.filter((it) => !it.served).reduce((s, it) => s + it.qty, 0) : 0;
  const totalItemCount = activeTable ? activeTable.items.reduce((s, it) => s + it.qty, 0) : 0;

  return (
    <div className="ktr-app">
      <style>{CSS}</style>

      <Header
        view={view}
        setView={setView}
        activeTable={activeTable}
        totalItemCount={totalItemCount}
        unservedCount={unservedCount}
        onOpenCheckout={() => setCheckoutOpen(true)}
        onBackToTables={() => {
          setView("tables");
          setActiveTableId(null);
        }}
      />

      <div className="ktr-main">
        {view === "tables" && (
          <TablesView tables={tables} onOpenTable={openTable} />
        )}

        {view === "order" && activeTable && (
          <OrderView
            table={activeTable}
            categories={categories}
            menuItems={menuItems}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            orderedQty={orderedQty}
            onSelectMenuItem={(m) => setModalMenuItem(m)}
            onGoOrderList={() => setView("orderlist")}
            onOpenCheckout={() => setCheckoutOpen(true)}
            onCloseTableNoOrder={() => closeTableNoOrder(activeTable)}
          />
        )}

        {view === "orderlist" && activeTable && (
          <OrderListView
            table={activeTable}
            onChangeQty={changeQty}
            onToggleServed={toggleServed}
            onRemoveItem={removeItem}
            onSetNote={setTableNote}
            onOpenCheckout={() => setCheckoutOpen(true)}
            onGoMenu={() => setView("order")}
          />
        )}

        {view === "menu" && (
          <MenuManageView
            categories={categories}
            menuItems={menuItems}
            onAddCategory={addCategory}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
            onAddMenuItem={addMenuItem}
            onUpdateMenuItem={updateMenuItem}
            onDeleteMenuItem={deleteMenuItem}
          />
        )}

        {view === "summary" && <SummaryView history={history} />}
      </div>

      {modalMenuItem && (
        <AddItemModal
          menuItem={modalMenuItem}
          onClose={() => setModalMenuItem(null)}
          onConfirm={(qty, spice, note) => {
            addItemToOrder(modalMenuItem, qty, spice, note);
            setModalMenuItem(null);
          }}
        />
      )}

      {checkoutOpen && activeTable && (
        <CheckoutModal
          table={activeTable}
          onClose={() => setCheckoutOpen(false)}
          onSetDiscount={setDiscount}
          onSetSurcharge={setSurcharge}
          onSetPaymentMethod={setPaymentMethod}
          onConfirm={confirmPayment}
        />
      )}

      <div className="shared-note">ข้อมูลร้านนี้ถูกบันทึกแบบใช้ร่วมกันทุกอุปกรณ์ในร้าน</div>
    </div>
  );
}

/* ============================================================
   Header
   ============================================================ */

function Header({ view, setView, activeTable, totalItemCount, unservedCount, onOpenCheckout, onBackToTables }) {
  const inTableContext = (view === "order" || view === "orderlist") && activeTable;

  if (inTableContext) {
    return (
      <div className="ktr-header">
        <div className="title-row">
          <button className="ktr-back" onClick={onBackToTables}>← โต๊ะอาหาร</button>
          <div>
            <h1>{activeTable.name}</h1>
            <div className="sub">
              {activeTable.openedAt
                ? "เปิดโต๊ะเมื่อ " + new Date(activeTable.openedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
                : "ยังไม่เปิดโต๊ะ"}
              {totalItemCount > 0 && <> · {totalItemCount} รายการ{unservedCount > 0 ? ` (ยังไม่เสริฟ ${unservedCount})` : ""}</>}
            </div>
          </div>
        </div>
        <div className="ktr-nav">
          <button className={view === "order" ? "active" : ""} onClick={() => setView("order")}>สั่งอาหาร</button>
          <button className={view === "orderlist" ? "active" : ""} onClick={() => setView("orderlist")}>
            รายการออเดอร์{totalItemCount > 0 ? ` (${totalItemCount})` : ""}
          </button>
          <button onClick={onOpenCheckout} disabled={activeTable.items.length === 0}>คิดเงิน</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ktr-header">
      <div className="title-row">
        <h1>🍜 ก๋วยเตี๋ยวเรือน้ำตก · POS</h1>
      </div>
      <div className="ktr-nav">
        <button className={view === "tables" ? "active" : ""} onClick={() => setView("tables")}>โต๊ะอาหาร</button>
        <button className={view === "menu" ? "active" : ""} onClick={() => setView("menu")}>จัดการเมนู</button>
        <button className={view === "summary" ? "active" : ""} onClick={() => setView("summary")}>สรุปยอดขาย</button>
      </div>
    </div>
  );
}

/* ============================================================
   หน้าเลือกโต๊ะ
   ============================================================ */

function TablesView({ tables, onOpenTable }) {
  return (
    <div>
      <h2 className="ktr-section-title">เลือกโต๊ะ</h2>
      <div className="table-grid">
        {tables.map((t) => {
          const total = tableTotal(t);
          const count = t.items.reduce((s, it) => s + it.qty, 0);
          return (
            <button key={t.id} className={`table-card ${t.status}`} onClick={() => onOpenTable(t)}>
              <div className="t-name">{t.name}</div>
              {t.status === "empty" ? (
                <span className="t-status empty">● ว่าง</span>
              ) : (
                <span className="t-status open">● มีลูกค้า</span>
              )}
              {t.status === "open" && (
                <>
                  <div className="t-meta">
                    เปิดเมื่อ {t.openedAt ? new Date(t.openedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </div>
                  {count > 0 ? (
                    <>
                      <div className="t-meta">{count} รายการ</div>
                      <div className="t-total">{baht(total)}</div>
                    </>
                  ) : (
                    <div className="t-meta">ยังไม่สั่งอาหาร</div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   หน้าสั่งอาหาร
   ============================================================ */

function OrderView({
  table,
  categories,
  menuItems,
  activeCategory,
  setActiveCategory,
  orderedQty,
  onSelectMenuItem,
  onGoOrderList,
  onOpenCheckout,
  onCloseTableNoOrder,
}) {
  const itemsInCategory = menuItems.filter((m) => m.categoryId === activeCategory);
  const bill = calcBill(table);

  return (
    <div className="order-layout">
      <div>
        <div className="cat-tabs">
          {categories.map((c) => (
            <button key={c.id} className={c.id === activeCategory ? "active" : ""} onClick={() => setActiveCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        {itemsInCategory.length === 0 ? (
          <div className="empty-state">ยังไม่มีเมนูในหมวดนี้ — ไปที่ "จัดการเมนู" เพื่อเพิ่มเมนู</div>
        ) : (
          <div className="menu-grid">
            {itemsInCategory.map((m) => {
              const qty = orderedQty(m.id);
              return (
                <button key={m.id} className="menu-card" onClick={() => onSelectMenuItem(m)}>
                  <div className="m-name">{m.name}</div>
                  {m.isNoodle && <span className="m-noodle-tag">เลือกความเผ็ดได้</span>}
                  <div className="m-bottom">
                    <span className="m-price">{baht(m.price)}</span>
                    {qty > 0 && <span className="qty-badge">{qty}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {table.items.length === 0 && (
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={onCloseTableNoOrder}>ปิดโต๊ะ (ยังไม่มีรายการสั่ง)</button>
          </div>
        )}
      </div>

      <div className="summary-card">
        <h3>ออเดอร์ {table.name}</h3>
        {table.items.length === 0 ? (
          <div className="summary-empty">ยังไม่มีรายการสั่ง<br />แตะที่เมนูเพื่อเริ่มสั่ง</div>
        ) : (
          <>
            {table.items.map((it) => (
              <div className="summary-line" key={it.lineId}>
                <span className="sl-name">
                  {it.name} ×{it.qty}
                  {it.spice && <span className="sl-muted"> · {spiceLabel(it.spice)}</span>}
                </span>
                <span>{baht(it.price * it.qty)}</span>
              </div>
            ))}
            <div className="summary-total-row">
              <span className="label">ยอดรวม</span>
              <span className="value">{baht(bill.subtotal)}</span>
            </div>
            <button className="btn btn-secondary btn-block" onClick={onGoOrderList}>ดูรายการออเดอร์ทั้งหมด</button>
            <button className="btn btn-primary btn-block" onClick={onOpenCheckout}>คิดเงิน</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Modal: เพิ่มรายการสั่ง
   ============================================================ */

function AddItemModal({ menuItem, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [spice, setSpice] = useState("normal");
  const [note, setNote] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{menuItem.name}</h2>
        <div className="modal-price">{baht(menuItem.price)} / รายการ</div>

        <div className="field">
          <label>จำนวน</label>
          <div className="modal-stepper">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="mqv">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        </div>

        {menuItem.isNoodle && (
          <div className="field">
            <label>ระดับความเผ็ด</label>
            <div className="spice-options">
              {SPICE_LEVELS.map((s) => (
                <button key={s.id} className={`spice-chip ${spice === s.id ? "active" : ""}`} onClick={() => setSpice(s.id)}>
                  {s.label}{spiceChili(s.id) ? " " + spiceChili(s.id) : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>หมายเหตุ (ถ้ามี)</label>
          <textarea
            placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่ถั่วงอก, ห่อกลับบ้าน"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={() => onConfirm(qty, spice, note)}>เพิ่มลงออเดอร์</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   หน้ารายการออเดอร์
   ============================================================ */

function OrderListView({ table, onChangeQty, onToggleServed, onRemoveItem, onSetNote, onOpenCheckout, onGoMenu }) {
  const unserved = table.items.filter((it) => !it.served).sort((a, b) => a.addedAt - b.addedAt);
  const served = table.items.filter((it) => it.served).sort((a, b) => a.addedAt - b.addedAt);
  const bill = calcBill(table);

  function renderRow(it) {
    return (
      <div className={`order-row ${it.served ? "served" : ""}`} key={it.lineId}>
        <div className="or-info">
          <div className="or-name">{it.name}</div>
          <div className="or-tags">
            {it.spice && <span className="or-tag">{spiceLabel(it.spice)} {spiceChili(it.spice)}</span>}
          </div>
          {it.note && <div className="or-note">หมายเหตุ: {it.note}</div>}
          <div className="or-price">{baht(it.price)} × {it.qty} = {baht(it.price * it.qty)}</div>
        </div>
        <div className="or-actions">
          <div className="qty-stepper">
            <button onClick={() => onChangeQty(it.lineId, -1)}>−</button>
            <span className="qv">{it.qty}</span>
            <button onClick={() => onChangeQty(it.lineId, 1)}>+</button>
          </div>
          <button className={`serve-btn ${it.served ? "done" : ""}`} onClick={() => onToggleServed(it.lineId)}>
            {it.served ? "เสริฟแล้ว ✓" : "เสริฟแล้ว"}
          </button>
          <button className="del-btn" onClick={() => onRemoveItem(it.lineId)}>ลบรายการ</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="ktr-section-title">รายการออเดอร์ — {table.name}</h2>

      <div className="order-note">
        <label>หมายเหตุรวมของโต๊ะนี้</label>
        <textarea
          placeholder="เช่น ลูกค้ารอเก้าอี้เด็ก, แพ้กุ้ง, เร่งด่วน"
          rows={2}
          value={table.note}
          onChange={(e) => onSetNote(e.target.value)}
        />
      </div>

      {table.items.length === 0 ? (
        <div className="empty-state">ยังไม่มีรายการสั่ง — กดปุ่ม "สั่งอาหาร" เพื่อเริ่มจดออเดอร์</div>
      ) : (
        <>
          {unserved.length > 0 && (
            <div>
              <div className="order-group-label">ยังไม่เสริฟ</div>
              {unserved.map(renderRow)}
            </div>
          )}
          {served.length > 0 && (
            <div>
              <div className="order-group-label">เสริฟแล้ว</div>
              {served.map(renderRow)}
            </div>
          )}
        </>
      )}

      <div className="order-footer">
        <button className="btn btn-secondary" onClick={onGoMenu}>+ เพิ่มรายการสั่ง</button>
        <div style={{ textAlign: "right" }}>
          <div className="of-label">ยอดรวม</div>
          <div className="of-total">{baht(bill.subtotal)}</div>
        </div>
        <button className="btn btn-primary" onClick={onOpenCheckout} disabled={table.items.length === 0}>คิดเงิน</button>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: คิดเงิน
   ============================================================ */

function CheckoutModal({ table, onClose, onSetDiscount, onSetSurcharge, onSetPaymentMethod, onConfirm }) {
  const bill = calcBill(table);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>คิดเงิน — {table.name}</h2>

        <div className="bill-list">
          {table.items.map((it) => (
            <div className="bill-line" key={it.lineId}>
              <span className="bl-name">
                {it.name} ×{it.qty}
                {it.spice ? ` (${spiceLabel(it.spice)})` : ""}
              </span>
              <span className="bl-amt">{baht(it.price * it.qty)}</span>
            </div>
          ))}
        </div>

        <div className="calc-row">
          <span>ยอดรวม</span>
          <span>{baht(bill.subtotal)}</span>
        </div>

        <div className="field">
          <label>ส่วนลด</label>
          <div className="adjust-row">
            <select value={table.discount.type} onChange={(e) => onSetDiscount({ ...table.discount, type: e.target.value })}>
              <option value="amount">บาท</option>
              <option value="percent">%</option>
            </select>
            <input
              type="number"
              min="0"
              value={table.discount.value}
              onChange={(e) => onSetDiscount({ ...table.discount, value: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </div>
          {bill.discountAmt > 0 && <div className="calc-row"><span>หักส่วนลด</span><span>−{baht(bill.discountAmt)}</span></div>}
        </div>

        <div className="field">
          <label>ค่าบริการ / คิดเพิ่ม</label>
          <div className="adjust-row">
            <select value={table.surcharge.type} onChange={(e) => onSetSurcharge({ ...table.surcharge, type: e.target.value })}>
              <option value="amount">บาท</option>
              <option value="percent">%</option>
            </select>
            <input
              type="number"
              min="0"
              value={table.surcharge.value}
              onChange={(e) => onSetSurcharge({ ...table.surcharge, value: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </div>
          {bill.surchargeAmt > 0 && <div className="calc-row"><span>คิดเพิ่ม</span><span>+{baht(bill.surchargeAmt)}</span></div>}
        </div>

        <div className="calc-row grand">
          <span>ยอดสุทธิ</span>
          <span>{baht(bill.total)}</span>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>ชำระโดย</label>
          <div className="pay-options">
            <button className={table.paymentMethod === "cash" ? "active" : ""} onClick={() => onSetPaymentMethod("cash")}>💵 เงินสด</button>
            <button className={table.paymentMethod === "transfer" ? "active" : ""} onClick={() => onSetPaymentMethod("transfer")}>📱 โอนเงิน</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={onConfirm}>ยืนยันการชำระเงิน</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   หน้าจัดการเมนู (CRUD)
   ============================================================ */

function MenuManageView({
  categories,
  menuItems,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}) {
  const [newCatName, setNewCatName] = useState("");
  const [newItem, setNewItem] = useState({ name: "", categoryId: categories[0]?.id || "", price: "", isNoodle: false });
  const [formError, setFormError] = useState("");

  function handleAddItem() {
    const name = newItem.name.trim();
    const price = Number(newItem.price);
    if (!name) { setFormError("กรุณากรอกชื่อเมนู"); return; }
    if (!newItem.categoryId) { setFormError("กรุณาเลือกหมวดหมู่"); return; }
    if (!price || price < 0) { setFormError("กรุณากรอกราคาที่ถูกต้อง"); return; }
    onAddMenuItem({ name, categoryId: newItem.categoryId, price, isNoodle: newItem.isNoodle });
    setNewItem({ name: "", categoryId: newItem.categoryId, price: "", isNoodle: false });
    setFormError("");
  }

  return (
    <div className="manage-grid">
      <div className="manage-card">
        <h3>หมวดหมู่เมนู</h3>
        {categories.map((c) => (
          <div className="cat-row" key={c.id}>
            <input value={c.name} onChange={(e) => onRenameCategory(c.id, e.target.value)} />
            <button className="btn btn-danger btn-sm" onClick={() => onDeleteCategory(c.id)}>ลบ</button>
          </div>
        ))}
        <div className="add-form">
          <input
            placeholder="ชื่อหมวดหมู่ใหม่"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              onAddCategory(newCatName);
              setNewCatName("");
            }}
          >
            + เพิ่มหมวดหมู่
          </button>
        </div>
      </div>

      <div className="manage-card">
        <h3>รายการเมนู</h3>
        <table className="menu-manage-table">
          <thead>
            <tr>
              <th style={{ width: "32%" }}>ชื่อเมนู</th>
              <th style={{ width: "24%" }}>หมวดหมู่</th>
              <th style={{ width: "14%" }}>ราคา</th>
              <th style={{ width: "16%" }}>เลือกเผ็ดได้</th>
              <th style={{ width: "14%" }}></th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((m) => (
              <tr key={m.id}>
                <td>
                  <input type="text" value={m.name} onChange={(e) => onUpdateMenuItem(m.id, { name: e.target.value })} />
                </td>
                <td>
                  <select value={m.categoryId} onChange={(e) => onUpdateMenuItem(m.id, { categoryId: e.target.value })}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={m.price}
                    onChange={(e) => onUpdateMenuItem(m.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={m.isNoodle} onChange={(e) => onUpdateMenuItem(m.id, { isNoodle: e.target.checked })} />
                </td>
                <td className="actions">
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteMenuItem(m.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-form" style={{ marginTop: 14, alignItems: "center" }}>
          <input
            placeholder="ชื่อเมนูใหม่"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            style={{ flex: "2 1 160px" }}
          />
          <select value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="ราคา"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            style={{ width: 90 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".85rem" }}>
            <input type="checkbox" checked={newItem.isNoodle} onChange={(e) => setNewItem({ ...newItem, isNoodle: e.target.checked })} />
            เลือกเผ็ดได้
          </label>
          <button className="btn btn-primary btn-sm" onClick={handleAddItem}>+ เพิ่มเมนู</button>
        </div>
        {formError && <div className="row-error">{formError}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   หน้าสรุปยอดขาย
   ============================================================ */

function SummaryView({ history }) {
  const today = new Date().toDateString();
  const todayOrders = history.filter((h) => new Date(h.paidAt).toDateString() === today);
  const todayTotal = todayOrders.reduce((s, h) => s + h.total, 0);
  const cashTotal = todayOrders.filter((h) => h.paymentMethod === "cash").reduce((s, h) => s + h.total, 0);
  const transferTotal = todayOrders.filter((h) => h.paymentMethod === "transfer").reduce((s, h) => s + h.total, 0);

  return (
    <div>
      <h2 className="ktr-section-title">สรุปยอดขายวันนี้</h2>
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">จำนวนบิลวันนี้</div>
          <div className="stat-value">{todayOrders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ยอดขายรวม</div>
          <div className="stat-value">{baht(todayTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">เงินสด</div>
          <div className="stat-value">{baht(cashTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">โอนเงิน</div>
          <div className="stat-value">{baht(transferTotal)}</div>
        </div>
      </div>

      {todayOrders.length === 0 ? (
        <div className="empty-state">ยังไม่มีบิลที่ชำระเงินวันนี้</div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>โต๊ะ</th>
              <th>รายการ</th>
              <th>ยอดสุทธิ</th>
              <th>ชำระโดย</th>
            </tr>
          </thead>
          <tbody>
            {todayOrders.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.paidAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>{h.tableName}</td>
                <td>{h.items.reduce((s, it) => s + it.qty, 0)} รายการ</td>
                <td>{baht(h.total)}</td>
                <td>
                  <span className={`pay-tag ${h.paymentMethod}`}>{h.paymentMethod === "cash" ? "เงินสด" : "โอนเงิน"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
