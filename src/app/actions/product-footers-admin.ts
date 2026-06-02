"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export async function createAutomaticFooter(data: { title: string; html: string }) {
  await requireAdmin();
  const title = data.title.trim();
  if (!title) throw new Error("Title required");
  await prisma.automaticFooter.create({
    data: { title, html: data.html ?? "" },
  });
  await revalidatePaths();
}

export async function updateAutomaticFooter(
  id: string,
  data: { title: string; html: string },
) {
  await requireAdmin();
  const title = data.title.trim();
  if (!title) throw new Error("Title required");
  await prisma.automaticFooter.update({
    where: { id },
    data: { title, html: data.html ?? "" },
  });
  await revalidatePaths();
}

export async function deleteAutomaticFooter(id: string) {
  await requireAdmin();
  await prisma.automaticFooter.delete({ where: { id } });
  await revalidatePaths();
}

async function revalidateProductDetailPages() {
  const rows = await prisma.product.findMany({ select: { slug: true } });
  for (const { slug } of rows) {
    revalidatePath(`/product/${slug}`);
  }
}

async function revalidatePaths() {
  revalidatePath("/settings/products");
  revalidatePath("/settings/products/footers");
  revalidatePath("/settings/products/types");
  revalidatePath("/store");
  await revalidateProductDetailPages();
}
