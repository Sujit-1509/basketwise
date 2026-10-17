import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import { api, errorMessage } from "../state";
import { useCatalog, PageTitle, Loading, Failure } from "../ui";
export default function Feedback() {
  const [params] = useSearchParams();
  const [type, setType] = useState(
    params.get("type") === "PRODUCT" ? "PRODUCT" : "STORE",
  );
  const [id, setId] = useState(Number(params.get("id")) || 1);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const catalog = useCatalog();
  const account = api.useMeQuery();
  const location = useLocation();
  const targets =
    (type === "STORE" ? catalog.data?.stores : catalog.data?.products) ?? [];
  const selectedId = targets.some((target) => target.id === id)
    ? id
    : (targets[0]?.id ?? 0);
  const reviews = api.useReviewsQuery(
    { targetType: type, targetId: selectedId },
    { skip: !selectedId },
  );
  const [add, { isLoading: saving }] = api.useAddReviewMutation();
  useEffect(() => {
    setMessage("");
    setFailure("");
  }, [type, selectedId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    if (!selectedId) {
      setFailure(
        "Choose an available product or store before publishing feedback.",
      );
      return;
    }
    try {
      await add({
        targetType: type,
        targetId: selectedId,
        rating: Number(f.get("rating")),
        comment: String(f.get("comment")),
      }).unwrap();
      setMessage("Thank you. Your feedback is published.");
      setFailure("");
      form.reset();
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  if (catalog.isLoading) return <Loading />;
  if (catalog.error) return <Failure error={catalog.error} />;
  return (
    <>
      <PageTitle
        eyebrow="FROM ONE SHOPPER TO ANOTHER"
        title="A little honest feedback."
      />
      <div className="notice sample">
        Community opinions about products and store/service experiences.
        Purchases are not verified.
      </div>
      <div className="form-row panel">
        <label>
          Feedback about
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setId(0);
            }}
          >
            <option value="STORE">Store & service</option>
            <option value="PRODUCT">Product</option>
          </select>
        </label>
        <label>
          Choose {type === "STORE" ? "store" : "product"}
          <select
            value={selectedId}
            disabled={!targets.length}
            onChange={(e) => setId(Number(e.target.value))}
          >
            {!targets.length ? (
              <option value={0}>
                No {type === "STORE" ? "stores" : "products"} available
              </option>
            ) : null}
            {targets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {"brand" in p ? ` · ${p.brand}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="feedback-layout">
        <section className="panel">
          <h2>What shoppers say</h2>
          {!selectedId ? (
            <p>
              No{" "}
              {type === "STORE"
                ? "stores serve this locality"
                : "products are available"}
              . Choose another locality or feedback type.
            </p>
          ) : reviews.isFetching ? (
            <Loading />
          ) : reviews.error ? (
            <Failure error={reviews.error} />
          ) : reviews.currentData?.length ? (
            reviews.currentData.map((r) => (
              <article className="review" key={r.id}>
                <div>
                  <strong>{r.author}</strong>
                  <span
                    className="stars"
                    aria-label={`${r.rating} out of 5 stars`}
                  >
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </span>
                </div>
                <p>{r.comment}</p>
                <small>
                  {new Date(r.createdAt).toLocaleDateString("en-IN")} ·
                  Community feedback
                </small>
              </article>
            ))
          ) : (
            <p>No feedback yet. Share the first perspective.</p>
          )}
        </section>
        <form className="panel" onSubmit={submit}>
          <h2>Share your experience</h2>
          {account.data?.user ? (
            <>
              <label>
                Rating
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} out of 5
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your feedback
                <textarea
                  name="comment"
                  minLength={1}
                  maxLength={1000}
                  required
                  rows={5}
                  placeholder="What would help another shopper?"
                />
              </label>
              <button
                className="button primary"
                disabled={saving || !selectedId}
              >
                Publish feedback
              </button>
            </>
          ) : (
            <p>
              <Link
                to={`/login?next=${encodeURIComponent("/feedback" + location.search)}`}
              >
                Sign in
              </Link>{" "}
              to share your feedback.
            </p>
          )}
          {message ? (
            <p className="notice success" role="status">
              {message}
            </p>
          ) : null}
          {failure ? (
            <p className="notice error" role="alert">
              {failure}
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
}
