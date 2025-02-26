import { Message } from "@/components/form-message";
import { SignUpForm } from "@/components/signup-form";

export default async function Signup(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="min-h-svh w-full 2xl:w-screen flex flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-3xl">
        <SignUpForm searchParams={searchParams} />
      </div>
    </div>
  );
}
