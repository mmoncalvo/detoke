import 'reflect-metadata';
import { Business } from './Business.js';
import { BusinessCategory } from './BusinessCategory.js';
import { Product } from './Product.js';
import { ProductCategory } from './ProductCategory.js';
import { User } from './User.js';

export { Business, BusinessCategory, Product, ProductCategory, User };
export const models = [User, BusinessCategory, ProductCategory, Business, Product];
