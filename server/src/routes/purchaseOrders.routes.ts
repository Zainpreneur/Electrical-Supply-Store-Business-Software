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
  unitCost: z.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.number().int(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

async function nextPoNumber(): Promise<string> {
  const count = await prisma.purchaseOrder.count();
  return `PO-${String(count + 1).padStart(5, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string>;
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: status ? { status: status as any } : undefined,
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(purchaseOrders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: Number(req.params.id) },
      include: { supplier: true, items: { include: { product: true } }, user: true },
    });
    if (!po) throw new HttpError(404, "Purchase order not found");
    res.json(po);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const total = data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const poNumber = await nextPoNumber();
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        userId: req.user!.id,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes,
        total,
        status: "ORDERED",
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            lineTotal: i.quantity * i.unitCost,
          })),
        },
      },
      include: { items: true, supplier: true },
    });
    res.status(201).json(po);
  })
);

router.post(
  "/:id/receive",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new HttpError(404, "Purchase order not found");
    if (po.status === "RECEIVED") throw new HttpError(400, "Purchase order already received");
    if (po.status === "CANCELLED") throw new HttpError(400, "Cannot receive a cancelled order");

    await prisma.$transaction([
      ...po.items.flatMap((item) => [
        prisma.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity }, costPrice: item.unitCost },
        }),
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            reason: `Received PO ${po.poNumber}`,
            referenceType: "PurchaseOrder",
            referenceId: po.id,
          },
        }),
      ]),
      prisma.purchaseOrder.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } }),
    ]);

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true },
    });
    res.json(updated);
  })
);

router.post(
  "/:id/cancel",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new HttpError(404, "Purchase order not found");
    if (po.status === "RECEIVED") throw new HttpError(400, "Cannot cancel a received order");
    const updated = await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json(updated);
  })
);

export default router;
