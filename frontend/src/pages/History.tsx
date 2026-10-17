import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, RefreshCw } from "lucide-react";
import {
  api,
  actions,
  useAppDispatch,
  useAppSelector,
  errorMessage,
} from "../state";
import { PageTitle, Loading, Failure, Empty, BrowseLink } from "../ui";
import { BasketCard } from "./Compare";
import type { Snapshot } from "../types";
export default function History() {
  const lists = api.useListsQuery();
  const plans = api.usePlansQuery();
  const [deleteList] = api.useDeleteListMutation();
  const [deletePlan] = api.useDeletePlanMutation();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.draft);
  const navigate = useNavigate();
  const [failure, setFailure] = useState("");
  async function remove(kind: "list" | "plan", id: number) {
    try {
      if (kind === "list") {
        await deleteList(id).unwrap();
        if (draft.id === id)
          dispatch(actions.load({ ...draft, id: undefined }));
      } else await deletePlan(id).unwrap();
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  if (lists.isLoading || plans.isLoading) return <Loading />;
  if (lists.error || plans.error)
    return <Failure error={lists.error || plans.error} />;
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE HISTORY, A QUICKER START"
        title="Your saved plans."
      />
      <p className="page-description">
        These are shopping plans, not placed orders. Prices are historical until
        you recalculate.
      </p>
      {failure ? (
        <p className="notice error" role="alert">
          {failure}
        </p>
      ) : null}
      <section>
        <div className="section-heading">
          <h2>Grocery lists</h2>
          <span>{lists.data?.length ?? 0} saved lists</span>
        </div>
        <div className="saved-lists">
          {lists.data?.map(({ list, items }) => (
            <article className="panel saved-list" key={list.id}>
              <div>
                <h3>{list.name}</h3>
                <p>
                  {items.length} products · {list.locality}
                </p>
                <small>
                  Updated {new Date(list.updatedAt).toLocaleString("en-IN")}
                </small>
              </div>
              <div>
                <button
                  className="button"
                  onClick={() => {
                    dispatch(
                      actions.load({
                        id: list.id,
                        name: list.name,
                        locality: list.locality,
                        budget: list.budget,
                        items: items.map((i) => ({
                          productId: i.productId,
                          quantity: i.quantity,
                        })),
                      }),
                    );
                    navigate("/list");
                  }}
                >
                  Open list <ArrowRight size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete list ${list.name}`}
                  onClick={() => void remove("list", list.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="history-plans">
        <div className="section-heading">
          <h2>Shopping plan snapshots</h2>
          <span>Original prices preserved</span>
        </div>
        {plans.data?.map((plan) => {
          const s = JSON.parse(plan.snapshot) as Snapshot;
          return (
            <div className="saved-plan" key={plan.id}>
              <div className="saved-plan-title">
                <div>
                  <h3>{plan.name}</h3>
                  <p>
                    Saved {new Date(plan.createdAt).toLocaleString("en-IN")} ·{" "}
                    {plan.locality}
                  </p>
                </div>
                <div>
                  <button
                    className="button"
                    onClick={() => {
                      dispatch(actions.load({ ...s.request, name: plan.name }));
                      navigate("/compare");
                    }}
                  >
                    <RefreshCw size={16} />
                    Recalculate now
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete plan ${plan.name}`}
                    onClick={() => void remove("plan", plan.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <BasketCard basket={s.basket} products={s.products} />
            </div>
          );
        })}
      </section>
      {!lists.data?.length && !plans.data?.length ? (
        <Empty title="A fresh page for your next shop">
          <p>Save a list or comparison to find it here.</p>
          <BrowseLink />
        </Empty>
      ) : null}
    </>
  );
}
