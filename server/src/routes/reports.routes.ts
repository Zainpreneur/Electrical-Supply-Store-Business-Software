import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [products, todaySales, monthSales, recentSales, lowStock, customerCount] = await Promise.all([
      prisma.product.findMany({ where: { active: true } }),
      prisma.sale.findMany({ where: { createdAt: { gte: startOfToday } } }),
      prisma.sale.findMany({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: true },
      }),
      prisma.product.findMany({ where: { active: true } }),
      prisma.customer.count(),
    ]);

    const lowStockItems = lowStock.filter((p) => p.stockQty <= p.reorderLevel);
    const inventoryValue = products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);

    res.json({
      todayRevenue: todaySales.reduce((s, sale) => s + sale.total, 0),
      todaySalesCount: todaySales.length,
      monthRevenue: monthSales.reduce((s, sale) => s + sale.total, 0),
      monthSalesCount: monthSales.length,
      totalProducts: products.length,
      lowStockCount: lowStockItems.length,
      inventoryValue,
      customerCount,
      recentSales,
      lowStockItems: lowStockItems.slice(0, 8),
    });
  })
);

router.get(
  "/sales-summary",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const sales = await prisma.sale.findMany({ where, include: { items: true } });

    const revenue = sales.reduce((s, sale) => s + sale.total, 0);
    const cost = sales.reduce(
      (s, sale) => s + sale.items.reduce((is, i) => is + i.unitCost * i.quantity, 0),
      0
    );
    const outstanding = sales.reduce((s, sale) => s + (sale.total - sale.amountPaid), 0);

    const productTotals = new Map<number, { productId: number; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const cur = productTotals.get(item.productId) || { productId: item.productId, quantity: 0, revenue: 0 };
        cur.quantity += item.quantity;
        cur.revenue += item.lineTotal;
        productTotals.set(item.productId, cur);
      }
    }
    const topProductRows = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const products = await prisma.product.findMany({
      where: { id: { in: topProductRows.map((r) => r.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = topProductRows.map((r) => ({
      ...r,
      name: productMap.get(r.productId)?.name || "Unknown",
      sku: productMap.get(r.productId)?.sku || "",
    }));

    res.json({
      salesCount: sales.length,
      revenue,
      cost,
      profit: revenue - cost,
      outstanding,
      topProducts,
    });
  })
);

router.get(
  "/inventory-valuation",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    const rows = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category?.name || "Uncategorized",
      stockQty: p.stockQty,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      costValue: p.stockQty * p.costPrice,
      retailValue: p.stockQty * p.sellPrice,
    }));
    res.json({
      rows,
      totalCostValue: rows.reduce((s, r) => s + r.costValue, 0),
      totalRetailValue: rows.reduce((s, r) => s + r.retailValue, 0),
    });
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true, supplier: true },
      orderBy: { stockQty: "asc" },
    });
    res.json(products.filter((p) => p.stockQty <= p.reorderLevel));
  })
);

export default router;
