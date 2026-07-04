export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-marca-azul px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">{children}</div>
    </div>
  );
}
