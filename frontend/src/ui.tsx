import { Link } from "react-router-dom";
import { LoaderCircle, ArrowRight, ShoppingBasket } from "lucide-react";
import { api, useAppSelector, errorMessage } from "./state";
export function useCatalog() {
  const locality = useAppSelector((s) => s.draft.locality);
  return api.useCatalogQuery(locality);
}
export function LocalitySelect({
  value,
  onChange,
  label = "Locality",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { data } = api.useLocalitiesQuery();
  const names = [
    ...new Set([...(data ?? ["Kothrud", "Baner", "Viman Nagar"]), value]),
  ];
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {names.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" /> Loading your pantry…
    </div>
  );
}
export function Failure({ error }: { error: unknown }) {
  return (
    <p className="notice error" role="alert">
      {errorMessage(error)}
    </p>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <ShoppingBasket size={36} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function BrowseLink() {
  return (
    <Link className="button primary" to="/catalogue">
      Explore groceries <ArrowRight size={17} />
    </Link>
  );
}
