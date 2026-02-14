import "server-only";

export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full">{props.children}</div>
      </div>
    </div>
  );
}
