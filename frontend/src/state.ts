import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import type {
  Catalog,
  User,
  CompareInput,
  Comparison,
  ListView,
  Plan,
  Review,
  Product,
  Store,
  Inventory,
  Line,
} from "./types";

const raw = fetchBaseQuery({ baseUrl: "/api", credentials: "same-origin" });
const secureQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, options) => {
  const request = typeof args === "string" ? { url: args } : args;
  if (request.method && request.method !== "GET") {
    const csrf = await raw("/auth/csrf", api, options);
    if (csrf.error) return { error: csrf.error };
    const token = csrf.data as { token: string; headerName: string };
    request.headers = { ...request.headers, [token.headerName]: token.token };
  }
  return raw(request, api, options);
};
export const api = createApi({
  reducerPath: "api",
  baseQuery: secureQuery,
  tagTypes: ["Account", "Catalog", "Lists", "Plans", "Reviews"],
  endpoints: (b) => ({
    me: b.query<{ user: User | null }, void>({
      query: () => "/auth/me",
      providesTags: ["Account"],
    }),
    catalog: b.query<Catalog, string>({
      query: (l) => `/catalog?locality=${encodeURIComponent(l)}`,
      providesTags: ["Catalog"],
    }),
    localities: b.query<string[], void>({
      query: () => "/localities",
      providesTags: ["Catalog"],
    }),
    login: b.mutation<{ ok: boolean }, { email: string; password: string }>({
      query: (v) => ({
        url: "/auth/login",
        method: "POST",
        body: new URLSearchParams(v),
      }),
      invalidatesTags: ["Account"],
    }),
    register: b.mutation<
      User,
      { name: string; email: string; password: string }
    >({ query: (v) => ({ url: "/auth/register", method: "POST", body: v }) }),
    logout: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      invalidatesTags: ["Account"],
    }),
    compare: b.mutation<Comparison, CompareInput>({
      query: (v) => ({ url: "/comparisons", method: "POST", body: v }),
    }),
    lists: b.query<ListView[], void>({
      query: () => "/lists",
      providesTags: ["Lists"],
    }),
    saveList: b.mutation<
      ListView,
      { id?: number; name: string } & CompareInput
    >({
      query: ({ id, ...body }) => ({
        url: `/lists${id ? `/${id}` : ""}`,
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: ["Lists"],
    }),
    deleteList: b.mutation<unknown, number>({
      query: (id) => ({ url: `/lists/${id}`, method: "DELETE" }),
      invalidatesTags: ["Lists"],
    }),
    plans: b.query<Plan[], void>({
      query: () => "/plans",
      providesTags: ["Plans"],
    }),
    savePlan: b.mutation<
      Plan,
      { name: string; request: CompareInput; basketKey: string }
    >({
      query: (body) => ({ url: "/plans", method: "POST", body }),
      invalidatesTags: ["Plans"],
    }),
    deletePlan: b.mutation<unknown, number>({
      query: (id) => ({ url: `/plans/${id}`, method: "DELETE" }),
      invalidatesTags: ["Plans"],
    }),
    suggestions: b.query<{ product: Product; reason: string }[], void>({
      query: () => "/suggestions",
      providesTags: ["Plans", "Catalog"],
    }),
    reviews: b.query<Review[], { targetType: string; targetId: number }>({
      query: (v) =>
        `/reviews?${new URLSearchParams({ targetType: v.targetType, targetId: String(v.targetId) })}`,
      providesTags: ["Reviews"],
    }),
    addReview: b.mutation<
      unknown,
      { targetType: string; targetId: number; rating: number; comment: string }
    >({
      query: (body) => ({ url: "/reviews", method: "POST", body }),
      invalidatesTags: ["Reviews"],
    }),
    admin: b.query<
      { products: Product[]; stores: Store[]; inventory: Inventory[] },
      void
    >({ query: () => "/admin/catalog", providesTags: ["Catalog"] }),
    adminSave: b.mutation<
      unknown,
      { kind: "products" | "stores" | "inventory"; id?: number; body: unknown }
    >({
      query: ({ kind, id, body }) => ({
        url: `/admin/${kind}${id ? `/${id}` : ""}`,
        method: kind === "inventory" || id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: ["Catalog"],
    }),
    adminArchive: b.mutation<
      unknown,
      { kind: "products" | "stores"; id: number }
    >({
      query: ({ kind, id }) => ({
        url: `/admin/${kind}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Catalog"],
    }),
  }),
});

export interface Draft extends CompareInput {
  name: string;
  id?: number;
}
const initial: Draft = {
  name: "My weekly essentials",
  locality: "Kothrud",
  budget: null,
  items: [],
};
const draft = createSlice({
  name: "draft",
  initialState: initial,
  reducers: {
    add: (s, a: PayloadAction<number>) => {
      const line = s.items.find((i) => i.productId === a.payload);
      if (line) line.quantity = Math.min(999, line.quantity + 1);
      else s.items.push({ productId: a.payload, quantity: 1 });
    },
    quantity: (s, a: PayloadAction<Line>) => {
      s.items = s.items.map((i) =>
        i.productId === a.payload.productId
          ? {
              ...i,
              quantity: Math.max(
                1,
                Math.min(999, Math.trunc(a.payload.quantity)),
              ),
            }
          : i,
      );
    },
    remove: (s, a: PayloadAction<number>) => {
      s.items = s.items.filter((i) => i.productId !== a.payload);
    },
    settings: (
      s,
      a: PayloadAction<Partial<Pick<Draft, "name" | "locality" | "budget">>>,
    ) => Object.assign(s, a.payload),
    load: (_s, a: PayloadAction<Draft>) => a.payload,
    clear: () => initial,
  },
});
export const actions = draft.actions;
export const makeStore = () =>
  configureStore({
    reducer: { draft: draft.reducer, [api.reducerPath]: api.reducer },
    middleware: (g) => g().concat(api.middleware),
  });
export const store = makeStore();
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export function errorMessage(e: unknown): string {
  const x = e as { data?: { message?: string }; message?: string };
  return (
    x?.data?.message ||
    x?.message ||
    "Unable to reach the server. Please try again."
  );
}
