export interface Product {
  id: number;
  name: string;
  brand: string;
  packSize: string;
  category: string;
  imageUrl: string;
  mrp: number;
  active: boolean;
}
export interface Store {
  id: number;
  name: string;
  type: "ONLINE" | "LOCAL";
  address: string;
  localities: string;
  fee: number;
  deliveryMinutes: number;
  active: boolean;
}
export interface Offer {
  id: number;
  productId: number;
  storeId: number;
  price: number;
  stock: number;
  stale: boolean;
  updatedAt: string;
  offerText: string | null;
}
export interface Inventory {
  id?: number;
  productId: number;
  storeId: number;
  stock: number;
  regularPrice: number;
  offerPrice: number | null;
  offerText: string | null;
  offerStart: string | null;
  offerEnd: string | null;
  updatedAt?: string;
}
export interface Catalog {
  products: Product[];
  stores: Store[];
  offers: Offer[];
  sampleData: boolean;
}
export interface User {
  id: number;
  name: string;
  email: string;
  role: "SHOPPER" | "ADMIN";
}
export interface Line {
  productId: number;
  quantity: number;
}
export interface CompareInput {
  locality: string;
  budget: number | null;
  items: Line[];
}
export interface Allocation extends Line {
  storeId: number;
  storeName: string;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  stale: boolean;
  updatedAt: string;
}
export interface Basket {
  key: string;
  stores: Pick<Store, "id" | "name" | "type" | "fee" | "deliveryMinutes">[];
  items: Allocation[];
  missing: number[];
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
  complete: boolean;
  overBudget: number | null;
}
export interface Comparison {
  singleStores: Basket[];
  splitStores: Basket[];
  bestSingle: Basket | null;
  bestSplit: Basket | null;
  splitSavings: number;
  message: string;
}
export interface ListView {
  list: {
    id: number;
    name: string;
    locality: string;
    budget: number | null;
    updatedAt: string;
  };
  items: Line[];
}
export interface Plan {
  id: number;
  name: string;
  locality: string;
  createdAt: string;
  snapshot: string;
}
export interface Snapshot {
  request: CompareInput;
  basket: Basket;
  products: Product[];
}
export interface Review {
  id: number;
  author: string;
  targetType: string;
  targetId: number;
  rating: number;
  comment: string;
  createdAt: string;
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
