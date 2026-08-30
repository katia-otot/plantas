"use client";

import { useEffect, useState } from "react";
import { firebaseSignInAction } from "@/app/login/actions";
import {
  canUseInAppFirebaseAuth,
  consumeGoogleRedirectResult,
  getIdTokenFromCredential,
  signInWithGooglePopup,
} from "@/lib/firebase-browser";
import { getFirebaseAuthBridgeUrl } from "@/lib/firebase-client-config";
import { withBasePath } from "@/lib/base-path";

const TOKEN_HASH_KEY = "firebase_id_token";

type Props = {
  initialError?: string | null;
};

function messageForAuthError(error: string | null | undefined) {
  if (error === "AccessDenied" || error === "CredentialsSignin") {
    return "No se pudo iniciar sesión con esa cuenta de Google.";
  }
  if (error === "Configuration") {
    return "Falta configurar Firebase Admin / AUTH_SECRET en el servidor.";
  }
  return null;
}

export function FirebaseGoogleSignInButton({ initialError }: Props) {
  const [message, setMessage] = useState<string | null>(
    messageForAuthError(initialError),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishWithToken(idToken: string) {
      setLoading(true);
      setMessage(null);
      try {
        const result = await firebaseSignInAction(idToken);
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setMessage(
            messageForAuthError(result.error) ??
              "No se pudo iniciar sesión. Revisá la configuración de Firebase.",
          );
          setLoading(false);
        }
        // success → server action redirects
      } catch (error) {
        // Next.js redirect() throws; ignore redirect errors
        const digest =
          error && typeof error === "object" && "digest" in error
            ? String((error as { digest?: string }).digest)
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) {
          return;
        }
        if (!cancelled) {
          setMessage("No se pudo iniciar sesión.");
          setLoading(false);
        }
      }
    }

    async function bootstrap() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const idToken = params.get(TOKEN_HASH_KEY);
        if (idToken) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
          await finishWithToken(idToken);
          return;
        }
      }

      if (!canUseInAppFirebaseAuth()) {
        return;
      }

      try {
        const result = await consumeGoogleRedirectResult();
        if (result && !cancelled) {
          const idToken = await getIdTokenFromCredential(result);
          await finishWithToken(idToken);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setMessage("Falló el retorno de Google. Probá de nuevo.");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToBridge() {
    const returnUrl = new URL(withBasePath("/login"), window.location.origin);
    const bridge = new URL(getFirebaseAuthBridgeUrl());
    bridge.searchParams.set("return", returnUrl.toString());
    window.location.href = bridge.toString();
  }

  async function handleClick() {
    setMessage(null);
    setLoading(true);

    try {
      if (!canUseInAppFirebaseAuth()) {
        goToBridge();
        return;
      }

      const credential = await signInWithGooglePopup();
      const idToken = await getIdTokenFromCredential(credential);
      const result = await firebaseSignInAction(idToken);
      if (!result.ok) {
        setMessage(
          messageForAuthError(result.error) ??
            "No se pudo iniciar sesión. Revisá la configuración de Firebase.",
        );
        setLoading(false);
      }
    } catch (error) {
      const digest =
        error && typeof error === "object" && "digest" in error
          ? String((error as { digest?: string }).digest)
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) {
        return;
      }

      console.error(error);
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code === "auth/unauthorized-domain") {
        goToBridge();
        return;
      }
      setMessage("No se pudo abrir Google. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-900/15 bg-white px-4 py-4 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 disabled:opacity-60"
      >
        <GoogleMark />
        {loading ? "Entrando…" : "Continuar con Google"}
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
