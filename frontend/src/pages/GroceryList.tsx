import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ArrowRight, Save } from "lucide-react";
import {
  api,
  actions,
  useAppDispatch,
  useAppSelector,
  errorMessage,
} from "../state";
import {
  useCatalog,
  PageTitle,
  Loading,
  Failure,
  Empty,
  BrowseLink,
  LocalitySelect,
} from "../ui";
import { money, type Product } from "../types";
export default function GroceryList() {
  const { data, isLoading, error } = useCatalog();
  const draft = useAppSelector((s) => s.draft);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: account } = api.useMeQuery();
  const [saveList, { isLoading: saving }] = api.useSaveListMutation();
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [alternative, setAlternative] = useState<Product | null>(null);
  if (isLoading) return <Loading />;
  if (error) return <Failure error={error} />;
  if (!data) return null;
  const validBudget =
    draft.budget === null ||
    (Number.isSafeInteger(draft.budget) &&
      draft.budget >= 0 &&
      draft.budget <= 1000000000);
  function newList() {
    dispatch(
      actions.load({
        name: "My weekly essentials",
        locality: draft.locality,
        budget: null,
        items: [],
      }),
    );
    setNotice("");
    setFailure("");
    setAlternative(null);
  }
  async function save(asNew = false) {
    if (!account?.user) {
      navigate("/login?next=/list");
      return;
    }
    try {
      const saved = await saveList(
        asNew ? { ...draft, id: undefined } : draft,
      ).unwrap();
      dispatch(actions.load({ ...draft, id: saved.list.id }));
      setNotice("Your grocery list is saved.");
      setFailure("");
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  return (
    <>
      <PageTitle eyebrow="A LITTLE PLANNING" title="Your grocery list.">
        <div className="page-title-actions">
          <button className="button" onClick={newList}>
            New grocery list
          </button>
          <BrowseLink />
        </div>
      </PageTitle>
      <div className="notice sample">
        Exact brands and pack sizes stay fixed. Alternatives are used only when
        you choose them.
      </div>
      <div className="list-layout">
        <section className="panel">
          <div className="form-row">
            <label>
              List name
              <input
                maxLength={100}
                required
                value={draft.name}
                onChange={(e) =>
                  dispatch(actions.settings({ name: e.target.value }))
                }
              />
            </label>
            <label>
              Locality
              <LocalitySelect
                value={draft.locality}
                onChange={(locality) =>
                  dispatch(actions.settings({ locality }))
                }
              />
            </label>
            <label>
              Budget in rupees (optional)
              <input
                type="number"
                min="0"
                max="10000000"
                step="0.01"
                value={draft.budget === null ? "" : draft.budget / 100}
                onChange={(e) =>
                  dispatch(
                    actions.settings({
                      budget:
                        e.target.value === ""
                          ? null
                          : Math.round(Number(e.target.value) * 100),
                    }),
                  )
                }
              />
            </label>
          </div>
          {draft.items.length ? (
            <div className="list-rows">
              {draft.items.map((line) => {
                const p = data.products.find((p) => p.id === line.productId);
                return (
                  <article className="list-row" key={line.productId}>
                    {p ? (
                      <>
                        <img width="70" height="70" src={p.imageUrl} alt="" />
                        <div className="list-product">
                          <span>{p.brand}</span>
                          <h3>{p.name}</h3>
                          <small>
                            {p.packSize} · MRP {money(p.mrp)}
                          </small>
                          <button
                            className="text-button"
                            onClick={() => setAlternative(p)}
                          >
                            View alternatives
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>Product unavailable (#{line.productId})</p>
                    )}
                    <div className="quantity">
                      <button
                        aria-label={`Decrease ${p?.name}`}
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          dispatch(
                            actions.quantity({
                              ...line,
                              quantity: line.quantity - 1,
                            }),
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        aria-label={`Quantity for ${p?.name}`}
                        type="number"
                        min={1}
                        max={999}
                        value={line.quantity}
                        onChange={(e) =>
                          dispatch(
                            actions.quantity({
                              ...line,
                              quantity: Number(e.target.value) || 1,
                            }),
                          )
                        }
                      />
                      <button
                        aria-label={`Increase ${p?.name}`}
                        disabled={line.quantity >= 999}
                        onClick={() =>
                          dispatch(
                            actions.quantity({
                              ...line,
                              quantity: line.quantity + 1,
                            }),
                          )
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${p?.name}`}
                      onClick={() => dispatch(actions.remove(line.productId))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty title="Your next good shop starts here.">
              <p>Add rice, milk, or anything on your everyday list.</p>
              <BrowseLink />
            </Empty>
          )}
        </section>
        <aside className="panel list-summary">
          <p className="eyebrow">READY WHEN YOU ARE</p>
          <h2>Let’s find your basket.</h2>
          <p>
            {draft.items.length} products ·{" "}
            {draft.items.reduce((s, l) => s + l.quantity, 0)} packs
          </p>
          <p>We’ll check the full list, stock, and every store’s fees.</p>
          {notice ? (
            <p className="notice success" role="status">
              {notice}
            </p>
          ) : null}
          {failure ? (
            <p className="notice error" role="alert">
              {failure}
            </p>
          ) : null}
          {!validBudget ? (
            <p role="alert" className="notice error">
              Enter a budget between ₹0 and ₹1,00,00,000.
            </p>
          ) : null}
          <button
            className="button primary full"
            disabled={!draft.items.length || !draft.name.trim() || !validBudget}
            onClick={() => navigate("/compare")}
          >
            Compare my basket <ArrowRight size={16} />
          </button>
          <button
            className="button full"
            disabled={
              !draft.items.length ||
              !draft.name.trim() ||
              saving ||
              !validBudget
            }
            onClick={() => void save()}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save grocery list"}
          </button>
          {draft.id ? (
            <button
              className="button full"
              disabled={
                !draft.items.length ||
                !draft.name.trim() ||
                saving ||
                !validBudget
              }
              onClick={() => void save(true)}
            >
              Save as new list
            </button>
          ) : null}
          <Link className="text-button" to="/history">
            Open a saved list
          </Link>
        </aside>
      </div>
      {alternative ? (
        <section
          className="panel alternative-panel"
          aria-label="Product alternatives"
        >
          <h2>Alternatives to {alternative.name}</h2>
          <p>
            Accepting a replacement changes your selected brand. Comparisons
            will use the new product.
          </p>
          {data.products
            .filter(
              (p) =>
                p.name === alternative.name &&
                p.packSize === alternative.packSize &&
                p.id !== alternative.id,
            )
            .map((p) => (
              <div className="alternative-row" key={p.id}>
                <span>
                  {p.brand} · {p.name} · {p.packSize}
                </span>
                <button
                  onClick={() => {
                    const qty =
                      draft.items.find((i) => i.productId === alternative.id)
                        ?.quantity ?? 1;
                    const existing =
                      draft.items.find((i) => i.productId === p.id)?.quantity ??
                      0;
                    dispatch(
                      actions.load({
                        ...draft,
                        items: [
                          ...draft.items.filter(
                            (i) =>
                              i.productId !== alternative.id &&
                              i.productId !== p.id,
                          ),
                          {
                            productId: p.id,
                            quantity: Math.min(999, qty + existing),
                          },
                        ],
                      }),
                    );
                    setAlternative(null);
                  }}
                >
                  Accept replacement
                </button>
              </div>
            ))}
          {!data.products.some(
            (p) =>
              p.name === alternative.name &&
              p.packSize === alternative.packSize &&
              p.id !== alternative.id,
          ) ? (
            <p>No matching alternatives in this sample catalog.</p>
          ) : null}
          <button className="text-button" onClick={() => setAlternative(null)}>
            Close alternatives
          </button>
        </section>
      ) : null}
    </>
  );
}
