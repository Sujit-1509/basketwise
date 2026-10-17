import { Suspense, lazy, Component, useState, type ReactNode } from "react";
import {
  NavLink,
  Link,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  ShoppingBasket,
  LayoutDashboard,
  Carrot,
  ListChecks,
  ArrowLeftRight,
  History,
  MessageSquare,
  Settings,
  MapPin,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import {
  api,
  actions,
  useAppDispatch,
  useAppSelector,
  errorMessage,
} from "./state";
import { Loading, LocalitySelect } from "./ui";
import Catalogue from "./pages/Catalogue";
const GroceryList = lazy(() => import("./pages/GroceryList"));
const Compare = lazy(() => import("./pages/Compare"));
const HistoryPage = lazy(() => import("./pages/History"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
function Guard({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { data, isLoading } = api.useMeQuery();
  if (isLoading) return <Loading />;
  if (!data?.user)
    return (
      <Navigate
        to={`/login?next=${admin ? "/admin" : window.location.pathname}`}
        replace
      />
    );
  if (admin && data.user.role !== "ADMIN")
    return (
      <div className="empty">
        <h1>Administrator access required</h1>
        <Link to="/">Back to groceries</Link>
      </div>
    );
  return children;
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty">
        <h1>Something went wrong</h1>
        <p>Your saved lists are kept on the server.</p>
        <button onClick={() => window.location.reload()}>
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const { data } = api.useMeQuery();
  const [logout] = api.useLogoutMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const quantity = useAppSelector((s) =>
    s.draft.items.reduce((sum, l) => sum + l.quantity, 0),
  );
  const locality = useAppSelector((s) => s.draft.locality);
  const [logoutError, setLogoutError] = useState("");
  async function signOut() {
    setLogoutError("");
    try {
      await logout().unwrap();
      dispatch(actions.clear());
      dispatch(api.util.resetApiState());
      navigate("/");
    } catch (e) {
      setLogoutError(`Sign out failed: ${errorMessage(e)} Please try again.`);
    }
  }
  const links = [
    ["/", "Overview", LayoutDashboard],
    ["/catalogue", "Explore groceries", Carrot],
    ["/list", "My grocery list", ListChecks],
    ["/compare", "Compare baskets", ArrowLeftRight],
    ["/history", "Saved plans", History],
    ["/feedback", "Community feedback", MessageSquare],
  ] as const;
  return (
    <ErrorBoundary>
      <div className="app-shell">
        <aside className="sidebar">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <ShoppingBasket />
            </span>
            basketwise<span className="brand-dot">.</span>
          </Link>
          <p className="brand-caption">GOOD GROCERIES. BETTER CHOICES.</p>
          <div className="nav-label">YOUR EVERYDAY PANTRY</div>
          <nav aria-label="Main navigation">
            {links.map(([path, label, Icon]) => (
              <NavLink key={path} to={path} end={path === "/"}>
                <Icon size={19} />
                <span>{label}</span>
                {path === "/list" && quantity > 0 ? (
                  <b className="count">{quantity}</b>
                ) : null}
              </NavLink>
            ))}
            {data?.user?.role === "ADMIN" ? (
              <NavLink to="/admin">
                <Settings size={19} />
                Catalog administration
              </NavLink>
            ) : null}
          </nav>
          <div className="sidebar-bottom">
            <div className="tip">
              <span className="pill">A SMALL HABIT</span>
              <h3>
                A list today.
                <br />A little more saved.
              </h3>
              <p>
                Compare the whole basket, including those little delivery fees.
              </p>
              <Link to="/list">
                Start your list <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="sample-note">
              A student project for CS3111
              <br />
              Illustrative stores & prices
            </p>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="location">
              <MapPin size={18} />
              <div>
                <span>SHOPPING IN</span>
                <LocalitySelect
                  label="Shopping locality"
                  value={locality}
                  onChange={(locality) =>
                    dispatch(actions.settings({ locality }))
                  }
                />
              </div>
              <span className="location-dot" />
            </div>
            <div className="top-actions">
              <Link className="basket-link" to="/list">
                <ShoppingBasket size={19} />
                <span>My basket</span>
                <b>{quantity}</b>
              </Link>
              {data?.user ? (
                <>
                  <span className="avatar" title={data.user.name}>
                    {data.user.name[0].toUpperCase()}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Sign out"
                    onClick={() => void signOut()}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <Link to="/login" className="button small">
                  Sign in <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </header>
          <main id="main">
            {logoutError ? (
              <p className="notice error" role="alert">
                {logoutError}
              </p>
            ) : null}
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Catalogue home />} />
                <Route path="/catalogue" element={<Catalogue />} />
                <Route path="/list" element={<GroceryList />} />
                <Route
                  path="/compare"
                  element={
                    <Guard>
                      <Compare />
                    </Guard>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <Guard>
                      <HistoryPage />
                    </Guard>
                  }
                />
                <Route path="/feedback" element={<Feedback />} />
                <Route
                  path="/admin"
                  element={
                    <Guard admin>
                      <Admin />
                    </Guard>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <footer>
            Smart Grocery Comparison and Recommendation System{" "}
            <span>Made for mindful everyday shopping · Sample data</span>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
