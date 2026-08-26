import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = (req.query.search as string) || "";
    const customers = await prisma.customer.findMany({
      where: search
        ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
        : undefined,
      orderBy: { name: "asc" },
    });
    // outstanding balance per customer
    const withBalance = await Promise.all(
      customers.map(async (c) => {
        const sales = await prisma.sale.findMany({ where: { customerId: c.id } });
        const outstanding = sales.reduce((sum, s) => sum + (s.total - s.amountPaid), 0);
        return { ...c, outstanding };
      })
    );
    res.json(withBalance);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: { sales: { orderBy: { createdAt: "desc" } } },
    });
    res.json(customer);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const customer = await prisma.customer.update({ where: { id: Number(req.params.id) }, data });
    res.json(customer);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
