import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ShoppingBasket, ArrowRight } from "lucide-react";
import { api, errorMessage } from "../state";
import { safeReturnPath } from "../navigation";
export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [login] = api.useLoginMutation();
  const [register] = api.useRegisterMutation();
  const { data } = api.useMeQuery();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = safeReturnPath(params.get("next"));
  if (data?.user) return <Navigate to={target} replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const input = {
        email: String(f.get("email")),
        password: String(f.get("password")),
      };
      if (mode === "register")
        await register({ ...input, name: String(f.get("name")) }).unwrap();
      await login(input).unwrap();
      navigate(target, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <ShoppingBasket size={46} />
        <p className="eyebrow">YOUR EVERYDAY, A LITTLE SIMPLER</p>
        <h1>
          A thoughtful list.
          <br />A smarter shop.
        </h1>
        <p>
          Keep your favourites, revisit your plans, and find the right basket
          for your budget.
        </p>
        <span className="subtle-tag">Pune · Sample catalog · CS3111</span>
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        <p className="eyebrow">WELCOME TO BASKETWISE</p>
        <h2>
          {mode === "login"
            ? "Good to see you."
            : "Make room for better choices."}
        </h2>
        <p>
          {mode === "login"
            ? "Sign in to save and compare your groceries."
            : "Create your personal shopping account."}
        </p>
        {mode === "register" ? (
          <label>
            Your name
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        ) : null}
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={190}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </label>
        {mode === "register" ? (
          <small>
            Use at least 8 characters. This local demo does not send
            verification or reset emails.
          </small>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button primary full" disabled={busy}>
          {busy
            ? "One moment…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
          <ArrowRight size={17} />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already registered? Sign in"}
        </button>
      </form>
    </section>
  );
}
