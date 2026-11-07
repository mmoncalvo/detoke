import { Op, type ModelStatic, type Transaction } from 'sequelize';
import type { Model } from 'sequelize-typescript';
import { slugify } from '../../shared/business.js';

/** Slug from the text, with a numeric suffix if it is taken. */
export async function uniqueSlug(model: ModelStatic<Model>, text: string, transaction?: Transaction) {
  const base = slugify(text) || 'item';
  const taken = await model.findAll({ attributes: ['slug'], where: { slug: { [Op.like]: `${base}%` } }, raw: true, transaction });
  const slugs = new Set(taken.map((row) => (row as unknown as { slug: string }).slug));
  if (!slugs.has(base)) return base;
  let suffix = 2;
  while (slugs.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
