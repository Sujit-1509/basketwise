import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  RefreshCw,
  Check,
  Truck,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { api, useAppSelector, errorMessage } from "../state";
import {
  useCatalog,
  PageTitle,
  Loading,
  Failure,
  Empty,
  BrowseLink,
} from "../ui";
import { money, type Basket, type Product, type Store } from "../types";
export function BasketCard({
  basket,
  products,
  name,
  onSave,
  busy = false,
  recommended = false,
  storeType,
}: {
  basket: Basket;
  products: Product[];
  name?: string;
  onSave?: (key: string) => void;
  busy?: boolean;
  recommended?: boolean;
  storeType?: Store["type"];
}) {
  return (
    <article className={`basket-card ${recommended ? "recommended" : ""}`}>
      <div className="basket-card-head">
        <div>
          <span className="pill">
            {basket.stores.length > 1
              ? "TWO-STORE PLAN"
              : (basket.stores[0]?.type ?? storeType) === "LOCAL"
                ? "NEARBY PICKUP"
                : "ONLINE DELIVERY"}
          </span>
          <h2>
            {basket.stores.map((s) => s.name).join(" + ") || name || "Store"}
          </h2>
          <p>
            {basket.complete ? (
              <>
                <Check size={15} /> Your complete list is available
              </>
            ) : (
              `${basket.items.length} available · ${basket.missing.length} missing`
            )}
          </p>
        </div>
        <div className="basket-price">
          <strong>{money(basket.total)}</strong>
          <small>
            {basket.complete ? "complete basket" : "partial basket only"}
          </small>
        </div>
      </div>
      <div className="cost-breakdown">
        <span>
          Items <b>{money(basket.subtotal)}</b>
        </span>
        <span>
          Store fees <b>{money(basket.fees)}</b>
        </span>
        <span>
          Below MRP <b>{money(basket.discount)}</b>
        </span>
      </div>
      {basket.overBudget !== null && basket.overBudget > 0 ? (
        <p className="notice warning">
          {money(basket.overBudget)} over your budget
        </p>
      ) : null}
      {basket.missing.length ? (
        <p className="notice warning">
          Missing:{" "}
          {basket.missing
            .map(
              (id) =>
                products.find((p) => p.id === id)?.name ?? `Product ${id}`,
            )
            .join(", ")}
          . This basket is excluded from complete-basket rankings.
        </p>
      ) : null}
      <details>
        <summary>
          View item allocation & price timestamps <ChevronDown size={15} />
        </summary>
        <div className="allocation-list">
          {basket.items.map((l) => (
            <div key={l.productId}>
              <span>
                <b>
                  {products.find((p) => p.id === l.productId)?.name ??
                    `Product ${l.productId}`}
                </b>
                <small>
                  {products.find((p) => p.id === l.productId)?.brand} ·{" "}
                  {products.find((p) => p.id === l.productId)?.packSize} · Qty{" "}
                  {l.quantity} · {l.storeName}
                </small>
                <small>
                  Updated {new Date(l.updatedAt).toLocaleString("en-IN")}
                  {l.stale ? " · Over 24 hours old" : ""}
                </small>
              </span>
              <b>{money(l.lineTotal)}</b>
            </div>
          ))}
        </div>
      </details>
      <div className="basket-card-foot">
        <span>
          {basket.stores.map((s) => (
            <span className="fulfillment" key={s.id}>
              {s.type === "LOCAL" ? <MapPin size={15} /> : <Truck size={15} />}{" "}
              {s.type === "LOCAL"
                ? "Pickup"
                : `~${s.deliveryMinutes} min delivery`}
            </span>
          ))}
        </span>
        {onSave ? (
          <button
            className={`button ${recommended ? "primary" : ""}`}
            disabled={!basket.complete || busy}
            onClick={() => onSave(basket.key)}
          >
            Save this plan <ArrowRight size={16} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
export default function Compare() {
  const draft = useAppSelector((s) => s.draft);
  const {
    data: catalog,
    error: catalogError,
    isLoading: catalogLoading,
    refetch: reloadCatalog,
  } = useCatalog();
  const [compare, result] = api.useCompareMutation();
  const [save, { isLoading: saving }] = api.useSavePlanMutation();
  const [filter, setFilter] = useState("All stores");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  useEffect(() => {
    setNotice("");
    setFailure("");
    if (draft.items.length) void compare(draft);
  }, [draft, compare]);
  if (!draft.items.length)
    return (
      <Empty title="Start with a grocery list">
        <p>We’ll compare the full basket once you add your products.</p>
        <BrowseLink />
      </Empty>
    );
  const data = result.data;
  const displayed =
    filter === "Split stores"
      ? (data?.splitStores ?? [])
      : (data?.singleStores ?? []).filter(
          (b) =>
            filter === "All stores" ||
            catalog?.stores.find((s) => String(s.id) === b.key)?.type ===
              (filter === "Online delivery" ? "ONLINE" : "LOCAL"),
        );
  const best =
    data?.bestSingle && data.bestSplit
      ? data.bestSplit.total < data.bestSingle.total
        ? data.bestSplit
        : data.bestSingle
      : (data?.bestSingle ?? data?.bestSplit);
  async function savePlan(key: string) {
    setFailure("");
    try {
      await save({ name: draft.name, request: draft, basketKey: key }).unwrap();
      setNotice(
        "Shopping plan saved using current server prices. See its price snapshot in Saved plans.",
      );
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  return (
    <>
      <PageTitle eyebrow="YOUR LIST, COMPARED" title="Find the right basket.">
        <button
          className="button"
          disabled={result.isLoading}
          onClick={() => {
            void reloadCatalog();
            void compare(draft);
          }}
        >
          <RefreshCw size={16} />
          Recalculate
        </button>
      </PageTitle>
      <p className="page-description">
        {draft.items.length} exact products · {draft.locality}, Pune ·{" "}
        {draft.budget === null
          ? "No budget set"
          : `${money(draft.budget)} budget`}{" "}
        <Link to="/list">Edit list</Link>
      </p>
      {result.isLoading || catalogLoading ? (
        <Loading />
      ) : result.error ? (
        <Failure error={result.error} />
      ) : catalogError ? (
        <Failure error={catalogError} />
      ) : data && catalog ? (
        <>
          <div className="comparison-summary">
            <div>
              <span className="eyebrow">LOWEST COMPLETE TOTAL</span>
              <strong>{best ? money(best.total) : "Unavailable"}</strong>
              <p>
                {best?.stores.map((s) => s.name).join(" + ") ??
                  "Try alternatives or another locality"}
              </p>
            </div>
            <div>
              <span className="eyebrow">SPLITTING YOUR LIST SAVES</span>
              <strong>
                {data.bestSingle ? money(data.splitSavings) : "Not applicable"}
              </strong>
              <p>
                {data.bestSingle
                  ? "Compared with the cheapest complete single store"
                  : "No complete single-store basket to compare against"}
              </p>
            </div>
            <div>
              <span className="eyebrow">THE COMPLETE PICTURE</span>
              <p>{data.message}</p>
              <small>Sample prices. Local pickup excludes travel costs.</small>
            </div>
          </div>
          {notice ? (
            <p role="status" className="notice success">
              {notice} <Link to="/history">Open saved plans</Link>
            </p>
          ) : null}
          {failure ? (
            <p role="alert" className="notice error">
              {failure}
            </p>
          ) : null}
          <div className="categories">
            {[
              "All stores",
              "Online delivery",
              "Nearby pickup",
              "Split stores",
            ].map((f) => (
              <button
                key={f}
                className={f === filter ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="comparison-list">
            {displayed.map((b) => (
              <BasketCard
                key={b.key}
                basket={b}
                products={catalog.products}
                name={catalog.stores.find((s) => String(s.id) === b.key)?.name}
                storeType={
                  catalog.stores.find((s) => String(s.id) === b.key)?.type
                }
                recommended={best?.key === b.key}
                busy={saving}
                onSave={(key) => void savePlan(key)}
              />
            ))}
            {filter === "Split stores" && !data.splitStores.length ? (
              <Empty title="No complete two-store plan">
                <p>
                  A single store may already cover your list, or stock is
                  insufficient.
                </p>
              </Empty>
            ) : null}
            {filter !== "Split stores" && !displayed.length ? (
              <Empty title="No stores available">
                <p>
                  No matching stores serve this locality. Choose another
                  locality or store filter.
                </p>
              </Empty>
            ) : null}
          </div>
          <section className="panel compare-notes">
            <h3>Know what you’re comparing</h3>
            <p>
              Offers are already included in selling prices. Each used store’s
              fixed fee is charged once. Stock is checked for the full quantity
              of each item; saving a plan does not reserve it.
            </p>
            {catalog.stores
              .filter((s) => s.type === "LOCAL")
              .map((s) => (
                <p key={s.id}>
                  <strong>{s.name}:</strong> {s.address}
                </p>
              ))}
          </section>
        </>
      ) : null}
    </>
  );
}
