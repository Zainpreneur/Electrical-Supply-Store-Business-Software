import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@electrosupply.com" },
    update: {},
    create: {
      name: "Store Admin",
      email: "admin@electrosupply.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@electrosupply.com" },
    update: {},
    create: {
      name: "Sales Staff",
      email: "staff@electrosupply.com",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  const categoryNames = [
    "Wires & Cables",
    "Circuit Breakers",
    "Switches & Sockets",
    "Lighting",
    "Conduits & Fittings",
    "Panels & Enclosures",
    "Tools & Equipment",
    "Motors & Fans",
  ];
  const categories: Record<string, number> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }

  const supplierData = [
    { name: "Voltex Distributors", contactPerson: "Amaka Obi", phone: "555-0101", email: "sales@voltex.com", address: "12 Industrial Rd" },
    { name: "BrightSpark Wholesale", contactPerson: "Tomiwa Bello", phone: "555-0102", email: "orders@brightspark.com", address: "88 Market St" },
    { name: "PowerLine Supplies", contactPerson: "Grace Nwosu", phone: "555-0103", email: "info@powerline.com", address: "5 Commerce Ave" },
  ];
  const suppliers: number[] = [];
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    const supplier = existing || (await prisma.supplier.create({ data: s }));
    suppliers.push(supplier.id);
  }

  const productData = [
    { sku: "WR-2.5-100", name: "2.5mm Twin & Earth Cable (100m roll)", category: "Wires & Cables", unit: "roll", cost: 45, sell: 68, stock: 40, reorder: 10, brand: "VoltCore" },
    { sku: "WR-1.5-100", name: "1.5mm Twin & Earth Cable (100m roll)", category: "Wires & Cables", unit: "roll", cost: 32, sell: 49, stock: 55, reorder: 10, brand: "VoltCore" },
    { sku: "WR-4.0-50", name: "4.0mm Single Core Cable (50m roll)", category: "Wires & Cables", unit: "roll", cost: 38, sell: 57, stock: 25, reorder: 8, brand: "VoltCore" },
    { sku: "CB-20A-SP", name: "20A Single Pole MCB", category: "Circuit Breakers", unit: "pcs", cost: 6.5, sell: 11, stock: 120, reorder: 20, brand: "SafeBreak" },
    { sku: "CB-32A-SP", name: "32A Single Pole MCB", category: "Circuit Breakers", unit: "pcs", cost: 7.2, sell: 12.5, stock: 90, reorder: 20, brand: "SafeBreak" },
    { sku: "CB-63A-DP", name: "63A Double Pole MCB", category: "Circuit Breakers", unit: "pcs", cost: 14, sell: 23, stock: 35, reorder: 10, brand: "SafeBreak" },
    { sku: "CB-RCD-30", name: "30mA RCD/RCCB", category: "Circuit Breakers", unit: "pcs", cost: 18, sell: 29, stock: 40, reorder: 10, brand: "SafeBreak" },
    { sku: "SW-1G-WHT", name: "1 Gang 2 Way Light Switch (White)", category: "Switches & Sockets", unit: "pcs", cost: 2.1, sell: 4.5, stock: 200, reorder: 30, brand: "ClickFit" },
    { sku: "SW-2G-WHT", name: "2 Gang 2 Way Light Switch (White)", category: "Switches & Sockets", unit: "pcs", cost: 3.2, sell: 6.5, stock: 150, reorder: 30, brand: "ClickFit" },
    { sku: "SK-DBL-13A", name: "Double 13A Switched Socket", category: "Switches & Sockets", unit: "pcs", cost: 3.8, sell: 7.9, stock: 6, reorder: 25, brand: "ClickFit" },
    { sku: "LT-LED-9W", name: "9W LED Bulb E27", category: "Lighting", unit: "pcs", cost: 1.5, sell: 3.5, stock: 300, reorder: 50, brand: "LumaBright" },
    { sku: "LT-PANEL-600", name: "600x600 LED Panel Light 40W", category: "Lighting", unit: "pcs", cost: 22, sell: 39, stock: 4, reorder: 15, brand: "LumaBright" },
    { sku: "LT-FLOOD-50", name: "50W LED Flood Light", category: "Lighting", unit: "pcs", cost: 16, sell: 28, stock: 45, reorder: 15, brand: "LumaBright" },
    { sku: "CD-PVC-20", name: "20mm PVC Conduit Pipe (3m)", category: "Conduits & Fittings", unit: "pcs", cost: 2.4, sell: 4.2, stock: 180, reorder: 40, brand: "DuraTube" },
    { sku: "CD-JB-20", name: "20mm Junction Box", category: "Conduits & Fittings", unit: "pcs", cost: 0.9, sell: 2.1, stock: 250, reorder: 50, brand: "DuraTube" },
    { sku: "PN-DB-8W", name: "8-Way Distribution Board", category: "Panels & Enclosures", unit: "pcs", cost: 28, sell: 47, stock: 18, reorder: 8, brand: "SafeBreak" },
    { sku: "PN-DB-12W", name: "12-Way Distribution Board", category: "Panels & Enclosures", unit: "pcs", cost: 38, sell: 62, stock: 2, reorder: 8, brand: "SafeBreak" },
    { sku: "TL-TESTER", name: "Digital Voltage Tester", category: "Tools & Equipment", unit: "pcs", cost: 9, sell: 17, stock: 30, reorder: 10, brand: "ProTech" },
    { sku: "TL-STRIP", name: "Wire Stripper/Cutter", category: "Tools & Equipment", unit: "pcs", cost: 6, sell: 12, stock: 25, reorder: 10, brand: "ProTech" },
    { sku: "MT-FAN-16", name: "16-inch Industrial Ceiling Fan", category: "Motors & Fans", unit: "pcs", cost: 34, sell: 58, stock: 12, reorder: 6, brand: "AeroDrive" },
  ];

  const productIds: Record<string, number> = {};
  for (let i = 0; i < productData.length; i++) {
    const p = productData[i];
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        brand: p.brand,
        costPrice: p.cost,
        sellPrice: p.sell,
        stockQty: p.stock,
        reorderLevel: p.reorder,
        categoryId: categories[p.category],
        supplierId: suppliers[i % suppliers.length],
      },
    });
    productIds[p.sku] = product.id;
    const existingMovement = await prisma.stockMovement.findFirst({ where: { productId: product.id } });
    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "IN", quantity: p.stock, reason: "Initial stock" },
      });
    }
  }

  const customerData = [
    { name: "Metro Construction Ltd", phone: "555-0201", email: "procurement@metroconstruction.com", address: "20 Site Ave" },
    { name: "Bright Homes Electricians", phone: "555-0202", email: "info@brighthomes.com", address: "14 Trade Way" },
    { name: "Walk-in Customer", phone: "", email: "", address: "" },
  ];
  const customerIds: number[] = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    const customer = existing || (await prisma.customer.create({ data: c }));
    customerIds.push(customer.id);
  }

  // Sample historical sales, only if none exist yet
  const saleCount = await prisma.sale.count();
  if (saleCount === 0) {
    const sampleSales = [
      { customerId: customerIds[0], items: [["CB-20A-SP", 10], ["WR-2.5-100", 2], ["PN-DB-8W", 1]], paid: "full" },
      { customerId: customerIds[1], items: [["SW-1G-WHT", 15], ["SK-DBL-13A", 5], ["LT-LED-9W", 20]], paid: "partial" },
      { customerId: customerIds[2], items: [["LT-LED-9W", 6], ["TL-TESTER", 1]], paid: "full" },
      { customerId: customerIds[0], items: [["CD-PVC-20", 30], ["CD-JB-20", 30]], paid: "unpaid" },
    ];

    let idx = 0;
    for (const s of sampleSales) {
      idx++;
      const items = s.items.map(([sku, qty]) => {
        const productId = productIds[sku as string];
        return { productId, quantity: qty as number };
      });
      const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));
      const lineItems = items.map((i) => {
        const product = productMap.get(i.productId)!;
        return {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: product.sellPrice,
          unitCost: product.costPrice,
          lineTotal: i.quantity * product.sellPrice,
        };
      });
      const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
      const tax = subtotal * 0.075;
      const total = subtotal + tax;
      const amountPaid = s.paid === "full" ? total : s.paid === "partial" ? total * 0.5 : 0;
      const status = s.paid === "full" ? "PAID" : s.paid === "partial" ? "PARTIAL" : "UNPAID";

      await prisma.sale.create({
        data: {
          saleNumber: `INV-${String(idx).padStart(5, "0")}`,
          customerId: s.customerId,
          userId: admin.id,
          subtotal,
          discount: 0,
          tax,
          total,
          amountPaid,
          status: status as any,
          paymentMethod: "CASH",
          items: { create: lineItems },
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Login with admin@electrosupply.com / admin123 or staff@electrosupply.com / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
