import 'reflect-metadata';
import { Category } from './Category.js';
import { Product } from './Product.js';
import { User } from './User.js';

export { Category, Product, User };
export const models = [User, Category, Product];
