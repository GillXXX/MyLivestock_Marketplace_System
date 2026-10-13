import { useEffect, useState } from "react";
import {
  Mail, Lock, Eye, EyeOff, KeyRound, User, Phone, ShieldCheck, ArrowRight, ShoppingBag, Tractor,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config";
import { completeAuth, describeGoogleError } from "../utils/auth";
import { isWeakPassword, PASSWORD_HINT } from "../utils/password";
import logo from "../assets/logo.png";
import "./Register.css";

const RESEND_COOLDOWN_SECONDS = 30;

function Register() {
  const navigate = useNavigate();
  // Set when "Continue with Google" on the sign-in page found no account
  // for that email, so the person picks up here at the details form.
  const googlePrefill = useLocation().state?.googleSignup;

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Email sign-up: "email" -> "code" -> "details". Google sign-up goes
  // straight to "details" — Google already confirmed the email, so there's
  // no code. Either way the account isn't created until the details form
  // (role, name, phone, password) is submitted.
  const [step, setStep] = useState(googlePrefill ? "details" : "email");
  const [email, setEmail] = useState(googlePrefill?.email || "");
  // Proof from the server that Google confirmed `email`; set only for a
  // Google sign-up.
  const [googleSignupToken, setGoogleSignupToken] = useState(googlePrefill?.signupToken || "");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [detailsForm, setDetailsForm] = useState({
    role: "",
    fullName: googlePrefill?.fullName || "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const requestCode = async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return res;
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await requestCode();
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Could not send verification code");
        setLoading(false);
        return;
      }

      setStep("code");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setCodeLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/auth/register/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Verification failed");
        setCodeLoading(false);
        return;
      }

      setStep("details");
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setCodeLoading(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setMessage("");

    try {
      const res = await requestCode();
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Could not resend code");
        return;
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage("A new code has been sent to your email.");
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!detailsForm.role) {
      setMessage("Please choose whether you are a farmer or a buyer.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        googleSignupToken
          ? `${API_URL}/api/auth/google/complete`
          : `${API_URL}/api/auth/register/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            googleSignupToken
              ? { signupToken: googleSignupToken, ...detailsForm }
              : { email, ...detailsForm }
          ),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Could not create your account");
        setLoading(false);
        return;
      }

      completeAuth(data, navigate);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  const googleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setMessage("");

      try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken: tokenResponse.access_token, intent: "register" }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Google sign-up failed");
          return;
        }

        // Google confirmed the email, so skip the code. Nothing is created
        // until the details form (role, name, phone, password) is submitted.
        setEmail(data.email);
        setGoogleSignupToken(data.signupToken);
        setDetailsForm((prev) => ({ ...prev, fullName: data.fullName || prev.fullName }));
        setStep("details");
      } catch (error) {
        setMessage("Cannot connect to backend server");
      }
    },
    onError: (error) => setMessage(describeGoogleError(error)),
    onNonOAuthError: (error) => setMessage(describeGoogleError(error)),
  });

  return (
    <div className="modern-register">
      <section className="register-showcase">
        <div className="register-showcase-content">
          <Link to="/" className="register-brand" aria-label="Back to VOLT home">
            <div className="register-brand-icon">
              <img src={logo} alt="VOLT logo" />
            </div>

            <div>
              <h2>VOLT</h2>
              <span>Veruela Online Livestock Trade</span>
            </div>
          </Link>

          <div className="register-showcase-text">
            <span>SECURE LIVESTOCK TRADING</span>
            <h1>Create your marketplace account.</h1>
            <p>
              Join the Web-Based Livestock Marketplace System for farmers and
              buyers in Veruela, Agusan del Sur.
            </p>
          </div>

          <div className="register-feature">
            <div className="feature-icon-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Role-Based Access</strong>
              <p>
                Farmers can post livestock listings while buyers can browse,
                inquire, and negotiate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <Link to="/" className="register-mobile-brand" aria-label="Back to VOLT home">
            <img src={logo} alt="VOLT logo" />

            <div>
              <h3>VOLT</h3>
              <span>Veruela Online Livestock Trade</span>
            </div>
          </Link>

          <div className="register-header">
            <span>CREATE ACCOUNT</span>
            <h2>Register to VOLT</h2>
            <p>Continue with Google, or sign up with your email.</p>
          </div>

          {message && <p className="form-error">{message}</p>}

          {step === "email" && (
            <>
              <form onSubmit={handleRequestCode}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={20} />
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button className="register-btn" type="submit" disabled={loading}>
                  {loading ? "Sending code..." : "Send verification code"}
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="divider">
                <span></span>
                <p>OR</p>
                <span></span>
              </div>

              <div className="social-login">
                <button type="button" onClick={() => googleSignup()}>
                  <svg viewBox="0 0 48 48" width="20" height="20">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.6 26.7 37.5 24 37.5c-5.4 0-9.9-3.4-11.6-8.2l-6.5 5C9.5 40.6 16.2 45 24 45z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C39.9 37.6 44 32.6 44 24c0-1.4-.1-2.7-.4-3.5z" />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode}>
              <p className="otp-hint">
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>

              <div className="form-group">
                <label>Verification Code</label>
                <div className="input-wrapper">
                  <KeyRound size={20} />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </div>
              </div>

              <button
                className="register-btn"
                type="submit"
                disabled={codeLoading || code.length !== 6}
              >
                {codeLoading ? "Verifying..." : "Verify Email"}
                <ArrowRight size={18} />
              </button>

              <div className="otp-actions">
                <button
                  type="button"
                  className="link-btn"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>

                <button type="button" className="link-btn" onClick={() => setStep("email")}>
                  Change email
                </button>
              </div>
            </form>
          )}

          {step === "details" && (
            <form onSubmit={handleCompleteRegistration}>
              <p className="otp-hint">
                {googleSignupToken ? (
                  <>
                    Signed in with Google as <strong>{email}</strong>. Finish setting up your account.
                  </>
                ) : (
                  <>
                    <strong>{email}</strong> is verified. Finish setting up your account.
                  </>
                )}
              </p>

              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <User size={20} />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={detailsForm.fullName}
                    onChange={(e) => setDetailsForm({ ...detailsForm, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={20} />
                  <input
                    type="text"
                    placeholder="+63 912 345 6789"
                    value={detailsForm.phone}
                    onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={detailsForm.password}
                    onChange={(e) => setDetailsForm({ ...detailsForm, password: e.target.value })}
                    minLength={8}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                    title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
                    required
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isWeakPassword(detailsForm.password) && (
                  <p className="field-hint">{PASSWORD_HINT}</p>
                )}
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={detailsForm.confirmPassword}
                    onChange={(e) => setDetailsForm({ ...detailsForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Last, right before the account is created. */}
              <RolePicker
                value={detailsForm.role}
                onChange={(role) => setDetailsForm({ ...detailsForm, role })}
              />

              <button className="register-btn" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
                <ArrowRight size={18} />
              </button>

              {googleSignupToken && (
                <div className="otp-actions">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                      setGoogleSignupToken("");
                      setMessage("");
                    }}
                  >
                    Use a different account
                  </button>
                </div>
              )}
            </form>
          )}

          <div className="signin-link">
            <p>
              Already have an account?
              <Link to="/login"> Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Farmer / buyer choice — required before any account is created. Nothing
// is preselected, so the person always makes the choice themselves.
function RolePicker({ value, onChange }) {
  return (
    <div className="form-group">
      <label id="register-role-label">I am a</label>
      <div className="register-role-grid" role="radiogroup" aria-labelledby="register-role-label">
        <button
          type="button"
          role="radio"
          aria-checked={value === "buyer"}
          className={value === "buyer" ? "register-role active" : "register-role"}
          onClick={() => onChange("buyer")}
        >
          <ShoppingBag size={22} />
          <div>
            <strong>Buyer</strong>
            <p>Browse and buy livestock and farm products</p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === "farmer"}
          className={value === "farmer" ? "register-role active" : "register-role"}
          onClick={() => onChange("farmer")}
        >
          <Tractor size={22} />
          <div>
            <strong>Farmer</strong>
            <p>Post and sell your livestock and farm products</p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default Register;
