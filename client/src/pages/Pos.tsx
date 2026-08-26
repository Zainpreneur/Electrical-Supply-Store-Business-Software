import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Product, Customer, PaymentMethod } from "../api/types";
import { money } from "../lib/format";

interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function Pos() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0.075);
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Product[]>("/products").then((res) => setProducts(res.data.filter((p) => p.active)));
    api.get<Customer[]>("/customers").then((res) => setCustomers(res.data));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, search]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stockQty) } : l
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellPrice }];
    });
  }

  function updateLine(productId: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  async function handleCheckout() {
    setError("");
    setSuccess(null);
    if (cart.length === 0) return setError("Cart is empty");
    setSubmitting(true);
    try {
      const res = await api.post("/sales", {
        customerId: customerId || undefined,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity, unitPrice: l.unitPrice })),
        discount,
        taxRate,
        amountPaid: amountPaid === "" ? total : Number(amountPaid),
        paymentMethod,
      });
      setSuccess(`Sale ${res.data.saleNumber} completed!`);
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setCustomerId("");
      api.get<Product[]>("/products").then((r) => setProducts(r.data.filter((p) => p.active)));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">New Sale</h1>
          <p className="text-sm text-slate-500">Search products and build the customer's cart</p>
        </div>
        <input
          className="input"
          placeholder="Search products by name, SKU, or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stockQty <= 0}
              className="card p-3 text-left hover:border-brand-400 disabled:opacity-40"
            >
              <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-400">{p.sku}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-700">{money(p.sellPrice)}</span>
                <span className="text-xs text-slate-400">{p.stockQty} in stock</span>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-slate-400">No products match your search</p>
          )}
        </div>
      </div>

      <div className="card flex flex-col p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Cart</h2>
        {success && <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="max-h-64 flex-1 space-y-2 overflow-y-auto">
          {cart.map((l) => (
            <div key={l.product.id} className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm">
              <div className="flex-1">
                <p className="truncate font-medium text-slate-700">{l.product.name}</p>
                <p className="text-xs text-slate-400">{money(l.unitPrice)} each</p>
              </div>
              <input
                type="number"
                min={1}
                max={l.product.stockQty}
                className="input w-16 py-1"
                value={l.quantity}
                onChange={(e) => updateLine(l.product.id, { quantity: Math.max(1, Number(e.target.value)) })}
              />
              <span className="w-16 text-right font-medium">{money(l.quantity * l.unitPrice)}</span>
              <button onClick={() => removeLine(l.product.id)} className="text-red-400 hover:text-red-600">
                ✕
              </button>
            </div>
          ))}
          {cart.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Cart is empty</p>}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Discount</label>
              <input type="number" className="input" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Tax rate</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1 py-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>-{money(discount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Amount Paid</label>
              <input
                type="number"
                className="input"
                placeholder={total.toFixed(2)}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT">Credit (pay later)</option>
              </select>
            </div>
          </div>

          <button className="btn-primary mt-2 w-full" onClick={handleCheckout} disabled={submitting || cart.length === 0}>
            {submitting ? "Processing…" : `Complete Sale — ${money(total)}`}
          </button>
          <button className="btn-secondary w-full" onClick={() => navigate("/sales")}>
            View Sales History
          </button>
        </div>
      </div>
    </div>
  );
}
