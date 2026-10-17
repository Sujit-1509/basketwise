import { memo, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  Plus,
  Check,
  SlidersHorizontal,
  Store as StoreIcon,
  ShieldCheck,
  ShoppingBasket,
  Leaf,
} from "lucide-react";
import { actions, api, useAppDispatch, useAppSelector } from "../state";
import { useCatalog, Loading, Failure, PageTitle, Empty } from "../ui";
import { money, type Product, type Offer } from "../types";
export const ProductCard = memo(function ProductCard({
  product,
  offer,
  count,
  onAdd,
}: {
  product: Product;
  offer?: Offer;
  count: number;
  onAdd: (id: number) => void;
}) {
  return (
    <article className="product-card">
      <div
        className={`product-picture picture-${product.category.toLowerCase()}`}
      >
        <img
          src={product.imageUrl}
          alt={`${product.name} illustration`}
          loading="lazy"
          width="160"
          height="160"
        />
        {offer?.offerText ? (
          <span className="product-offer">SPECIAL PRICE</span>
        ) : null}
      </div>
      <div className="product-info">
        <p className="product-brand">{product.brand}</p>
        <h3>{product.name}</h3>
        <p className="pack-size">{product.packSize}</p>
        <div className="product-bottom">
          <div>
            {offer ? (
              <>
                <strong>{money(offer.price)}</strong>
                <del>{money(product.mrp)}</del>
                <small>lowest item price</small>
              </>
            ) : (
              <strong className="unavailable">Unavailable</strong>
            )}
          </div>
          <button
            disabled={!offer}
            className={count ? "add-button added" : "add-button"}
            aria-label={`Add ${product.name} ${product.brand}`}
            onClick={() => onAdd(product.id)}
          >
            {count ? (
              <>
                <Check size={14} />
                {count}
              </>
            ) : (
              <>
                <Plus size={16} />
                Add
              </>
            )}
          </button>
        </div>
        {offer?.stale ? (
          <small className="stale">Price update over 24h old</small>
        ) : null}
        <Link
          className="review-link"
          to={`/feedback?type=PRODUCT&id=${product.id}`}
        >
          Product feedback
        </Link>
      </div>
    </article>
  );
});
export default function Catalogue({ home = false }: { home?: boolean }) {
  const { data, isLoading, error } = useCatalog();
  const { data: me } = api.useMeQuery();
  const { data: suggestions } = api.useSuggestionsQuery(undefined, {
    skip: !me?.user,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All groceries");
  const [brand, setBrand] = useState("");
  const deferred = useDeferredValue(search);
  const lines = useAppSelector((s) => s.draft.items);
  const dispatch = useAppDispatch();
  const onAdd = useMemo(
    () => (id: number) => dispatch(actions.add(id)),
    [dispatch],
  );
  const cheapest = useMemo(() => {
    const map = new Map<number, Offer>();
    for (const offer of data?.offers ?? [])
      if (
        offer.stock > 0 &&
        (!map.has(offer.productId) ||
          offer.price < map.get(offer.productId)!.price)
      )
        map.set(offer.productId, offer);
    return map;
  }, [data]);
  const counts = useMemo(
    () => new Map(lines.map((i) => [i.productId, i.quantity])),
    [lines],
  );
  const filtered = useMemo(
    () =>
      data?.products.filter(
        (p) =>
          (category === "All groceries" || p.category === category) &&
          (!brand || p.brand === brand) &&
          `${p.name} ${p.brand}`.toLowerCase().includes(deferred.toLowerCase()),
      ) ?? [],
    [data, category, brand, deferred],
  );
  if (isLoading) return <Loading />;
  if (error) return <Failure error={error} />;
  if (!data) return null;
  const estimate = lines.reduce(
    (sum, l) => sum + (cheapest.get(l.productId)?.price ?? 0) * l.quantity,
    0,
  );
  return (
    <>
      <PageTitle
        eyebrow="A FRESH START TO EVERYDAY SHOPPING"
        title={
          home
            ? `Good groceries. Better choices.`
            : "Find your everyday essentials."
        }
      >
        <span className="subtle-tag">
          <span className="live-dot" />
          Pune sample catalog
        </span>
      </PageTitle>
      {home ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-kicker">
                <Leaf size={15} /> A LITTLE PLANNING GOES A LONG WAY
              </span>
              <h2>
                Your list.
                <br />
                The right store.
                <br />
                <em>A better basket.</em>
              </h2>
              <p>
                Compare your whole grocery list across online stores and
                neighbourhood shops. See the total before you choose.
              </p>
              <Link to="/list" className="button cream">
                Build my grocery list <ArrowRight size={18} />
              </Link>
              <div className="hero-foot">
                <ShieldCheck size={16} /> Every fee included. Every choice
                yours.
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-circle" />
              <div className="art-caption">
                THE EVERYDAY
                <br />
                <b>good stuff.</b>
              </div>
              <img className="art-rice" src="/images/rice.svg" alt="" />
              <img className="art-milk" src="/images/milk.svg" alt="" />
              <img className="art-oil" src="/images/oil.svg" alt="" />
              <div className="art-basket">
                <ShoppingBasket size={140} strokeWidth={1} />
              </div>
              <span className="art-label">
                <Check size={15} />A smarter way to shop
              </span>
            </div>
          </section>
          <div className="benefits">
            <div>
              <span>
                <StoreIcon size={21} />
              </span>
              <p>
                <strong>{data.stores.length} stores, one clear view</strong>
                Online convenience. Local favourites.
              </p>
            </div>
            <div>
              <span>
                <ShoppingBasket size={21} />
              </span>
              <p>
                <strong>Compare the complete basket</strong>Item prices + fees.
                No guesswork.
              </p>
            </div>
            <div>
              <span>
                <ShieldCheck size={21} />
              </span>
              <p>
                <strong>Your budget comes first</strong>Exact brands. No
                surprise swaps.
              </p>
            </div>
          </div>
        </>
      ) : null}
      {suggestions?.length ? (
        <section className="repeat-section">
          <h2>Back on your list?</h2>
          <p>Based on products in your saved plans.</p>
          <div className="repeat-items">
            {suggestions.map((s) => (
              <button
                key={s.product.id}
                title={s.reason}
                onClick={() => onAdd(s.product.id)}
              >
                <Plus size={15} />
                {s.product.name}
                <small>{s.reason}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="catalogue-layout">
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE PANTRY EDIT</p>
              <h2>Everyday essentials</h2>
            </div>
            <span>{data.products.length} carefully listed products</span>
          </div>
          <div className="catalogue-search">
            <Search size={19} />
            <input
              aria-label="Search groceries"
              placeholder="Search rice, milk, your favourite brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SlidersHorizontal size={18} />
            <select
              aria-label="Filter by brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">All brands</option>
              {[...new Set(data.products.map((p) => p.brand))].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="categories" aria-label="Categories">
            {[
              "All groceries",
              ...new Set(data.products.map((p) => p.category)),
            ].map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="catalogue-caption">
            Illustrative prices · Exact brands & pack sizes · Fees calculated at
            comparison
          </p>
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  offer={cheapest.get(p.id)}
                  count={counts.get(p.id) ?? 0}
                  onAdd={onAdd}
                />
              ))}
            </div>
          ) : (
            <Empty title="No matching groceries">
              <p>Try another search or clear the filters.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setBrand("");
                  setCategory("All groceries");
                }}
              >
                Clear filters
              </button>
            </Empty>
          )}
        </section>
        <aside className="basket-preview">
          <div className="section-heading">
            <h3>Your basket</h3>
            <ShoppingBasket size={20} />
          </div>
          <span className="mini-label">A LITTLE LIST, A BIG DIFFERENCE</span>
          {lines.length ? (
            <>
              <div className="preview-lines">
                {lines.slice(0, 5).map((l) => (
                  <div key={l.productId}>
                    <span>
                      {data.products.find((p) => p.id === l.productId)?.name ??
                        "Product"}
                      <small>Qty {l.quantity}</small>
                    </span>
                    <b>
                      {cheapest.has(l.productId)
                        ? money(cheapest.get(l.productId)!.price * l.quantity)
                        : "Unavailable"}
                    </b>
                  </div>
                ))}
              </div>
              {lines.length > 5 ? (
                <p>+ {lines.length - 5} more products</p>
              ) : null}
            </>
          ) : (
            <div className="preview-empty">
              <ShoppingBasket size={38} />
              <p>
                A good shop starts
                <br />
                with a little list.
              </p>
              <small>Add a few essentials to begin.</small>
            </div>
          )}
          <div className="preview-total">
            <span>Item estimate</span>
            <strong>{money(estimate)}</strong>
          </div>
          <small>
            Lowest available item prices. Store fees extra; availability depends
            on quantity.
          </small>
          <Link to="/list" className="button primary full">
            View my grocery list <ArrowRight size={16} />
          </Link>
          <div className="preview-footer">
            <Check size={14} /> Save your list with a free account
          </div>
        </aside>
      </div>
      <div className="local-banner">
        <div>
          <p className="eyebrow">ONLINE OR AROUND THE CORNER</p>
          <h2>Your neighbourhood belongs in the comparison.</h2>
          <p>
            Compare local pickup alongside online delivery. Choose what works
            for your day.
          </p>
        </div>
        <Link to="/compare" className="button">
          Explore comparisons <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
