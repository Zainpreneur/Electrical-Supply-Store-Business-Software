import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(users);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, role: data.role, passwordHash },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.status(201).json(user);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    const { password, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "Cannot deactivate your own account");
    await prisma.user.update({ where: { id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
