import { LoginForm } from "@/components/login-form"
import { Message } from "@/components/form-message"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Message>;
}) {
  const message = await searchParams;
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm searchParams={message} />
      </div>
    </div>
  )
}
