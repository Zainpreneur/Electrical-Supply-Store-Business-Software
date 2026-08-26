import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  unit: z.string().min(1).default("pcs"),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().nonnegative(),
  stockQty: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(5),
  categoryId: z.number().int().optional().nullable(),
  supplierId: z.number().int().optional().nullable(),
  active: z.boolean().optional(),
});

const adjustSchema = z.object({
  quantity: z.number(),
  reason: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, categoryId, lowStock } = req.query as Record<string, string>;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = Number(categoryId);
    const products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: "asc" },
    });
    const filtered = lowStock === "true" ? products.filter((p) => p.stockQty <= p.reorderLevel) : products;
    res.json(filtered);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        category: true,
        supplier: true,
        movements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const product = await prisma.product.create({ data });
    if (product.stockQty > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: product.stockQty,
          reason: "Initial stock",
        },
      });
    }
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data });
    res.json(product);
  })
);

router.post(
  "/:id/adjust-stock",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { quantity, reason } = adjustSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");
    const newQty = product.stockQty + quantity;
    if (newQty < 0) throw new HttpError(400, "Resulting stock cannot be negative");
    const [updated] = await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { stockQty: newQty } }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: "ADJUSTMENT",
          quantity,
          reason: reason || "Manual adjustment",
        },
      }),
    ]);
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
