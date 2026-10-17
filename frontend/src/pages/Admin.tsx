import { useState, type FormEvent } from "react";
import { Plus, Save, Archive } from "lucide-react";
import { api, errorMessage } from "../state";
import { PageTitle, Loading, Failure } from "../ui";
import { money, type Product, type Store, type Inventory } from "../types";
type Kind = "products" | "stores" | "inventory";
export default function Admin() {
  const { data, isLoading, error } = api.useAdminQuery();
  const [save, { isLoading: saving }] = api.useAdminSaveMutation();
  const [archive] = api.useAdminArchiveMutation();
  const [kind, setKind] = useState<Kind>("inventory");
  const [editing, setEditing] = useState<Product | Store | Inventory | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  if (isLoading) return <Loading />;
  if (error) return <Failure error={error} />;
  if (!data) return null;
  function change(k: Kind) {
    setKind(k);
    setEditing(null);
    setNotice("");
    setFailure("");
    setRevision((v) => v + 1);
  }
  function newRecord() {
    setEditing(null);
    setRevision((v) => v + 1);
    setNotice("");
    setFailure("");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let body: Record<string, unknown> = {};
    if (kind === "products")
      body = {
        name: f.get("name"),
        brand: f.get("brand"),
        packSize: f.get("packSize"),
        category: f.get("category"),
        imageUrl: f.get("imageUrl"),
        mrp: Math.round(Number(f.get("mrp")) * 100),
        active: f.get("active") === "on",
      };
    else if (kind === "stores")
      body = {
        name: f.get("name"),
        type: f.get("type"),
        address: f.get("address"),
        localities: f.get("localities"),
        fee: Math.round(Number(f.get("fee")) * 100),
        deliveryMinutes: Number(f.get("deliveryMinutes")),
        active: f.get("active") === "on",
      };
    else
      body = {
        productId: Number(f.get("productId")),
        storeId: Number(f.get("storeId")),
        stock: Number(f.get("stock")),
        regularPrice: Math.round(Number(f.get("regularPrice")) * 100),
        offerPrice: f.get("offerPrice")
          ? Math.round(Number(f.get("offerPrice")) * 100)
          : null,
        offerText: String(f.get("offerText") || ""),
        offerStart: f.get("offerStart")
          ? new Date(String(f.get("offerStart"))).toISOString()
          : null,
        offerEnd: f.get("offerEnd")
          ? new Date(String(f.get("offerEnd"))).toISOString()
          : null,
      };
    try {
      await save({
        kind,
        id: kind === "inventory" ? undefined : editing?.id,
        body,
      }).unwrap();
      setNotice(
        "Catalog updated. New comparisons use these values; saved snapshots stay unchanged.",
      );
      setFailure("");
      if (!editing && kind !== "inventory") setRevision((v) => v + 1);
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  async function deactivate(id: number) {
    if (kind === "inventory") return;
    try {
      await archive({ kind, id }).unwrap();
      setNotice("Record archived. Existing saved plans are preserved.");
      setEditing(null);
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }
  const product = editing as Product | null;
  const store = editing as Store | null;
  const inventory = editing as Inventory | null;
  const localTime = (s: string | null | undefined) =>
    s
      ? new Date(
          new Date(s).getTime() - new Date(s).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
  return (
    <>
      <PageTitle
        eyebrow="CATALOG ADMINISTRATION"
        title="Keep the pantry up to date."
      />
      <div className="notice sample">
        All initial stores and prices are fictional. Prices below are entered in
        rupees and stored as integer paise.
      </div>
      <div className="categories">
        {(["inventory", "products", "stores"] as Kind[]).map((k) => (
          <button
            className={kind === k ? "selected" : ""}
            key={k}
            onClick={() => change(k)}
          >
            {k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
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
      <div className="admin-layout">
        <section className="panel admin-records">
          <div className="section-heading">
            <h2>
              {kind === "inventory"
                ? "Store inventory"
                : kind === "products"
                  ? "Products"
                  : "Stores"}
            </h2>
            <button
              className="icon-button"
              aria-label={`New ${kind}`}
              onClick={newRecord}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="record-list">
            {kind === "inventory"
              ? data.inventory.map((i) => (
                  <button
                    key={i.id}
                    className={editing?.id === i.id ? "selected" : ""}
                    onClick={() => setEditing(i)}
                  >
                    <span>
                      {data.products.find((p) => p.id === i.productId)?.name}
                      <small>
                        {data.stores.find((s) => s.id === i.storeId)?.name} ·
                        Stock {i.stock}
                      </small>
                    </span>
                    <strong>{money(i.regularPrice)}</strong>
                  </button>
                ))
              : (kind === "products" ? data.products : data.stores).map((p) => (
                  <button
                    key={p.id}
                    className={editing?.id === p.id ? "selected" : ""}
                    onClick={() => setEditing(p)}
                  >
                    <span>
                      {p.name}
                      <small>
                        {"brand" in p ? p.brand : p.type} ·{" "}
                        {p.active ? "Active" : "Archived"}
                      </small>
                    </span>
                  </button>
                ))}
          </div>
        </section>
        <form
          className="panel admin-form"
          onSubmit={submit}
          key={`${kind}-${editing?.id ?? "new"}-${revision}`}
        >
          <h2>
            {editing ? "Edit" : "Add"}{" "}
            {kind === "inventory"
              ? "inventory"
              : kind === "products"
                ? "product"
                : "store"}
          </h2>
          {kind === "products" ? (
            <p className="admin-variant-note">
              For a product already stocked or saved in a list, create a new
              product to change its brand or pack size. This preserves shoppers’
              exact selections.
            </p>
          ) : null}
          {kind === "products" ? (
            <>
              <label>
                Product name
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={product?.name}
                />
              </label>
              <div className="form-row">
                <label>
                  Brand
                  <input
                    name="brand"
                    required
                    maxLength={80}
                    defaultValue={product?.brand}
                  />
                </label>
                <label>
                  Pack size
                  <input
                    name="packSize"
                    required
                    maxLength={40}
                    defaultValue={product?.packSize}
                  />
                </label>
              </div>
              <label>
                Category
                <input
                  name="category"
                  required
                  maxLength={40}
                  defaultValue={product?.category ?? "Staples"}
                />
              </label>
              <label>
                Illustration
                <select
                  name="imageUrl"
                  defaultValue={product?.imageUrl ?? "/images/rice.svg"}
                >
                  {[
                    "atta",
                    "rice",
                    "sugar",
                    "lentils",
                    "oil",
                    "milk",
                    "oats",
                    "eggs",
                    "tea",
                    "coffee",
                    "salt",
                    "spice",
                    "ghee",
                    "curd",
                    "paneer",
                    "bread",
                    "butter",
                    "nuts",
                    "biscuits",
                  ].map((i) => (
                    <option key={i} value={`/images/${i}.svg`}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                MRP (₹)
                <input
                  name="mrp"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  required
                  defaultValue={product ? product.mrp / 100 : ""}
                />
              </label>
            </>
          ) : kind === "stores" ? (
            <>
              <label>
                Store name
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={store?.name}
                />
              </label>
              <label>
                Type
                <select name="type" defaultValue={store?.type ?? "LOCAL"}>
                  <option>LOCAL</option>
                  <option>ONLINE</option>
                </select>
              </label>
              <label>
                Address
                <input
                  name="address"
                  required
                  maxLength={250}
                  defaultValue={store?.address}
                />
              </label>
              <label>
                Localities (comma-separated)
                <input
                  name="localities"
                  required
                  maxLength={200}
                  defaultValue={store?.localities ?? "Kothrud"}
                />
              </label>
              <div className="form-row">
                <label>
                  Delivery fee (₹)
                  <input
                    name="fee"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    required
                    defaultValue={store ? store.fee / 100 : 0}
                  />
                </label>
                <label>
                  Delivery estimate (minutes)
                  <input
                    name="deliveryMinutes"
                    type="number"
                    min="1"
                    max="1440"
                    required
                    defaultValue={store?.deliveryMinutes ?? 30}
                  />
                </label>
              </div>
              <small>
                Local pickup always has zero delivery fees. Its delivery
                estimate is ignored.
              </small>
            </>
          ) : (
            <>
              <label>
                Product
                <select
                  name="productId"
                  defaultValue={inventory?.productId ?? data.products[0]?.id}
                >
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.brand} · {p.packSize}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Store
                <select
                  name="storeId"
                  defaultValue={inventory?.storeId ?? data.stores[0]?.id}
                >
                  {data.stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Regular selling price (₹)
                  <input
                    name="regularPrice"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    required
                    defaultValue={inventory ? inventory.regularPrice / 100 : ""}
                  />
                </label>
                <label>
                  Stock (whole packs)
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    max="100000"
                    required
                    defaultValue={inventory?.stock ?? 0}
                  />
                </label>
              </div>
              <label>
                Offer price (₹, optional)
                <input
                  name="offerPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    inventory?.offerPrice ? inventory.offerPrice / 100 : ""
                  }
                />
              </label>
              <label>
                Offer description
                <input
                  name="offerText"
                  maxLength={160}
                  defaultValue={inventory?.offerText ?? ""}
                />
              </label>
              <div className="form-row">
                <label>
                  Offer starts
                  <input
                    name="offerStart"
                    type="datetime-local"
                    defaultValue={localTime(inventory?.offerStart)}
                  />
                </label>
                <label>
                  Offer ends
                  <input
                    name="offerEnd"
                    type="datetime-local"
                    defaultValue={localTime(inventory?.offerEnd)}
                  />
                </label>
              </div>
              <small>
                Leave offer price blank to remove a discount. Saving refreshes
                the inventory timestamp.
              </small>
            </>
          )}
          {kind !== "inventory" ? (
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={
                  editing ? "active" in editing && editing.active : true
                }
              />{" "}
              Active in catalog
            </label>
          ) : null}
          <button className="button primary full" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving…" : "Save changes"}
          </button>
          {editing && kind !== "inventory" ? (
            <button
              type="button"
              className="text-button danger"
              onClick={() => void deactivate(editing.id!)}
            >
              <Archive size={15} />
              Archive record
            </button>
          ) : null}
        </form>
      </div>
    </>
  );
}
