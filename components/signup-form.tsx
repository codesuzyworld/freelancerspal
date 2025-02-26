import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function SignUpForm({
  className,
  searchParams,
}: React.ComponentProps<"div"> & { searchParams: Message }) {
  return (
    <div className={cn("w-full flex flex-col gap-6", className)}>
      <Card className="overflow-hidden">
        <CardContent className="bg-projectcard-primary grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-muted-foreground">
                  Sign up for Freelancer's Pal
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  minLength={6}
                  required 
                />
              </div>
              <SubmitButton formAction={signUpAction} pendingText="Signing up...">
                Sign up
              </SubmitButton>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/sign-in" className="underline underline-offset-4">
                  Sign in
                </a>
              </div>
            </div>
            <FormMessage message={searchParams} />
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/img/loginfreelancer.png"
              alt="Signup Logo"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 