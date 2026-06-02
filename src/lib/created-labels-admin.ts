import type { Prisma } from "@/generated/prisma/client";

export function createdLabelsSearchWhere(q: string): {
  designWhere: Prisma.CustomerLabelDesignWhereInput;
  cartWhere: Prisma.CartLabelItemWhereInput;
  orderWhere: Prisma.OrderLabelLineWhereInput;
  bagWhere: Prisma.CustomerLabelBagWhereInput;
} {
  const t = q.trim();
  if (!t) {
    return { designWhere: {}, cartWhere: {}, orderWhere: {}, bagWhere: {} };
  }

  const customerMatch: Prisma.CustomerWhereInput = {
    OR: [
      { email: { contains: t, mode: "insensitive" } },
      { displayName: { contains: t, mode: "insensitive" } },
      { firstName: { contains: t, mode: "insensitive" } },
      { lastName: { contains: t, mode: "insensitive" } },
    ],
  };

  return {
    designWhere: {
      OR: [
        { name: { contains: t, mode: "insensitive" } },
        { customer: customerMatch },
        { template: { name: { contains: t, mode: "insensitive" } } },
      ],
    },
    cartWhere: {
      OR: [
        { displayName: { contains: t, mode: "insensitive" } },
        { template: { name: { contains: t, mode: "insensitive" } } },
        { cart: { customer: customerMatch } },
      ],
    },
    orderWhere: {
      OR: [
        { displayName: { contains: t, mode: "insensitive" } },
        { template: { name: { contains: t, mode: "insensitive" } } },
        { order: { customer: customerMatch } },
      ],
    },
    bagWhere: { customer: customerMatch },
  };
}

export function formatAdminDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
