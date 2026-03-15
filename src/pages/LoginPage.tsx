import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Database, Lock, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (isSignup) {
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }
      const result = await signup(email, password);
      if (!result.success) {
        setError(result.error || "Erro ao criar conta.");
      } else if (result.needsConfirmation) {
        setInfo("Conta criada! Verifique seu email para confirmar o cadastro.");
      }
    } else {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || "Credenciais inválidas.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(hsl(175 80% 50% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(175 80% 50% / 0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-lg p-8 neon-border animate-slide-up">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4 glow-primary">
              <Database className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold neon-text font-mono">DB Sentinela</h1>
            <p className="text-muted-foreground text-sm mt-1">Database Operations Center</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-border">
            <button
              type="button"
              onClick={() => { setIsSignup(false); setError(""); setInfo(""); }}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${!isSignup ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              <LogIn className="w-4 h-4 inline mr-1.5" />Login
            </button>
            <button
              type="button"
              onClick={() => { setIsSignup(true); setError(""); setInfo(""); }}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${isSignup ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              <UserPlus className="w-4 h-4 inline mr-1.5" />Cadastro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-secondary border-border focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Senha</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-secondary border-border focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignup && (
                <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p>
              )}
            </div>

            {error && (
              <p className="text-destructive text-sm animate-slide-up">{error}</p>
            )}
            {info && (
              <p className="text-success text-sm animate-slide-up">{info}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-semibold"
            >
              {loading ? (
                <Lock className="w-4 h-4 animate-spin-slow mr-2" />
              ) : isSignup ? (
                <UserPlus className="w-4 h-4 mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {loading ? "Processando..." : isSignup ? "Criar Conta" : "Acessar Painel"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
