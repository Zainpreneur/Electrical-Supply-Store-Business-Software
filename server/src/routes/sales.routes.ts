import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  customerId: z.number().int().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(1).default(0),
  amountPaid: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CREDIT"]).default("CASH"),
  notes: z.string().optional().nullable(),
});

async function nextSaleNumber(): Promise<string> {
  const count = await prisma.sale.count();
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

function statusFor(total: number, amountPaid: number): "PAID" | "PARTIAL" | "UNPAID" {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= total) return "PAID";
  return "PARTIAL";
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, status, customerId } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (status) where.status = status;
    if (customerId) where.customerId = Number(customerId);
    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true, items: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: Number(req.params.id) },
      include: { customer: true, user: true, items: { include: { product: true } } },
    });
    if (!sale) throw new HttpError(404, "Sale not found");
    res.json(sale);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new HttpError(400, `Product ${item.productId} not found`);
      if (product.stockQty < item.quantity) {
        throw new HttpError(400, `Insufficient stock for ${product.name} (have ${product.stockQty}, need ${item.quantity})`);
      }
    }

    const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxableAmount = Math.max(subtotal - data.discount, 0);
    const tax = taxableAmount * data.taxRate;
    const total = taxableAmount + tax;
    const amountPaid = Math.min(data.amountPaid, total);
    const status = statusFor(total, amountPaid);
    const saleNumber = await nextSaleNumber();

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          saleNumber,
          customerId: data.customerId || null,
          userId: req.user!.id,
          subtotal,
          discount: data.discount,
          tax,
          total,
          amountPaid,
          status,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          items: {
            create: data.items.map((i) => {
              const product = productMap.get(i.productId)!;
              return {
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                unitCost: product.costPrice,
                lineTotal: i.quantity * i.unitPrice,
              };
            }),
          },
        },
        include: { items: true, customer: true },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity,
            reason: `Sale ${saleNumber}`,
            referenceType: "Sale",
            referenceId: created.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(sale);
  })
);

const paymentSchema = z.object({ amount: z.number().positive() });

router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { amount } = paymentSchema.parse(req.body);
    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new HttpError(404, "Sale not found");
    const amountPaid = Math.min(sale.amountPaid + amount, sale.total);
    const status = statusFor(sale.total, amountPaid);
    const updated = await prisma.sale.update({ where: { id }, data: { amountPaid, status } });
    res.json(updated);
  })
);

router.post(
  "/:id/void",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) throw new HttpError(404, "Sale not found");

    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            reason: `Void sale ${sale.saleNumber}`,
            referenceType: "Sale",
            referenceId: sale.id,
          },
        });
      }
      await tx.sale.delete({ where: { id } });
    });

    res.status(204).send();
  })
);

export default router;
